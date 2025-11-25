/**
 * Validator Utilities
 * Form validation helper functions
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate email domain
 * @param {string} email - Email to validate
 * @param {array} allowedDomains - Array of allowed email domains
 * @returns {object} Validation result with valid boolean and message
 */
export const isValidEmailDomain = (email, allowedDomains = ['snsu.edu.ph', 'ssct.edu.ph']) => {
  if (!email) {
    return { valid: false, message: 'Email is required' };
  }
  
  if (!isValidEmail(email)) {
    return { valid: false, message: 'Invalid email format' };
  }
  
  const emailDomain = email.split('@')[1]?.toLowerCase();
  if (!emailDomain) {
    return { valid: false, message: 'Invalid email format' };
  }
  
  if (!allowedDomains.includes(emailDomain)) {
    return { 
      valid: false, 
      message: `Email must be from an allowed domain. Allowed domains: ${allowedDomains.join(', ')}` 
    };
  }
  
  return { valid: true, message: '' };
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with errors array
 */
export const validatePassword = (password) => {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { valid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate student ID format (YYYY-XXXXX)
 * @param {string} studentId - Student ID to validate
 * @returns {boolean} True if valid
 */
export const isValidStudentId = (studentId) => {
  if (!studentId) return false;
  const studentIdRegex = /^\d{4}-\d{5}$/;
  return studentIdRegex.test(studentId);
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
export const isValidPhone = (phone) => {
  if (!phone) return true; // Phone is optional
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

/**
 * Validate required field
 * @param {any} value - Value to check
 * @returns {boolean} True if not empty
 */
export const isRequired = (value) => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {boolean} True if valid
 */
export const isValidFileSize = (file, maxSizeMB = 5) => {
  if (!file) return true; // File is optional
  const maxSize = maxSizeMB * 1024 * 1024; // Convert to bytes
  return file.size <= maxSize;
};

/**
 * Validate file type
 * @param {File} file - File to validate
 * @param {array} allowedTypes - Array of allowed MIME types
 * @returns {boolean} True if valid
 */
export const isValidFileType = (file, allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']) => {
  if (!file) return true; // File is optional
  return allowedTypes.includes(file.type);
};

/**
 * Validate date is in future
 * @param {string|Date} date - Date to validate
 * @returns {boolean} True if in future
 */
export const isFutureDate = (date) => {
  if (!date) return false;
  const d = new Date(date);
  return d > new Date();
};

/**
 * Validate date range
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {boolean} True if end date is after start date
 */
export const isValidDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return end > start;
};

/**
 * Validate form data
 * @param {object} data - Form data object
 * @param {object} rules - Validation rules object
 * @returns {object} Validation result with errors object
 */
export const validateForm = (data, rules) => {
  const errors = {};
  
  Object.keys(rules).forEach(field => {
    const value = data[field];
    const rule = rules[field];
    
    // Required validation
    if (rule.required && !isRequired(value)) {
      errors[field] = rule.requiredMessage || `${field} is required`;
      return;
    }
    
    // Email validation
    if (rule.email && value && !isValidEmail(value)) {
      errors[field] = 'Invalid email format';
      return;
    }
    
    // Min length validation
    if (rule.minLength && value && value.length < rule.minLength) {
      errors[field] = `Minimum length is ${rule.minLength} characters`;
      return;
    }
    
    // Max length validation
    if (rule.maxLength && value && value.length > rule.maxLength) {
      errors[field] = `Maximum length is ${rule.maxLength} characters`;
      return;
    }
    
    // Custom validation
    if (rule.custom && value) {
      const customResult = rule.custom(value);
      if (!customResult.valid) {
        errors[field] = customResult.message;
        return;
      }
    }
  });
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
};

export default {
  isValidEmail,
  isValidEmailDomain,
  validatePassword,
  isValidStudentId,
  isValidPhone,
  isRequired,
  isValidFileSize,
  isValidFileType,
  isFutureDate,
  isValidDateRange,
  validateForm
};

