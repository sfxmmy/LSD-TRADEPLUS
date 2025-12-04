'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSignup(e) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      // If session exists, user is logged in (email confirmation disabled)
      if (data.session) {
        window.location.href = '/pricing'
      } else {
        // Email confirmation required
        setSuccess(true)
      }

    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
        <header style={{ padding: '20px 48px', borderBottom: '1px solid #1a1a22' }}>
          <a href="/" style={{ fontSize: '22px', fontWeight: 700 }}>
            <span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE+</span>
          </a>
        </header>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
          <div style={{ background: '#14141a', border: '1px solid #222230', borderRadius: '20px', padding: '40px', width: '400px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✉️</div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>Check your email</h2>
            <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
              We sent a confirmation link to <strong style={{ color: '#fff' }}>{email}</strong>
            </p>
            <a href="/login" style={{ display: 'inline-block', padding: '12px 24px', background: '#22c55e', borderRadius: '8px', color: '#fff', fontWeight: 600 }}>
              Go to Login
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      <header style={{ padding: '20px 48px', borderBottom: '1px solid #1a1a22' }}>
        <a href="/" style={{ fontSize: '22px', fontWeight: 700 }}>
          <span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE+</span>
        </a>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
        <div style={{ background: '#14141a', border: '1px solid #222230', borderRadius: '20px', padding: '40px', width: '400px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Create Account</h1>
            <p style={{ color: '#888', fontSize: '14px' }}>Start your trading journal today</p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px', marginBottom: '20px', color: '#ef4444', fontSize: '14px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSignup}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', textTransform: 'uppercase' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="your@email.com" style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #222230', borderRadius: '10px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', textTransform: 'uppercase' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #222230', borderRadius: '10px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', textTransform: 'uppercase' }}>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="••••••••" style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #222230', borderRadius: '10px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? '#166534' : '#22c55e', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#888' }}>
            Already have an account? <a href="/login" style={{ color: '#22c55e' }}>Sign in</a>
          </p>
        </div>
      </div>
    </div>
  )
}
