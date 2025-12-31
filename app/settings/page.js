'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function SettingsPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadProfile()
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

  async function loadProfile() {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      window.location.href = '/login'
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!hasValidSubscription(profile)) {
      window.location.href = '/pricing'
      return
    }

    setUser(user)
    setProfile(profile)
    setUsername(profile?.username || '')
    setLoading(false)
  }

  async function handleSaveUsername() {
    if (!username.trim()) return
    setSaving(true)
    setMessage('')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { error } = await supabase
      .from('profiles')
      .update({ username: username.trim() })
      .eq('id', user.id)

    if (error) {
      setMessage('Error saving username')
    } else {
      setMessage('Username saved!')
      setProfile({ ...profile, username: username.trim() })
    }
    setSaving(false)
  }

  async function handleManageSubscription() {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      alert('Please log in')
      return
    }

    try {
      const res = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Could not open subscription management')
      }
    } catch (err) {
      alert('Error opening subscription portal')
    }
  }

  async function handleSignOut() {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  function getSubscriptionDisplay() {
    if (!profile) return { status: 'Unknown', color: '#999' }

    switch (profile.subscription_status) {
      case 'admin':
        return { status: 'Admin', color: '#a855f7' }
      case 'subscribing':
        return { status: 'Active Subscription', color: '#22c55e' }
      case 'free subscription':
        return { status: 'Free Access', color: '#3b82f6' }
      default:
        return { status: 'Not Subscribed', color: '#ef4444' }
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#999' }}>Loading...</div>
      </div>
    )
  }

  const subDisplay = getSubscriptionDisplay()

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      {/* Header */}
      <header style={{ padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a22' }}>
        <a href="/" style={{ fontSize: '28px', fontWeight: 700, textDecoration: 'none', letterSpacing: '-0.5px' }}>
          <span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE</span><span style={{ color: '#22c55e' }}>+</span>
        </a>
        <a href="/dashboard" style={{ padding: '12px 24px', background: '#22c55e', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>
            Back to Journal
          </a>
      </header>

      {/* Main Content */}
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Settings</h1>
        <p style={{ color: '#999', fontSize: '14px', marginBottom: '40px' }}>Manage your account and subscription</p>

        {/* Profile Section */}
        <div style={{ background: '#14141a', border: '1px solid #222230', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: '#fff' }}>Profile</h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '6px', textTransform: 'uppercase' }}>Email</label>
            <div style={{ padding: '14px', background: '#0a0a0f', border: '1px solid #222230', borderRadius: '10px', color: '#666', fontSize: '15px' }}>
              {user?.email}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '6px', textTransform: 'uppercase' }}>Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #222230', borderRadius: '10px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }}
            />
          </div>

          {message && (
            <div style={{ marginBottom: '16px', padding: '10px', background: message.includes('Error') ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${message.includes('Error') ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`, borderRadius: '8px', color: message.includes('Error') ? '#ef4444' : '#22c55e', fontSize: '14px' }}>
              {message}
            </div>
          )}

          <button
            onClick={handleSaveUsername}
            disabled={saving || !username.trim() || username === profile?.username}
            style={{
              padding: '12px 24px',
              background: saving || !username.trim() || username === profile?.username ? '#166534' : '#22c55e',
              border: 'none',
              borderRadius: '10px',
              color: '#fff',
              fontWeight: 600,
              fontSize: '14px',
              cursor: saving || !username.trim() || username === profile?.username ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : 'Save Username'}
          </button>
        </div>

        {/* Subscription Section */}
        <div style={{ background: '#14141a', border: '1px solid #222230', borderRadius: '16px', padding: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', color: '#fff' }}>Subscription</h2>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '6px', textTransform: 'uppercase' }}>Status</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: subDisplay.color }} />
              <span style={{ color: subDisplay.color, fontSize: '15px', fontWeight: 500 }}>{subDisplay.status}</span>
            </div>
          </div>

          {profile?.subscription_start && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '6px', textTransform: 'uppercase' }}>Member Since</label>
              <div style={{ color: '#fff', fontSize: '15px' }}>
                {new Date(profile.subscription_start).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          )}

          {profile?.subscription_end && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#999', marginBottom: '6px', textTransform: 'uppercase' }}>Access Until</label>
              <div style={{ color: '#f59e0b', fontSize: '15px' }}>
                {new Date(profile.subscription_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          )}

          {profile?.subscription_status === 'subscribing' && (
            <button
              onClick={handleManageSubscription}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: '1px solid #2a2a35',
                borderRadius: '10px',
                color: '#fff',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Manage Subscription
            </button>
          )}

          {profile?.subscription_status === 'admin' && (
            <div style={{ padding: '12px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: '10px', color: '#a855f7', fontSize: '14px' }}>
              Admin accounts have permanent full access
            </div>
          )}

          {profile?.subscription_status === 'free subscription' && (
            <div style={{ padding: '12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', color: '#3b82f6', fontSize: '14px' }}>
              You have free access to LSDTRADE+
            </div>
          )}
        </div>

        {/* Sign Out Section */}
        <div style={{ background: '#14141a', border: '1px solid #222230', borderRadius: '16px', padding: '24px', marginTop: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#fff' }}>Account</h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>Sign out of your LSDTRADE+ account</p>
          <button
            onClick={handleSignOut}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: '1px solid #ef4444',
              borderRadius: '10px',
              color: '#ef4444',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
