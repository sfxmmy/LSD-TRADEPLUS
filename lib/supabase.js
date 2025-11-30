import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    console.error('Missing Supabase env vars:', { url: !!url, key: !!key })
    throw new Error('Supabase configuration missing')
  }
  
  return createBrowserClient(url, key)
}