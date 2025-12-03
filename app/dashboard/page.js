'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { useRouter } from 'next/navigation'

function getDaysAgo(d) {
  if (!d) return 'N/A'
  const today = new Date()
  const date = new Date(d)
  if (isNaN(date.getTime())) return 'N/A'
  const diff = Math.floor((today - date) / (1000 * 60 * 60 * 24))
  return diff === 0 ? 'Today' : diff === 1 ? '1d ago' : `${diff}d ago`
}

function formatDate(d) {
  if (!d) return 'N/A'
  const date = new Date(d)
  return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function PencilIcon({ size = 12 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
}

function Chart({ data, isPositive, accountId }) {
  const [tooltip, setTooltip] = useState(null)
  if (!data || data.length < 2) return <div style={{ width: '100%', height: '100%', background: '#0a0a0f', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>No data yet</div>
  
  const values = data.map(d => d.value)
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const width = 700, height = 280, pL = 45, pT = 10, pR = 15, cW = width - pL - pR, cH = height - pT - 35
  const points = data.map((d, i) => ({ x: pL + (i / (data.length - 1)) * cW, y: pT + (1 - (d.value - min) / range) * cH, value: d.value, date: d.date }))
  let pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const fillD = pathD + ` L ${points[points.length - 1].x} ${pT + cH} L ${pL} ${pT + cH} Z`
  const color = isPositive ? '#22c55e' : '#ef4444'

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={`cg${accountId}${isPositive}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map(i => <line key={i} x1={pL} y1={pT + (i / 4) * cH} x2={width - pR} y2={pT + (i / 4) * cH} stroke="#1a1a22" strokeWidth="1" />)}
        <path d={fillD} fill={`url(#cg${accountId}${isPositive})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function AccountCard({ account, trades, onEditName, supabase }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(account.name)

  const handleSave = async () => {
    if (editName !== account.name) {
      await supabase.from('accounts').update({ name: editName }).eq('id', account.id)
      onEditName(account.id, editName)
    }
    setIsEditing(false)
  }

  const wins = trades.filter(t => t.outcome === 'win').length
  const losses = trades.filter(t => t.outcome === 'loss').length
  const totalPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0)
  const winrate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0
  const avgRR = trades.length > 0 ? (trades.reduce((s, t) => s + (t.rr || 0), 0) / trades.length).toFixed(1) : '0'
  const pnlHistory = trades.length > 0 
    ? trades.slice().reverse().reduce((acc, t) => {
        const prev = acc[acc.length - 1]?.value || 0
        acc.push({ value: prev + (t.pnl || 0), date: formatDate(t.date) })
        return acc
      }, [{ value: 0, date: 'Start' }]) 
    : [{ value: 0, date: 'Start' }]

  return (
    <div style={{ background: '#14141a', border: '1px solid #222230', borderRadius: '14px', marginBottom: '24px', overflow: 'hidden' }}>
      <div style={{ padding: '14px 24px', borderBottom: '1px solid #222230', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ background: '#0a0a0f', border: '1px solid #2a2a35', borderRadius: '8px', padding: '10px 18px', display: 'flex', alignItems: 'center' }}>
            {isEditing ? (
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} onBlur={handleSave} onKeyDown={e => e.key === 'Enter' && handleSave()} autoFocus style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '17px', fontWeight: 700, width: '150px', outline: 'none' }} />
            ) : (
              <span style={{ fontWeight: 700, fontSize: '17px', color: '#fff' }}>{account.name}</span>
            )}
          </div>
          <button onClick={() => setIsEditing(true)} style={{ background: 'transparent', border: 'none', padding: '6px', cursor: 'pointer', color: '#777' }}><PencilIcon size={14} /></button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ background: '#0a0a0f', border: '1px solid #2a2a35', borderRadius: '8px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: '#aaa', fontSize: '14px' }}>Balance:</span>
            <span style={{ fontWeight: 700, fontSize: '19px', color: '#fff' }}>${((account.starting_balance || 0) + totalPnl).toLocaleString()}</span>
          </div>
          <a href={`/account/${account.id}`} style={{ padding: '10px 20px', background: '#22c55e', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>Open Journal</a>
        </div>
      </div>
      <div style={{ padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: '20px' }}>
          <div style={{ background: '#0a0a0f', borderRadius: '10px', padding: '14px', height: '280px' }}>
            <Chart data={pnlHistory} isPositive={totalPnl >= 0} accountId={account.id} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { label: 'Total PnL', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl}`, color: totalPnl >= 0 ? '#22c55e' : '#ef4444' },
              { label: 'Winrate', value: `${winrate}%` },
              { label: 'Avg RR', value: `${avgRR}R` },
              { label: 'Trades', value: trades.length },
            ].map((s, i) => (
              <div key={i} style={{ background: '#0a0a0f', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1 }}>
                <span style={{ fontSize: '13px', color: '#aaa' }}>{s.label}</span>
                <span style={{ fontSize: '16px', fontWeight: 600, color: s.color || '#fff' }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, profile, loading, signOut, hasAccess, supabase } = useAuth()
  const router = useRouter()
  const [accounts, setAccounts] = useState([])
  const [trades, setTrades] = useState({})
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [dataLoaded, setDataLoaded] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  // Handle redirects
  useEffect(() => {
    if (loading) return // Wait for auth to complete
    
    if (!user) {
      setRedirecting(true)
      router.push('/login')
      return
    }
    
    if (!hasAccess) {
      setRedirecting(true)
      router.push('/pricing?signup=true')
      return
    }
  }, [user, loading, hasAccess, router])

  // Load data when user is ready
  useEffect(() => {
    if (!user || !supabase || loading || redirecting) return
    
    const loadData = async () => {
      try {
        // Load accounts
        const { data: accountsData, error: accError } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })

        if (accError) {
          console.error('Accounts error:', accError)
          setDataLoaded(true)
          return
        }

        setAccounts(accountsData || [])

        // Load trades for each account
        if (accountsData?.length) {
          const tradesMap = {}
          for (const acc of accountsData) {
            const { data: tradesData } = await supabase
              .from('trades')
              .select('*')
              .eq('account_id', acc.id)
              .order('date', { ascending: false })
            tradesMap[acc.id] = tradesData || []
          }
          setTrades(tradesMap)
        }
        
        setDataLoaded(true)
      } catch (err) {
        console.error('Load data error:', err)
        setDataLoaded(true)
      }
    }

    loadData()
  }, [user, supabase, loading, redirecting])

  const handleEditName = (accountId, newName) => {
    setAccounts(accounts.map(a => a.id === accountId ? { ...a, name: newName } : a))
  }

  const addAccount = async () => {
    if (!name || !balance || !user) return

    const { data, error } = await supabase.from('accounts').insert({
      user_id: user.id,
      name,
      starting_balance: parseFloat(balance) || 0,
    }).select().single()

    if (error) {
      console.error('Add account error:', error)
      return
    }

    if (data) {
      setAccounts([...accounts, data])
      setTrades({ ...trades, [data.id]: [] })
    }
    setName('')
    setBalance('')
    setShowModal(false)
  }

  // Show loading while checking auth or redirecting
  if (loading || redirecting || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f', color: '#777' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 48px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a href="/" style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '1px', textDecoration: 'none' }}>
              <span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE+</span>
            </a>
            <span style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, color: '#fff' }}>PRO</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#aaa', fontSize: '14px' }}>{user?.email}</span>
            <button onClick={signOut} style={{ padding: '8px 16px', background: '#1a1a24', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontSize: '13px', cursor: 'pointer' }}>Sign Out</button>
          </div>
        </div>

        {/* Dashboard Title */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '32px', position: 'relative' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '3px', color: '#fff' }}>DASHBOARD</h1>
          <button onClick={() => setShowModal(true)} style={{ position: 'absolute', right: 0, padding: '12px 22px', background: '#1a1a24', border: '1px solid #2a2a36', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>+ Add Journal</button>
        </div>

        {/* Accounts */}
        {!dataLoaded ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#777' }}>Loading your journals...</div>
        ) : accounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', background: '#14141a', border: '1px solid #222230', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '12px', color: '#fff' }}>Welcome to LSDTRADE+!</h2>
            <p style={{ color: '#888', marginBottom: '24px' }}>Create your first trading journal to get started</p>
            <button onClick={() => setShowModal(true)} style={{ padding: '14px 28px', background: '#22c55e', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '15px', cursor: 'pointer' }}>+ Create Journal</button>
          </div>
        ) : (
          accounts.map(a => <AccountCard key={a.id} account={a} trades={trades[a.id] || []} onEditName={handleEditName} supabase={supabase} />)
        )}

        {/* Add Account Modal */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: '#14141a', border: '1px solid #222230', borderRadius: '14px', padding: '24px', width: '400px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px', color: '#fff' }}>Add Journal</h2>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '8px', textTransform: 'uppercase' }}>Journal Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. FTMO 10k" style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #222230', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#aaa', marginBottom: '8px', textTransform: 'uppercase' }}>Starting Balance ($)</label>
                <input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="e.g. 10000" style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #222230', borderRadius: '10px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={addAccount} style={{ flex: 1, padding: '14px', background: '#22c55e', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Create</button>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '14px', background: '#1a1a24', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
