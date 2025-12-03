/**
 * Formatter Utilities
 * Functions for formatting dates, numbers, etc.
 */

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @param {string} format - Format type ('short', 'long', 'datetime')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = 'long') => {
  if (!date) return '';
  
  const d = new Date(date);
  
  if (isNaN(d.getTime())) return '';
  
  const options = {
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    datetime: { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  };
  
  return d.toLocaleDateString('en-US', options[format] || options.long);
};

/**
 * Format datetime to time ago string
 * @param {string|Date} date - Date to format
 * @returns {string} Time ago string (e.g., "2 hours ago")
 */
export const timeAgo = (date) => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const seconds = Math.floor((new Date() - d) / 1000);
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  };
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
    }
  }
  
  return 'just now';
};

/**
 * Format number with commas
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US');
};

/**
 * Format percentage
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '0%';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format file size
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Truncate text with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Format student ID
 * @param {string} studentId - Student ID (YYYY-XXXXX format)
 * @returns {string} Formatted student ID
 */
export const formatStudentId = (studentId) => {
  if (!studentId) return '';
  // Already in correct format: YYYY-XXXXX
  return studentId;
};

/**
 * Get election status display
 * @param {object} election - Election object
 * @returns {object} Status object with label and variant
 */
export const getElectionStatus = (election) => {
  if (!election) return { label: 'Unknown', variant: 'secondary' };
  
  const now = new Date();
  const startDate = new Date(election.start_date);
  const endDate = new Date(election.end_date);
  
  if (now < startDate) {
    return { label: 'Upcoming', variant: 'info' };
  } else if (now >= startDate && now <= endDate && election.is_active) {
    return { label: 'Active', variant: 'success' };
  } else if (now > endDate) {
    return { label: 'Finished', variant: 'secondary' };
  } else {
    return { label: 'Inactive', variant: 'warning' };
  }
};

/**
 * Get application status display
 * @param {string} status - Application status
 * @returns {object} Status object with label and variant
 */
export const getApplicationStatus = (status) => {
  const statusMap = {
    pending: { label: 'Pending Review', variant: 'warning' },
    approved: { label: 'Approved', variant: 'success' },
    rejected: { label: 'Rejected', variant: 'danger' },
    withdrawn: { label: 'Withdrawn', variant: 'secondary' }
  };
  
  return statusMap[status] || { label: status, variant: 'secondary' };
};

export default {
  formatDate,
  timeAgo,
  formatNumber,
  formatPercentage,
  formatFileSize,
  truncateText,
  formatStudentId,
  getElectionStatus,
  getApplicationStatus
};

