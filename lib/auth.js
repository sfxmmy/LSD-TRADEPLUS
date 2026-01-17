/**
 * Shared authentication utilities
 * Used across the app to check subscription status
 */

/**
 * Check if user has valid subscription to access the app
 * @param {Object} profile - User profile from Supabase
 * @returns {boolean} - True if user has valid access
 *
 * Valid subscription statuses:
 * - 'admin' = admin user with full access
 * - 'subscribing' = paying subscriber
 * - 'free subscription' = free access (giveaway, promo, etc.)
 * - 'free trial' = 7-day trial period
 */
export function hasValidSubscription(profile) {
  if (!profile) return false
  const { subscription_status } = profile

  // Admin has full access
  if (subscription_status === 'admin') return true

  // Active paying subscription
  if (subscription_status === 'subscribing') return true

  // Free subscription (giveaway, promo, etc.)
  if (subscription_status === 'free subscription') return true

  // Free trial period
  if (subscription_status === 'free trial') return true

  return false
}
