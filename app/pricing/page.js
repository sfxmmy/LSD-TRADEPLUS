'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function PricingPage() {
  const [user, setUser] = useState(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [])

  // Check if user has valid subscription
  // 'admin' = admin user, 'subscribing' = paying, 'free subscription' = free access
  // 'not subscribing' = no subscription, no access
  function hasValidSubscription(profile) {
    if (!profile) return false
    const { subscription_status } = profile
    if (subscription_status === 'admin') return true
    if (subscription_status === 'subscribing') return true
    if (subscription_status === 'free subscription') return true
    return false
  }

  async function checkAuth() {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_end')
          .eq('id', user.id)
          .single()
        setHasAccess(hasValidSubscription(profile))
      }
    } catch (err) {
      console.error('Auth check:', err)
    }
    setLoading(false)
  }

  async function handleSubscribe() {
    if (!user) {
      window.location.href = '/signup'
      return
    }

    setSubscribing(true)

    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        alert('Please log in to subscribe')
        window.location.href = '/login'
        return
      }

      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Error: ' + (data.error || 'Could not create checkout'))
        setSubscribing(false)
      }
    } catch (err) {
      alert('Error creating checkout')
      setSubscribing(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      <header style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a22' }}>
        <a href="/" style={{ fontSize: '28px', fontWeight: 700, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE</span><span style={{ color: '#22c55e' }}>+</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {!loading && hasAccess ? (
            <a href="/dashboard" style={{ padding: '12px 24px', background: '#22c55e', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>Enter Journal</a>
          ) : (
            <>
              <a href="/login" style={{ padding: '12px 24px', background: 'transparent', border: 'none', color: '#999', fontSize: '14px', textDecoration: 'none' }}>Login</a>
              <a href="/signup" style={{ padding: '12px 24px', background: '#22c55e', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>Sign Up</a>
            </>
          )}
        </div>
      </header>

      <section style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '40px', fontWeight: 700, marginBottom: '16px' }}>Get Full Access</h1>
          <p style={{ color: '#999', fontSize: '18px', marginBottom: '48px' }}>Everything you need to track your trading</p>

          <div style={{ background: 'linear-gradient(135deg, #14141a 0%, #1a2a1a 100%)', border: '2px solid #22c55e', borderRadius: '16px', padding: '32px', textAlign: 'left', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-14px', right: '24px', background: '#22c55e', color: '#000', fontSize: '12px', fontWeight: 700, padding: '6px 16px', borderRadius: '16px' }}>FULL ACCESS</div>

            <div style={{ fontSize: '14px', color: '#22c55e', textTransform: 'uppercase', marginBottom: '8px' }}>Pro Membership</div>
            <div style={{ fontSize: '52px', fontWeight: 700, marginBottom: '8px' }}>£9<span style={{ fontSize: '20px', color: '#999' }}>/month</span></div>
            <div style={{ color: '#999', marginBottom: '32px' }}>Cancel anytime</div>

            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              {['Unlimited Journals', 'Unlimited Trades', 'Advanced Statistics', 'Trade Screenshots', 'Equity Curves', 'Cloud Storage'].map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#999', fontSize: '15px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                  {f}
                </li>
              ))}
            </ul>

            {!loading && hasAccess ? (
              <div>
                <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '16px', textAlign: 'center' }}>
                  <span style={{ color: '#22c55e', fontSize: '14px' }}>✓ You have full access</span>
                </div>
                <a href="/dashboard" style={{ display: 'block', padding: '16px', background: '#22c55e', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '16px', textAlign: 'center', textDecoration: 'none' }}>Go to Dashboard</a>
              </div>
            ) : (
              <button onClick={handleSubscribe} disabled={subscribing} style={{ width: '100%', padding: '16px', background: subscribing ? '#166534' : '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '16px', cursor: subscribing ? 'not-allowed' : 'pointer' }}>
                {subscribing ? 'Loading...' : 'Subscribe Now - £9/month'}
              </button>
            )}

            {!user && (
              <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: '#999' }}>
                Already have an account? <a href="/login" style={{ color: '#22c55e', textDecoration: 'none' }}>Sign in</a>
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
