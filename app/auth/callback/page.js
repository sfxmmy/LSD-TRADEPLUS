'use client'

import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function AuthCallbackPage() {
  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )

      // Get the session from the URL hash (Supabase puts tokens there)
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Auth callback error:', error)
        window.location.href = '/login?error=auth_failed'
        return
      }

      if (session) {
        // Check if user has a profile, if not create one
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', session.user.id)
          .single()

        if (!profile) {
          // Create profile for new user
          await supabase.from('profiles').insert({
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || null,
            subscription_status: 'inactive'
          })
        }

        // Redirect to dashboard or pricing based on subscription
        const { data: profileData } = await supabase
          .from('profiles')
          .select('subscription_status')
          .eq('id', session.user.id)
          .single()

        // Admin bypass
        if (session.user.email === 'ssiagos@hotmail.com') {
          window.location.href = '/dashboard'
          return
        }

        if (profileData?.subscription_status === 'active') {
          window.location.href = '/dashboard'
        } else {
          window.location.href = '/pricing'
        }
      } else {
        window.location.href = '/login'
      }
    }

    handleCallback()
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px', fontWeight: 700 }}>
          <span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE</span><span style={{ color: '#22c55e' }}>+</span>
        </div>
        <div style={{ color: '#999', fontSize: '16px' }}>Completing sign in...</div>
        <div style={{ marginTop: '20px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #1a1a22', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        </div>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
