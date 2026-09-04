import axios from 'axios';
import { STORAGE_KEYS, APP_VERSION } from '../constants';

/**
 * Get base URL for API requests
 * 
 * DEVELOPMENT: Uses relative URL '/api' which is proxied by Vite to localhost:8000
 * PRODUCTION: Uses VITE_API_BASE_URL environment variable (REQUIRED in production)
 * 
 * @returns {string} Base URL for API requests
 */
const getBaseURL = () => {
  // In development, use relative URL to leverage Vite proxy (see vite.config.js)
  const isDevelopment = import.meta.env.DEV;
  if (isDevelopment) {
    return '/api';
  }
  
  // In production, VITE_API_BASE_URL MUST be set
  // This is set during build time via environment variables
  const envURL = import.meta.env.VITE_API_BASE_URL;
  if (envURL) {
    // Ensure it ends with /api if not already
    const baseURL = envURL.endsWith('/api') ? envURL : envURL.replace(/\/api\/?$/, '') + '/api';
    return baseURL;
  }
  
  // Production fallback - warn if not set
  if (import.meta.env.PROD) {
    console.error(
      '⚠️ VITE_API_BASE_URL is not set in production! ' +
      'Set this environment variable during build. ' +
      'Falling back to relative URL which may not work.'
    );
  }
  
  // Fallback (only works if backend is on same domain)
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    config.headers['X-Frontend-Version'] = APP_VERSION;
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Token refresh mutex and queue for concurrent requests
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response interceptor - Handle errors and token refresh
api.interceptors.response.use(
  (response) => {
    // Don't process blob responses - return as-is
    if (response.config.responseType === 'blob') {
      return response;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle network errors
    if (!error.response) {
      console.error('Network Error:', error.message);
      return Promise.reject({
        ...error,
        message: 'Network error. Please check your connection and try again.',
      });
    }

    // Handle blob error responses (e.g., CSV export errors)
    if (originalRequest.responseType === 'blob' && error.response?.data instanceof Blob) {
      // Convert blob error to readable format for the caller
      try {
        const text = await error.response.data.text();
        try {
          const errorData = JSON.parse(text);
          error.response.data = errorData;
        } catch {
          // If not JSON, keep as text
          error.response.data = text;
        }
      } catch {
        // If we can't read the blob, create a generic error
        error.response.data = {
          error: `HTTP ${error.response.status}: ${error.response.statusText}`,
          detail: 'Failed to read error response'
        };
      }
      // Return the modified error
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized - Token expired or invalid
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Do not attempt token refresh for authentication endpoints
      if (
        originalRequest.url?.includes('/auth/token/refresh/') ||
        originalRequest.url?.includes('/auth/login/')
      ) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        isRefreshing = false;
        processQueue(new Error('No refresh token available'), null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          `${getBaseURL()}/auth/token/refresh/`,
          { refresh: refreshToken }
        );

        const { access } = response.data;
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access);
        api.defaults.headers.common.Authorization = `Bearer ${access}`;
        originalRequest.headers.Authorization = `Bearer ${access}`;

        processQueue(null, access);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle CORS errors
    if (error.code === 'ERR_NETWORK' || error.message.includes('CORS')) {
      console.error('CORS Error:', error.message);
      return Promise.reject({
        ...error,
        message: 'CORS error. Please check backend CORS configuration.',
      });
    }

    // Handle other errors
    return Promise.reject(error);
  }
);

/**
 * In-memory client-side response cache with TTL
 */
const apiCache = new Map();

/**
 * Cached GET request helper
 * @param {string} url - Request endpoint URL
 * @param {object} config - Axios request config (params, headers, etc.)
 * @param {number} ttlMs - Time-to-live in milliseconds (defaults to 5 minutes)
 * @returns {Promise<any>} Axios response promise
 */
export const cachedGet = async (url, config = {}, ttlMs = 5 * 60 * 1000) => {
  const cacheKey = `${url}:${JSON.stringify(config.params || {})}`;
  const cached = apiCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < ttlMs) {
    return cached.response;
  }

  const response = await api.get(url, config);
  apiCache.set(cacheKey, {
    response,
    timestamp: now,
  });
  return response;
};

/**
 * Clear cached responses
 * @param {string|null} urlPrefix - Optional prefix to selectively invalidate cache keys
 */
export const clearApiCache = (urlPrefix = null) => {
  if (!urlPrefix) {
    apiCache.clear();
  } else {
    for (const key of apiCache.keys()) {
      if (key.startsWith(urlPrefix)) {
        apiCache.delete(key);
      }
    }
  }
};

export default api;