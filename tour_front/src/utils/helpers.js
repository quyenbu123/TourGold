/**
 * Helper utility functions
 */

/**
 * Format a date string to a human-readable format
 * @param {string} dateString - Date string to format
 * @param {Object} options - Date formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return 'N/A';
  
  const defaultOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', mergedOptions);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Format a price to currency format
 * @param {number} price - Price to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} Formatted price
 */
export const formatPrice = (price, currency = 'USD') => {
  if (price === undefined || price === null) return 'N/A';
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  } catch (error) {
    console.error('Error formatting price:', error);
    return `${price}`;
  }
};

/**
 * Truncate text to a specified length and add ellipsis if needed
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  
  return `${text.substring(0, maxLength)}...`;
};

/**
 * Calculate discount percentage
 * @param {number} originalPrice - Original price
 * @param {number} discountedPrice - Discounted price
 * @returns {number} Discount percentage
 */
export const calculateDiscount = (originalPrice, discountedPrice) => {
  if (!originalPrice || !discountedPrice) return 0;
  if (originalPrice <= 0 || discountedPrice >= originalPrice) return 0;
  
  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
};

/**
 * Get the minimum price from an array of tour packages
 * @param {Array} tourPrices - Array of tour price objects
 * @returns {number|null} Minimum price or null if no prices
 */
export const getMinPrice = (tourPrices) => {
  if (!tourPrices || !tourPrices.length) return null;
  
  return Math.min(...tourPrices.map(price => price.price));
};

/**
 * Extract unique tour types from an array of tours
 * @param {Array} tours - Array of tour objects
 * @returns {Array} Array of unique tour types
 */
export const getUniqueTourTypes = (tours) => {
  if (!tours || !tours.length) return [];
  
  return [...new Set(tours.flatMap(tour => 
    tour.typeOfTourEntities 
      ? tour.typeOfTourEntities.map(type => type.name) 
      : []
  ))];
};

/**
 * Check if a value is empty (null, undefined, empty string, empty array, or empty object)
 * @param {*} value - Value to check
 * @returns {boolean} True if the value is empty
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  
  return false;
};

/**
 * Load a script dynamically
 * @param {string} src - Source URL of the script
 * @returns {Promise} Promise resolving when the script is loaded
 */
export const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${src}"]`);
    if (existingScript) {
      resolve(true);
      return;
    }
    
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error(`Script load error for ${src}`));
    document.body.appendChild(script);
  });
};

/**
 * Load a stylesheet dynamically
 * @param {string} href - Source URL of the stylesheet
 * @returns {Promise} Promise resolving when the stylesheet is loaded
 */
export const loadCSS = (href) => {
  return new Promise((resolve, reject) => {
    // Check if stylesheet already exists
    const existingLink = document.querySelector(`link[href="${href}"]`);
    if (existingLink) {
      resolve(true);
      return;
    }
    
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve(true);
    link.onerror = () => reject(new Error(`CSS load error for ${href}`));
    document.head.appendChild(link);
  });
}; 