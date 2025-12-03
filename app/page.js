'use client'

import { useAuth } from '@/components/AuthProvider'

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

export default function HomePage() {
  const { user, hasAccess, loading } = useAuth()

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      {/* Header */}
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
          {!loading && user && hasAccess ? (
            <a 
              href="/dashboard" 
              style={{ 
                padding: '12px 24px', 
                background: '#1a1a24', 
                border: '1px solid #2a2a35', 
                borderRadius: '8px', 
                color: '#fff', 
                fontWeight: 600, 
                fontSize: '14px' 
              }}
            >
              Enter Journal
            </a>
          ) : (
            <a 
              href="/login" 
              style={{ 
                padding: '12px 24px', 
                background: '#1a1a24', 
                border: '1px solid #2a2a35', 
                borderRadius: '8px', 
                color: '#fff', 
                fontWeight: 600, 
                fontSize: '14px' 
              }}
            >
              Member Login
            </a>
          )}
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: '100px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '56px', fontWeight: 800, lineHeight: 1.1, marginBottom: '16px' }}>
            The Trading Journal
          </h1>
          <h2 style={{ fontSize: '56px', fontWeight: 800, color: '#22c55e', marginBottom: '24px' }}>
            Built for Serious Traders
          </h2>
          <p style={{ fontSize: '20px', color: '#888', marginBottom: '40px', lineHeight: 1.6 }}>
            Track your trades, analyze your performance, and discover patterns that make you profitable.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <a 
              href="/signup" 
              style={{ 
                padding: '18px 40px', 
                background: '#22c55e', 
                borderRadius: '12px', 
                color: '#fff', 
                fontWeight: 700, 
                fontSize: '18px' 
              }}
            >
              Get Started - £9/month
            </a>
            <a 
              href="#features" 
              style={{ 
                padding: '18px 40px', 
                background: '#1a1a24', 
                border: '1px solid #2a2a35', 
                borderRadius: '12px', 
                color: '#fff', 
                fontWeight: 600, 
                fontSize: '18px' 
              }}
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ padding: '60px 48px', background: '#0d0d12' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 700, textAlign: 'center', marginBottom: '48px' }}>
            Everything You Need
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '24px' 
          }}>
            {[
              { title: 'Multiple Journals', desc: 'Create separate journals for each account - 10k, 25k, 50k, FTMO, etc.' },
              { title: 'Smart Statistics', desc: 'See PnL, winrate, and RR. Discover which setups work best for you.' },
              { title: 'Trade Screenshots', desc: 'Attach images to every trade. Review your entries and exits visually.' },
              { title: 'Custom Fields', desc: 'Create your own fields - timeframes, sessions, setups. Make it yours.' },
              { title: 'Equity Curves', desc: 'Beautiful charts showing your progress over time.' },
              { title: 'Cloud Synced', desc: 'Access from any device. Your data is always safe and available.' },
            ].map((f, i) => (
              <div 
                key={i} 
                style={{ 
                  background: '#14141a', 
                  border: '1px solid #222230', 
                  borderRadius: '16px', 
                  padding: '24px' 
                }}
              >
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '10px' }}>{f.title}</h3>
                <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '60px 48px' }}>
        <div style={{ maxWidth: '450px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '32px' }}>Simple Pricing</h2>
          <div style={{ 
            background: 'linear-gradient(135deg, #14141a 0%, #1a2a1a 100%)', 
            border: '2px solid #22c55e', 
            borderRadius: '16px', 
            padding: '32px', 
            textAlign: 'left' 
          }}>
            <div style={{ fontSize: '14px', color: '#22c55e', textTransform: 'uppercase', marginBottom: '8px' }}>
              Full Access
            </div>
            <div style={{ fontSize: '48px', fontWeight: 700, marginBottom: '24px' }}>
              £9<span style={{ fontSize: '18px', color: '#666' }}>/month</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '32px' }}>
              {['Unlimited Journals', 'Unlimited Trades', 'Advanced Statistics', 'Custom Fields', 'Cloud Storage'].map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#bbb', fontSize: '15px', marginBottom: '12px' }}>
                  <CheckIcon /> {f}
                </li>
              ))}
            </ul>
            <a 
              href="/signup" 
              style={{ 
                display: 'block', 
                padding: '16px', 
                background: '#22c55e', 
                borderRadius: '10px', 
                color: '#fff', 
                fontWeight: 700, 
                fontSize: '16px', 
                textAlign: 'center' 
              }}
            >
              Subscribe Now
            </a>
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
