'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function PricingPage() {
  const router = useRouter()
  const { user, hasAccess, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)
  const [needsub, setNeedsub] = useState(false)
  const [autoCheckout, setAutoCheckout] = useState(false)
  const [checkoutTriggered, setCheckoutTriggered] = useState(false)

  useEffect(() => {
    // Check URL params on client side only
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setNeedsub(params.get('needsub') === 'true')
      setAutoCheckout(params.get('checkout') === 'true')
    }
  }, [])

  useEffect(() => {
    // Auto-trigger checkout if needed
    if (autoCheckout && user && !hasAccess && !authLoading && !checkoutTriggered) {
      setCheckoutTriggered(true)
      handleSubscribe()
    }
  }, [autoCheckout, user, hasAccess, authLoading, checkoutTriggered])

  const handleSubscribe = async () => {
    if (!user) {
      router.push('/signup?redirect=checkout')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/stripe/create-checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Error creating checkout: ' + (data.error || 'Unknown error'))
        setLoading(false)
      }
    } catch (err) {
      alert('Error: ' + err.message)
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
          {!authLoading && user && hasAccess ? (
            <a href="/dashboard" style={{ 
              padding: '12px 24px', 
              background: '#22c55e', 
              borderRadius: '8px', 
              color: '#fff', 
              fontWeight: 600, 
              fontSize: '14px' 
            }}>
              Enter Journal
            </a>
          ) : (
            <>
              <a href="/pricing" style={{ 
                padding: '12px 24px', 
                background: '#22c55e', 
                borderRadius: '8px', 
                color: '#fff', 
                fontWeight: 600, 
                fontSize: '14px' 
              }}>
                Get Access - £9/mo
              </a>
              <a href="/login" style={{ 
                padding: '12px 24px', 
                background: '#1a1a24', 
                border: '1px solid #2a2a35', 
                borderRadius: '8px', 
                color: '#fff', 
                fontWeight: 600, 
                fontSize: '14px' 
              }}>
                Member Login
              </a>
            </>
          )}
        </div>
      </header>

      {needsub && user && !hasAccess && (
        <div style={{ 
          background: 'rgba(234,179,8,0.1)', 
          borderBottom: '1px solid rgba(234,179,8,0.3)', 
          padding: '16px', 
          textAlign: 'center' 
        }}>
          <p style={{ color: '#eab308', fontSize: '14px', margin: 0 }}>
            ⚠️ Subscribe below to access the journal!
          </p>
        </div>
      )}

      <section style={{ padding: '60px 48px' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '40px', fontWeight: 700, marginBottom: '16px' }}>Get Full Access</h1>
          <p style={{ color: '#888', fontSize: '18px', marginBottom: '48px' }}>
            Everything you need to track your trading
          </p>

          <div style={{ 
            background: 'linear-gradient(135deg, #14141a 0%, #1a2a1a 100%)', 
            border: '2px solid #22c55e', 
            borderRadius: '20px', 
            padding: '40px', 
            textAlign: 'left', 
            position: 'relative' 
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '-14px', 
              right: '24px', 
              background: '#22c55e', 
              color: '#000', 
              fontSize: '12px', 
              fontWeight: 700, 
              padding: '6px 16px', 
              borderRadius: '20px' 
            }}>
              FULL ACCESS
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#22c55e', 
              textTransform: 'uppercase', 
              letterSpacing: '1px', 
              marginBottom: '8px' 
            }}>
              Pro Membership
            </div>
            <div style={{ fontSize: '52px', fontWeight: 700, marginBottom: '8px' }}>
              £9<span style={{ fontSize: '20px', color: '#666' }}>/month</span>
            </div>
            <div style={{ color: '#666', marginBottom: '32px' }}>Cancel anytime</div>

            <ul style={{ 
              listStyle: 'none', 
              padding: 0, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '16px', 
              marginBottom: '40px' 
            }}>
              {[
                'Unlimited Journals', 
                'Unlimited Trades', 
                'Advanced Statistics', 
                'Custom Fields', 
                'Trade Screenshots', 
                'Data stored forever'
              ].map((f, i) => (
                <li key={i} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  color: '#bbb', 
                  fontSize: '15px' 
                }}>
                  <CheckIcon /> {f}
                </li>
              ))}
            </ul>

            {!authLoading && hasAccess ? (
              <div>
                <div style={{ 
                  background: 'rgba(34,197,94,0.1)', 
                  border: '1px solid rgba(34,197,94,0.3)', 
                  borderRadius: '10px', 
                  padding: '12px', 
                  marginBottom: '16px', 
                  textAlign: 'center' 
                }}>
                  <span style={{ color: '#22c55e', fontSize: '14px' }}>✓ You have full access</span>
                </div>
                <a href="/dashboard" style={{ 
                  display: 'block', 
                  padding: '16px', 
                  background: '#22c55e', 
                  borderRadius: '12px', 
                  color: '#fff', 
                  fontWeight: 700, 
                  fontSize: '16px', 
                  textAlign: 'center' 
                }}>
                  Go to Dashboard
                </a>
              </div>
            ) : (
              <button 
                onClick={handleSubscribe} 
                disabled={loading} 
                style={{ 
                  width: '100%', 
                  padding: '16px', 
                  background: loading ? '#166534' : '#22c55e', 
                  border: 'none', 
                  borderRadius: '12px', 
                  color: '#fff', 
                  fontWeight: 700, 
                  fontSize: '16px', 
                  cursor: loading ? 'wait' : 'pointer' 
                }}
              >
                {loading ? 'Loading...' : 'Subscribe Now - £9/month'}
              </button>
            )}

            {!user && (
              <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#666' }}>
                Already have an account? <a href="/login" style={{ color: '#22c55e' }}>Sign in</a>
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
