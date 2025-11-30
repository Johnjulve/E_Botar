import api from './api';

const logService = {
  /**
   * Fetch system/security logs
   * @param {Object} params Query params (severity, log_type, limit, etc.)
   * @returns {Promise<AxiosResponse>}
   */
  getSystemLogs(params = {}) {
    return api.get('/common/system-logs/', { params });
  },
};

export default logService;

