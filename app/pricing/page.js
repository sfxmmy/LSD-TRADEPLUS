'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PricingPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [trialDaysLeft, setTrialDaysLeft] = useState(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      setUser(authUser)

      if (authUser) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        setProfile(profileData)

        // Calculate trial days left
        if (profileData && profileData.subscription_status !== 'active') {
          const created = new Date(profileData.created_at)
          const trialEnd = new Date(created)
          trialEnd.setDate(trialEnd.getDate() + 7)
          const now = new Date()
          const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24))
          setTrialDaysLeft(daysLeft > 0 ? daysLeft : 0)
        }
      }
    }
    getUser()
  }, [])

  const handleCheckout = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
      })

      const { url, error } = await response.json()

      if (error) throw new Error(error)
      if (url) window.location.href = url
    } catch (err) {
      alert('Failed to start checkout: ' + err.message)
      setLoading(false)
    }
  }

  const isOnTrial = user && profile && profile.subscription_status !== 'active' && trialDaysLeft > 0
  const trialExpired = user && profile && profile.subscription_status !== 'active' && trialDaysLeft === 0

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '60px 20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: '800',
            color: '#fff',
            marginBottom: '16px'
          }}>
            Choose Your Plan
          </h1>
          
          {isOnTrial && (
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '12px 24px',
              borderRadius: '8px',
              display: 'inline-block',
              marginTop: '16px'
            }}>
              <p style={{ color: '#fff', fontSize: '18px', fontWeight: '600' }}>
                🎉 You have {trialDaysLeft} days left in your free trial!
              </p>
            </div>
          )}

          {trialExpired && (
            <div style={{
              background: 'rgba(255,68,68,0.3)',
              padding: '12px 24px',
              borderRadius: '8px',
              display: 'inline-block',
              marginTop: '16px'
            }}>
              <p style={{ color: '#fff', fontSize: '18px', fontWeight: '600' }}>
                ⚠️ Your free trial has expired. Subscribe to continue.
              </p>
            </div>
          )}

          <p style={{
            fontSize: '20px',
            color: 'rgba(255,255,255,0.9)',
            maxWidth: '600px',
            margin: '16px auto 0'
          }}>
            Start with a 7-day free trial, then just $9/month
          </p>
        </div>

        <div style={{
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          {/* Pro Plan */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '40px',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(102, 126, 234, 0.4)'
          }}>
            <div style={{
              position: 'absolute',
              top: '-12px',
              right: '20px',
              background: '#4ade80',
              color: '#000',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '700',
              textTransform: 'uppercase'
            }}>
              7-Day Free Trial
            </div>

            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '8px'
            }}>
              Pro
            </h3>
            <div style={{
              fontSize: '48px',
              fontWeight: '800',
              color: '#fff',
              marginBottom: '24px'
            }}>
              $9
              <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)', fontWeight: '400' }}>/month</span>
            </div>

            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: '0 0 32px 0'
            }}>
              {[
                '7-Day Free Trial',
                'Unlimited Trading Accounts',
                'Unlimited Trades',
                'Unlimited Custom Fields',
                'Advanced Statistics & Analytics',
                'Export Data (CSV/Excel)',
                'Trade Screenshots & Notes',
                'Cloud Sync Across Devices',
                'Priority Support'
              ].map((feature, i) => (
                <li key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  color: '#fff',
                  marginBottom: '12px',
                  fontSize: '15px'
                }}>
                  <span style={{ color: '#4ade80', fontSize: '20px' }}>✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={handleCheckout}
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: '#fff',
                color: '#667eea',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => !loading && (e.target.style.transform = 'scale(1.05)')}
              onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
            >
              {loading ? 'Loading...' : (user ? 'Start 7-Day Free Trial' : 'Sign Up to Continue')}
            </button>

            {!user && (
              <p style={{
                textAlign: 'center',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '13px',
                marginTop: '12px'
              }}>
                You'll be redirected to create an account
              </p>
            )}
          </div>
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '60px',
          color: 'rgba(255,255,255,0.9)'
        }}>
          <p style={{ fontSize: '16px', marginBottom: '12px' }}>
            ✨ All features unlocked during trial • Cancel anytime • No credit card required for trial
          </p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
            Your data is preserved forever, even if you cancel
          </p>
        </div>
      </div>
    </div>
  )
}