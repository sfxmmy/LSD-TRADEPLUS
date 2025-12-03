'use client'

import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

function CheckIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
}

export default function LandingPage() {
  const { user, hasAccess, loading } = useAuth()
  const router = useRouter()

  // Redirect logged in users with access
  useEffect(() => {
    if (!loading && user && hasAccess) {
      router.push('/dashboard')
    }
  }, [user, hasAccess, loading, router])

  const handleSubscribe = () => {
    router.push('/signup?redirect=checkout')
  }

  const scrollToHowItWorks = () => {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      {/* Header */}
      <header style={{ padding: '20px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a22' }}>
        <div style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '1px' }}>
          <span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE+</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a href="/pricing" style={{ padding: '12px 24px', background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '16px', textDecoration: 'none' }}>Pricing</a>
          <a href="/login" style={{ padding: '12px 24px', background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '16px', textDecoration: 'none' }}>
            Member Login
          </a>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: '80px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '56px', fontWeight: 800, lineHeight: 1.1, marginBottom: '16px', color: '#fff' }}>
            The Trading Journal
          </h1>
          <h2 style={{ fontSize: '56px', fontWeight: 800, color: '#22c55e', marginBottom: '24px' }}>
            Built for Serious Traders
          </h2>
          <p style={{ fontSize: '20px', color: '#888', marginBottom: '40px', lineHeight: 1.6 }}>
            Track your trades, analyze your performance, and discover patterns that make you profitable.
            Customizable fields, powerful statistics, and beautiful visualizations.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button onClick={handleSubscribe} style={{ padding: '18px 40px', background: '#22c55e', border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '18px', cursor: 'pointer' }}>
              Purchase Membership: £9/month
            </button>
            <button onClick={scrollToHowItWorks} style={{ padding: '18px 40px', background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: '12px', color: '#fff', fontWeight: 600, fontSize: '18px', cursor: 'pointer' }}>
              More Info
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '60px 48px', background: '#0d0d12' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 700, textAlign: 'center', marginBottom: '48px', color: '#fff' }}>Everything You Need</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
            {[
              { title: 'Multiple Journals', desc: 'Create separate journals for each account - 10k, 25k, 50k. Keep everything organized.' },
              { title: 'Smart Statistics', desc: 'See PnL, winrate, and RR broken down by any field. Discover which setups work.' },
              { title: 'Trade Screenshots', desc: 'Attach images to every trade. Review your entries and exits visually.' },
              { title: 'Custom Fields', desc: 'Create your own inputs - timeframes, sessions, setups. Make it work for YOU.' },
              { title: 'Beautiful Charts', desc: 'Interactive equity curves. Watch your progress over time.' },
              { title: 'Cloud Synced', desc: 'Access from any device. Your data is securely stored and always available.' },
            ].map((f, i) => (
              <div key={i} style={{ background: '#14141a', border: '1px solid #222230', borderRadius: '16px', padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '10px', color: '#fff' }}>{f.title}</h3>
                <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{ padding: '60px 48px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 700, textAlign: 'center', marginBottom: '48px', color: '#fff' }}>How It Works</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '32px' }}>
            {[
              { step: '1', title: 'Subscribe', desc: 'Sign up with a simple monthly subscription' },
              { step: '2', title: 'Log Trades', desc: 'Record your trades with custom fields' },
              { step: '3', title: 'Analyze', desc: 'Discover patterns and improve your edge' },
            ].map((item, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', background: '#22c55e', borderRadius: '50%', fontWeight: 700, fontSize: '20px', marginBottom: '16px', color: '#fff' }}>{item.step}</div>
                <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>{item.title}</h3>
                <p style={{ fontSize: '14px', color: '#888' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section style={{ padding: '60px 48px', background: '#0d0d12' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>Simple Pricing</h2>
          <p style={{ color: '#888', marginBottom: '32px' }}>One plan, everything included</p>

          <div style={{ background: 'linear-gradient(135deg, #14141a 0%, #1a2a1a 100%)', border: '2px solid #22c55e', borderRadius: '16px', padding: '32px', textAlign: 'left', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '-12px', right: '20px', background: '#22c55e', color: '#000', fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px' }}>FULL ACCESS</div>
            <div style={{ fontSize: '14px', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Pro</div>
            <div style={{ fontSize: '40px', fontWeight: 700, marginBottom: '24px', color: '#fff' }}>£9<span style={{ fontSize: '16px', color: '#666' }}>/month</span></div>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              {['Unlimited Journals', 'Advanced Statistics', 'Unlimited Trades', 'Custom Fields', 'Data Stored Forever'].map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#bbb', fontSize: '14px' }}><CheckIcon /> {f}</li>
              ))}
            </ul>
            <button onClick={handleSubscribe} style={{ width: '100%', padding: '14px', background: '#22c55e', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '16px' }}>
              Subscribe Now
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px 48px', borderTop: '1px solid #1a1a22', textAlign: 'center' }}>
        <p style={{ color: '#555', fontSize: '14px' }}>© 2024 LSDTRADE+. All rights reserved.</p>
      </footer>
    </div>
  )
}
