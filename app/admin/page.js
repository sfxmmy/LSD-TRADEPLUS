'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [trades, setTrades] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [stats, setStats] = useState({ totalUsers: 0, subscribers: 0, freeUsers: 0, totalTrades: 0 })

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

  const checkAdminAndLoad = async () => {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Check if admin (only subscription_status === 'admin')
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    if (profile?.subscription_status !== 'admin') {
      router.push('/dashboard')
      return
    }

    setIsAdmin(true)
    await loadUsers()
    setLoading(false)
  }

  const loadUsers = async () => {
    const supabase = getSupabase()
    // Fetch all profiles (admin can see all due to admin policy)
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return

    // Get account and trade counts for each user
    const usersWithStats = await Promise.all(profiles.map(async (profile) => {
      const { count: accountCount } = await supabase
        .from('accounts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.id)

      const { data: userAccounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('user_id', profile.id)

      let tradeCount = 0
      let totalPnl = 0
      if (userAccounts && userAccounts.length > 0) {
        const accountIds = userAccounts.map(a => a.id)
        const { data: userTrades } = await supabase
          .from('trades')
          .select('pnl')
          .in('account_id', accountIds)

        if (userTrades) {
          tradeCount = userTrades.length
          totalPnl = userTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
        }
      }

      return {
        ...profile,
        accountCount: accountCount || 0,
        tradeCount,
        totalPnl
      }
    }))

    setUsers(usersWithStats)

    // Calculate stats
    const totalUsers = profiles.length
    const subscribers = profiles.filter(p => p.subscription_status === 'subscribing').length
    const freeUsers = profiles.filter(p => p.subscription_status === 'free subscription').length
    const totalTrades = usersWithStats.reduce((sum, u) => sum + u.tradeCount, 0)
    setStats({ totalUsers, subscribers, freeUsers, totalTrades })
  }

  const loadUserAccounts = async (user) => {
    const supabase = getSupabase()
    setSelectedUser(user)
    setSelectedAccount(null)
    setTrades([])

    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Get trade stats for each account
    const accountsWithStats = await Promise.all((data || []).map(async (account) => {
      const { data: accTrades } = await supabase
        .from('trades')
        .select('pnl, outcome')
        .eq('account_id', account.id)

      const tradeCount = accTrades?.length || 0
      const totalPnl = accTrades?.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0) || 0
      const wins = accTrades?.filter(t => t.outcome === 'win').length || 0
      const winrate = tradeCount > 0 ? Math.round((wins / tradeCount) * 100) : 0

      return { ...account, tradeCount, totalPnl, winrate }
    }))

    setAccounts(accountsWithStats)
  }

  const loadAccountTrades = async (account) => {
    const supabase = getSupabase()
    setSelectedAccount(account)

    const { data } = await supabase
      .from('trades')
      .select('*')
      .eq('account_id', account.id)
      .order('date', { ascending: false })

    setTrades(data || [])
  }

  const updateUserRole = async (userId, newStatus) => {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('profiles')
      .update({ subscription_status: newStatus })
      .eq('id', userId)

    if (!error) {
      await loadUsers()
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, subscription_status: newStatus })
      }
    }
  }

  // Admin is determined by subscription_status = 'admin', not is_admin field
  const isUserAdmin = (user) => user?.subscription_status === 'admin'

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status) => {
    if (status === 'admin') return '#f59e0b'
    if (status === 'subscribing') return '#22c55e'
    if (status === 'free subscription') return '#3b82f6'
    return '#ef4444'
  }

  const getStatusBadge = (status) => {
    if (status === 'admin') return 'ADMIN'
    if (status === 'subscribing') return 'PAID'
    if (status === 'free subscription') return 'FREE'
    return 'NONE'
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <img src="/logo.svg" alt="TradeSave+" style={{ height: '50px', width: 'auto', marginBottom: '16px' }} />
          <div style={{ color: '#999' }}>Loading...</div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#fff', padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #1a1a22', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, margin: 0, color: '#22c55e' }}>ADMIN PANEL</h1>
          <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0' }}>Manage users, accounts, and trades</p>
        </div>
        <button onClick={() => router.push('/dashboard')} style={{ padding: '8px 16px', background: '#1a1a22', border: '1px solid #333', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '13px' }}>
          Back to Dashboard
        </button>
      </div>

      {/* Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Users', value: stats.totalUsers, color: '#fff' },
          { label: 'Paid Subscribers', value: stats.subscribers, color: '#22c55e' },
          { label: 'Free Users', value: stats.freeUsers, color: '#3b82f6' },
          { label: 'Total Trades', value: stats.totalTrades.toLocaleString(), color: '#f59e0b' },
        ].map((stat, i) => (
          <div key={i} style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginTop: '4px' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '350px 300px 1fr', gap: '16px', height: 'calc(100vh - 220px)' }}>

        {/* Users List */}
        <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px', borderBottom: '1px solid #1a1a22' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e', marginBottom: '8px' }}>USERS ({filteredUsers.length})</div>
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px', outline: 'none' }}
            />
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {filteredUsers.map(user => (
              <div
                key={user.id}
                onClick={() => loadUserAccounts(user)}
                style={{
                  padding: '12px',
                  borderBottom: '1px solid #1a1a22',
                  cursor: 'pointer',
                  background: selectedUser?.id === user.id ? 'rgba(34,197,94,0.1)' : 'transparent',
                  borderLeft: selectedUser?.id === user.id ? '3px solid #22c55e' : '3px solid transparent'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{user.username || 'No username'}</div>
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{user.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', padding: '2px 6px', background: getStatusColor(user.subscription_status), color: user.subscription_status === 'admin' ? '#000' : '#fff', borderRadius: '4px', fontWeight: 600 }}>
                      {getStatusBadge(user.subscription_status)}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '10px', color: '#666' }}>
                  <span>{user.accountCount} accounts</span>
                  <span>{user.tradeCount} trades</span>
                  <span style={{ color: user.totalPnl >= 0 ? '#22c55e' : '#ef4444' }}>
                    {user.totalPnl >= 0 ? '+' : ''}${Math.round(user.totalPnl).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Accounts List */}
        <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px', borderBottom: '1px solid #1a1a22' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e' }}>
              {selectedUser ? `${selectedUser.username || selectedUser.email?.split('@')[0] || 'User'}'s ACCOUNTS` : 'SELECT A USER'}
            </div>
            {selectedUser && (
              <div style={{ marginTop: '8px' }}>
                <select
                  value={selectedUser.subscription_status}
                  onChange={e => updateUserRole(selectedUser.id, e.target.value)}
                  style={{ padding: '6px 10px', background: '#141418', border: '1px solid #333', borderRadius: '4px', color: '#fff', fontSize: '11px', cursor: 'pointer' }}
                >
                  <option value="not subscribing">Not Subscribing</option>
                  <option value="subscribing">Subscribing (Paid)</option>
                  <option value="free subscription">Free Subscription</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {!selectedUser ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
                Click a user to view their accounts
              </div>
            ) : accounts.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
                No accounts found
              </div>
            ) : (
              accounts.map(account => (
                <div
                  key={account.id}
                  onClick={() => loadAccountTrades(account)}
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #1a1a22',
                    cursor: 'pointer',
                    background: selectedAccount?.id === account.id ? 'rgba(34,197,94,0.1)' : 'transparent',
                    borderLeft: selectedAccount?.id === account.id ? '3px solid #22c55e' : '3px solid transparent'
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{account.name}</div>
                  <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
                    Starting: ${parseFloat(account.starting_balance).toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '10px' }}>
                    <span style={{ color: '#666' }}>{account.tradeCount} trades</span>
                    <span style={{ color: '#666' }}>{account.winrate}% WR</span>
                    <span style={{ color: account.totalPnl >= 0 ? '#22c55e' : '#ef4444' }}>
                      {account.totalPnl >= 0 ? '+' : ''}${Math.round(account.totalPnl).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Trades List */}
        <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px', borderBottom: '1px solid #1a1a22' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e' }}>
              {selectedAccount ? `${selectedAccount.name} TRADES (${trades.length})` : 'SELECT AN ACCOUNT'}
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {!selectedAccount ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
                Click an account to view trades
              </div>
            ) : trades.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
                No trades found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
                {trades.map(trade => {
                  const extraData = trade.extra_data ? (typeof trade.extra_data === 'string' ? JSON.parse(trade.extra_data) : trade.extra_data) : {}
                  return (
                    <div key={trade.id} style={{ background: '#141418', borderRadius: '8px', padding: '12px', border: '1px solid #1a1a22' }}>
                      {/* Trade Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: '#999', fontSize: '11px' }}>{trade.date}</span>
                          <span style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>{trade.symbol || '-'}</span>
                          <span style={{ fontSize: '9px', padding: '2px 6px', background: trade.direction === 'long' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: trade.direction === 'long' ? '#22c55e' : '#ef4444', borderRadius: '4px', fontWeight: 600 }}>{trade.direction?.toUpperCase() || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ color: parseFloat(trade.pnl) >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600, fontSize: '13px' }}>{parseFloat(trade.pnl) >= 0 ? '+' : ''}${parseFloat(trade.pnl || 0).toLocaleString()}</span>
                          <span style={{ fontSize: '9px', padding: '2px 6px', background: trade.outcome === 'win' ? '#22c55e' : trade.outcome === 'loss' ? '#ef4444' : '#666', color: '#fff', borderRadius: '4px', fontWeight: 600 }}>{trade.outcome?.toUpperCase() || '-'}</span>
                        </div>
                      </div>
                      {/* Trade Details Grid */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '10px' }}>
                        {trade.rr && <span style={{ padding: '3px 8px', background: '#0d0d12', borderRadius: '4px', color: '#888' }}>RR: <span style={{ color: '#fff' }}>{trade.rr}</span></span>}
                        {trade.risk_percent && <span style={{ padding: '3px 8px', background: '#0d0d12', borderRadius: '4px', color: '#888' }}>Risk: <span style={{ color: '#fff' }}>{trade.risk_percent}%</span></span>}
                        {trade.rating && <span style={{ padding: '3px 8px', background: '#0d0d12', borderRadius: '4px', color: '#888' }}>Rating: <span style={{ color: '#f59e0b' }}>{'★'.repeat(trade.rating)}</span></span>}
                        {trade.time && <span style={{ padding: '3px 8px', background: '#0d0d12', borderRadius: '4px', color: '#888' }}>Time: <span style={{ color: '#fff' }}>{trade.time}</span></span>}
                        {/* Extra Data Fields */}
                        {Object.entries(extraData).map(([key, value]) => value && (
                          <span key={key} style={{ padding: '3px 8px', background: '#0d0d12', borderRadius: '4px', color: '#888' }}>{key}: <span style={{ color: '#fff' }}>{String(value)}</span></span>
                        ))}
                      </div>
                      {/* Notes */}
                      {trade.notes && (
                        <div style={{ marginTop: '8px', padding: '8px', background: '#0d0d12', borderRadius: '4px', fontSize: '11px', color: '#999', borderLeft: '2px solid #333' }}>
                          {trade.notes}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Roles Reference */}
      <div style={{ marginTop: '24px', padding: '16px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e', marginBottom: '12px' }}>USER ROLES REFERENCE</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', fontSize: '12px' }}>
          <div style={{ padding: '12px', background: '#141418', borderRadius: '6px', border: '1px solid #ef4444' }}>
            <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: '6px' }}>NOT SUBSCRIBING</div>
            <div style={{ color: '#999', fontSize: '11px', lineHeight: 1.4 }}>
              Cannot access journal. Must subscribe to use.
              <br /><code style={{ color: '#ef4444', background: '#1a1a22', padding: '2px 4px', borderRadius: '3px', fontSize: '10px' }}>subscription_status = 'not subscribing'</code>
            </div>
          </div>
          <div style={{ padding: '12px', background: '#141418', borderRadius: '6px', border: '1px solid #22c55e' }}>
            <div style={{ color: '#22c55e', fontWeight: 700, marginBottom: '6px' }}>SUBSCRIBING (PAID)</div>
            <div style={{ color: '#999', fontSize: '11px', lineHeight: 1.4 }}>
              Paying customer. Full journal access.
              <br /><code style={{ color: '#22c55e', background: '#1a1a22', padding: '2px 4px', borderRadius: '3px', fontSize: '10px' }}>subscription_status = 'subscribing'</code>
            </div>
          </div>
          <div style={{ padding: '12px', background: '#141418', borderRadius: '6px', border: '1px solid #3b82f6' }}>
            <div style={{ color: '#3b82f6', fontWeight: 700, marginBottom: '6px' }}>FREE SUBSCRIPTION</div>
            <div style={{ color: '#999', fontSize: '11px', lineHeight: 1.4 }}>
              Giveaway/promo winner. Full journal access.
              <br /><code style={{ color: '#3b82f6', background: '#1a1a22', padding: '2px 4px', borderRadius: '3px', fontSize: '10px' }}>subscription_status = 'free subscription'</code>
            </div>
          </div>
        </div>
        <div style={{ marginTop: '12px', padding: '12px', background: '#141418', borderRadius: '6px', border: '1px solid #f59e0b' }}>
          <div style={{ color: '#f59e0b', fontWeight: 700, marginBottom: '6px' }}>ADMIN</div>
          <div style={{ color: '#999', fontSize: '11px', lineHeight: 1.4 }}>
            Full access + can view all users data. Bypasses subscription check.
            <br /><code style={{ color: '#f59e0b', background: '#1a1a22', padding: '2px 4px', borderRadius: '3px', fontSize: '10px' }}>subscription_status = 'admin'</code>
          </div>
        </div>
        <div style={{ marginTop: '16px', padding: '12px', background: '#1a1a22', borderRadius: '6px', fontSize: '11px', color: '#999' }}>
          <div style={{ fontWeight: 600, color: '#fff', marginBottom: '8px' }}>SQL Commands:</div>
          <code style={{ display: 'block', marginBottom: '4px', color: '#22c55e' }}>-- Give someone paid access:</code>
          <code style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>UPDATE profiles SET subscription_status = 'subscribing' WHERE email = 'user@email.com';</code>
          <code style={{ display: 'block', marginBottom: '4px', color: '#3b82f6' }}>-- Give someone free access:</code>
          <code style={{ display: 'block', marginBottom: '8px', color: '#ccc' }}>UPDATE profiles SET subscription_status = 'free subscription' WHERE email = 'user@email.com';</code>
          <code style={{ display: 'block', marginBottom: '4px', color: '#f59e0b' }}>-- Make someone admin:</code>
          <code style={{ display: 'block', color: '#ccc' }}>UPDATE profiles SET subscription_status = 'admin' WHERE email = 'user@email.com';</code>
        </div>
      </div>
    </div>
  )
}
