import api from './api';

const parseVersion = (version) => {
  if (!version || typeof version !== 'string') {
    return [0, 0, 0];
  }
  return version
    .split('.')
    .slice(0, 3)
    .map((segment) => Number.parseInt(segment, 10) || 0);
};

const isVersionAtLeast = (currentVersion, minimumVersion) => {
  const current = parseVersion(currentVersion);
  const minimum = parseVersion(minimumVersion);

  for (let index = 0; index < 3; index += 1) {
    if (current[index] > minimum[index]) {
      return true;
    }
    if (current[index] < minimum[index]) {
      return false;
    }
  }
  return true;
};

const getVersionInfo = async () => {
  const response = await api.get('/version/');
  return response.data;
};

const isFrontendVersionSupported = (currentFrontendVersion, versionInfo) => {
  const minimumVersion = versionInfo?.min_frontend_version;
  if (!minimumVersion) {
    return true;
  }
  return isVersionAtLeast(currentFrontendVersion, minimumVersion);
};

const versionService = {
  getVersionInfo,
  isFrontendVersionSupported,
};

export default versionService;
