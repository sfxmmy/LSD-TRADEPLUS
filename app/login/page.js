'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (!data.user) {
        setError('Login failed. Please try again.')
        setLoading(false)
        return
      }

      // Check if admin
      const isAdmin = data.user.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL || data.user.email === 'ssiagos@hotmail.com'

      if (isAdmin) {
        window.location.href = '/dashboard'
        return
      }

      // Check subscription status before redirecting
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, subscription_end, plan')
        .eq('id', data.user.id)
        .single()

      // Check if user has valid subscription
      const hasAccess = (() => {
        if (!profile) return false
        const { subscription_status, subscription_end, plan } = profile
        if (subscription_status === 'active') return true
        if (plan === 'lifetime') return true
        if (['cancelled', 'expired', 'past_due'].includes(subscription_status) && subscription_end) {
          const gracePeriodEnd = new Date(new Date(subscription_end).getTime() + 7 * 24 * 60 * 60 * 1000)
          if (new Date() < gracePeriodEnd) return true
        }
        return false
      })()

      if (hasAccess) {
        window.location.href = '/dashboard'
      } else {
        window.location.href = '/pricing'
      }

    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://lsdtradeplus.com/auth/callback'
        }
      })

      if (error) {
        setError(error.message)
      }
    } catch (err) {
      setError('Failed to connect to Google')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      <header style={{ padding: '20px 48px', borderBottom: '1px solid #1a1a22' }}>
        <a href="/" style={{ fontSize: '22px', fontWeight: 700, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE</span><span style={{ color: '#22c55e' }}>+</span>
        </a>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
        <div style={{ background: '#14141a', border: '1px solid #222230', borderRadius: '20px', padding: '40px', width: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Welcome Back</h1>
            <p style={{ color: '#999', fontSize: '14px' }}>Sign in to your account</p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px', marginBottom: '20px', color: '#ef4444', fontSize: '14px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleLogin}
            style={{
              width: '100%',
              padding: '14px',
              background: '#fff',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '20px'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span style={{ color: '#333', fontWeight: 600, fontSize: '15px' }}>Continue with Google</span>
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: '#222230' }} />
            <span style={{ color: '#999', fontSize: '13px' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#222230' }} />
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '6px', textTransform: 'uppercase' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #222230', borderRadius: '10px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '6px', textTransform: 'uppercase' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #222230', borderRadius: '10px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '14px', background: loading ? '#166534' : '#22c55e', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#999' }}>
            Don't have an account? <a href="/signup" style={{ color: '#22c55e', textDecoration: 'none' }}>Sign up</a>
          </p>
        </div>
      </div>
    </div>
  )
}
