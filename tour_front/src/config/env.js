/**
 * Environment Configuration
 * Contains environment-specific settings and API endpoints
 */

// API Base URL (Change based on environment)
const explicitApiBaseUrl = process.env.REACT_APP_API_BASE_URL?.replace(/\/$/, '');
const explicitBackendUrl = process.env.REACT_APP_API_URL?.replace(/\/$/, '');

export const BACKEND_URL =
  explicitBackendUrl ||
  (explicitApiBaseUrl ? explicitApiBaseUrl.replace(/\/api$/, '') : 'http://localhost:8080');

export const API_BASE_URL = explicitApiBaseUrl || `${BACKEND_URL}/api`;

// Other environment variables
export const APP_NAME = 'Tour Gold';
export const APP_VERSION = '1.0.0';

// Feature flags
export const FEATURES = {
  ENABLE_ANALYTICS: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_DARK_MODE: true,
  ENABLE_GOOGLE_MAPS: true,
};

// Constants
export const ITEMS_PER_PAGE = 10;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB 
