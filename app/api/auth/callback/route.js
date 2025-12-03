import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name, options) {
            cookieStore.delete(name)
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Create profile if doesn't exist
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email,
          username: data.user.email?.split('@')[0] || 'Trader',
          subscription_status: 'free',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        })
      } catch (err) {
        console.error('Profile error:', err)
      }

      // Handle redirect for checkout flow
      if (redirect === 'checkout') {
        return NextResponse.redirect(`${origin}/pricing?checkout=true`)
      }

      // Admin always goes to dashboard
      if (data.user.email === 'ssiagos@hotmail.com') {
        return NextResponse.redirect(`${origin}/dashboard`)
      }

      // Check subscription
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', data.user.id)
        .single()
      
      if (profile?.subscription_status === 'active') {
        return NextResponse.redirect(`${origin}/dashboard`)
      }

      return NextResponse.redirect(`${origin}/pricing?signup=true`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
