'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isSignUp) {
        // Sign up mode
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        })

        if (error) throw error

        if (data?.user) {
          // Check if email confirmation is required
          if (data.user.identities && data.user.identities.length === 0) {
            setError('This email is already registered. Please sign in instead.')
          } else {
            alert('Please check your email to confirm your account!')
            setIsSignUp(false)
          }
        }
      } else {
        // Sign in mode
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        if (data?.user) {
          // Get user profile to check subscription status
          const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_status')
            .eq('id', data.user.id)
            .single()

          // Redirect based on subscription status
          if (profile?.subscription_status === 'active') {
            router.push('/dashboard')
          } else {
            router.push('/pricing')
          }
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: '#1a1a1a',
        borderRadius: '16px',
        padding: '40px',
        width: '100%',
        maxWidth: '440px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#fff',
          marginBottom: '8px',
          textAlign: 'center'
        }}>
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h1>
        
        <p style={{
          color: '#888',
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          {isSignUp ? 'Sign up to start your trading journal' : 'Sign in to continue to your journal'}
        </p>

        {error && (
          <div style={{
            background: '#ff4444',
            color: '#fff',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              color: '#ccc',
              fontSize: '14px',
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#2a2a2a',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '16px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#333'}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block',
              color: '#ccc',
              fontSize: '14px',
              marginBottom: '8px',
              fontWeight: '500'
            }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#2a2a2a',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '16px',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#333'}
            />
          </div>

          {isSignUp && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                color: '#ccc',
                fontSize: '14px',
                marginBottom: '8px',
                fontWeight: '500'
              }}>
                CONFIRM PASSWORD
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#2a2a2a',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '16px',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#333'}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: loading ? '#555' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '16px',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => !loading && (e.target.style.transform = 'scale(1.02)')}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div style={{ flex: 1, height: '1px', background: '#333' }} />
          <span style={{ padding: '0 16px', color: '#666', fontSize: '14px' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: '#333' }} />
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: '#2a2a2a',
            color: '#fff',
            border: '1px solid #333',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '24px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => !loading && (e.target.style.background = '#333')}
          onMouseOut={(e) => e.target.style.background = '#2a2a2a'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{
          textAlign: 'center',
          color: '#888',
          fontSize: '14px'
        }}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
              setEmail('')
              setPassword('')
              setConfirmPassword('')
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#667eea',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  )
}