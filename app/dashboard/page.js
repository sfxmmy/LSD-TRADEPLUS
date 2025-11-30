'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewAccount, setShowNewAccount] = useState(false)
  const [newAccountName, setNewAccountName] = useState('')
  const [newAccountBalance, setNewAccountBalance] = useState('')
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Get user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }
      setUser(authUser)

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()
      setProfile(profileData)

      // Get accounts from database
      const { data: accountsData, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading accounts:', error)
      } else {
        setAccounts(accountsData || [])
      }
    } catch (err) {
      console.error('Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  const createAccount = async () => {
    if (!newAccountName.trim()) {
      alert('Please enter an account name')
      return
    }

    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          user_id: user.id,
          name: newAccountName.trim(),
          starting_balance: parseFloat(newAccountBalance) || 0
        })
        .select()
        .single()

      if (error) throw error

      // Reload accounts
      await loadData()
      
      // Reset form
      setNewAccountName('')
      setNewAccountBalance('')
      setShowNewAccount(false)
      
      alert('Account created successfully!')
    } catch (err) {
      console.error('Create error:', err)
      alert('Failed to create account: ' + err.message)
    } finally {
      setCreating(false)
    }
  }

  const deleteAccount = async (accountId) => {
    if (!confirm('Delete this account? All trades will be deleted.')) return

    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', accountId)

      if (error) throw error

      await loadData()
      alert('Account deleted')
    } catch (err) {
      alert('Failed to delete: ' + err.message)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000'
      }}>
        <div style={{ color: '#fff' }}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff' }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid #333',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700' }}>Trading Journal Pro</h1>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span style={{ color: '#888' }}>{profile?.email}</span>
          <button
            onClick={handleSignOut}
            style={{
              padding: '8px 16px',
              background: '#333',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Header Section */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
            Your Trading Accounts
          </h2>
          <p style={{ color: '#888' }}>
            Create and manage your trading journals
          </p>
        </div>

        {/* New Account Button */}
        {!showNewAccount && (
          <button
            onClick={() => setShowNewAccount(true)}
            style={{
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '30px'
            }}
          >
            + New Trading Account
          </button>
        )}

        {/* New Account Form */}
        {showNewAccount && (
          <div style={{
            background: '#1a1a1a',
            padding: '30px',
            borderRadius: '12px',
            marginBottom: '30px',
            border: '1px solid #333'
          }}>
            <h3 style={{ fontSize: '20px', marginBottom: '20px' }}>Create New Account</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>
                Account Name *
              </label>
              <input
                type="text"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                placeholder="e.g., FTMO 10k Challenge"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>
                Starting Balance (optional)
              </label>
              <input
                type="number"
                value={newAccountBalance}
                onChange={(e) => setNewAccountBalance(e.target.value)}
                placeholder="10000"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '16px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={createAccount}
                disabled={creating}
                style={{
                  padding: '12px 24px',
                  background: creating ? '#555' : '#4ade80',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#000',
                  fontWeight: '600',
                  cursor: creating ? 'not-allowed' : 'pointer'
                }}
              >
                {creating ? 'Creating...' : 'Create Account'}
              </button>
              <button
                onClick={() => setShowNewAccount(false)}
                style={{
                  padding: '12px 24px',
                  background: '#333',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Accounts Grid */}
        {accounts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#666'
          }}>
            <p style={{ fontSize: '18px', marginBottom: '12px' }}>No trading accounts yet</p>
            <p>Create your first account to start journaling</p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {accounts.map(account => (
              <div
                key={account.id}
                style={{
                  background: '#1a1a1a',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px solid #333',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onMouseOut={(e) => e.currentTarget.style.borderColor = '#333'}
                onClick={() => router.push(`/account/${account.id}`)}
              >
                <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
                  {account.name}
                </h3>
                <p style={{ color: '#888', fontSize: '14px', marginBottom: '16px' }}>
                  Starting Balance: ${parseFloat(account.starting_balance).toLocaleString()}
                </p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/account/${account.id}`)
                    }}
                    style={{
                      padding: '8px 16px',
                      background: '#667eea',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Open Journal
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteAccount(account.id)
                    }}
                    style={{
                      padding: '8px 16px',
                      background: '#ff4444',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}