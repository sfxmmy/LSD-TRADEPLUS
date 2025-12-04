'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

export default function DashboardPage() {
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [trades, setTrades] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [editName, setEditName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const isAdmin = user.email === 'ssiagos@hotmail.com'
    if (!isAdmin) {
      const { data: profile } = await supabase.from('profiles').select('subscription_status').eq('id', user.id).single()
      if (!profile || profile.subscription_status !== 'active') { window.location.href = '/pricing'; return }
    }
    setUser(user)
    const { data: accountsData } = await supabase.from('accounts').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
    setAccounts(accountsData || [])
    if (accountsData?.length) {
      const tradesMap = {}
      for (const acc of accountsData) {
        const { data: tradesData } = await supabase.from('trades').select('*').eq('account_id', acc.id).order('date', { ascending: true })
        tradesMap[acc.id] = tradesData || []
      }
      setTrades(tradesMap)
    }
    setLoading(false)
  }

  async function handleSignOut() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  async function createJournal() {
    if (!name.trim() || !balance) return
    setCreating(true)
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data, error } = await supabase.from('accounts').insert({ user_id: user.id, name: name.trim(), starting_balance: parseFloat(balance) || 0 }).select().single()
    if (error) { alert('Error: ' + error.message); setCreating(false); return }
    setAccounts([...accounts, data])
    setTrades({ ...trades, [data.id]: [] })
    setName(''); setBalance(''); setShowModal(false); setCreating(false)
  }

  async function renameAccount(accountId) {
    if (!editName.trim()) return
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    await supabase.from('accounts').update({ name: editName.trim() }).eq('id', accountId)
    setAccounts(accounts.map(a => a.id === accountId ? { ...a, name: editName.trim() } : a))
    setShowEditModal(null); setEditName('')
  }

  async function deleteAccount(accountId) {
    if (deleteConfirm.toLowerCase() !== 'delete') return
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    await supabase.from('accounts').delete().eq('id', accountId)
    setAccounts(accounts.filter(a => a.id !== accountId))
    const newTrades = { ...trades }; delete newTrades[accountId]; setTrades(newTrades)
    setShowDeleteModal(null); setDeleteConfirm('')
  }

  function EquityCurve({ accountTrades, startingBalance }) {
    const [tooltip, setTooltip] = useState(null)
    const svgRef = useRef(null)

    if (!accountTrades || accountTrades.length === 0) {
      return <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: '11px' }}>No trades yet</div>
    }

    const start = parseFloat(startingBalance) || 10000
    let cumulative = start
    const points = [{ balance: cumulative, date: 'Start', pnl: 0 }]
    accountTrades.forEach(t => {
      cumulative += parseFloat(t.pnl) || 0
      points.push({ balance: cumulative, date: t.date, pnl: parseFloat(t.pnl) || 0, symbol: t.symbol })
    })

    // Calculate nice Y-axis bounds (round to nearest 500)
    const maxBal = Math.max(...points.map(p => p.balance))
    const minBal = Math.min(...points.map(p => p.balance))
    const yMax = Math.ceil(maxBal / 500) * 500
    const yMin = Math.floor(minBal / 500) * 500
    const yRange = yMax - yMin || 500

    // Y-axis labels in $500 increments
    const yLabels = []
    for (let v = yMin; v <= yMax; v += 500) {
      yLabels.push(v)
    }

    const width = 480
    const height = 180
    const paddingLeft = 50
    const paddingRight = 10
    const paddingTop = 10
    const paddingBottom = 25
    const chartWidth = width - paddingLeft - paddingRight
    const chartHeight = height - paddingTop - paddingBottom

    const chartPoints = points.map((p, i) => ({
      x: paddingLeft + (i / (points.length - 1)) * chartWidth,
      y: paddingTop + chartHeight - ((p.balance - yMin) / yRange) * chartHeight,
      ...p
    }))

    const pathD = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaD = pathD + ` L ${chartPoints[chartPoints.length-1].x} ${paddingTop + chartHeight} L ${paddingLeft} ${paddingTop + chartHeight} Z`

    // X-axis: evenly spaced dates
    const xLabelCount = 4
    const xLabels = []
    for (let i = 0; i < xLabelCount; i++) {
      const idx = Math.floor(i * (points.length - 1) / (xLabelCount - 1))
      const p = chartPoints[idx]
      if (p) {
        xLabels.push({
          label: p.date === 'Start' ? 'Start' : new Date(p.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          x: paddingLeft + (i / (xLabelCount - 1)) * chartWidth
        })
      }
    }

    function handleMouseMove(e) {
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const mouseX = (e.clientX - rect.left) * (width / rect.width)
      let closest = chartPoints[0], minDist = Math.abs(mouseX - chartPoints[0].x)
      chartPoints.forEach(p => { const d = Math.abs(mouseX - p.x); if (d < minDist) { minDist = d; closest = p } })
      setTooltip(minDist < 25 ? closest : null)
    }

    return (
      <div style={{ position: 'relative', background: '#0a0a0e', borderRadius: '6px', border: '1px solid #1a1a22', padding: '6px' }}>
        <svg ref={svgRef} width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }} onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
          <defs>
            <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Y-axis line */}
          <line x1={paddingLeft} y1={paddingTop} x2={paddingLeft} y2={paddingTop + chartHeight} stroke="#1a1a22" strokeWidth="1" />
          {/* Grid lines */}
          {yLabels.map((v, i) => {
            const y = paddingTop + chartHeight - ((v - yMin) / yRange) * chartHeight
            return <line key={i} x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#1a1a22" strokeWidth="1" />
          })}
          <path d={areaD} fill="url(#areaGrad)" />
          <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Y labels */}
          {yLabels.map((v, i) => {
            const y = paddingTop + chartHeight - ((v - yMin) / yRange) * chartHeight
            return <text key={i} x={paddingLeft - 5} y={y + 3} fill="#444" fontSize="8" textAnchor="end">${(v/1000).toFixed(1)}k</text>
          })}
          {/* X labels */}
          {xLabels.map((l, i) => <text key={i} x={l.x} y={height - 6} fill="#444" fontSize="8" textAnchor="middle">{l.label}</text>)}
          {tooltip && (
            <>
              <line x1={tooltip.x} y1={paddingTop} x2={tooltip.x} y2={paddingTop + chartHeight} stroke="#22c55e" strokeWidth="1" strokeDasharray="2,2" opacity="0.4" />
              <circle cx={tooltip.x} cy={tooltip.y} r="4" fill="#22c55e" />
              <circle cx={tooltip.x} cy={tooltip.y} r="2" fill="#0a0a0f" />
            </>
          )}
        </svg>
        {tooltip && (
          <div style={{ position: 'absolute', left: `${(tooltip.x / width) * 100}%`, top: '6px', transform: 'translateX(-50%)', background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '4px', padding: '5px 8px', fontSize: '9px', whiteSpace: 'nowrap', zIndex: 10 }}>
            <div style={{ color: '#666' }}>{tooltip.date === 'Start' ? 'Start' : new Date(tooltip.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
            <div style={{ fontWeight: 600, fontSize: '11px' }}>${tooltip.balance.toLocaleString()}</div>
            {tooltip.symbol && <div style={{ color: tooltip.pnl >= 0 ? '#22c55e' : '#ef4444' }}>{tooltip.symbol}: {tooltip.pnl >= 0 ? '+' : ''}${tooltip.pnl.toFixed(0)}</div>}
          </div>
        )}
      </div>
    )
  }

  function getExtraData(trade) { try { return JSON.parse(trade.extra_data || '{}') } catch { return {} } }
  function getDaysAgo(dateStr) { const d = Math.floor((new Date() - new Date(dateStr)) / 86400000); return d === 0 ? 'Today' : d === 1 ? '1d ago' : `${d}d ago` }

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', marginBottom: '16px' }}><span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE+</span></div><div style={{ color: '#666' }}>Loading...</div></div></div>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '24px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '1px' }}>DASHBOARD</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setShowModal(true)} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#888', fontSize: '12px', cursor: 'pointer' }}>+ Add Account</button>
            <button onClick={handleSignOut} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: '#444', fontSize: '12px', cursor: 'pointer' }}>Sign Out</button>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 40px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '10px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Welcome to LSDTRADE+</h2>
            <p style={{ color: '#666', marginBottom: '28px', fontSize: '13px' }}>Create your first trading journal to get started</p>
            <button onClick={() => setShowModal(true)} style={{ padding: '12px 24px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>+ Create Your First Journal</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
              const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(1) : grossProfit > 0 ? '∞' : '0'
              const tradeDays = {}
              accTrades.forEach(t => { if (!tradeDays[t.date]) tradeDays[t.date] = 0; tradeDays[t.date] += parseFloat(t.pnl) || 0 })
              const consistency = Object.keys(tradeDays).length > 0 ? Math.round((Object.values(tradeDays).filter(v => v > 0).length / Object.keys(tradeDays).length) * 100) : 0
              const avgWin = wins > 0 ? Math.round(grossProfit / wins) : 0
              const avgLoss = losses > 0 ? Math.round(grossLoss / losses) : 0
              const recentTrades = [...accTrades].reverse().slice(0, 3)

              return (
                <div key={account.id} style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '10px', overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #1a1a22' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ background: '#1a1a22', padding: '10px 18px', borderRadius: '6px', fontWeight: 600, fontSize: '16px' }}>{account.name}</span>
                      <button onClick={() => { setEditName(account.name); setShowEditModal(account.id) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                    </div>
                    <div style={{ background: '#1a1a22', padding: '12px 18px', borderRadius: '6px', border: '1px solid #2a2a35', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '11px', color: '#555' }}>Account Balance:</span>
                      <span style={{ fontSize: '18px', fontWeight: 700 }}>${currentBalance.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Chart + Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px' }}>
                    <div style={{ padding: '14px 18px', borderRight: '1px solid #1a1a22' }}>
                      <EquityCurve accountTrades={accTrades} startingBalance={account.starting_balance} />
                    </div>
                    <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {[
                        { label: 'Total PnL', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString()}`, color: totalPnl >= 0 ? '#22c55e' : '#ef4444' },
                        { label: 'Winrate', value: `${winrate}%`, color: '#fff' },
                        { label: 'Avg RR', value: `${avgRR}R`, color: '#fff' },
                        { label: 'Profit Factor', value: profitFactor, color: '#fff' },
                        { label: 'Trade Amount', value: accTrades.length, color: '#fff' },
                        { label: 'Consistency', value: `${consistency}%`, color: '#fff' },
                        { label: 'Avg Win', value: `+$${avgWin}`, color: '#22c55e' },
                        { label: 'Avg Loss', value: `-$${avgLoss}`, color: '#ef4444' },
                      ].map((stat, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: '#0a0a0e', borderRadius: '5px', border: '1px solid #1a1a22' }}>
                          <span style={{ fontSize: '10px', color: '#555' }}>{stat.label}</span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: stat.color }}>{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Trades */}
                  <div style={{ borderTop: '1px solid #1a1a22' }}>
                    <div style={{ padding: '8px 18px', borderBottom: '1px solid #1a1a22', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>Recent Trades</span>
                    </div>
                    {recentTrades.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#333', fontSize: '11px' }}>No trades yet</div>
                    ) : (
                      <div style={{ maxHeight: '130px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#0a0a0e' }}>
                              {['Symbol', 'W/L', 'PnL', '%', 'Rating', 'Image', 'Placed', 'Date'].map((h, i) => (
                                <th key={i} style={{ padding: '6px 12px', textAlign: i === 2 ? 'right' : i === 7 ? 'right' : 'center', color: '#444', fontSize: '8px', fontWeight: 600, textTransform: 'uppercase', width: i === 0 ? '15%' : '10.6%' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {recentTrades.map((trade, idx) => {
                              const extra = getExtraData(trade)
                              return (
                                <tr key={trade.id} style={{ borderBottom: idx < recentTrades.length - 1 ? '1px solid #141418' : 'none' }}>
                                  <td style={{ padding: '8px 12px', fontWeight: 600, fontSize: '11px', textAlign: 'center' }}>{trade.symbol}</td>
                                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                    <span style={{ padding: '2px 8px', borderRadius: '3px', fontSize: '9px', fontWeight: 600, background: trade.outcome === 'win' ? 'rgba(34,197,94,0.15)' : trade.outcome === 'loss' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)', color: trade.outcome === 'win' ? '#22c55e' : trade.outcome === 'loss' ? '#ef4444' : '#888' }}>
                                      {trade.outcome === 'win' ? 'WIN' : trade.outcome === 'loss' ? 'LOSS' : 'BE'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, fontSize: '11px', color: parseFloat(trade.pnl) >= 0 ? '#22c55e' : '#ef4444' }}>{parseFloat(trade.pnl) >= 0 ? '+' : ''}${parseFloat(trade.pnl || 0).toFixed(0)}</td>
                                  <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: '10px', color: '#555' }}>{extra.riskPercent || '1'}%</td>
                                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1px' }}>{[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= parseInt(extra.rating || 0) ? '#22c55e' : '#2a2a35', fontSize: '8px' }}>★</span>)}</div>
                                  </td>
                                  <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                                    <div style={{ width: '18px', height: '18px', background: trade.image_url ? '#1a1a22' : '#141418', borderRadius: '3px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={trade.image_url ? '#22c55e' : '#333'} strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                    </div>
                                  </td>
                                  <td style={{ padding: '8px 12px', textAlign: 'center', fontSize: '9px', color: '#444' }}>{getDaysAgo(trade.date)}</td>
                                  <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: '9px', color: '#444' }}>{new Date(trade.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div style={{ padding: '12px 18px', borderTop: '1px solid #1a1a22', display: 'flex', gap: '10px' }}>
                    <a href={`/account/${account.id}`} style={{ flex: 2, padding: '12px', background: '#22c55e', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '12px', textAlign: 'center', textDecoration: 'none' }}>ENTER JOURNAL</a>
                    <a href={`/account/${account.id}?tab=statistics`} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #22c55e', borderRadius: '6px', color: '#22c55e', fontWeight: 600, fontSize: '12px', textAlign: 'center', textDecoration: 'none' }}>SEE STATISTICS</a>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modals */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowModal(false)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '10px', padding: '22px', width: '340px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '18px' }}>Create New Journal</h2>
              <div style={{ marginBottom: '12px' }}><label style={{ display: 'block', fontSize: '9px', color: '#555', marginBottom: '5px', textTransform: 'uppercase' }}>Journal Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. FTMO 10k" autoFocus style={{ width: '100%', padding: '9px 11px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '5px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} /></div>
              <div style={{ marginBottom: '18px' }}><label style={{ display: 'block', fontSize: '9px', color: '#555', marginBottom: '5px', textTransform: 'uppercase' }}>Starting Balance ($)</label><input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="e.g. 10000" style={{ width: '100%', padding: '9px 11px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '5px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} /></div>
              <div style={{ display: 'flex', gap: '10px' }}><button onClick={createJournal} disabled={creating || !name.trim() || !balance} style={{ flex: 1, padding: '10px', background: '#22c55e', border: 'none', borderRadius: '5px', color: '#fff', fontWeight: 600, fontSize: '11px', cursor: 'pointer', opacity: (creating || !name.trim() || !balance) ? 0.5 : 1 }}>{creating ? 'Creating...' : 'Create'}</button><button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '5px', color: '#888', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}>Cancel</button></div>
            </div>
          </div>
        )}

        {showEditModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowEditModal(null)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '10px', padding: '22px', width: '340px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '18px' }}>Edit Journal</h2>
              <div style={{ marginBottom: '18px' }}><label style={{ display: 'block', fontSize: '9px', color: '#555', marginBottom: '5px', textTransform: 'uppercase' }}>Journal Name</label><input type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus style={{ width: '100%', padding: '9px 11px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '5px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} /></div>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}><button onClick={() => renameAccount(showEditModal)} disabled={!editName.trim()} style={{ flex: 1, padding: '10px', background: '#22c55e', border: 'none', borderRadius: '5px', color: '#fff', fontWeight: 600, fontSize: '11px', cursor: 'pointer', opacity: !editName.trim() ? 0.5 : 1 }}>Save</button><button onClick={() => setShowEditModal(null)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '5px', color: '#888', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}>Cancel</button></div>
              <button onClick={() => { setShowDeleteModal(showEditModal); setShowEditModal(null) }} style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid #ef4444', borderRadius: '5px', color: '#ef4444', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}>Delete Journal</button>
            </div>
          </div>
        )}

        {showDeleteModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => { setShowDeleteModal(null); setDeleteConfirm('') }}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '10px', padding: '22px', width: '340px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', color: '#ef4444' }}>Delete Journal</h2>
              <p style={{ fontSize: '12px', color: '#888', marginBottom: '14px' }}>This action cannot be undone. All trades will be permanently deleted.</p>
              <div style={{ marginBottom: '14px' }}><label style={{ display: 'block', fontSize: '9px', color: '#555', marginBottom: '5px', textTransform: 'uppercase' }}>Type "delete" to confirm</label><input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="delete" style={{ width: '100%', padding: '9px 11px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '5px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} /></div>
              <div style={{ display: 'flex', gap: '10px' }}><button onClick={() => deleteAccount(showDeleteModal)} disabled={deleteConfirm.toLowerCase() !== 'delete'} style={{ flex: 1, padding: '10px', background: '#ef4444', border: 'none', borderRadius: '5px', color: '#fff', fontWeight: 600, fontSize: '11px', cursor: 'pointer', opacity: deleteConfirm.toLowerCase() !== 'delete' ? 0.5 : 1 }}>Delete Forever</button><button onClick={() => { setShowDeleteModal(null); setDeleteConfirm('') }} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '5px', color: '#888', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}>Cancel</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
