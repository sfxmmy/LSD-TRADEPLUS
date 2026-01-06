import { createClient } from '@supabase/supabase-js'

// Create a single instance of Supabase client for browser
let supabaseInstance = null

export function getSupabase() {
  if (typeof window === 'undefined') {
    // Server-side - create new instance each time
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }
  
  // Client-side - reuse same instance
  if (!supabaseInstance) {
    supabaseInstance = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    )
  }
  
  return supabaseInstance
}

// For components that need to create client
export function createSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Backwards compatible export for pages using direct import
export const supabase = typeof window !== 'undefined' ? getSupabase() : null
