'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const defaultInputs = [
  { id: 'symbol', label: 'Symbol', type: 'text', required: true, enabled: true, fixed: true },
  { id: 'outcome', label: 'Win/Loss', type: 'select', options: ['Win', 'Loss', 'Breakeven'], required: true, enabled: true, fixed: true },
  { id: 'pnl', label: 'PnL ($)', type: 'number', required: true, enabled: true, fixed: true },
  { id: 'riskPercent', label: '% Risked', type: 'number', required: false, enabled: true, fixed: true },
  { id: 'rr', label: 'RR', type: 'number', required: false, enabled: true, fixed: true },
  { id: 'direction', label: 'Trend', type: 'select', options: ['Long', 'Short'], required: false, enabled: true, fixed: false },
  { id: 'confidence', label: 'Confidence', type: 'select', options: ['High', 'Medium', 'Low'], required: false, enabled: true, fixed: false },
  { id: 'rating', label: 'Rating', type: 'rating', required: false, enabled: true, fixed: false },
  { id: 'notes', label: 'Notes', type: 'textarea', required: false, enabled: true, fixed: false },
  { id: 'date', label: 'Date', type: 'date', required: true, enabled: true, fixed: true },
  { id: 'timeframe', label: 'Timeframe', type: 'select', options: ['1m', '5m', '15m', '30m', '1H', '4H', 'Daily'], required: false, enabled: true, fixed: false },
  { id: 'session', label: 'Session', type: 'select', options: ['London', 'New York', 'Asian', 'Overlap'], required: false, enabled: true, fixed: false },
  { id: 'image', label: 'Image URL', type: 'text', required: false, enabled: true, fixed: false },
]

export default function AccountPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const accountId = params.id
  
  const [user, setUser] = useState(null)
  const [account, setAccount] = useState(null)
  const [trades, setTrades] = useState([])
  const [notes, setNotes] = useState({ daily: {}, weekly: {}, custom: [] })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'statistics' ? 'statistics' : searchParams.get('tab') === 'notes' ? 'notes' : 'trades')
  const [notesSubTab, setNotesSubTab] = useState('daily')
  const [showAddTrade, setShowAddTrade] = useState(false)
  const [showEditInputs, setShowEditInputs] = useState(false)
  const [showExpandedNote, setShowExpandedNote] = useState(null)
  const [showExpandedImage, setShowExpandedImage] = useState(null)
  const [editingOptions, setEditingOptions] = useState(null)
  const [optionsText, setOptionsText] = useState('')
  const [saving, setSaving] = useState(false)
  const [inputs, setInputs] = useState(defaultInputs)
  const [tradeForm, setTradeForm] = useState({})
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0])
  const [noteText, setNoteText] = useState('')
  const [customNoteTitle, setCustomNoteTitle] = useState('')
  const [barGraphMetric, setBarGraphMetric] = useState('winrate')
  const [graphGroupBy, setGraphGroupBy] = useState('symbol')
  const [analysisGroupBy, setAnalysisGroupBy] = useState('direction')
  const [analysisMetric, setAnalysisMetric] = useState('avgpnl')
  const [tooltip, setTooltip] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [hasNewInputs, setHasNewInputs] = useState(false)

  useEffect(() => { loadData() }, [])
  useEffect(() => {
    const initial = {}
    inputs.forEach(inp => {
      if (inp.type === 'date') initial[inp.id] = new Date().toISOString().split('T')[0]
      else if (inp.type === 'select' && inp.options?.length) initial[inp.id] = inp.options[0].toLowerCase()
      else if (inp.type === 'rating') initial[inp.id] = '3'
      else initial[inp.id] = ''
    })
    setTradeForm(initial)
  }, [inputs])

  async function loadData() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    setUser(user)
    const { data: accountData } = await supabase.from('accounts').select('*').eq('id', accountId).eq('user_id', user.id).single()
    if (!accountData) { window.location.href = '/dashboard'; return }
    setAccount(accountData)
    if (accountData.custom_inputs) { 
      try { 
        const parsed = JSON.parse(accountData.custom_inputs)
        setInputs(parsed)
        const customInputs = parsed.filter(i => !defaultInputs.find(d => d.id === i.id))
        if (customInputs.length > 0) setHasNewInputs(true)
      } catch {} 
    }
    if (accountData.notes_data) { try { setNotes(JSON.parse(accountData.notes_data)) } catch {} }
    const { data: tradesData } = await supabase.from('trades').select('*').eq('account_id', accountId).order('date', { ascending: false })
    setTrades(tradesData || [])
    setLoading(false)
  }

  async function addTrade() {
    if (!tradeForm.symbol || !tradeForm.pnl) return
    setSaving(true)
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    
    // Collect all custom field data
    const extraData = {}
    inputs.forEach(inp => {
      if (!['symbol', 'outcome', 'pnl', 'rr', 'date', 'notes', 'direction', 'image'].includes(inp.id)) {
        extraData[inp.id] = tradeForm[inp.id] || ''
      }
    })
    
    const { data, error } = await supabase.from('trades').insert({
      account_id: accountId,
      symbol: tradeForm.symbol?.toUpperCase(),
      direction: tradeForm.direction || 'long',
      outcome: tradeForm.outcome || 'win',
      pnl: parseFloat(tradeForm.pnl) || 0,
      rr: parseFloat(tradeForm.rr) || 0,
      date: tradeForm.date || new Date().toISOString().split('T')[0],
      notes: tradeForm.notes || '',
      extra_data: JSON.stringify(extraData)
    }).select().single()
    
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    setTrades([data, ...trades])
    const initial = {}
    inputs.forEach(inp => {
      if (inp.type === 'date') initial[inp.id] = new Date().toISOString().split('T')[0]
      else if (inp.type === 'select' && inp.options?.length) initial[inp.id] = inp.options[0].toLowerCase()
      else if (inp.type === 'rating') initial[inp.id] = '3'
      else initial[inp.id] = ''
    })
    setTradeForm(initial)
    setShowAddTrade(false)
    setSaving(false)
  }

  async function deleteTrade(tradeId) {
    if (!confirm('Delete this trade?')) return
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    await supabase.from('trades').delete().eq('id', tradeId)
    setTrades(trades.filter(t => t.id !== tradeId))
  }

  async function saveInputs() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    await supabase.from('accounts').update({ custom_inputs: JSON.stringify(inputs) }).eq('id', accountId)
    const customInputs = inputs.filter(i => !defaultInputs.find(d => d.id === i.id))
    if (customInputs.length > 0) setHasNewInputs(true)
    setShowEditInputs(false)
  }

  async function saveNote() {
    if (!noteText.trim()) return
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const newNotes = { ...notes }
    if (notesSubTab === 'daily') newNotes.daily = { ...newNotes.daily, [noteDate]: noteText }
    else if (notesSubTab === 'weekly') { const weekStart = getWeekStart(noteDate); newNotes.weekly = { ...newNotes.weekly, [weekStart]: noteText } }
    else newNotes.custom = [...(newNotes.custom || []), { title: customNoteTitle || 'Note', text: noteText, date: new Date().toISOString() }]
    await supabase.from('accounts').update({ notes_data: JSON.stringify(newNotes) }).eq('id', accountId)
    setNotes(newNotes)
    setNoteText('')
    setCustomNoteTitle('')
  }

  async function deleteNote(type, key) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const newNotes = { ...notes }
    if (type === 'daily') delete newNotes.daily[key]
    else if (type === 'weekly') delete newNotes.weekly[key]
    else newNotes.custom = notes.custom.filter((_, i) => i !== key)
    await supabase.from('accounts').update({ notes_data: JSON.stringify(newNotes) }).eq('id', accountId)
    setNotes(newNotes)
  }

  function getWeekStart(dateStr) {
    const d = new Date(dateStr)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff)).toISOString().split('T')[0]
  }

  function addNewInput() { 
    const newInput = { id: `custom_${Date.now()}`, label: 'New Field', type: 'text', required: false, enabled: true, fixed: false, options: [] }
    setInputs([...inputs, newInput]) 
  }
  function updateInput(i, f, v) { const n = [...inputs]; n[i] = { ...n[i], [f]: v }; setInputs(n) }
  function deleteInput(i) { setInputs(inputs.filter((_, idx) => idx !== i)) }
  function openOptionsEditor(i) { setEditingOptions(i); setOptionsText((inputs[i].options || []).join('\n')) }
  function saveOptions() { if (editingOptions === null) return; updateInput(editingOptions, 'options', optionsText.split('\n').map(o => o.trim()).filter(o => o)); setEditingOptions(null); setOptionsText('') }
  function getExtraData(t) { try { return JSON.parse(t.extra_data || '{}') } catch { return {} } }
  function getDaysAgo(d) { const diff = Math.floor((new Date() - new Date(d)) / 86400000); return diff === 0 ? 'Today' : diff === 1 ? '1d ago' : `${diff}d ago` }

  // Get custom select inputs for dropdown options
  function getCustomSelectInputs() {
    return inputs.filter(i => i.type === 'select' && i.enabled && !['outcome'].includes(i.id))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px' }}><span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE+</span></div>
        <div style={{ color: '#888' }}>Loading...</div>
      </div>
    </div>
  )

  const wins = trades.filter(t => t.outcome === 'win').length
  const losses = trades.filter(t => t.outcome === 'loss').length
  const totalPnl = trades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0)
  const winrate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0
  const grossProfit = trades.filter(t => parseFloat(t.pnl) > 0).reduce((s, t) => s + parseFloat(t.pnl), 0)
  const grossLoss = Math.abs(trades.filter(t => parseFloat(t.pnl) < 0).reduce((s, t) => s + parseFloat(t.pnl), 0))
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? 'Inf' : '0'
  const avgWin = wins > 0 ? Math.round(grossProfit / wins) : 0
  const avgLoss = losses > 0 ? Math.round(grossLoss / losses) : 0
  const startingBalance = parseFloat(account?.starting_balance) || 10000
  const currentBalance = startingBalance + totalPnl

  function getStreaks() {
    let mw = 0, ml = 0, ts = 0, lo = null, cs = 0
    const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
    sorted.forEach(t => { if (t.outcome === 'win') { ts = lo === 'win' ? ts + 1 : 1; mw = Math.max(mw, ts); lo = 'win' } else if (t.outcome === 'loss') { ts = lo === 'loss' ? ts + 1 : 1; ml = Math.max(ml, ts); lo = 'loss' } })
    let i = sorted.length - 1
    if (i >= 0) { const last = sorted[i].outcome; while (i >= 0 && sorted[i].outcome === last) { cs++; i-- }; if (last === 'loss') cs = -cs }
    return { cs, mw, ml }
  }
  const streaks = getStreaks()
  const enabledInputs = inputs.filter(i => i.enabled)
  const fixedInputs = enabledInputs.filter(i => i.fixed || ['symbol', 'outcome', 'pnl', 'riskPercent', 'rr', 'date'].includes(i.id))
  const customInputs = enabledInputs.filter(i => !i.fixed && !['symbol', 'outcome', 'pnl', 'riskPercent', 'rr', 'date'].includes(i.id))

  const avgRating = trades.length > 0 ? (trades.reduce((s, t) => s + (parseInt(getExtraData(t).rating) || 0), 0) / trades.length).toFixed(1) : '0'
  const avgPnl = trades.length > 0 ? Math.round(totalPnl / trades.length) : 0
  const avgRR = trades.length > 0 ? (trades.reduce((s, t) => s + (parseFloat(t.rr) || 0), 0) / trades.length).toFixed(1) : '0'
  const mostTradedPair = (() => { const c = {}; trades.forEach(t => c[t.symbol] = (c[t.symbol] || 0) + 1); return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || '-' })()
  const mostUsedRR = (() => { const c = {}; trades.forEach(t => { const rr = Math.round(parseFloat(t.rr) || 0); if (rr > 0) c[rr] = (c[rr] || 0) + 1 }); const best = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return best ? best[0] + 'R' : '-' })()
  const bestRR = (() => { const best = trades.filter(t => t.outcome === 'win').sort((a, b) => (parseFloat(b.rr) || 0) - (parseFloat(a.rr) || 0))[0]; return best ? `${best.rr}R` : '-' })()
  const avgTrend = trades.filter(t => t.direction === 'long').length >= trades.filter(t => t.direction === 'short').length ? 'Long' : 'Short'
  const longCount = trades.filter(t => t.direction === 'long').length
  const shortCount = trades.filter(t => t.direction === 'short').length
  const longPct = Math.round((longCount / (longCount + shortCount || 1)) * 100)

  const bestDay = (() => { const byDay = {}; trades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + (parseFloat(t.pnl) || 0) }); const best = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0]; return best ? { date: best[0], pnl: best[1] } : null })()
  const worstDay = (() => { const byDay = {}; trades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + (parseFloat(t.pnl) || 0) }); const worst = Object.entries(byDay).sort((a, b) => a[1] - b[1])[0]; return worst ? { date: worst[0], pnl: worst[1] } : null })()
  const tradingDays = new Set(trades.map(t => t.date)).size
  const avgTradesPerDay = tradingDays > 0 ? (trades.length / tradingDays).toFixed(1) : 0
  const biggestWin = Math.max(...trades.map(t => parseFloat(t.pnl) || 0), 0)
  const biggestLoss = Math.min(...trades.map(t => parseFloat(t.pnl) || 0), 0)
  const expectancy = trades.length > 0 ? ((winrate / 100) * avgWin - ((100 - winrate) / 100) * avgLoss).toFixed(0) : 0
  const lossExpectancy = trades.length > 0 ? (((100 - winrate) / 100) * avgLoss).toFixed(0) : 0
  const returnOnRisk = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '-'

  // Daily PnL data for net daily chart
  const dailyPnL = (() => {
    const byDay = {}
    trades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + (parseFloat(t.pnl) || 0) })
    return Object.entries(byDay).sort((a, b) => new Date(a[0]) - new Date(b[0])).map(([date, pnl]) => ({ date, pnl }))
  })()

  const tabTitles = { trades: 'TRADES AREA', statistics: 'STATISTICS AREA', notes: 'NOTES AREA' }
  const tabDescriptions = {
    trades: 'View and manage all your trades. Add new trades and track performance.',
    statistics: 'Detailed statistics, charts, and breakdowns by pair, session, and more.',
    notes: 'Keep daily, weekly, and custom notes about your trading journey.'
  }

  // Tooltip component that follows mouse
  const Tooltip = ({ data }) => {
    if (!data) return null
    return (
      <div style={{ position: 'fixed', left: mousePos.x + 15, top: mousePos.y + 15, background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', zIndex: 1000, pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
        <div style={{ color: '#888', marginBottom: '4px' }}>{data.date}</div>
        <div style={{ fontWeight: 700, fontSize: '16px', color: '#fff' }}>${data.value?.toLocaleString()}</div>
        {data.extra && <div style={{ color: data.extra.color || '#22c55e', marginTop: '4px' }}>{data.extra.text}</div>}
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }} onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}>
      {/* Global Tooltip */}
      <Tooltip data={tooltip} />

      {/* FIXED HEADER */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a22', background: '#0a0a0f' }}>
        <a href="/" style={{ fontSize: '22px', fontWeight: 700, textDecoration: 'none' }}><span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE+</span></a>
        <div style={{ fontSize: '32px', fontWeight: 700, color: '#fff' }}>{tabTitles[activeTab]}</div>
        <a href="/dashboard" style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#fff', fontSize: '14px', textDecoration: 'none' }}>← Dashboard</a>
      </header>

      {/* FIXED SUBHEADER */}
      <div style={{ position: 'fixed', top: '57px', left: '180px', right: 0, zIndex: 40, padding: '14px 24px', background: '#0a0a0f', borderBottom: '1px solid #1a1a22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '26px', fontWeight: 700, color: '#fff' }}>{account?.name}</span>
        <div style={{ display: 'flex', gap: '12px' }}>
          {activeTab === 'trades' && (
            <button onClick={() => setShowEditInputs(true)} style={{ padding: '12px 24px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#fff', fontSize: '14px', cursor: 'pointer' }}>Edit Columns</button>
          )}
          <button onClick={() => setShowAddTrade(true)} style={{ padding: '12px 28px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>+ LOG NEW TRADE</button>
        </div>
      </div>

      {/* FIXED SIDEBAR */}
      <div style={{ position: 'fixed', top: '57px', left: 0, bottom: 0, width: '180px', padding: '16px 12px', borderRight: '1px solid #1a1a22', background: '#0a0a0f', zIndex: 45, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '80px' }}>
        <div>
          {['trades', 'statistics', 'notes'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => { setActiveTab(tab); if (tab === 'statistics') setHasNewInputs(false) }} 
              style={{ 
                width: '100%', padding: '16px 20px', marginBottom: '8px',
                background: activeTab === tab ? '#22c55e' : 'transparent', 
                border: activeTab === tab ? 'none' : '1px solid #2a2a35',
                borderRadius: '8px', color: activeTab === tab ? '#fff' : '#888', 
                fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer', textAlign: 'center',
                position: 'relative'
              }}
            >
              {tab}
              {tab === 'statistics' && hasNewInputs && (
                <span style={{ position: 'absolute', top: '8px', right: '8px', width: '8px', height: '8px', background: '#f59e0b', borderRadius: '50%' }} title="New stats available" />
              )}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 'auto', padding: '14px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.5' }}>{tabDescriptions[activeTab]}</div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ marginLeft: '180px', marginTop: '124px', padding: '16px 24px', minHeight: 'calc(100vh - 124px)' }}>

        {/* TRADES TAB */}
        {activeTab === 'trades' && (
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', overflow: 'hidden' }}>
            {trades.length === 0 ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#888', fontSize: '15px' }}>No trades yet. Click "+ LOG NEW TRADE" to add your first trade.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0a0a0e' }}>
                      {['Symbol', 'W/L', 'PnL', '%', 'RR', ...customInputs.map(i => i.label), 'Date', ''].map((h, i) => (
                        <th key={i} style={{ padding: '14px 12px', textAlign: 'center', color: '#888', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid #1a1a22' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => {
                      const extra = getExtraData(trade)
                      const pnlValue = parseFloat(trade.pnl) || 0
                      return (
                        <tr key={trade.id} style={{ borderBottom: '1px solid #141418' }}>
                          <td style={{ padding: '14px 12px', fontWeight: 600, fontSize: '16px', textAlign: 'center', color: '#fff' }}>{trade.symbol}</td>
                          <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                            <span style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, background: trade.outcome === 'win' ? 'rgba(34,197,94,0.15)' : trade.outcome === 'loss' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)', color: trade.outcome === 'win' ? '#22c55e' : trade.outcome === 'loss' ? '#ef4444' : '#888' }}>
                              {trade.outcome === 'win' ? 'WIN' : trade.outcome === 'loss' ? 'LOSS' : 'BE'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 600, fontSize: '16px', color: pnlValue >= 0 ? '#22c55e' : '#ef4444' }}>{pnlValue >= 0 ? '+' : ''}${pnlValue.toFixed(0)}</td>
                          <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: '14px', color: '#fff' }}>{extra.riskPercent || '1'}%</td>
                          <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: '14px', color: '#fff' }}>{trade.rr || '-'}</td>
                          {customInputs.map(inp => (
                            <td key={inp.id} style={{ padding: '14px 12px', textAlign: 'center', fontSize: '14px', color: '#fff' }}>
                              {inp.type === 'rating' ? (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>
                                  {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= parseInt(extra[inp.id] || 0) ? '#22c55e' : '#2a2a35', fontSize: '14px' }}>★</span>)}
                                </div>
                              ) : inp.id === 'image' && extra[inp.id] ? (
                                <button onClick={() => setShowExpandedImage(extra[inp.id])} style={{ width: '30px', height: '30px', background: '#1a1a22', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>
                                </button>
                              ) : inp.id === 'notes' && (trade.notes || extra[inp.id]) ? (
                                <button onClick={() => setShowExpandedNote(trade.notes || extra[inp.id])} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#888', fontSize: '13px' }}>View</button>
                              ) : (
                                <span style={{ color: inp.id === 'confidence' && extra[inp.id] === 'High' ? '#22c55e' : inp.id === 'confidence' && extra[inp.id] === 'Low' ? '#ef4444' : inp.id === 'direction' ? (trade.direction === 'long' ? '#22c55e' : '#ef4444') : '#fff' }}>
                                  {inp.id === 'direction' ? trade.direction?.toUpperCase() : extra[inp.id] || '-'}
                                </span>
                              )}
                            </td>
                          ))}
                          <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: '14px', color: '#fff' }}>{new Date(trade.date).toLocaleDateString()}</td>
                          <td style={{ padding: '14px 12px', textAlign: 'center' }}><button onClick={() => deleteTrade(trade.id)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '18px' }}>×</button></td>
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
          <>
            {/* ROW 1: Stats + Graphs */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              {/* Stats Column */}
              <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { l: 'Total PnL', v: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString()}`, c: totalPnl >= 0 ? '#22c55e' : '#ef4444' },
                  { l: 'Winrate', v: `${winrate}%`, c: winrate >= 50 ? '#22c55e' : '#ef4444' },
                  { l: 'Profit Factor', v: profitFactor, c: '#fff' },
                  { l: 'Avg Win', v: `+$${avgWin}`, c: '#22c55e' },
                  { l: 'Avg Loss', v: `-$${avgLoss}`, c: '#ef4444' },
                  { l: 'Streak', v: `${streaks.cs >= 0 ? '+' : ''}${streaks.cs}`, c: streaks.cs >= 0 ? '#22c55e' : '#ef4444' },
                  { l: 'Best Pair', v: mostTradedPair, c: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#888' }}>{s.l}</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: s.c }}>{s.v}</span>
                  </div>
                ))}
                <div style={{ background: '#0d0d12', border: '2px solid #22c55e', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#888' }}>Total Trades</span>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#22c55e' }}>{trades.length}</span>
                </div>
              </div>

              {/* Graphs */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Equity Curve */}
                <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px', height: '180px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', color: '#888', textTransform: 'uppercase' }}>Equity Curve</span>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                      <span style={{ color: '#888' }}>Start: <span style={{ color: '#fff' }}>${startingBalance.toLocaleString()}</span></span>
                      <span style={{ color: '#888' }}>Current: <span style={{ color: '#22c55e' }}>${currentBalance.toLocaleString()}</span></span>
                    </div>
                  </div>
                  <div style={{ height: 'calc(100% - 30px)', position: 'relative', display: 'flex' }}>
                    {(() => {
                      if (trades.length < 2) return <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Need 2+ trades</div>
                      const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
                      let cum = startingBalance
                      const pts = [{ y: cum, date: 'Start', pnl: 0 }]
                      sorted.forEach(t => { cum += parseFloat(t.pnl) || 0; pts.push({ y: cum, date: t.date, pnl: parseFloat(t.pnl), symbol: t.symbol }) })
                      const minY = Math.min(...pts.map(p => p.y)), maxY = Math.max(...pts.map(p => p.y)), range = maxY - minY || 1
                      const yAxisLabels = [maxY, minY + range * 0.66, minY + range * 0.33, minY]
                      
                      return (
                        <>
                          {/* Y-Axis */}
                          <div style={{ width: '55px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '8px', boxSizing: 'border-box' }}>
                            {yAxisLabels.map((val, i) => (
                              <span key={i} style={{ fontSize: '10px', color: '#666', textAlign: 'right' }}>${Math.round(val).toLocaleString()}</span>
                            ))}
                          </div>
                          {/* Chart */}
                          <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #2a2a35', borderBottom: '1px solid #2a2a35' }}>
                            <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 100 100" preserveAspectRatio="none"
                              onMouseMove={e => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                const xPct = (e.clientX - rect.left) / rect.width
                                const idx = Math.round(xPct * (pts.length - 1))
                                const pt = pts[Math.max(0, Math.min(pts.length - 1, idx))]
                                setTooltip({ date: pt.date === 'Start' ? 'Start' : new Date(pt.date).toLocaleDateString(), value: pt.y, extra: pt.symbol ? { text: `${pt.symbol}: ${pt.pnl >= 0 ? '+' : ''}$${pt.pnl}`, color: pt.pnl >= 0 ? '#22c55e' : '#ef4444' } : null })
                              }}
                              onMouseLeave={() => setTooltip(null)}
                            >
                              <defs><linearGradient id="eqG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" /><stop offset="100%" stopColor="#22c55e" stopOpacity="0" /></linearGradient></defs>
                              <polygon points={pts.map((p, i) => `${(i / (pts.length - 1)) * 100},${100 - ((p.y - minY) / range) * 100}`).join(' ') + ' 100,100 0,100'} fill="url(#eqG)" />
                              <polyline points={pts.map((p, i) => `${(i / (pts.length - 1)) * 100},${100 - ((p.y - minY) / range) * 100}`).join(' ')} fill="none" stroke="#22c55e" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                            </svg>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>

                {/* Bar Chart */}
                <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px', height: '180px', display: 'flex', gap: '16px', overflow: 'hidden' }}>
                  <div style={{ flex: 1 }}>
                    {(() => {
                      const groupedData = {}
                      const customSelects = getCustomSelectInputs()
                      trades.forEach(t => {
                        let key
                        if (graphGroupBy === 'symbol') key = t.symbol
                        else if (['direction', 'session', 'confidence', 'timeframe'].includes(graphGroupBy)) {
                          key = graphGroupBy === 'direction' ? t.direction : getExtraData(t)[graphGroupBy]
                        } else {
                          key = getExtraData(t)[graphGroupBy]
                        }
                        if (!key || key === 'Unknown') return
                        if (!groupedData[key]) groupedData[key] = { w: 0, l: 0, pnl: 0, count: 0 }
                        groupedData[key].count++
                        groupedData[key].pnl += parseFloat(t.pnl) || 0
                        if (t.outcome === 'win') groupedData[key].w++
                        else if (t.outcome === 'loss') groupedData[key].l++
                      })
                      
                      const entries = Object.entries(groupedData).map(([name, d]) => {
                        const wr = d.w + d.l > 0 ? Math.round((d.w / (d.w + d.l)) * 100) : 0
                        let val, disp
                        if (barGraphMetric === 'winrate') { val = wr; disp = wr + '%' }
                        else if (barGraphMetric === 'pnl') { val = d.pnl; disp = (d.pnl >= 0 ? '+' : '') + '$' + Math.round(d.pnl) }
                        else if (barGraphMetric === 'avgpnl') { val = d.count > 0 ? d.pnl / d.count : 0; disp = (val >= 0 ? '+' : '') + '$' + Math.round(val) }
                        else { val = d.count; disp = d.count.toString() }
                        return { name, val, disp }
                      }).sort((a, b) => b.val - a.val).slice(0, 8)
                      
                      if (entries.length === 0) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>No data</div>
                      const maxVal = barGraphMetric === 'winrate' ? 100 : Math.max(...entries.map(e => Math.abs(e.val)), 1)
                      const yAxisLabels = barGraphMetric === 'winrate' ? ['100%', '75%', '50%', '25%', '0%'] : [maxVal, maxVal * 0.75, maxVal * 0.5, maxVal * 0.25, 0].map(v => barGraphMetric === 'count' ? Math.round(v) : (v >= 0 ? '+' : '') + '$' + Math.round(v))
                      
                      return (
                        <div style={{ height: '100%', display: 'flex' }}>
                          {/* Y-Axis */}
                          <div style={{ width: '50px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '8px', paddingBottom: '22px', boxSizing: 'border-box' }}>
                            {yAxisLabels.map((val, i) => (
                              <span key={i} style={{ fontSize: '9px', color: '#666', textAlign: 'right' }}>{val}</span>
                            ))}
                          </div>
                          {/* Chart Area */}
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #2a2a35', overflow: 'hidden' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '4px', borderBottom: '1px solid #2a2a35', overflow: 'hidden' }}>
                              {entries.map((item, i) => {
                                const hPct = Math.max((Math.abs(item.val) / maxVal) * 100, 5)
                                const isGreen = barGraphMetric === 'winrate' ? item.val >= 50 : item.val >= 0
                                return (
                                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}
                                    onMouseEnter={() => setTooltip({ date: item.name, value: item.val, extra: { text: item.disp, color: isGreen ? '#22c55e' : '#ef4444' } })}
                                    onMouseLeave={() => setTooltip(null)}
                                  >
                                    <div style={{ fontSize: '11px', color: isGreen ? '#22c55e' : '#ef4444', marginBottom: '3px', fontWeight: 600 }}>{item.disp}</div>
                                    <div style={{ width: '100%', height: `${hPct}%`, background: isGreen ? '#22c55e' : '#ef4444', borderRadius: '3px 3px 0 0' }} />
                                  </div>
                                )
                              })}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', paddingTop: '6px' }}>
                              {entries.map((item, i) => <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '10px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>)}
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                    <div style={{ padding: '10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px' }}>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Show</div>
                      <select value={barGraphMetric} onChange={e => setBarGraphMetric(e.target.value)} style={{ width: '110px', padding: '6px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '12px' }}>
                        <option value="winrate">Winrate</option>
                        <option value="pnl">PnL</option>
                        <option value="avgpnl">Avg PnL</option>
                        <option value="count">Count</option>
                      </select>
                    </div>
                    <div style={{ padding: '10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px' }}>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>Group by</div>
                      <select value={graphGroupBy} onChange={e => setGraphGroupBy(e.target.value)} style={{ width: '110px', padding: '6px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '12px' }}>
                        <option value="symbol">Pairs</option>
                        <option value="direction">Direction</option>
                        <option value="session">Session</option>
                        <option value="confidence">Confidence</option>
                        <option value="timeframe">Timeframe</option>
                        {getCustomSelectInputs().filter(i => !['direction', 'session', 'confidence', 'timeframe'].includes(i.id)).map(inp => (
                          <option key={inp.id} value={inp.id}>{inp.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 2: Direction/Bullish bars + Daily PnL + Avg Rating + Day of Week */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {/* Top thin bars: Direction Split + Bullish/Bearish */}
              <div style={{ display: 'flex', gap: '16px' }}>
                {/* Direction Split Bar */}
                <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Direction</span>
                    <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>{longPct}% Long</span>
                    <div style={{ flex: 1, height: '10px', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${longPct}%`, background: '#22c55e' }} />
                      <div style={{ width: `${100 - longPct}%`, background: '#ef4444' }} />
                    </div>
                    <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>{100 - longPct}% Short</span>
                  </div>
                </div>
                {/* Bullish/Bearish Bar */}
                <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '12px 16px' }}>
                  {(() => {
                    const bullishPct = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 50
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Sentiment</span>
                        <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>{bullishPct}% Bullish</span>
                        <div style={{ flex: 1, height: '10px', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                          <div style={{ width: `${bullishPct}%`, background: '#22c55e' }} />
                          <div style={{ width: `${100 - bullishPct}%`, background: '#ef4444' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>{100 - bullishPct}% Bearish</span>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* Main row: Daily PnL + Two widgets */}
              <div style={{ display: 'flex', gap: '16px' }}>
                {/* Daily PnL Chart - all bars upward */}
                <div style={{ flex: 2, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>Daily PnL</div>
                  <div style={{ height: '140px', display: 'flex' }}>
                    {trades.length === 0 ? <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>No data</div> : (() => {
                      const sortedTrades = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
                      const maxAbs = Math.max(...sortedTrades.map(t => Math.abs(parseFloat(t.pnl) || 0)), 1)
                      const yAxisLabels = ['$' + Math.round(maxAbs), '$' + Math.round(maxAbs * 0.66), '$' + Math.round(maxAbs * 0.33), '$0']
                      
                      return (
                        <>
                          {/* Y-Axis */}
                          <div style={{ width: '45px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '8px', boxSizing: 'border-box' }}>
                            {yAxisLabels.map((val, i) => (
                              <span key={i} style={{ fontSize: '9px', color: '#666', textAlign: 'right' }}>{val}</span>
                            ))}
                          </div>
                          {/* Chart - all bars grow upward */}
                          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '2px', padding: '0 4px', borderLeft: '1px solid #2a2a35', borderBottom: '1px solid #2a2a35' }}>
                            {sortedTrades.map((t, i) => {
                              const pnl = parseFloat(t.pnl) || 0
                              const hPct = (Math.abs(pnl) / maxAbs) * 100
                              return (
                                <div key={i} style={{ flex: 1, minWidth: '4px', maxWidth: '24px', height: '100%', display: 'flex', alignItems: 'flex-end' }}
                                  onMouseEnter={() => setTooltip({ date: new Date(t.date).toLocaleDateString(), value: Math.abs(pnl), extra: { text: `${t.symbol}: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(0)}`, color: pnl >= 0 ? '#22c55e' : '#ef4444' } })}
                                  onMouseLeave={() => setTooltip(null)}
                                >
                                  <div style={{ width: '100%', height: `${Math.max(hPct, 3)}%`, background: pnl >= 0 ? '#22c55e' : '#ef4444', borderRadius: '2px 2px 0 0' }} />
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>

                {/* Right widgets column */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Average Rating Widget */}
                  <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>Average Rating</div>
                    <div style={{ display: 'flex', gap: '6px' }}>{[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= Math.round(parseFloat(avgRating)) ? '#22c55e' : '#2a2a35', fontSize: '32px' }}>★</span>)}</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>{avgRating}</div>
                  </div>

                  {/* Day of Week PnL Bar */}
                  <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '10px' }}>PnL by Day</div>
                    {(() => {
                      const dayNames = ['M', 'T', 'W', 'T', 'F']
                      const dayPnL = [0, 0, 0, 0, 0]
                      trades.forEach(t => {
                        const day = new Date(t.date).getDay()
                        if (day >= 1 && day <= 5) dayPnL[day - 1] += parseFloat(t.pnl) || 0
                      })
                      const totalProfit = dayPnL.reduce((s, v) => s + (v > 0 ? v : 0), 0) || 1
                      const totalLoss = Math.abs(dayPnL.reduce((s, v) => s + (v < 0 ? v : 0), 0)) || 1
                      
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {/* Bar */}
                          <div style={{ display: 'flex', height: '24px', borderRadius: '4px', overflow: 'hidden' }}>
                            {dayPnL.map((pnl, i) => {
                              const proportion = pnl >= 0 ? (pnl / totalProfit) * 100 : (Math.abs(pnl) / totalLoss) * 100
                              const minWidth = Math.max(proportion * 0.8, 8)
                              return (
                                <div key={i} style={{ flex: minWidth, background: pnl >= 0 ? '#22c55e' : '#ef4444', borderRight: i < 4 ? '2px solid #0a0a0f' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#fff' }}>{dayNames[i]}</span>
                                </div>
                              )
                            })}
                          </div>
                          {/* Labels */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#666' }}>
                            {dayPnL.map((pnl, i) => (
                              <span key={i} style={{ color: pnl >= 0 ? '#22c55e' : '#ef4444' }}>{pnl >= 0 ? '+' : ''}{Math.round(pnl)}</span>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 3: Stats + Donut + Trade Analysis */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              {/* Stats + Mini Chart + Donut */}
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px', display: 'flex' }}>
                <div style={{ width: '180px' }}>
                  {[
                    { l: 'Avg. Trend', v: avgTrend },
                    { l: 'Avg. Rating', v: avgRating + '★' },
                    { l: 'Avg Trade PnL', v: (avgPnl >= 0 ? '+' : '') + '$' + avgPnl },
                    { l: 'Most Traded', v: mostTradedPair },
                    { l: 'Most Used RR', v: mostUsedRR },
                    { l: 'Best RR', v: bestRR },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 5 ? '1px solid #1a1a22' : 'none' }}>
                      <span style={{ fontSize: '13px', color: '#888' }}>{item.l}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{item.v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ width: '1px', background: '#1a1a22', margin: '0 12px' }} />
                {/* Mini Win/Loss Ratio Chart */}
                <div style={{ width: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', marginBottom: '6px' }}>Win/Loss</div>
                  <div style={{ width: '60px', height: '60px', position: 'relative' }}>
                    <svg width="60" height="60" viewBox="0 0 60 60">
                      <circle cx="30" cy="30" r="24" fill="none" stroke="#1a1a22" strokeWidth="8" />
                      <circle cx="30" cy="30" r="24" fill="none" stroke="#22c55e" strokeWidth="8" 
                        strokeDasharray={`${(wins / Math.max(wins + losses, 1)) * 150.8} 150.8`} 
                        transform="rotate(-90 30 30)" strokeLinecap="round" />
                    </svg>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: '#fff' }}>{wins}/{losses}</div>
                  </div>
                </div>
                <div style={{ width: '1px', background: '#1a1a22', margin: '0 12px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '100px' }}>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px', textTransform: 'uppercase' }}>Best Pair</div>
                  {(() => {
                    const ps = {}
                    trades.forEach(t => { if (!ps[t.symbol]) ps[t.symbol] = { w: 0, l: 0, pnl: 0 }; if (t.outcome === 'win') ps[t.symbol].w++; else if (t.outcome === 'loss') ps[t.symbol].l++; ps[t.symbol].pnl += parseFloat(t.pnl) || 0 })
                    const best = Object.entries(ps).sort((a, b) => b[1].pnl - a[1].pnl)[0]
                    if (!best) return <div style={{ color: '#666' }}>No data</div>
                    const wr = best[1].w + best[1].l > 0 ? Math.round((best[1].w / (best[1].w + best[1].l)) * 100) : 0
                    const size = 80, stroke = 8, r = (size - stroke) / 2, c = 2 * Math.PI * r
                    return (
                      <>
                        <div style={{ position: 'relative', width: size, height: size }}>
                          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ef4444" strokeWidth={stroke} />
                            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#22c55e" strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c * (1 - wr/100)} strokeLinecap="round" />
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>{best[0]}</div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>{wr}%</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '10px' }}>
                          <span><span style={{ color: '#22c55e' }}>●</span> W</span>
                          <span><span style={{ color: '#ef4444' }}>●</span> L</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Trade Analysis */}
              <div style={{ width: '280px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '13px', color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>Trade Analysis</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <select value={analysisGroupBy} onChange={e => setAnalysisGroupBy(e.target.value)} style={{ flex: 1, padding: '8px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px' }}>
                    <option value="direction">Direction</option>
                    <option value="confidence">Confidence</option>
                    <option value="session">Session</option>
                    <option value="timeframe">Timeframe</option>
                    {getCustomSelectInputs().filter(i => !['direction', 'session', 'confidence', 'timeframe'].includes(i.id)).map(inp => (
                      <option key={inp.id} value={inp.id}>{inp.label}</option>
                    ))}
                  </select>
                  <select value={analysisMetric} onChange={e => setAnalysisMetric(e.target.value)} style={{ flex: 1, padding: '8px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px' }}>
                    <option value="avgpnl">Avg PnL</option>
                    <option value="winrate">Winrate</option>
                    <option value="pnl">Total PnL</option>
                    <option value="count">Count</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(() => {
                    const groups = {}
                    trades.forEach(t => {
                      let key
                      if (analysisGroupBy === 'direction') key = t.direction?.toUpperCase()
                      else key = getExtraData(t)[analysisGroupBy]
                      if (!key) return
                      if (!groups[key]) groups[key] = { w: 0, l: 0, pnl: 0, count: 0 }
                      groups[key].count++
                      groups[key].pnl += parseFloat(t.pnl) || 0
                      if (t.outcome === 'win') groups[key].w++
                      else if (t.outcome === 'loss') groups[key].l++
                    })
                    return Object.entries(groups).slice(0, 4).map(([name, data]) => {
                      let val, disp
                      if (analysisMetric === 'avgpnl') { val = data.count > 0 ? data.pnl / data.count : 0; disp = (val >= 0 ? '+' : '') + '$' + Math.round(val) + '/trade' }
                      else if (analysisMetric === 'winrate') { val = (data.w + data.l) > 0 ? (data.w / (data.w + data.l)) * 100 : 0; disp = Math.round(val) + '%' }
                      else if (analysisMetric === 'pnl') { val = data.pnl; disp = (val >= 0 ? '+' : '') + '$' + Math.round(val) }
                      else { val = data.count; disp = data.count + ' trades' }
                      return (
                        <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', color: '#fff' }}>{name}:</span>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: val >= 0 ? '#22c55e' : '#ef4444' }}>{disp}</span>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* Expectancy widgets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '140px' }}>
                <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '6px' }}>Avg Loss Exp.</div>
                  <div style={{ fontSize: '24px', fontWeight: 700, color: '#ef4444' }}>-${lossExpectancy}</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>per trade</div>
                </div>
                <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '6px' }}>Expectancy</div>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: parseFloat(expectancy) >= 0 ? '#22c55e' : '#ef4444' }}>${expectancy}</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>per trade</div>
                </div>
              </div>
            </div>

            {/* ROW 4: Performance + Streaks */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '13px', color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>Performance</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  {[
                    { l: 'Best Day', v: bestDay ? `+$${Math.round(bestDay.pnl)}` : '-', c: '#22c55e' },
                    { l: 'Worst Day', v: worstDay ? `$${Math.round(worstDay.pnl)}` : '-', c: '#ef4444' },
                    { l: 'Biggest Win', v: `+$${biggestWin}`, c: '#22c55e' },
                    { l: 'Biggest Loss', v: `$${biggestLoss}`, c: '#ef4444' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '12px', background: '#0a0a0e', borderRadius: '6px', border: '1px solid #1a1a22' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#666' }}>{item.l}</span>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: item.c }}>{item.v}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '13px', color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>Streaks & Consistency</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  {[
                    { l: 'Max Wins', v: streaks.mw, c: '#22c55e' },
                    { l: 'Max Losses', v: streaks.ml, c: '#ef4444' },
                    { l: 'Days', v: tradingDays, c: '#fff' },
                    { l: 'Trades/Day', v: avgTradesPerDay, c: '#fff' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '12px', background: '#0a0a0e', borderRadius: '6px', border: '1px solid #1a1a22' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#666' }}>{item.l}</span>
                        <span style={{ fontSize: '18px', fontWeight: 700, color: item.c }}>{item.v}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ROW 5: Risk + Progress + Sessions */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '13px', color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>Risk Management</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { l: 'Avg RR', v: avgRR + 'R', c: '#fff' },
                    { l: 'Risk/Reward', v: returnOnRisk + 'x', c: '#22c55e' },
                    { l: 'Profit Factor', v: profitFactor, c: '#fff' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '12px', background: '#0a0a0e', borderRadius: '6px', border: '1px solid #1a1a22', textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{item.l}</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: item.c }}>{item.v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '13px', color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>Account Progress</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { l: 'Starting', v: '$' + startingBalance.toLocaleString(), c: '#888' },
                    { l: 'Current', v: '$' + currentBalance.toLocaleString(), c: '#22c55e' },
                    { l: 'Growth', v: ((currentBalance / startingBalance - 1) * 100).toFixed(1) + '%', c: currentBalance >= startingBalance ? '#22c55e' : '#ef4444' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '12px', background: '#0a0a0e', borderRadius: '6px', border: '1px solid #1a1a22', textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{item.l}</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: item.c }}>{item.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              {['daily', 'weekly', 'custom'].map(sub => (
                <button key={sub} onClick={() => setNotesSubTab(sub)} style={{ padding: '12px 24px', background: notesSubTab === sub ? '#22c55e' : 'transparent', border: notesSubTab === sub ? 'none' : '1px solid #2a2a35', borderRadius: '8px', color: notesSubTab === sub ? '#fff' : '#888', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{sub}</button>
              ))}
            </div>

            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: '#888', textTransform: 'uppercase' }}>Write {notesSubTab} Note</span>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {notesSubTab === 'custom' && <input type="text" placeholder="Note title..." value={customNoteTitle} onChange={e => setCustomNoteTitle(e.target.value)} style={{ padding: '8px 12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '160px' }} />}
                  <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} style={{ padding: '8px 12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px' }} />
                </div>
              </div>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder={`Write your ${notesSubTab} note...`} style={{ width: '100%', minHeight: '140px', padding: '14px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', lineHeight: '1.6', resize: 'vertical', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button onClick={saveNote} disabled={!noteText.trim()} style={{ padding: '12px 24px', background: noteText.trim() ? '#22c55e' : '#1a1a22', border: 'none', borderRadius: '8px', color: noteText.trim() ? '#fff' : '#666', fontWeight: 600, fontSize: '14px', cursor: noteText.trim() ? 'pointer' : 'not-allowed' }}>Save Note</button>
              </div>
            </div>

            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '20px' }}>
              <span style={{ fontSize: '13px', color: '#888', textTransform: 'uppercase' }}>{notesSubTab} Notes</span>
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
                {notesSubTab === 'custom' ? (
                  (notes.custom || []).length === 0 ? <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No custom notes yet.</div> : (notes.custom || []).map((note, idx) => (
                    <div key={idx} style={{ padding: '16px', background: '#0a0a0e', borderRadius: '8px', border: '1px solid #1a1a22' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '14px', color: '#22c55e', fontWeight: 600 }}>{note.title}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '12px', color: '#666' }}>{new Date(note.date).toLocaleDateString()}</span>
                          <button onClick={() => deleteNote('custom', idx)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '16px' }}>×</button>
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', color: '#fff', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{note.text}</div>
                    </div>
                  ))
                ) : (
                  Object.keys(notes[notesSubTab] || {}).length === 0 ? <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No {notesSubTab} notes yet.</div> : Object.entries(notes[notesSubTab] || {}).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([date, text]) => (
                    <div key={date} style={{ padding: '16px', background: '#0a0a0e', borderRadius: '8px', border: '1px solid #1a1a22' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '14px', color: '#22c55e', fontWeight: 600 }}>{new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <button onClick={() => deleteNote(notesSubTab, date)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '16px' }}>×</button>
                      </div>
                      <div style={{ fontSize: '14px', color: '#fff', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{text}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODALS */}
      {showAddTrade && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowAddTrade(false)}>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '28px', width: '560px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px', color: '#fff' }}>Log New Trade</h2>
            
            {/* Fixed inputs row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
              {fixedInputs.map(input => (
                <div key={input.id}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase' }}>{input.label} {input.required && <span style={{ color: '#ef4444' }}>*</span>}</label>
                  {input.type === 'select' ? (
                    <select value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}>
                      {input.options?.map(o => <option key={o} value={o.toLowerCase()}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={input.type} value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} step={input.type === 'number' ? '0.01' : undefined} style={{ width: '100%', padding: '10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                  )}
                </div>
              ))}
            </div>

            {/* Custom inputs section */}
            {customInputs.length > 0 && (
              <>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '10px', textTransform: 'uppercase' }}>Additional Fields</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  {customInputs.map(input => (
                    <div key={input.id} style={{ gridColumn: input.type === 'textarea' ? 'span 2' : 'span 1' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase' }}>{input.label}</label>
                      {input.type === 'select' ? (
                        <select value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}>
                          {input.options?.map(o => <option key={o} value={o.toLowerCase()}>{o}</option>)}
                        </select>
                      ) : input.type === 'textarea' ? (
                        <textarea value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} rows={3} style={{ width: '100%', padding: '10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', resize: 'none', boxSizing: 'border-box' }} />
                      ) : input.type === 'rating' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>{[1,2,3,4,5].map(i => <button key={i} type="button" onClick={() => setTradeForm({...tradeForm, [input.id]: String(i)})} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '24px', color: i <= parseInt(tradeForm[input.id] || 0) ? '#22c55e' : '#333' }}>★</button>)}</div>
                      ) : (
                        <input type={input.type} value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} style={{ width: '100%', padding: '10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={addTrade} disabled={saving || !tradeForm.symbol || !tradeForm.pnl} style={{ flex: 1, padding: '14px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: (saving || !tradeForm.symbol || !tradeForm.pnl) ? 0.5 : 1 }}>{saving ? 'Saving...' : 'Save Trade'}</button>
              <button onClick={() => setShowAddTrade(false)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showEditInputs && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 101 }} onClick={() => setShowEditInputs(false)}>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '28px', width: '520px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px', color: '#fff' }}>Customize Columns</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {inputs.map((input, i) => (
                <div key={input.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: input.fixed ? '#141418' : '#0a0a0e', borderRadius: '6px', opacity: input.fixed ? 0.7 : 1 }}>
                  <input type="checkbox" checked={input.enabled} onChange={e => !input.fixed && updateInput(i, 'enabled', e.target.checked)} disabled={input.fixed} style={{ width: '18px', height: '18px' }} />
                  <input type="text" value={input.label} onChange={e => updateInput(i, 'label', e.target.value)} disabled={input.fixed} style={{ flex: 1, padding: '8px 12px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px' }} />
                  <select value={input.type} onChange={e => updateInput(i, 'type', e.target.value)} disabled={input.fixed} style={{ padding: '8px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '6px', color: '#888', fontSize: '12px' }}>
                    {['text', 'number', 'date', 'select', 'textarea', 'rating'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {input.type === 'select' && !input.fixed && <button onClick={() => openOptionsEditor(i)} style={{ padding: '6px 12px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px', cursor: 'pointer' }}>Opts</button>}
                  {!input.fixed && <button onClick={() => deleteInput(i)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}>×</button>}
                  {input.fixed && <span style={{ fontSize: '10px', color: '#666', padding: '4px 8px', background: '#1a1a22', borderRadius: '4px' }}>Fixed</span>}
                </div>
              ))}
            </div>
            <button onClick={addNewInput} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px dashed #2a2a35', borderRadius: '8px', color: '#888', fontSize: '13px', cursor: 'pointer', marginBottom: '20px' }}>+ Add New Field</button>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={saveInputs} style={{ flex: 1, padding: '14px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Save</button>
              <button onClick={() => setShowEditInputs(false)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editingOptions !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 102 }} onClick={() => setEditingOptions(null)}>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '28px', width: '360px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#fff' }}>Edit Options</h2>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>One option per line</p>
            <textarea value={optionsText} onChange={e => setOptionsText(e.target.value)} rows={8} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', resize: 'none', boxSizing: 'border-box', marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={saveOptions} style={{ flex: 1, padding: '14px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save</button>
              <button onClick={() => setEditingOptions(null)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showExpandedNote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowExpandedNote(null)}>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '28px', width: '520px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#fff' }}>Notes</h2>
            <div style={{ background: '#0a0a0e', borderRadius: '6px', padding: '16px', maxHeight: '320px', overflowY: 'auto', fontSize: '14px', color: '#fff', lineHeight: '1.7' }}>{showExpandedNote}</div>
            <button onClick={() => setShowExpandedNote(null)} style={{ marginTop: '16px', width: '100%', padding: '14px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontWeight: 600, cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}

      {showExpandedImage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowExpandedImage(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={showExpandedImage} alt="Trade" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px' }} />
            <button onClick={() => setShowExpandedImage(null)} style={{ position: 'absolute', top: '-50px', right: '0', background: 'transparent', border: 'none', color: '#888', fontSize: '32px', cursor: 'pointer' }}>×</button>
          </div>
        </div>
      )}
    </div>
  )
}
