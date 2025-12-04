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

      // Success - go to dashboard using window.location for clean redirect
      window.location.href = '/dashboard'

    } catch (err) {
      console.error('Login error:', err)
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      <header style={{ padding: '20px 48px', borderBottom: '1px solid #1a1a22' }}>
        <a href="/" style={{ fontSize: '22px', fontWeight: 700 }}>
          <span style={{ color: '#22c55e' }}>LSD</span>
          <span style={{ color: '#fff' }}>TRADE+</span>
        </a>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
        <div style={{ background: '#14141a', border: '1px solid #222230', borderRadius: '20px', padding: '40px', width: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Welcome Back</h1>
            <p style={{ color: '#888', fontSize: '14px' }}>Sign in to your account</p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px', marginBottom: '20px', color: '#ef4444', fontSize: '14px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', textTransform: 'uppercase' }}>Email</label>
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
              <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', textTransform: 'uppercase' }}>Password</label>
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

          <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#888' }}>
            Don't have an account? <a href="/signup" style={{ color: '#22c55e' }}>Sign up</a>
          </p>
        </div>
      </div>
    </div>
  )
}
