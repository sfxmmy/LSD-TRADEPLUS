// Simple in-memory rate limiter for API routes
// Note: This is per-instance, so in serverless environments requests may hit different instances
// For production at scale, consider using Redis or a dedicated rate limiting service

/**
 * Rate limit configuration
 * @typedef {Object} RateLimitConfig
 * @property {number} windowMs - Time window in milliseconds
 * @property {number} max - Maximum number of requests per window
 */

// In-memory store for rate limiting
// Key: identifier (IP or user ID), Value: { count, resetTime }
const rateLimitStore = new Map()

// Clean up old entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanupOldEntries() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key)
    }
  }
  lastCleanup = now
}

/**
 * Check if a request should be rate limited
 * @param {string} identifier - Unique identifier (IP, user ID, etc.)
 * @param {RateLimitConfig} config - Rate limit configuration
 * @returns {{ limited: boolean, remaining: number, resetTime: number }}
 */
export function checkRateLimit(identifier, config = {}) {
  const { windowMs = 60000, max = 10 } = config
  const now = Date.now()

  // Periodic cleanup
  cleanupOldEntries()

  const key = identifier
  const record = rateLimitStore.get(key)

  // No existing record or window expired
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs
    })
    return { limited: false, remaining: max - 1, resetTime: now + windowMs }
  }

  // Within window, increment count
  record.count++

  if (record.count > max) {
    return { limited: true, remaining: 0, resetTime: record.resetTime }
  }

  return { limited: false, remaining: max - record.count, resetTime: record.resetTime }
}

/**
 * Get the client's IP address from the request
 * @param {Request} request - Next.js request object
 * @returns {string} IP address
 */
export function getClientIP(request) {
  // Check various headers that might contain the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Vercel-specific header
  const vercelIP = request.headers.get('x-vercel-forwarded-for')
  if (vercelIP) {
    return vercelIP.split(',')[0].trim()
  }

  // Fallback
  return 'unknown'
}

/**
 * Rate limit middleware helper for API routes
 * @param {Request} request - Next.js request object
 * @param {RateLimitConfig} config - Rate limit configuration
 * @returns {{ success: boolean, response?: Response }}
 */
export function rateLimit(request, config = {}) {
  const ip = getClientIP(request)
  const result = checkRateLimit(ip, config)

  if (result.limited) {
    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(config.max || 10),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
            'Retry-After': String(Math.ceil((result.resetTime - Date.now()) / 1000))
          }
        }
      )
    }
  }

  return { success: true, remaining: result.remaining }
}

/**
 * Create a rate limiter with custom config
 * @param {RateLimitConfig} config - Rate limit configuration
 * @returns {function(Request): { success: boolean, response?: Response }}
 */
export function createRateLimiter(config) {
  return (request) => rateLimit(request, config)
}

// Pre-configured rate limiters for common use cases
export const rateLimiters = {
  // Auth endpoints - stricter limits
  auth: createRateLimiter({ windowMs: 60000, max: 5 }), // 5 per minute

  // Checkout/payment - prevent spam
  checkout: createRateLimiter({ windowMs: 60000, max: 3 }), // 3 per minute

  // Image upload - moderate limits
  upload: createRateLimiter({ windowMs: 60000, max: 20 }), // 20 per minute

  // General API - more lenient
  api: createRateLimiter({ windowMs: 60000, max: 60 }), // 60 per minute

  // Webhook - exempt (Stripe needs to be able to retry)
  webhook: createRateLimiter({ windowMs: 1000, max: 100 }), // Effectively no limit
}
