import { createBrowserClient } from '@supabase/ssr'

let supabase = null

export function getSupabase() {
  if (supabase) return supabase
  
  supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  
  return supabase
}
