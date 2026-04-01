/**
 * Debug Logger Utility
 * 
 * Provides consistent logging throughout the application with module naming,
 * timestamp, and different log levels. Can be disabled in production.
 */

// Set to false to disable all logging in production
const ENABLE_LOGGING = true;

// Log levels
export const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
};

// Minimum log level to display (set to DEBUG to show all logs)
const MIN_LOG_LEVEL = LOG_LEVELS.DEBUG;

// Color codes for different log levels
const LOG_COLORS = {
  [LOG_LEVELS.DEBUG]: '#888888',
  [LOG_LEVELS.INFO]: '#0088ff',
  [LOG_LEVELS.WARN]: '#ff9900',
  [LOG_LEVELS.ERROR]: '#ff0000',
};

// Log level priorities (higher number = more important)
const LOG_PRIORITIES = {
  [LOG_LEVELS.DEBUG]: 0,
  [LOG_LEVELS.INFO]: 1,
  [LOG_LEVELS.WARN]: 2,
  [LOG_LEVELS.ERROR]: 3,
};

/**
 * Create a logger instance for a specific module
 * @param {string} moduleName - Name of the module using the logger
 * @returns {Object} Logger object with methods for different log levels
 */
export const createLogger = (moduleName) => {
  const getTimestamp = () => {
    return new Date().toISOString().split('T')[1].substring(0, 12);
  };

  const shouldLog = (level) => {
    if (!ENABLE_LOGGING) return false;
    return LOG_PRIORITIES[level] >= LOG_PRIORITIES[MIN_LOG_LEVEL];
  };

  const log = (level, message, ...args) => {
    if (!shouldLog(level)) return;

    const timestamp = getTimestamp();
    const prefix = `[${timestamp}] [${level}] [${moduleName}]:`;

    // Use console methods based on level
    switch (level) {
      case LOG_LEVELS.ERROR:
        console.error(`%c${prefix} ${message}`, `color: ${LOG_COLORS[level]}`, ...args);
        break;
      case LOG_LEVELS.WARN:
        console.warn(`%c${prefix} ${message}`, `color: ${LOG_COLORS[level]}`, ...args);
        break;
      case LOG_LEVELS.INFO:
        console.info(`%c${prefix} ${message}`, `color: ${LOG_COLORS[level]}`, ...args);
        break;
      default:
        console.log(`%c${prefix} ${message}`, `color: ${LOG_COLORS[level]}`, ...args);
    }
  };

  return {
    debug: (message, ...args) => log(LOG_LEVELS.DEBUG, message, ...args),
    info: (message, ...args) => log(LOG_LEVELS.INFO, message, ...args),
    warn: (message, ...args) => log(LOG_LEVELS.WARN, message, ...args),
    error: (message, ...args) => log(LOG_LEVELS.ERROR, message, ...args),
  };
};

// Export default logger for quick use
export default createLogger('App'); 