'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// Default input configuration
const defaultInputs = [
  { id: 'symbol', label: 'Symbol', type: 'text', required: true, enabled: true },
  { id: 'date', label: 'Date', type: 'date', required: true, enabled: true },
  { id: 'direction', label: 'Direction', type: 'select', options: ['Long', 'Short'], required: true, enabled: true },
  { id: 'outcome', label: 'Result', type: 'select', options: ['Win', 'Loss', 'Breakeven'], required: true, enabled: true },
  { id: 'pnl', label: 'Profit ($)', type: 'number', required: true, enabled: true },
  { id: 'rr', label: 'RR', type: 'number', required: false, enabled: true },
  { id: 'timeframe', label: 'Timeframe', type: 'select', options: ['1m', '5m', '15m', '30m', '1H', '4H', 'Daily'], required: false, enabled: true },
  { id: 'session', label: 'Session', type: 'select', options: ['London', 'New York', 'Asian', 'Overlap'], required: false, enabled: true },
  { id: 'confluences', label: 'Confluences', type: 'number', required: false, enabled: true },
  { id: 'emotion', label: 'Emotion', type: 'select', options: ['Confident', 'Neutral', 'Fearful', 'FOMO', 'Revenge'], required: false, enabled: true },
  { id: 'rating', label: 'Rating', type: 'select', options: ['1', '2', '3', '4', '5'], required: false, enabled: true },
  { id: 'notes', label: 'Notes', type: 'textarea', required: false, enabled: true },
]

export default function AccountPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const accountId = params.id
  
  const [user, setUser] = useState(null)
  const [account, setAccount] = useState(null)
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'statistics' ? 'statistics' : 'trades')
  const [showAddTrade, setShowAddTrade] = useState(false)
  const [showEditInputs, setShowEditInputs] = useState(false)
  const [saving, setSaving] = useState(false)
  const [inputs, setInputs] = useState(defaultInputs)
  const [tradeForm, setTradeForm] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    const initial = {}
    inputs.forEach(inp => {
      if (inp.type === 'date') initial[inp.id] = new Date().toISOString().split('T')[0]
      else if (inp.type === 'select' && inp.options?.length) initial[inp.id] = inp.options[0].toLowerCase()
      else initial[inp.id] = ''
    })
    setTradeForm(initial)
  }, [inputs])

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

    setUser(user)

    const { data: accountData } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .single()

    if (!accountData) {
      window.location.href = '/dashboard'
      return
    }

    setAccount(accountData)

    if (accountData.custom_inputs) {
      try {
        setInputs(JSON.parse(accountData.custom_inputs))
      } catch (e) {}
    }

    const { data: tradesData } = await supabase
      .from('trades')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false })

    setTrades(tradesData || [])
    setLoading(false)
  }

  async function addTrade() {
    if (!tradeForm.symbol || !tradeForm.pnl) return
    setSaving(true)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const tradeData = {
      account_id: accountId,
      symbol: tradeForm.symbol?.toUpperCase(),
      direction: tradeForm.direction || 'long',
      outcome: tradeForm.outcome || 'win',
      pnl: parseFloat(tradeForm.pnl) || 0,
      rr: parseFloat(tradeForm.rr) || 0,
      date: tradeForm.date || new Date().toISOString().split('T')[0],
      notes: tradeForm.notes || '',
      extra_data: JSON.stringify({
        timeframe: tradeForm.timeframe,
        session: tradeForm.session,
        confluences: tradeForm.confluences,
        emotion: tradeForm.emotion,
        rating: tradeForm.rating,
      })
    }

    const { data, error } = await supabase
      .from('trades')
      .insert(tradeData)
      .select()
      .single()

    if (error) {
      alert('Error: ' + error.message)
      setSaving(false)
      return
    }

    setTrades([data, ...trades])
    const initial = {}
    inputs.forEach(inp => {
      if (inp.type === 'date') initial[inp.id] = new Date().toISOString().split('T')[0]
      else if (inp.type === 'select' && inp.options?.length) initial[inp.id] = inp.options[0].toLowerCase()
      else initial[inp.id] = ''
    })
    setTradeForm(initial)
    setShowAddTrade(false)
    setSaving(false)
  }

  async function deleteTrade(tradeId) {
    if (!confirm('Delete this trade?')) return

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    await supabase.from('trades').delete().eq('id', tradeId)
    setTrades(trades.filter(t => t.id !== tradeId))
  }

  async function saveInputs() {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    await supabase
      .from('accounts')
      .update({ custom_inputs: JSON.stringify(inputs) })
      .eq('id', accountId)

    setShowEditInputs(false)
  }

  function addNewInput() {
    setInputs([...inputs, {
      id: `custom_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      enabled: true,
      options: []
    }])
  }

  function updateInput(index, field, value) {
    const newInputs = [...inputs]
    newInputs[index] = { ...newInputs[index], [field]: value }
    setInputs(newInputs)
  }

  function deleteInput(index) {
    setInputs(inputs.filter((_, i) => i !== index))
  }

  function getExtraData(trade) {
    try {
      return JSON.parse(trade.extra_data || '{}')
    } catch {
      return {}
    }
  }

  // Bar Chart Component
  function BarChart({ data, title, valueKey = 'value', labelKey = 'label', showPercent = false, color = '#22c55e' }) {
    if (!data || data.length === 0) {
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: '#444', fontSize: '12px' }}>
          No data available
        </div>
      )
    }

    const maxValue = Math.max(...data.map(d => Math.abs(d[valueKey])))

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {data.map((item, i) => {
          const value = item[valueKey]
          const percent = maxValue > 0 ? (Math.abs(value) / maxValue) * 100 : 0
          const isPositive = value >= 0
          
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '70px', fontSize: '12px', color: '#888', textAlign: 'right' }}>{item[labelKey]}</div>
              <div style={{ flex: 1, height: '24px', background: '#0a0a0e', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ 
                  width: `${percent}%`, 
                  height: '100%', 
                  background: isPositive ? color : '#ef4444',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <div style={{ width: '60px', fontSize: '12px', fontWeight: 600, color: isPositive ? '#22c55e' : '#ef4444', textAlign: 'right' }}>
                {showPercent ? `${value}%` : (value >= 0 ? '+' : '') + '$' + value.toFixed(0)}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Donut Chart Component
  function DonutChart({ value, label, color = '#22c55e' }) {
    const radius = 40
    const stroke = 8
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (value / 100) * circumference

    return (
      <div style={{ textAlign: 'center' }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#1a1a22" strokeWidth={stroke} />
          <circle 
            cx="50" cy="50" r={radius} 
            fill="none" 
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
          <text x="50" y="50" textAnchor="middle" dy="0.35em" fontSize="18" fontWeight="700" fill="#fff">{value}%</text>
        </svg>
        <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>{label}</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}><span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE+</span></div>
          <div style={{ color: '#666' }}>Loading...</div>
        </div>
      </div>
    )
  }

  // Calculate all stats
  const wins = trades.filter(t => t.outcome === 'win').length
  const losses = trades.filter(t => t.outcome === 'loss').length
  const breakevens = trades.filter(t => t.outcome === 'breakeven').length
  const totalPnl = trades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
  const winrate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0
  const avgRR = trades.length > 0 ? (trades.reduce((sum, t) => sum + (parseFloat(t.rr) || 0), 0) / trades.length).toFixed(2) : '0'
  const currentBalance = (parseFloat(account?.starting_balance) || 0) + totalPnl

  const grossProfit = trades.filter(t => parseFloat(t.pnl) > 0).reduce((sum, t) => sum + parseFloat(t.pnl), 0)
  const grossLoss = Math.abs(trades.filter(t => parseFloat(t.pnl) < 0).reduce((sum, t) => sum + parseFloat(t.pnl), 0))
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '0'

  const avgWin = wins > 0 ? (grossProfit / wins).toFixed(0) : 0
  const avgLoss = losses > 0 ? (grossLoss / losses).toFixed(0) : 0

  // Stats by group helper
  function getStatsByGroup(groupField, fromExtra = false) {
    const groups = {}
    trades.forEach(trade => {
      const extra = getExtraData(trade)
      let key = fromExtra ? extra[groupField] : trade[groupField]
      if (!key) key = 'Unknown'
      if (!groups[key]) {
        groups[key] = { trades: [], wins: 0, losses: 0, pnl: 0 }
      }
      groups[key].trades.push(trade)
      groups[key].pnl += parseFloat(trade.pnl) || 0
      if (trade.outcome === 'win') groups[key].wins++
      if (trade.outcome === 'loss') groups[key].losses++
    })
    return groups
  }

  // Day of week stats
  function getDayOfWeekStats() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const stats = {}
    days.forEach(d => stats[d] = { wins: 0, losses: 0, pnl: 0, trades: 0 })
    
    trades.forEach(t => {
      const day = days[new Date(t.date).getDay()]
      stats[day].trades++
      stats[day].pnl += parseFloat(t.pnl) || 0
      if (t.outcome === 'win') stats[day].wins++
      if (t.outcome === 'loss') stats[day].losses++
    })

    return Object.entries(stats)
      .filter(([_, v]) => v.trades > 0)
      .map(([day, v]) => ({
        label: day.slice(0, 3),
        value: (v.wins + v.losses) > 0 ? Math.round((v.wins / (v.wins + v.losses)) * 100) : 0,
        pnl: v.pnl,
        trades: v.trades
      }))
  }

  // Best/Worst pairs
  function getBestWorstPairs() {
    const symbolStats = getStatsByGroup('symbol')
    const sorted = Object.entries(symbolStats)
      .map(([symbol, data]) => ({ symbol, pnl: data.pnl, trades: data.trades.length }))
      .sort((a, b) => b.pnl - a.pnl)
    
    return {
      best: sorted.slice(0, 3),
      worst: sorted.slice(-3).reverse()
    }
  }

  // Streak calculation
  function getStreaks() {
    let currentStreak = 0
    let maxWinStreak = 0
    let maxLossStreak = 0
    let tempStreak = 0
    let lastOutcome = null

    const sortedTrades = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
    
    sortedTrades.forEach(t => {
      if (t.outcome === 'win') {
        if (lastOutcome === 'win') {
          tempStreak++
        } else {
          tempStreak = 1
        }
        maxWinStreak = Math.max(maxWinStreak, tempStreak)
        lastOutcome = 'win'
      } else if (t.outcome === 'loss') {
        if (lastOutcome === 'loss') {
          tempStreak++
        } else {
          tempStreak = 1
        }
        maxLossStreak = Math.max(maxLossStreak, tempStreak)
        lastOutcome = 'loss'
      }
    })

    // Current streak
    let i = sortedTrades.length - 1
    if (i >= 0) {
      const lastType = sortedTrades[i].outcome
      while (i >= 0 && sortedTrades[i].outcome === lastType) {
        currentStreak++
        i--
      }
      if (lastType === 'loss') currentStreak = -currentStreak
    }

    return { currentStreak, maxWinStreak, maxLossStreak }
  }

  const streaks = getStreaks()
  const dayStats = getDayOfWeekStats()
  const { best: bestPairs, worst: worstPairs } = getBestWorstPairs()

  const enabledInputs = inputs.filter(i => i.enabled)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px 32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <a href="/dashboard" style={{ color: '#555', fontSize: '20px', textDecoration: 'none' }}>←</a>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Journal</div>
            <div style={{ fontSize: '20px', fontWeight: 600 }}>{account?.name}</div>
          </div>
          <button onClick={() => setShowAddTrade(true)} style={{ padding: '12px 24px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
            + LOG NEW TRADE
          </button>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button 
            onClick={() => setActiveTab('trades')} 
            style={{ 
              padding: '12px 28px', 
              background: activeTab === 'trades' ? '#22c55e' : 'transparent', 
              border: activeTab === 'trades' ? 'none' : '1px solid #1a1a22', 
              borderRadius: '8px', 
              color: activeTab === 'trades' ? '#fff' : '#888', 
              fontWeight: 600, 
              fontSize: '13px', 
              cursor: 'pointer' 
            }}
          >
            Trades
          </button>
          <button 
            onClick={() => setActiveTab('statistics')} 
            style={{ 
              padding: '12px 28px', 
              background: activeTab === 'statistics' ? '#22c55e' : 'transparent', 
              border: activeTab === 'statistics' ? 'none' : '1px solid #1a1a22', 
              borderRadius: '8px', 
              color: activeTab === 'statistics' ? '#fff' : '#888', 
              fontWeight: 600, 
              fontSize: '13px', 
              cursor: 'pointer' 
            }}
          >
            Statistics
          </button>
        </div>

        {/* TRADES TAB */}
        {activeTab === 'trades' && (
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #1a1a22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {trades.length} Trades
              </span>
              <button 
                onClick={() => setShowEditInputs(true)} 
                style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '6px', color: '#666', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Columns
              </button>
            </div>

            {trades.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#444' }}>
                No trades yet. Click "LOG NEW TRADE" to add your first trade.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                  <thead>
                    <tr style={{ background: '#0a0a0e' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: '#555', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Symbol</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: '#555', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Result</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', color: '#555', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Profit</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', color: '#555', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>RR</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', color: '#555', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Time</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', color: '#555', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Confluences</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', color: '#555', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Emotion</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', color: '#555', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Rating</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: '#555', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Notes</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', color: '#555', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Date</th>
                      <th style={{ padding: '10px 8px', width: '40px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map(trade => {
                      const extra = getExtraData(trade)
                      return (
                        <tr key={trade.id} style={{ borderBottom: '1px solid #141418' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: '13px' }}>{trade.symbol}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ 
                              padding: '4px 10px', 
                              borderRadius: '4px', 
                              fontSize: '11px', 
                              fontWeight: 600, 
                              background: trade.outcome === 'win' ? 'rgba(34,197,94,0.15)' : trade.outcome === 'loss' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)', 
                              color: trade.outcome === 'win' ? '#22c55e' : trade.outcome === 'loss' ? '#ef4444' : '#888' 
                            }}>
                              {trade.outcome?.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, fontSize: '13px', color: parseFloat(trade.pnl) >= 0 ? '#22c55e' : '#ef4444' }}>
                            {parseFloat(trade.pnl) >= 0 ? '+' : ''}${parseFloat(trade.pnl || 0).toFixed(0)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#888' }}>{trade.rr || '-'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: '#666' }}>{extra.timeframe || '-'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: '#888' }}>{extra.confluences || '-'}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {extra.emotion && (
                              <span style={{ 
                                padding: '3px 8px', 
                                borderRadius: '4px', 
                                fontSize: '10px', 
                                background: extra.emotion === 'Confident' ? 'rgba(34,197,94,0.1)' : extra.emotion === 'FOMO' || extra.emotion === 'Revenge' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', 
                                color: extra.emotion === 'Confident' ? '#22c55e' : extra.emotion === 'FOMO' || extra.emotion === 'Revenge' ? '#ef4444' : '#666' 
                              }}>
                                {extra.emotion}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {extra.rating && (
                              <div style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>
                                {[1,2,3,4,5].map(i => (
                                  <span key={i} style={{ color: i <= parseInt(extra.rating) ? '#22c55e' : '#333', fontSize: '10px' }}>●</span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '12px', color: '#666', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {trade.notes || '-'}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', color: '#555' }}>
                            {new Date(trade.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </td>
                          <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                            <button onClick={() => deleteTrade(trade.id)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', fontSize: '16px' }}>×</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* STATISTICS TAB */}
        {activeTab === 'statistics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Overview Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
              {[
                { label: 'Total PnL', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString()}`, color: totalPnl >= 0 ? '#22c55e' : '#ef4444' },
                { label: 'Winrate', value: `${winrate}%`, color: winrate >= 50 ? '#22c55e' : '#ef4444' },
                { label: 'Profit Factor', value: profitFactor, color: parseFloat(profitFactor) >= 1 ? '#22c55e' : '#ef4444' },
                { label: 'Avg RR', value: `${avgRR}R`, color: '#fff' },
                { label: 'Avg Win', value: `+$${avgWin}`, color: '#22c55e' },
                { label: 'Avg Loss', value: `-$${avgLoss}`, color: '#ef4444' },
              ].map((stat, i) => (
                <div key={i} style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '10px', padding: '16px' }}>
                  <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{stat.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Win/Loss/Streak Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              {/* Win/Loss Breakdown */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>Win/Loss Breakdown</h3>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                  <DonutChart value={winrate} label="Win Rate" color="#22c55e" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#22c55e' }} />
                      <span style={{ fontSize: '13px' }}>{wins} Wins</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444' }} />
                      <span style={{ fontSize: '13px' }}>{losses} Losses</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#666' }} />
                      <span style={{ fontSize: '13px' }}>{breakevens} BE</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Streaks */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>Streaks</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#0a0a0e', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>Current Streak</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: streaks.currentStreak >= 0 ? '#22c55e' : '#ef4444' }}>
                      {streaks.currentStreak >= 0 ? '+' : ''}{streaks.currentStreak}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#0a0a0e', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>Best Win Streak</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#22c55e' }}>{streaks.maxWinStreak}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#0a0a0e', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>Worst Loss Streak</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#ef4444' }}>{streaks.maxLossStreak}</span>
                  </div>
                </div>
              </div>

              {/* Long vs Short */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '20px' }}>Long vs Short</h3>
                {(() => {
                  const dirStats = getStatsByGroup('direction')
                  const longWr = dirStats['long'] && (dirStats['long'].wins + dirStats['long'].losses) > 0 
                    ? Math.round((dirStats['long'].wins / (dirStats['long'].wins + dirStats['long'].losses)) * 100) : 0
                  const shortWr = dirStats['short'] && (dirStats['short'].wins + dirStats['short'].losses) > 0 
                    ? Math.round((dirStats['short'].wins / (dirStats['short'].wins + dirStats['short'].losses)) * 100) : 0
                  
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ padding: '12px', background: '#0a0a0e', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#22c55e' }}>Long</span>
                          <span style={{ fontSize: '12px', color: '#888' }}>{dirStats['long']?.trades?.length || 0} trades</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>{longWr}% WR</span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: (dirStats['long']?.pnl || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                            {(dirStats['long']?.pnl || 0) >= 0 ? '+' : ''}${(dirStats['long']?.pnl || 0).toFixed(0)}
                          </span>
                        </div>
                      </div>
                      <div style={{ padding: '12px', background: '#0a0a0e', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#ef4444' }}>Short</span>
                          <span style={{ fontSize: '12px', color: '#888' }}>{dirStats['short']?.trades?.length || 0} trades</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>{shortWr}% WR</span>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: (dirStats['short']?.pnl || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                            {(dirStats['short']?.pnl || 0) >= 0 ? '+' : ''}${(dirStats['short']?.pnl || 0).toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Charts Row 1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* PnL by Symbol */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>PnL by Symbol</h3>
                <BarChart 
                  data={Object.entries(getStatsByGroup('symbol'))
                    .map(([symbol, data]) => ({ label: symbol, value: data.pnl }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 8)} 
                />
              </div>

              {/* Winrate by Day of Week */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Winrate by Day</h3>
                <BarChart data={dayStats} valueKey="value" showPercent={true} />
              </div>
            </div>

            {/* Charts Row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Winrate by Session */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Winrate by Session</h3>
                <BarChart 
                  data={Object.entries(getStatsByGroup('session', true))
                    .filter(([k]) => k !== 'Unknown')
                    .map(([session, data]) => ({ 
                      label: session, 
                      value: (data.wins + data.losses) > 0 ? Math.round((data.wins / (data.wins + data.losses)) * 100) : 0 
                    }))} 
                  showPercent={true}
                />
              </div>

              {/* Winrate by Emotion */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Winrate by Emotion</h3>
                <BarChart 
                  data={Object.entries(getStatsByGroup('emotion', true))
                    .filter(([k]) => k !== 'Unknown')
                    .map(([emotion, data]) => ({ 
                      label: emotion, 
                      value: (data.wins + data.losses) > 0 ? Math.round((data.wins / (data.wins + data.losses)) * 100) : 0 
                    }))} 
                  showPercent={true}
                />
              </div>
            </div>

            {/* Charts Row 3 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Winrate by Timeframe */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Winrate by Timeframe</h3>
                <BarChart 
                  data={Object.entries(getStatsByGroup('timeframe', true))
                    .filter(([k]) => k !== 'Unknown')
                    .map(([tf, data]) => ({ 
                      label: tf, 
                      value: (data.wins + data.losses) > 0 ? Math.round((data.wins / (data.wins + data.losses)) * 100) : 0 
                    }))} 
                  showPercent={true}
                />
              </div>

              {/* Best & Worst Pairs */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Best & Worst Pairs</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: '#22c55e', marginBottom: '8px' }}>BEST</div>
                    {bestPairs.map((p, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a1a22' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{p.symbol}</span>
                        <span style={{ fontSize: '13px', color: '#22c55e' }}>+${p.pnl.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#ef4444', marginBottom: '8px' }}>WORST</div>
                    {worstPairs.map((p, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a1a22' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600 }}>{p.symbol}</span>
                        <span style={{ fontSize: '13px', color: p.pnl >= 0 ? '#22c55e' : '#ef4444' }}>{p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* PnL by Rating */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>PnL by Setup Rating</h3>
                <BarChart 
                  data={Object.entries(getStatsByGroup('rating', true))
                    .filter(([k]) => k !== 'Unknown')
                    .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
                    .map(([rating, data]) => ({ 
                      label: `${rating} Star`, 
                      value: data.pnl
                    }))} 
                />
              </div>

              {/* PnL by Confluences */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '12px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>PnL by Confluences</h3>
                <BarChart 
                  data={Object.entries(getStatsByGroup('confluences', true))
                    .filter(([k]) => k !== 'Unknown')
                    .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
                    .map(([conf, data]) => ({ 
                      label: `${conf} Conf`, 
                      value: data.pnl
                    }))} 
                />
              </div>
            </div>
          </div>
        )}

        {/* ADD TRADE MODAL */}
        {showAddTrade && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowAddTrade(false)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '24px', width: '600px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Log New Trade</h2>
                <button onClick={() => setShowEditInputs(true)} style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '4px', color: '#666', fontSize: '11px', cursor: 'pointer' }}>
                  Edit Fields
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {enabledInputs.map(input => (
                  <div key={input.id} style={{ gridColumn: input.type === 'textarea' ? 'span 2' : 'span 1' }}>
                    <label style={{ display: 'block', fontSize: '10px', color: '#555', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {input.label} {input.required && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>
                    {input.type === 'select' ? (
                      <select
                        value={tradeForm[input.id] || ''}
                        onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})}
                        style={{ width: '100%', padding: '10px 12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                      >
                        {input.options?.map(opt => (
                          <option key={opt} value={opt.toLowerCase()}>{opt}</option>
                        ))}
                      </select>
                    ) : input.type === 'textarea' ? (
                      <textarea
                        value={tradeForm[input.id] || ''}
                        onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})}
                        placeholder={`Enter ${input.label.toLowerCase()}...`}
                        rows={2}
                        style={{ width: '100%', padding: '10px 12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', resize: 'none' }}
                      />
                    ) : (
                      <input
                        type={input.type}
                        value={tradeForm[input.id] || ''}
                        onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})}
                        placeholder={input.type === 'number' ? '0' : `Enter ${input.label.toLowerCase()}`}
                        step={input.type === 'number' ? '0.1' : undefined}
                        style={{ width: '100%', padding: '10px 12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button onClick={addTrade} disabled={saving || !tradeForm.symbol || !tradeForm.pnl} style={{ flex: 1, padding: '12px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer', opacity: (saving || !tradeForm.symbol || !tradeForm.pnl) ? 0.5 : 1 }}>
                  {saving ? 'Saving...' : 'Save Trade'}
                </button>
                <button onClick={() => setShowAddTrade(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '8px', color: '#888', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT INPUTS MODAL */}
        {showEditInputs && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 101 }} onClick={() => setShowEditInputs(false)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '24px', width: '500px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>Customize Fields</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {inputs.map((input, index) => (
                  <div key={input.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#0a0a0e', borderRadius: '8px' }}>
                    <input
                      type="checkbox"
                      checked={input.enabled}
                      onChange={e => updateInput(index, 'enabled', e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <input
                      type="text"
                      value={input.label}
                      onChange={e => updateInput(index, 'label', e.target.value)}
                      style={{ flex: 1, padding: '6px 10px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '13px' }}
                    />
                    <select
                      value={input.type}
                      onChange={e => updateInput(index, 'type', e.target.value)}
                      style={{ padding: '6px 10px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '4px', color: '#888', fontSize: '12px' }}
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                      <option value="select">Dropdown</option>
                      <option value="textarea">Notes</option>
                    </select>
                    {!['symbol', 'date', 'direction', 'outcome', 'pnl'].includes(input.id) && (
                      <button onClick={() => deleteInput(index)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}>×</button>
                    )}
                  </div>
                ))}
              </div>

              <button onClick={addNewInput} style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px dashed #1a1a22', borderRadius: '8px', color: '#666', fontSize: '13px', cursor: 'pointer', marginBottom: '20px' }}>
                + Add New Field
              </button>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={saveInputs} style={{ flex: 1, padding: '12px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Changes</button>
                <button onClick={() => setShowEditInputs(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '8px', color: '#888', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
