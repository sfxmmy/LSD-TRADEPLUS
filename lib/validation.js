// Form validation utilities for trading journal
// Use these across all forms to ensure consistent validation

// ============================================
// Email Validation
// ============================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' }
  }

  const trimmed = email.trim()

  if (trimmed.length === 0) {
    return { valid: false, error: 'Email is required' }
  }

  if (trimmed.length > 254) {
    return { valid: false, error: 'Email is too long' }
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Please enter a valid email address' }
  }

  return { valid: true, value: trimmed }
}

// ============================================
// Password Validation
// ============================================

export function validatePassword(password, options = {}) {
  const { minLength = 6, maxLength = 128, requireStrong = false } = options

  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' }
  }

  if (password.length < minLength) {
    return { valid: false, error: `Password must be at least ${minLength} characters` }
  }

  if (password.length > maxLength) {
    return { valid: false, error: `Password must be less than ${maxLength} characters` }
  }

  if (requireStrong) {
    if (!/[A-Z]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one uppercase letter' }
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one lowercase letter' }
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, error: 'Password must contain at least one number' }
    }
  }

  return { valid: true }
}

export function validatePasswordMatch(password, confirmPassword) {
  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match' }
  }
  return { valid: true }
}

// ============================================
// Text Input Validation
// ============================================

export function validateRequired(value, fieldName = 'This field') {
  if (value === null || value === undefined) {
    return { valid: false, error: `${fieldName} is required` }
  }

  if (typeof value === 'string' && value.trim().length === 0) {
    return { valid: false, error: `${fieldName} is required` }
  }

  return { valid: true, value: typeof value === 'string' ? value.trim() : value }
}

export function validateLength(value, options = {}) {
  const { min = 0, max = Infinity, fieldName = 'This field' } = options

  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be text` }
  }

  const trimmed = value.trim()

  if (trimmed.length < min) {
    return { valid: false, error: `${fieldName} must be at least ${min} characters` }
  }

  if (trimmed.length > max) {
    return { valid: false, error: `${fieldName} must be less than ${max} characters` }
  }

  return { valid: true, value: trimmed }
}

// ============================================
// Number Validation
// ============================================

export function validateNumber(value, options = {}) {
  const { min = -Infinity, max = Infinity, fieldName = 'This field', allowEmpty = false } = options

  if (value === '' || value === null || value === undefined) {
    if (allowEmpty) return { valid: true, value: null }
    return { valid: false, error: `${fieldName} is required` }
  }

  const num = parseFloat(value)

  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a valid number` }
  }

  if (num < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` }
  }

  if (num > max) {
    return { valid: false, error: `${fieldName} must be at most ${max}` }
  }

  return { valid: true, value: num }
}

export function validateCurrency(value, options = {}) {
  const { min = 0, max = 9999999999.99, fieldName = 'Amount', allowEmpty = false } = options

  if (value === '' || value === null || value === undefined) {
    if (allowEmpty) return { valid: true, value: null }
    return { valid: false, error: `${fieldName} is required` }
  }

  // Remove currency symbols and commas
  const cleaned = String(value).replace(/[$€£¥₹,\s]/g, '')
  const num = parseFloat(cleaned)

  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a valid amount` }
  }

  if (num < min) {
    return { valid: false, error: `${fieldName} cannot be negative` }
  }

  if (num > max) {
    return { valid: false, error: `${fieldName} exceeds maximum allowed value` }
  }

  return { valid: true, value: num }
}

// ============================================
// Date Validation
// ============================================

export function validateDate(value, options = {}) {
  const { fieldName = 'Date', allowFuture = true, allowPast = true } = options

  if (!value) {
    return { valid: false, error: `${fieldName} is required` }
  }

  const date = new Date(value)

  if (isNaN(date.getTime())) {
    return { valid: false, error: `${fieldName} is not a valid date` }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (!allowFuture && date > today) {
    return { valid: false, error: `${fieldName} cannot be in the future` }
  }

  if (!allowPast && date < today) {
    return { valid: false, error: `${fieldName} cannot be in the past` }
  }

  return { valid: true, value: date.toISOString().split('T')[0] }
}

// ============================================
// Trading-Specific Validation
// ============================================

export function validateSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') {
    return { valid: false, error: 'Symbol is required' }
  }

  const trimmed = symbol.trim().toUpperCase()

  if (trimmed.length === 0) {
    return { valid: false, error: 'Symbol is required' }
  }

  if (trimmed.length > 20) {
    return { valid: false, error: 'Symbol is too long' }
  }

  // Allow letters, numbers, forward slash (for pairs like EUR/USD), and common symbols
  if (!/^[A-Z0-9\/\.\-_]+$/i.test(trimmed)) {
    return { valid: false, error: 'Symbol contains invalid characters' }
  }

  return { valid: true, value: trimmed }
}

export function validatePnL(value, options = {}) {
  const { fieldName = 'P&L', allowEmpty = true } = options

  if (value === '' || value === null || value === undefined) {
    if (allowEmpty) return { valid: true, value: null }
    return { valid: false, error: `${fieldName} is required` }
  }

  // Remove currency symbols, percentage, commas, handle accounting format
  let cleaned = String(value)
    .replace(/[$€£¥₹%,\s]/g, '')
    .replace(/^\((.+)\)$/, '-$1') // Convert (500) to -500

  const num = parseFloat(cleaned)

  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a valid number` }
  }

  // Reasonable limits for a single trade
  if (Math.abs(num) > 999999999) {
    return { valid: false, error: `${fieldName} value is unreasonably large` }
  }

  return { valid: true, value: num }
}

export function validateRiskReward(value) {
  if (value === '' || value === null || value === undefined) {
    return { valid: true, value: null }
  }

  const strValue = String(value).trim()

  // Handle "1:2" format
  if (strValue.includes(':')) {
    const parts = strValue.split(':')
    if (parts.length === 2) {
      const reward = parseFloat(parts[1])
      if (!isNaN(reward) && reward >= 0 && reward <= 100) {
        return { valid: true, value: reward }
      }
    }
    return { valid: false, error: 'Invalid R:R format (use 1:2 or just 2)' }
  }

  const num = parseFloat(strValue)

  if (isNaN(num)) {
    return { valid: false, error: 'R:R must be a valid number' }
  }

  if (num < 0) {
    return { valid: false, error: 'R:R cannot be negative' }
  }

  if (num > 100) {
    return { valid: false, error: 'R:R value seems unrealistic' }
  }

  return { valid: true, value: num }
}

export function validateRiskPercent(value) {
  if (value === '' || value === null || value === undefined) {
    return { valid: true, value: null }
  }

  const cleaned = String(value).replace('%', '').trim()
  const num = parseFloat(cleaned)

  if (isNaN(num)) {
    return { valid: false, error: 'Risk must be a valid number' }
  }

  if (num < 0) {
    return { valid: false, error: 'Risk cannot be negative' }
  }

  if (num > 100) {
    return { valid: false, error: 'Risk cannot exceed 100%' }
  }

  return { valid: true, value: num }
}

// ============================================
// Account/Journal Validation
// ============================================

export function validateAccountName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Account name is required' }
  }

  const trimmed = name.trim()

  if (trimmed.length === 0) {
    return { valid: false, error: 'Account name is required' }
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Account name must be 50 characters or less' }
  }

  return { valid: true, value: trimmed }
}

export function validateStartingBalance(value) {
  return validateCurrency(value, {
    min: 0,
    max: 9999999999.99,
    fieldName: 'Starting balance',
    allowEmpty: false
  })
}

// ============================================
// Sanitization
// ============================================

// Sanitize text input to prevent XSS (basic)
export function sanitizeText(text) {
  if (typeof text !== 'string') return ''
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

// Sanitize for display (decode)
export function unsanitizeText(text) {
  if (typeof text !== 'string') return ''
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
}

// ============================================
// Form Helper
// ============================================

/**
 * Validate multiple fields at once
 * @param {Object} fields - { fieldName: { value, validator, options } }
 * @returns {{ valid: boolean, errors: Object, values: Object }}
 */
export function validateForm(fields) {
  const errors = {}
  const values = {}
  let valid = true

  for (const [fieldName, config] of Object.entries(fields)) {
    const { value, validator, options = {} } = config
    const result = validator(value, { fieldName, ...options })

    if (!result.valid) {
      errors[fieldName] = result.error
      valid = false
    } else {
      values[fieldName] = result.value !== undefined ? result.value : value
    }
  }

  return { valid, errors, values }
}
