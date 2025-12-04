'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [trades, setTrades] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      window.location.href = '/login'
      return
    }

    const isAdmin = user.email === 'ssiagos@hotmail.com'
    
    if (!isAdmin) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single()

      if (!profile || profile.subscription_status !== 'active') {
        window.location.href = '/pricing'
        return
      }
    }

    setUser(user)

    const { data: accountsData } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    setAccounts(accountsData || [])

    if (accountsData?.length) {
      const tradesMap = {}
      for (const acc of accountsData) {
        const { data: tradesData } = await supabase
          .from('trades')
          .select('*')
          .eq('account_id', acc.id)
          .order('date', { ascending: true })
        tradesMap[acc.id] = tradesData || []
      }
      setTrades(tradesMap)
    }

    setLoading(false)
  }

  async function handleSignOut() {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  async function createJournal() {
    if (!name.trim() || !balance) return
    setCreating(true)
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data, error } = await supabase
      .from('accounts')
      .insert({ user_id: user.id, name: name.trim(), starting_balance: parseFloat(balance) || 0 })
      .select()
      .single()

    if (error) {
      alert('Error: ' + error.message)
      setCreating(false)
      return
    }

    setAccounts([...accounts, data])
    setTrades({ ...trades, [data.id]: [] })
    setName('')
    setBalance('')
    setShowModal(false)
    setCreating(false)
  }

  // Interactive Equity Curve Component
  function EquityCurve({ accountTrades, startingBalance }) {
    const [tooltip, setTooltip] = useState(null)
    const svgRef = useRef(null)

    if (!accountTrades || accountTrades.length === 0) {
      return (
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: '13px' }}>
          No trades yet - start logging to see your equity curve
        </div>
      )
    }

    // Calculate cumulative balance
    let cumulative = parseFloat(startingBalance) || 0
    const points = [{ balance: cumulative, date: 'Start', pnl: 0 }]
    
    accountTrades.forEach(t => {
      cumulative += parseFloat(t.pnl) || 0
      points.push({ 
        balance: cumulative, 
        date: t.date,
        pnl: parseFloat(t.pnl) || 0,
        symbol: t.symbol
      })
    })

    const maxBalance = Math.max(...points.map(p => p.balance))
    const minBalance = Math.min(...points.map(p => p.balance))
    const range = maxBalance - minBalance || 1

    const width = 500
    const height = 180
    const paddingLeft = 60
    const paddingRight = 20
    const paddingTop = 20
    const paddingBottom = 40

    const chartWidth = width - paddingLeft - paddingRight
    const chartHeight = height - paddingTop - paddingBottom

    // Generate points
    const chartPoints = points.map((p, i) => {
      const x = paddingLeft + (i / (points.length - 1)) * chartWidth
      const y = paddingTop + chartHeight - ((p.balance - minBalance) / range) * chartHeight
      return { x, y, ...p }
    })

    const pathD = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaD = pathD + ` L ${chartPoints[chartPoints.length-1].x} ${paddingTop + chartHeight} L ${paddingLeft} ${paddingTop + chartHeight} Z`

    // Y-axis labels (PnL)
    const yLabels = [minBalance, minBalance + range * 0.5, maxBalance].map(v => ({
      value: v,
      y: paddingTop + chartHeight - ((v - minBalance) / range) * chartHeight
    }))

    // X-axis labels (dates) - show 4-5 evenly spaced
    const xLabelCount = Math.min(5, points.length)
    const xLabels = []
    for (let i = 0; i < xLabelCount; i++) {
      const idx = Math.floor(i * (points.length - 1) / (xLabelCount - 1))
      const p = chartPoints[idx]
      if (p) {
        xLabels.push({
          label: p.date === 'Start' ? 'Start' : new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          x: p.x
        })
      }
    }

    function handleMouseMove(e) {
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const scaleX = width / rect.width
      const scaledMouseX = mouseX * scaleX
      
      // Find closest point
      let closest = chartPoints[0]
      let minDist = Math.abs(scaledMouseX - chartPoints[0].x)
      
      chartPoints.forEach(p => {
        const dist = Math.abs(scaledMouseX - p.x)
        if (dist < minDist) {
          minDist = dist
          closest = p
        }
      })

      if (minDist < 30) {
        setTooltip(closest)
      } else {
        setTooltip(null)
      }
    }

    return (
      <div style={{ position: 'relative' }}>
        <svg 
          ref={svgRef}
          width="100%" 
          viewBox={`0 0 ${width} ${height}`} 
          style={{ display: 'block' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {yLabels.map((l, i) => (
            <line key={i} x1={paddingLeft} y1={l.y} x2={width - paddingRight} y2={l.y} stroke="#1a1a22" strokeWidth="1" />
          ))}

          {/* Area fill */}
          <path d={areaD} fill="url(#areaGradient)" />

          {/* Line */}
          <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Y-axis labels */}
          {yLabels.map((l, i) => (
            <text key={i} x={paddingLeft - 8} y={l.y + 4} fill="#555" fontSize="10" textAnchor="end">
              ${l.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </text>
          ))}

          {/* X-axis labels */}
          {xLabels.map((l, i) => (
            <text key={i} x={l.x} y={height - 10} fill="#555" fontSize="10" textAnchor="middle">
              {l.label}
            </text>
          ))}

          {/* Tooltip hover point */}
          {tooltip && (
            <>
              <line x1={tooltip.x} y1={paddingTop} x2={tooltip.x} y2={paddingTop + chartHeight} stroke="#22c55e" strokeWidth="1" strokeDasharray="3,3" opacity="0.5" />
              <circle cx={tooltip.x} cy={tooltip.y} r="6" fill="#22c55e" />
              <circle cx={tooltip.x} cy={tooltip.y} r="3" fill="#0a0a0f" />
            </>
          )}
        </svg>

        {/* Tooltip box */}
        {tooltip && (
          <div style={{
            position: 'absolute',
            left: `${(tooltip.x / width) * 100}%`,
            top: '10px',
            transform: 'translateX(-50%)',
            background: '#1a1a22',
            border: '1px solid #2a2a35',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            zIndex: 10
          }}>
            <div style={{ color: '#888', marginBottom: '2px' }}>
              {tooltip.date === 'Start' ? 'Starting Balance' : new Date(tooltip.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
            <div style={{ fontWeight: 600, fontSize: '13px' }}>
              ${tooltip.balance.toLocaleString()}
            </div>
            {tooltip.symbol && (
              <div style={{ color: tooltip.pnl >= 0 ? '#22c55e' : '#ef4444', marginTop: '2px' }}>
                {tooltip.symbol}: {tooltip.pnl >= 0 ? '+' : ''}${tooltip.pnl.toFixed(0)}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Get extra data helper
  function getExtraData(trade) {
    try {
      return JSON.parse(trade.extra_data || '{}')
    } catch {
      return {}
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>
            <span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE+</span>
          </div>
          <div style={{ color: '#666' }}>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
              <path d="M3 3v18h18" /><path d="M18 9l-5 5-4-4-3 3" />
            </svg>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#888', letterSpacing: '2px' }}>DASHBOARD</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setShowModal(true)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontSize: '13px', cursor: 'pointer' }}>
              + Add Account
            </button>
            <button onClick={handleSignOut} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: '#555', fontSize: '13px', cursor: 'pointer' }}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Content */}
        {accounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 40px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '12px' }}>Welcome to LSDTRADE+</h2>
            <p style={{ color: '#666', marginBottom: '32px' }}>Create your first trading journal to get started</p>
            <button onClick={() => setShowModal(true)} style={{ padding: '14px 28px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>
              + Create Your First Journal
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {accounts.map(account => {
              const accTrades = trades[account.id] || []
              const wins = accTrades.filter(t => t.outcome === 'win').length
              const losses = accTrades.filter(t => t.outcome === 'loss').length
              const totalPnl = accTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
              const winrate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0
              const avgRR = accTrades.length > 0 ? (accTrades.reduce((sum, t) => sum + (parseFloat(t.rr) || 0), 0) / accTrades.length).toFixed(1) : '0'
              const currentBalance = (parseFloat(account.starting_balance) || 0) + totalPnl
              
              const grossProfit = accTrades.filter(t => parseFloat(t.pnl) > 0).reduce((sum, t) => sum + parseFloat(t.pnl), 0)
              const grossLoss = Math.abs(accTrades.filter(t => parseFloat(t.pnl) < 0).reduce((sum, t) => sum + parseFloat(t.pnl), 0))
              const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '0'

              // Consistency: % of winning days
              const tradeDays = {}
              accTrades.forEach(t => {
                const d = t.date
                if (!tradeDays[d]) tradeDays[d] = 0
                tradeDays[d] += parseFloat(t.pnl) || 0
              })
              const winningDays = Object.values(tradeDays).filter(v => v > 0).length
              const totalDays = Object.keys(tradeDays).length
              const consistency = totalDays > 0 ? Math.round((winningDays / totalDays) * 100) : 0

              // Recent trades (last 5, newest first)
              const recentTrades = [...accTrades].reverse().slice(0, 5)

              return (
                <div key={account.id} style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', overflow: 'hidden' }}>
                  {/* Top Section: Chart + Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px' }}>
                    {/* Left: Account Name + Chart */}
                    <div style={{ borderRight: '1px solid #1a1a22' }}>
                      {/* Account Header */}
                      <div style={{ padding: '16px 24px', borderBottom: '1px solid #1a1a22', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: 600, fontSize: '15px' }}>{account.name}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2" style={{ cursor: 'pointer' }}>
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </div>
                      {/* Chart */}
                      <div style={{ padding: '16px 20px' }}>
                        <EquityCurve accountTrades={accTrades} startingBalance={account.starting_balance} />
                      </div>
                    </div>

                    {/* Right: Stats */}
                    <div style={{ padding: '16px 20px' }}>
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Account Balance</div>
                        <div style={{ fontSize: '24px', fontWeight: 700 }}>${currentBalance.toLocaleString()}</div>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#555' }}>Total PnL</span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: totalPnl >= 0 ? '#22c55e' : '#ef4444' }}>{totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#555' }}>Winrate</span>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{winrate}%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#555' }}>Avg RR</span>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{avgRR}R</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#555' }}>Profit Factor</span>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{profitFactor}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#555' }}>Total Trades</span>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{accTrades.length}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#555' }}>Consistency</span>
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{consistency}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Trades Section */}
                  <div style={{ borderTop: '1px solid #1a1a22' }}>
                    <div style={{ padding: '10px 24px', borderBottom: '1px solid #1a1a22' }}>
                      <span style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>Recent Trades</span>
                    </div>
                    
                    {recentTrades.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: '#444', fontSize: '13px' }}>
                        No trades yet
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <div style={{ display: 'flex', gap: '0', minWidth: 'max-content' }}>
                          {recentTrades.map((trade, idx) => {
                            const extra = getExtraData(trade)
                            return (
                              <div key={trade.id} style={{ 
                                flex: '0 0 auto',
                                width: '180px',
                                padding: '12px 16px',
                                borderRight: idx < recentTrades.length - 1 ? '1px solid #1a1a22' : 'none',
                                background: idx === 0 ? 'rgba(34,197,94,0.03)' : 'transparent'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                  <span style={{ fontWeight: 600, fontSize: '13px' }}>{trade.symbol}</span>
                                  <span style={{ 
                                    padding: '2px 8px', 
                                    borderRadius: '4px', 
                                    fontSize: '10px', 
                                    fontWeight: 600,
                                    background: trade.outcome === 'win' ? 'rgba(34,197,94,0.15)' : trade.outcome === 'loss' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)',
                                    color: trade.outcome === 'win' ? '#22c55e' : trade.outcome === 'loss' ? '#ef4444' : '#888'
                                  }}>
                                    {trade.outcome?.toUpperCase()}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '11px', color: '#555' }}>PnL</span>
                                  <span style={{ fontSize: '12px', fontWeight: 600, color: parseFloat(trade.pnl) >= 0 ? '#22c55e' : '#ef4444' }}>
                                    {parseFloat(trade.pnl) >= 0 ? '+' : ''}${parseFloat(trade.pnl || 0).toFixed(0)}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '11px', color: '#555' }}>RR</span>
                                  <span style={{ fontSize: '12px', color: '#888' }}>{trade.rr || '-'}</span>
                                </div>
                                {extra.rating && (
                                  <div style={{ display: 'flex', gap: '2px', marginBottom: '6px' }}>
                                    {[1,2,3,4,5].map(i => (
                                      <span key={i} style={{ color: i <= parseInt(extra.rating) ? '#22c55e' : '#333', fontSize: '8px' }}>●</span>
                                    ))}
                                  </div>
                                )}
                                <div style={{ fontSize: '10px', color: '#444', marginTop: '4px' }}>
                                  {new Date(trade.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        {/* Scroll indicator */}
                        {recentTrades.length >= 5 && (
                          <div style={{ padding: '8px 24px', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ width: '60px', height: '4px', background: '#1a1a22', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
                              <div style={{ width: '30px', height: '4px', background: '#22c55e', borderRadius: '2px' }} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ padding: '16px 24px', borderTop: '1px solid #1a1a22', display: 'flex', gap: '12px' }}>
                    <a href={`/account/${account.id}`} style={{ 
                      flex: 3,
                      padding: '14px', 
                      background: '#22c55e', 
                      borderRadius: '8px', 
                      color: '#fff', 
                      fontWeight: 600, 
                      fontSize: '13px', 
                      textAlign: 'center',
                      textDecoration: 'none'
                    }}>
                      ENTER JOURNAL
                    </a>
                    <a href={`/account/${account.id}?tab=statistics`} style={{ 
                      flex: 1,
                      padding: '14px', 
                      background: 'transparent', 
                      border: '1px solid #22c55e',
                      borderRadius: '8px', 
                      color: '#22c55e', 
                      fontWeight: 600, 
                      fontSize: '13px', 
                      textAlign: 'center',
                      textDecoration: 'none'
                    }}>
                      STATISTICS
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Create Modal */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowModal(false)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '28px', width: '380px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '24px' }}>Create New Journal</h2>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Journal Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. FTMO 10k" autoFocus style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Starting Balance ($)</label>
                <input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="e.g. 10000" style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={createJournal} disabled={creating || !name.trim() || !balance} style={{ flex: 1, padding: '12px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: (creating || !name.trim() || !balance) ? 0.5 : 1 }}>
                  {creating ? 'Creating...' : 'Create'}
                </button>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '8px', color: '#888', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
