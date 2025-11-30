'use client'

import { useAuth } from '@/components/AuthProvider'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

function CheckIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
}

export default function PricingPage() {
  const { user, isPro, signInWithDiscord } = useAuth()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleUpgrade = async () => {
    if (!user) {
      signInWithDiscord()
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/stripe/create-checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Upgrade error:', error)
    }
    setLoading(false)
  }

  const handleManage = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/create-portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Portal error:', error)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a22' }}>
        <a href="/" style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '1px' }}>
          <span style={{ color: '#22c55e' }}>JOURNAL</span><span style={{ color: '#fff' }}>PRO</span>
        </a>
        {user ? (
          <a href="/dashboard" style={{ padding: '10px 20px', background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: '8px', color: '#fff', fontSize: '14px' }}>Dashboard</a>
        ) : (
          <button onClick={signInWithDiscord} style={{ padding: '10px 20px', background: '#5865F2', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Login</button>
        )}
      </header>

      {/* Pricing */}
      <section style={{ padding: '80px 48px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ fontSize: '44px', fontWeight: 700, marginBottom: '16px' }}>Simple, Transparent Pricing</h1>
          <p style={{ color: '#888', fontSize: '18px', marginBottom: '60px' }}>Start free, upgrade when you need more power</p>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            {/* Free */}
            <div style={{ background: '#14141a', border: '1px solid #222230', borderRadius: '20px', padding: '40px', textAlign: 'left' }}>
              <div style={{ fontSize: '14px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Free</div>
              <div style={{ fontSize: '52px', fontWeight: 700, marginBottom: '8px' }}>$0</div>
              <div style={{ color: '#666', marginBottom: '32px' }}>Forever free</div>
              
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
                {[
                  '1 Trading Account',
                  'Up to 50 Trades',
                  'Basic Statistics',
                  '5 Custom Fields',
                  'Discord Login',
                  'Community Support'
                ].map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#bbb', fontSize: '15px' }}><CheckIcon /> {f}</li>
                ))}
              </ul>
              
              {user ? (
                <a href="/dashboard" style={{ display: 'block', width: '100%', padding: '16px', background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: '12px', color: '#fff', fontWeight: 600, textAlign: 'center' }}>Go to Dashboard</a>
              ) : (
                <button onClick={signInWithDiscord} style={{ width: '100%', padding: '16px', background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: '12px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Get Started Free</button>
              )}
            </div>

            {/* Pro */}
            <div style={{ background: 'linear-gradient(135deg, #14141a 0%, #1a2a1a 100%)', border: '2px solid #22c55e', borderRadius: '20px', padding: '40px', textAlign: 'left', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '-14px', right: '24px', background: '#22c55e', color: '#000', fontSize: '12px', fontWeight: 700, padding: '6px 16px', borderRadius: '20px' }}>RECOMMENDED</div>
              <div style={{ fontSize: '14px', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Pro</div>
              <div style={{ fontSize: '52px', fontWeight: 700, marginBottom: '8px' }}>$9<span style={{ fontSize: '20px', color: '#666' }}>/mo</span></div>
              <div style={{ color: '#666', marginBottom: '32px' }}>Billed monthly</div>
              
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px' }}>
                {[
                  'Unlimited Accounts',
                  'Unlimited Trades',
                  'Advanced Statistics',
                  'Unlimited Custom Fields',
                  'Trade Screenshots',
                  'Export to CSV/PDF',
                  'Priority Support',
                  'Early Access Features'
                ].map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#bbb', fontSize: '15px' }}><CheckIcon /> {f}</li>
                ))}
              </ul>
              
              {isPro ? (
                <button onClick={handleManage} disabled={loading} style={{ width: '100%', padding: '16px', background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: '12px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                  {loading ? 'Loading...' : 'Manage Subscription'}
                </button>
              ) : (
                <button onClick={handleUpgrade} disabled={loading} style={{ width: '100%', padding: '16px', background: '#22c55e', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '16px', cursor: 'pointer' }}>
                  {loading ? 'Loading...' : 'Upgrade to Pro'}
                </button>
              )}
            </div>
          </div>

          {/* FAQ */}
          <div style={{ marginTop: '80px', textAlign: 'left' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '32px', textAlign: 'center' }}>Frequently Asked Questions</h2>
            <div style={{ display: 'grid', gap: '16px' }}>
              {[
                { q: 'Can I cancel anytime?', a: 'Yes, you can cancel your subscription at any time. You\'ll continue to have access until the end of your billing period.' },
                { q: 'Is my data secure?', a: 'Absolutely. We use industry-standard encryption and secure cloud infrastructure to protect your trading data.' },
                { q: 'Can I export my trades?', a: 'Pro users can export their trades to CSV or PDF format at any time.' },
                { q: 'Do you offer refunds?', a: 'We offer a 7-day money-back guarantee if you\'re not satisfied with Pro.' },
              ].map((faq, i) => (
                <div key={i} style={{ background: '#14141a', border: '1px solid #222230', borderRadius: '12px', padding: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>{faq.q}</h3>
                  <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6 }}>{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
