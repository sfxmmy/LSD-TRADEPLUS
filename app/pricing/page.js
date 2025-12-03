'use client'

import { useAuth } from '@/components/AuthProvider'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function CheckIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
}

export default function PricingPage() {
  const { user, profile, isPro, isAdmin, loading } = useAuth()
  const [btnLoading, setBtnLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const shouldCheckout = searchParams.get('checkout') === 'true'
  const justSignedUp = searchParams.get('signup') === 'true'

  // Auto-trigger checkout if coming from signup
  useEffect(() => {
    if (!loading && user && shouldCheckout && !isPro && !isAdmin) {
      handleSubscribe()
    }
  }, [loading, user, shouldCheckout, isPro, isAdmin])

  const handleSubscribe = async () => {
    if (!user) {
      router.push('/signup?redirect=checkout')
      return
    }

    setBtnLoading(true)
    try {
      const res = await fetch('/api/stripe/create-checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No checkout URL')
      }
    } catch (error) {
      console.error('Checkout error:', error)
    }
    setBtnLoading(false)
  }

  const handleManage = async () => {
    setBtnLoading(true)
    try {
      const res = await fetch('/api/stripe/create-portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Portal error:', error)
    }
    setBtnLoading(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f', color: '#777' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      {/* Header */}
      <header style={{ padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a22' }}>
        <a href="/" style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '1px', textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE+</span>
        </a>
        {user ? (
          <a href="/dashboard" style={{ padding: '10px 20px', background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: '8px', color: '#fff', fontSize: '14px', textDecoration: 'none' }}>Dashboard</a>
        ) : (
          <a href="/login" style={{ padding: '10px 20px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>Login</a>
        )}
      </header>

      {/* Message for new signups */}
      {justSignedUp && !isPro && !isAdmin && (
        <div style={{ background: 'rgba(34,197,94,0.1)', borderBottom: '1px solid rgba(34,197,94,0.3)', padding: '16px', textAlign: 'center' }}>
          <p style={{ color: '#22c55e', fontSize: '14px', margin: 0 }}>
            🎉 Account created! Subscribe below to access your trading journal.
          </p>
        </div>
      )}

      {/* Pricing */}
      <section style={{ padding: '60px 48px' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '40px', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>Get Full Access</h1>
          <p style={{ color: '#888', fontSize: '18px', marginBottom: '48px' }}>Everything you need to track and improve your trading</p>
          
          <div style={{ background: 'linear-gradient(135deg, #14141a 0%, #1a2a1a 100%)', border: '2px solid #22c55e', borderRadius: '20px', padding: '40px', textAlign: 'left', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-14px', right: '24px', background: '#22c55e', color: '#000', fontSize: '12px', fontWeight: 700, padding: '6px 16px', borderRadius: '20px' }}>FULL ACCESS</div>
            <div style={{ fontSize: '14px', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Pro Membership</div>
            <div style={{ fontSize: '52px', fontWeight: 700, marginBottom: '8px', color: '#fff' }}>£9<span style={{ fontSize: '20px', color: '#666' }}>/month</span></div>
            <div style={{ color: '#666', marginBottom: '32px' }}>Cancel anytime</div>
            
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
              {[
                'Unlimited Journals (10k, 25k, 50k etc)',
                'Unlimited Trades',
                'Advanced Statistics & Charts',
                'Custom Fields',
                'Trade Screenshots',
                'Data stored securely forever'
              ].map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#bbb', fontSize: '15px' }}><CheckIcon /> {f}</li>
              ))}
            </ul>
            
            {isPro || isAdmin ? (
              <div>
                <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '10px', padding: '12px', marginBottom: '16px', textAlign: 'center' }}>
                  <span style={{ color: '#22c55e', fontSize: '14px' }}>✓ You have full access</span>
                </div>
                <a href="/dashboard" style={{ display: 'block', width: '100%', padding: '16px', background: '#22c55e', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '16px', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
                  Go to Dashboard
                </a>
                {isPro && !isAdmin && (
                  <button onClick={handleManage} disabled={btnLoading} style={{ width: '100%', padding: '14px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '12px', color: '#888', fontWeight: 600, cursor: 'pointer', marginTop: '12px' }}>
                    {btnLoading ? 'Loading...' : 'Manage Subscription'}
                  </button>
                )}
              </div>
            ) : (
              <button onClick={handleSubscribe} disabled={btnLoading} style={{ width: '100%', padding: '16px', background: '#22c55e', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}>
                {btnLoading ? 'Loading...' : 'Subscribe Now - £9/month'}
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
