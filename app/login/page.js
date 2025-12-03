'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

export default function LoginPage() {
  const router = useRouter()
  const { supabase } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) throw error

      const isAdmin = data.user.email === 'ssiagos@hotmail.com'
      
      if (isAdmin) {
        router.push('/dashboard')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', data.user.id)
        .single()

      if (profile?.subscription_status === 'active') {
        router.push('/dashboard')
      } else {
        router.push('/pricing')
      }
    } catch (err) {
      setError(err.message || 'Login failed')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      <header style={{ 
        padding: '20px 48px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottom: '1px solid #1a1a22' 
      }}>
        <a href="/" style={{ fontSize: '22px', fontWeight: 700 }}>
          <span style={{ color: '#22c55e' }}>LSD</span>
          <span style={{ color: '#fff' }}>TRADE+</span>
        </a>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a 
            href="/pricing" 
            style={{ 
              padding: '12px 24px', 
              background: '#22c55e', 
              borderRadius: '8px', 
              color: '#fff', 
              fontWeight: 600, 
              fontSize: '14px' 
            }}
          >
            Get Access - £9/mo
          </a>
        </div>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
        <div style={{ 
          background: '#14141a', 
          border: '1px solid #222230', 
          borderRadius: '20px', 
          padding: '40px', 
          width: '400px' 
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Welcome Back</h1>
            <p style={{ color: '#888', fontSize: '14px' }}>Sign in to your account</p>
          </div>

          {error && (
            <div style={{ 
              background: 'rgba(239,68,68,0.1)', 
              border: '1px solid rgba(239,68,68,0.3)', 
              borderRadius: '10px', 
              padding: '12px', 
              marginBottom: '20px', 
              color: '#ef4444', 
              fontSize: '14px', 
              textAlign: 'center' 
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                color: '#888', 
                marginBottom: '6px', 
                textTransform: 'uppercase' 
              }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  background: '#0a0a0f', 
                  border: '1px solid #222230', 
                  borderRadius: '10px', 
                  color: '#fff', 
                  fontSize: '15px', 
                  boxSizing: 'border-box' 
                }}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '12px', 
                color: '#888', 
                marginBottom: '6px', 
                textTransform: 'uppercase' 
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ 
                  width: '100%', 
                  padding: '14px', 
                  background: '#0a0a0f', 
                  border: '1px solid #222230', 
                  borderRadius: '10px', 
                  color: '#fff', 
                  fontSize: '15px', 
                  boxSizing: 'border-box' 
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '14px', 
                background: loading ? '#166534' : '#22c55e', 
                border: 'none', 
                borderRadius: '10px', 
                color: '#fff', 
                fontWeight: 600, 
                fontSize: '16px', 
                cursor: loading ? 'wait' : 'pointer' 
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: '#888' }}>
            Don't have an account? <a href="/signup" style={{ color: '#22c55e' }}>Sign up</a>
          </p>
        </div>
      </div>
    </div>
  )
}
