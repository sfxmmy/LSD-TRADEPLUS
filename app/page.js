'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function HomePage() {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthAndRedirect()
  }, [])

  // Check if user has valid subscription
  function hasValidSubscription(profile) {
    if (!profile) return false
    const { subscription_status } = profile
    if (subscription_status === 'admin') return true
    if (subscription_status === 'subscribing') return true
    if (subscription_status === 'free subscription') return true
    return false
  }

  async function checkAuthAndRedirect() {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, subscription_end')
          .eq('id', user.id)
          .single()

        // Auto-redirect to dashboard if user has valid subscription
        if (hasValidSubscription(profile)) {
          window.location.href = '/dashboard'
          return
        }
      }
    } catch (err) {
      console.error('Auth check:', err)
    }
    setLoading(false)
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#999' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      {/* Header */}
      <header style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a22' }}>
        <a href="/" style={{ fontSize: '28px', fontWeight: 700, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE</span><span style={{ color: '#22c55e' }}>+</span>
        </a>
        <div style={{ display: 'flex', gap: '12px' }}>
          <a href="/pricing" style={{ padding: '12px 24px', background: '#22c55e', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
            Get Access - £9/mo
          </a>
          <a href="/login" style={{ padding: '12px 24px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
            Member Log In
          </a>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '56px', fontWeight: 800, lineHeight: 1.1, marginBottom: '16px' }}>The Trading Journal</h1>
          <h2 style={{ fontSize: '56px', fontWeight: 800, color: '#22c55e', marginBottom: '24px' }}>Built for Serious Traders</h2>
          <p style={{ fontSize: '20px', color: '#999', marginBottom: '40px', lineHeight: 1.6 }}>
            Track your trades, analyze your performance, and discover patterns that make you profitable.
          </p>
          <a href="/signup" style={{ display: 'inline-block', padding: '16px 40px', background: '#22c55e', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '18px', textDecoration: 'none' }}>
            Get Started - £9/month
          </a>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '60px 24px', background: '#0d0d12' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 700, textAlign: 'center', marginBottom: '48px' }}>Everything You Need</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
            {[
              { title: 'Multiple Journals', desc: 'Create separate journals for each account - 10k, 25k, 50k, FTMO, etc.' },
              { title: 'Smart Statistics', desc: 'See PnL, winrate, and RR. Discover which setups work best for you.' },
              { title: 'Trade Screenshots', desc: 'Attach images to every trade. Review your entries and exits visually.' },
              { title: 'Custom Fields', desc: 'Create your own fields - timeframes, sessions, setups. Make it yours.' },
              { title: 'Equity Curves', desc: 'Beautiful charts showing your progress over time.' },
              { title: 'Cloud Synced', desc: 'Access from any device. Your data is always safe and available.' },
            ].map((f, i) => (
              <div key={i} style={{ background: '#14141a', border: '1px solid #222230', borderRadius: '16px', padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '10px' }}>{f.title}</h3>
                <p style={{ fontSize: '14px', color: '#999', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '60px 24px' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '32px' }}>Simple Pricing</h2>
          <div style={{ background: 'linear-gradient(135deg, #14141a 0%, #1a2a1a 100%)', border: '2px solid #22c55e', borderRadius: '16px', padding: '32px' }}>
            <div style={{ fontSize: '14px', color: '#22c55e', textTransform: 'uppercase', marginBottom: '8px' }}>Full Access</div>
            <div style={{ fontSize: '48px', fontWeight: 700, marginBottom: '8px' }}>
              £9<span style={{ fontSize: '18px', color: '#999' }}>/mo</span>
            </div>
            <p style={{ color: '#999', fontSize: '14px', marginBottom: '24px' }}>Everything included. Cancel anytime.</p>
            <a href="/signup" style={{ display: 'block', padding: '16px', background: '#22c55e', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '16px', textDecoration: 'none' }}>
              Subscribe Now
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px', borderTop: '1px solid #1a1a22', textAlign: 'center' }}>
        <p style={{ color: '#555', fontSize: '14px' }}>© 2024 LSDTRADE+. All rights reserved.</p>
      </footer>
    </div>
  )
}
