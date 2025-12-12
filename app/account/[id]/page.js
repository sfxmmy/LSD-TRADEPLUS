'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const defaultInputs = [
  { id: 'symbol', label: 'Symbol', type: 'text', required: true, enabled: true },
  { id: 'outcome', label: 'Win/Loss', type: 'select', options: ['Win', 'Loss', 'Breakeven'], required: true, enabled: true },
  { id: 'riskPercent', label: '% Risked', type: 'number', required: false, enabled: true },
  { id: 'rr', label: 'RR', type: 'number', required: false, enabled: true },
  { id: 'image', label: 'Image URL', type: 'text', required: false, enabled: true },
  { id: 'direction', label: 'Trend', type: 'select', options: ['Long', 'Short'], required: false, enabled: true },
  { id: 'confidence', label: 'Confidence', type: 'select', options: ['High', 'Medium', 'Low'], required: false, enabled: true },
  { id: 'rating', label: 'Rating', type: 'rating', required: false, enabled: true },
  { id: 'notes', label: 'Notes', type: 'textarea', required: false, enabled: true },
  { id: 'date', label: 'Date', type: 'date', required: true, enabled: true },
  { id: 'timeframe', label: 'Timeframe', type: 'select', options: ['1m', '5m', '15m', '30m', '1H', '4H', 'Daily'], required: false, enabled: true },
  { id: 'session', label: 'Session', type: 'select', options: ['London', 'New York', 'Asian', 'Overlap'], required: false, enabled: true },
  { id: 'pnl', label: 'PnL ($)', type: 'number', required: true, enabled: true },
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
  const [hoveredBar, setHoveredBar] = useState(null)

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
    if (accountData.custom_inputs) { try { setInputs(JSON.parse(accountData.custom_inputs)) } catch {} }
    if (accountData.notes_data) { try { setNotes(JSON.parse(accountData.notes_data)) } catch {} }
    const { data: tradesData } = await supabase.from('trades').select('*').eq('account_id', accountId).order('date', { ascending: false })
    setTrades(tradesData || [])
    setLoading(false)
  }

  async function addTrade() {
    if (!tradeForm.symbol || !tradeForm.pnl) return
    setSaving(true)
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data, error } = await supabase.from('trades').insert({
      account_id: accountId,
      symbol: tradeForm.symbol?.toUpperCase(),
      direction: tradeForm.direction || 'long',
      outcome: tradeForm.outcome || 'win',
      pnl: parseFloat(tradeForm.pnl) || 0,
      rr: parseFloat(tradeForm.rr) || 0,
      date: tradeForm.date || new Date().toISOString().split('T')[0],
      notes: tradeForm.notes || '',
      image_url: tradeForm.image || '',
      extra_data: JSON.stringify({ timeframe: tradeForm.timeframe, session: tradeForm.session, confidence: tradeForm.confidence, rating: tradeForm.rating, riskPercent: tradeForm.riskPercent })
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
    setShowEditInputs(false)
  }

  async function saveNote() {
    if (!noteText.trim()) return
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const newNotes = { ...notes }
    if (notesSubTab === 'daily') {
      newNotes.daily = { ...newNotes.daily, [noteDate]: noteText }
    } else if (notesSubTab === 'weekly') {
      const weekStart = getWeekStart(noteDate)
      newNotes.weekly = { ...newNotes.weekly, [weekStart]: noteText }
    } else {
      newNotes.custom = [...(newNotes.custom || []), { title: customNoteTitle || 'Note', text: noteText, date: new Date().toISOString() }]
    }
    await supabase.from('accounts').update({ notes_data: JSON.stringify(newNotes) }).eq('id', accountId)
    setNotes(newNotes)
    setNoteText('')
    setCustomNoteTitle('')
  }

  async function deleteNote(type, key) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const newNotes = { ...notes }
    if (type === 'daily') { delete newNotes.daily[key] }
    else if (type === 'weekly') { delete newNotes.weekly[key] }
    else { newNotes.custom = notes.custom.filter((_, i) => i !== key) }
    await supabase.from('accounts').update({ notes_data: JSON.stringify(newNotes) }).eq('id', accountId)
    setNotes(newNotes)
  }

  function getWeekStart(dateStr) {
    const d = new Date(dateStr)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff)).toISOString().split('T')[0]
  }

  function addNewInput() { setInputs([...inputs, { id: `custom_${Date.now()}`, label: 'New Field', type: 'text', required: false, enabled: true, options: [] }]) }
  function updateInput(i, f, v) { const n = [...inputs]; n[i] = { ...n[i], [f]: v }; setInputs(n) }
  function deleteInput(i) { setInputs(inputs.filter((_, idx) => idx !== i)) }
  function openOptionsEditor(i) { setEditingOptions(i); setOptionsText((inputs[i].options || []).join('\n')) }
  function saveOptions() { if (editingOptions === null) return; updateInput(editingOptions, 'options', optionsText.split('\n').map(o => o.trim()).filter(o => o)); setEditingOptions(null); setOptionsText('') }
  function getExtraData(t) { try { return JSON.parse(t.extra_data || '{}') } catch { return {} } }
  function getDaysAgo(d) { const diff = Math.floor((new Date() - new Date(d)) / 86400000); return diff === 0 ? 'Today' : diff === 1 ? '1d ago' : `${diff}d ago` }

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

  const avgRating = trades.length > 0 ? (trades.reduce((s, t) => s + (parseInt(getExtraData(t).rating) || 0), 0) / trades.length).toFixed(1) : '0'
  const avgPnl = trades.length > 0 ? Math.round(totalPnl / trades.length) : 0
  const avgRR = trades.length > 0 ? (trades.reduce((s, t) => s + (parseFloat(t.rr) || 0), 0) / trades.length).toFixed(1) : '0'
  const mostTradedPair = (() => { const c = {}; trades.forEach(t => c[t.symbol] = (c[t.symbol] || 0) + 1); return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || '-' })()
  const mostUsedRR = (() => { const c = {}; trades.forEach(t => { const rr = Math.round(parseFloat(t.rr) || 0); if (rr > 0) c[rr] = (c[rr] || 0) + 1 }); const best = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return best ? best[0] + 'R' : '-' })()
  const bestRR = (() => { const best = trades.filter(t => t.outcome === 'win').sort((a, b) => (parseFloat(b.rr) || 0) - (parseFloat(a.rr) || 0))[0]; return best ? `${best.rr}R (100%)` : '-' })()
  const avgTrend = trades.filter(t => t.direction === 'long').length >= trades.filter(t => t.direction === 'short').length ? 'Long' : 'Short'
  const longCount = trades.filter(t => t.direction === 'long').length
  const shortCount = trades.filter(t => t.direction === 'short').length
  const longPct = Math.round((longCount / (longCount + shortCount || 1)) * 100)

  const bestDay = (() => { const byDay = {}; trades.forEach(t => { const d = t.date; byDay[d] = (byDay[d] || 0) + (parseFloat(t.pnl) || 0) }); const best = Object.entries(byDay).sort((a, b) => b[1] - a[1])[0]; return best ? { date: best[0], pnl: best[1] } : null })()
  const worstDay = (() => { const byDay = {}; trades.forEach(t => { const d = t.date; byDay[d] = (byDay[d] || 0) + (parseFloat(t.pnl) || 0) }); const worst = Object.entries(byDay).sort((a, b) => a[1] - b[1])[0]; return worst ? { date: worst[0], pnl: worst[1] } : null })()
  const tradingDays = new Set(trades.map(t => t.date)).size
  const avgTradesPerDay = tradingDays > 0 ? (trades.length / tradingDays).toFixed(1) : 0
  const biggestWin = Math.max(...trades.map(t => parseFloat(t.pnl) || 0), 0)
  const biggestLoss = Math.min(...trades.map(t => parseFloat(t.pnl) || 0), 0)
  const consecutiveWins = streaks.mw
  const consecutiveLosses = streaks.ml
  const expectancy = trades.length > 0 ? ((winrate / 100) * avgWin - ((100 - winrate) / 100) * avgLoss).toFixed(0) : 0

  // Additional calculations
  const winsBySession = (() => { const s = {}; trades.forEach(t => { const sess = getExtraData(t).session; if (sess) { if (!s[sess]) s[sess] = { w: 0, l: 0 }; if (t.outcome === 'win') s[sess].w++; else if (t.outcome === 'loss') s[sess].l++ } }); return s })()
  const bestSession = (() => { const entries = Object.entries(winsBySession).map(([k, v]) => ({ name: k, wr: (v.w + v.l) > 0 ? Math.round((v.w / (v.w + v.l)) * 100) : 0 })); return entries.sort((a, b) => b.wr - a.wr)[0]?.name || '-' })()
  const avgHoldTime = '-'
  const returnOnRisk = trades.length > 0 && avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '-'

  const tabTitles = { trades: 'TRADES AREA', statistics: 'STATISTICS AREA', notes: 'NOTES AREA' }
  const tabDescriptions = {
    trades: 'View and manage all your logged trades. Add new trades, edit columns, and track your performance over time.',
    statistics: 'Analyze your trading performance with detailed statistics, charts, and breakdowns by pair, session, and more.',
    notes: 'Keep daily, weekly, and custom notes about your trading journey, mindset, and lessons learned.'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      {/* FIXED HEADER */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a22', background: '#0a0a0f' }}>
        <a href="/" style={{ fontSize: '22px', fontWeight: 700, textDecoration: 'none' }}><span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE+</span></a>
        <div style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px', color: '#fff' }}>{tabTitles[activeTab]}</div>
        <a href="/dashboard" style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#fff', fontSize: '14px', textDecoration: 'none' }}>← Dashboard</a>
      </header>

      {/* FIXED SUBHEADER */}
      <div style={{ position: 'fixed', top: '53px', left: '170px', right: 0, zIndex: 40, padding: '16px 24px', background: '#0a0a0f', borderBottom: '1px solid #1a1a22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{account?.name}</span>
        <div style={{ display: 'flex', gap: '12px' }}>
          {activeTab === 'trades' && (
            <button onClick={() => setShowEditInputs(true)} style={{ padding: '12px 24px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#fff', fontSize: '14px', cursor: 'pointer' }}>Edit Columns</button>
          )}
          <button onClick={() => setShowAddTrade(true)} style={{ padding: '12px 28px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>+ LOG NEW TRADE</button>
        </div>
      </div>

      {/* FIXED SIDEBAR */}
      <div style={{ position: 'fixed', top: '53px', left: 0, bottom: 0, width: '170px', padding: '16px 12px', borderRight: '1px solid #1a1a22', background: '#0a0a0f', zIndex: 45, display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          {['trades', 'statistics', 'notes'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              style={{ 
                width: '100%',
                padding: '16px 20px', 
                marginBottom: '8px',
                background: activeTab === tab ? '#22c55e' : 'transparent', 
                border: activeTab === tab ? 'none' : '1px solid #2a2a35',
                borderRadius: '8px',
                color: activeTab === tab ? '#fff' : '#888', 
                fontSize: '14px', 
                fontWeight: 600, 
                textTransform: 'uppercase', 
                cursor: 'pointer', 
                textAlign: 'center'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        {/* Info widget at bottom */}
        <div style={{ padding: '14px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', marginTop: 'auto' }}>
          <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.5' }}>{tabDescriptions[activeTab]}</div>
        </div>
      </div>

      {/* MAIN CONTENT - with offset for fixed elements */}
      <div style={{ marginLeft: '170px', marginTop: '120px', padding: '16px 24px', minHeight: 'calc(100vh - 120px)' }}>

        {/* TRADES TAB */}
        {activeTab === 'trades' && (
          <>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', overflow: 'hidden' }}>
              {trades.length === 0 ? (
                <div style={{ padding: '60px', textAlign: 'center', color: '#888', fontSize: '15px' }}>No trades yet. Click "+ LOG NEW TRADE" to add your first trade.</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#0a0a0e' }}>
                        {['Symbol', 'W/L', 'PnL', '%', 'RR', 'Trend', 'Confidence', 'Rating', 'Image', 'Notes', 'Placed', 'Date', ''].map((h, i) => (
                          <th key={i} style={{ padding: '14px 12px', textAlign: 'center', color: '#888', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid #1a1a22' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {trades.map((trade) => {
                        const extra = getExtraData(trade)
                        const pnlValue = parseFloat(trade.pnl) || 0
                        return (
                          <tr key={trade.id} style={{ borderBottom: '1px solid #141418' }}>
                            <td style={{ padding: '14px 12px', fontWeight: 600, fontSize: '15px', textAlign: 'center', color: '#fff' }}>{trade.symbol}</td>
                            <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                              <span style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: trade.outcome === 'win' ? 'rgba(34,197,94,0.15)' : trade.outcome === 'loss' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)', color: trade.outcome === 'win' ? '#22c55e' : trade.outcome === 'loss' ? '#ef4444' : '#888' }}>
                                {trade.outcome === 'win' ? 'WIN' : trade.outcome === 'loss' ? 'LOSS' : 'BE'}
                              </span>
                            </td>
                            <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 600, fontSize: '15px', color: pnlValue >= 0 ? '#22c55e' : '#ef4444' }}>{pnlValue >= 0 ? '+' : ''}${pnlValue.toFixed(0)}</td>
                            <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: '14px', color: '#fff' }}>{extra.riskPercent || '1'}%</td>
                            <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: '14px', color: '#fff' }}>{trade.rr || '-'}</td>
                            <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: '14px', color: trade.direction === 'long' ? '#22c55e' : '#ef4444' }}>{trade.direction?.toUpperCase() || '-'}</td>
                            <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                              {extra.confidence && <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '12px', background: extra.confidence === 'High' ? 'rgba(34,197,94,0.1)' : extra.confidence === 'Low' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', color: extra.confidence === 'High' ? '#22c55e' : extra.confidence === 'Low' ? '#ef4444' : '#888' }}>{extra.confidence}</span>}
                            </td>
                            <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                              <div style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>{[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= parseInt(extra.rating || 0) ? '#22c55e' : '#2a2a35', fontSize: '14px' }}>★</span>)}</div>
                            </td>
                            <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                              {trade.image_url ? (
                                <button onClick={() => setShowExpandedImage(trade.image_url)} style={{ width: '30px', height: '30px', background: '#1a1a22', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                </button>
                              ) : <div style={{ width: '30px', height: '30px', background: '#141418', borderRadius: '6px', margin: '0 auto' }} />}
                            </td>
                            <td style={{ padding: '14px 12px', maxWidth: '140px' }}>
                              {trade.notes ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '13px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{trade.notes}</span>
                                  <button onClick={() => setShowExpandedNote(trade.notes)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                                  </button>
                                </div>
                              ) : <span style={{ fontSize: '13px', color: '#444' }}>-</span>}
                            </td>
                            <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: '14px', color: '#fff' }}>{getDaysAgo(trade.date)}</td>
                            <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: '14px', color: '#fff' }}>{new Date(trade.date).getDate()}/{new Date(trade.date).getMonth()+1}</td>
                            <td style={{ padding: '14px 12px', textAlign: 'center' }}><button onClick={() => deleteTrade(trade.id)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '18px' }}>×</button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* STATISTICS TAB */}
        {activeTab === 'statistics' && (
          <>
            {/* ROW 1: Stats sidebar + Graphs */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              {/* LEFT: Stats Column */}
              <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { l: 'Total PnL', v: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString()}`, c: totalPnl >= 0 ? '#22c55e' : '#ef4444' },
                  { l: 'Winrate', v: `${winrate}%`, c: winrate >= 50 ? '#22c55e' : '#ef4444' },
                  { l: 'Profit Factor', v: profitFactor, c: '#fff' },
                  { l: 'Avg Win', v: `+$${avgWin}`, c: '#22c55e' },
                  { l: 'Avg Loss', v: `-$${avgLoss}`, c: '#ef4444' },
                  { l: 'Current Streak', v: `${streaks.cs >= 0 ? '+' : ''}${streaks.cs}`, c: streaks.cs >= 0 ? '#22c55e' : '#ef4444' },
                  { l: 'Best Pair', v: mostTradedPair, c: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#fff' }}>{s.l}</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: s.c }}>{s.v}</span>
                  </div>
                ))}
                <div style={{ background: 'linear-gradient(135deg, #1a1a22 0%, #0d0d12 100%)', border: '2px solid #22c55e', borderRadius: '8px', padding: '16px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#fff' }}>Total Trades</span>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#22c55e' }}>{trades.length}</span>
                </div>
              </div>

              {/* RIGHT: Graphs */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Equity Curve */}
                <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <span style={{ fontSize: '13px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Equity Curve</span>
                    <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
                      <span style={{ color: '#888' }}>Start: <span style={{ color: '#fff', fontWeight: 600 }}>${startingBalance.toLocaleString()}</span></span>
                      <span style={{ color: '#888' }}>Current: <span style={{ color: '#22c55e', fontWeight: 600 }}>${currentBalance.toLocaleString()}</span></span>
                      <span style={{ color: '#888' }}>Trades: <span style={{ color: '#fff', fontWeight: 600 }}>{trades.length}</span></span>
                    </div>
                  </div>
                  <div style={{ height: '140px', position: 'relative' }}>
                    {(() => {
                      if (trades.length < 2) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '14px' }}>Need at least 2 trades</div>
                      const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
                      let cumPnl = 0
                      const dataPoints = sorted.map((t, i) => { cumPnl += parseFloat(t.pnl) || 0; return { x: i, y: cumPnl, date: t.date } })
                      const minY = Math.min(...dataPoints.map(d => d.y), 0)
                      const maxY = Math.max(...dataPoints.map(d => d.y))
                      const range = maxY - minY || 1
                      
                      const chartW = 100, chartH = 100
                      const getX = (i) => (i / (dataPoints.length - 1)) * chartW
                      const getY = (y) => chartH - ((y - minY) / range) * chartH
                      const points = dataPoints.map((d, i) => `${getX(i)},${getY(d.y)}`).join(' ')
                      const areaPoints = `0,${chartH} ${points} ${chartW},${chartH}`
                      
                      const yLabels = ['$' + Math.round(maxY).toLocaleString(), '$' + Math.round((maxY + minY) / 2).toLocaleString(), '$' + Math.round(minY).toLocaleString()]
                      const xLabels = [sorted[0]?.date, sorted[sorted.length - 1]?.date].map(d => { const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth() + 1}` })
                      
                      return (
                        <div style={{ height: '100%', display: 'flex' }}>
                          <div style={{ width: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '11px', color: '#666', paddingRight: '8px', textAlign: 'right' }}>
                            {yLabels.map((l, i) => <span key={i}>{l}</span>)}
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #222', borderBottom: '1px solid #222' }}>
                              <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} preserveAspectRatio="none">
                                <defs><linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" /><stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" /></linearGradient></defs>
                                <polygon points={areaPoints} fill="url(#eqGrad)" />
                                <polyline points={points} fill="none" stroke="#22c55e" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                              </svg>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', fontSize: '11px', color: '#666' }}>
                              {xLabels.map((l, i) => <span key={i}>{l}</span>)}
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Bar Chart */}
                <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '20px', display: 'flex', gap: '20px' }}>
                  <div style={{ flex: 1, height: '180px' }}>
                    {(() => {
                      const groupedData = {}
                      trades.forEach(t => {
                        let key
                        if (graphGroupBy === 'symbol') key = t.symbol
                        else if (graphGroupBy === 'session') key = getExtraData(t).session || 'Unknown'
                        else if (graphGroupBy === 'confidence') key = getExtraData(t).confidence || 'Unknown'
                        else if (graphGroupBy === 'timeframe') key = getExtraData(t).timeframe || 'Unknown'
                        else if (graphGroupBy === 'direction') key = t.direction || 'Unknown'
                        if (!key || key === 'Unknown' || key === 'undefined') return
                        if (!groupedData[key]) groupedData[key] = { wins: 0, losses: 0, total: 0, pnl: 0 }
                        groupedData[key].total++
                        groupedData[key].pnl += parseFloat(t.pnl) || 0
                        if (t.outcome === 'win') groupedData[key].wins++
                        else if (t.outcome === 'loss') groupedData[key].losses++
                      })
                      
                      const entries = Object.entries(groupedData).map(([name, data]) => {
                        const wr = data.wins + data.losses > 0 ? Math.round((data.wins / (data.wins + data.losses)) * 100) : 0
                        let value, displayValue
                        if (barGraphMetric === 'winrate') { value = wr; displayValue = wr + '%' }
                        else if (barGraphMetric === 'pnl') { value = data.pnl; displayValue = (data.pnl >= 0 ? '+' : '') + '$' + Math.round(data.pnl) }
                        else if (barGraphMetric === 'avgpnl') { value = data.total > 0 ? data.pnl / data.total : 0; displayValue = (value >= 0 ? '+' : '') + '$' + Math.round(value) }
                        else { value = data.total; displayValue = data.total.toString() }
                        return { name, value, displayValue }
                      }).sort((a, b) => b.value - a.value).slice(0, 8)
                      
                      if (entries.length === 0) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '14px' }}>No data</div>
                      
                      const maxVal = barGraphMetric === 'winrate' ? 100 : Math.max(...entries.map(e => Math.abs(e.value)), 1)
                      const yLabels = barGraphMetric === 'winrate' ? ['100%', '50%', '0%'] : ['$' + Math.round(maxVal), '$' + Math.round(maxVal / 2), '$0']
                      
                      return (
                        <div style={{ height: '100%', display: 'flex' }}>
                          <div style={{ width: '50px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '11px', color: '#666', paddingRight: '8px', textAlign: 'right', paddingBottom: '24px' }}>
                            {yLabels.map((l, i) => <span key={i}>{l}</span>)}
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '6px', borderLeft: '1px solid #222', borderBottom: '1px solid #222', paddingLeft: '6px', paddingBottom: '4px' }}>
                              {entries.map((item, i) => {
                                const heightPct = Math.max((Math.abs(item.value) / maxVal) * 100, 3)
                                const isGreen = barGraphMetric === 'winrate' ? item.value >= 50 : item.value >= 0
                                return (
                                  <div key={i} style={{ flex: 1, maxWidth: '55px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }} onMouseEnter={() => setHoveredBar(i)} onMouseLeave={() => setHoveredBar(null)}>
                                    <div style={{ fontSize: '10px', color: isGreen ? '#22c55e' : '#ef4444', marginBottom: '3px', fontWeight: 600 }}>{item.displayValue}</div>
                                    <div style={{ width: '100%', height: `${heightPct}%`, background: isGreen ? '#22c55e' : '#ef4444', borderRadius: '3px 3px 0 0', opacity: hoveredBar === null || hoveredBar === i ? 1 : 0.5 }} />
                                  </div>
                                )
                              })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: '6px' }}>
                              {entries.map((item, i) => (
                                <div key={i} style={{ flex: 1, maxWidth: '55px', textAlign: 'center', fontSize: '10px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  {/* Dropdowns */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
                    <div style={{ padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '8px' }}>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Graph to show</div>
                      <select value={barGraphMetric} onChange={e => setBarGraphMetric(e.target.value)} style={{ width: '130px', padding: '8px 10px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px' }}>
                        <option value="winrate">Winrate</option>
                        <option value="pnl">PnL</option>
                        <option value="count">Trade Count</option>
                        <option value="avgpnl">Avg PnL</option>
                      </select>
                    </div>
                    <div style={{ padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '8px' }}>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>compared to</div>
                      <select value={graphGroupBy} onChange={e => setGraphGroupBy(e.target.value)} style={{ width: '130px', padding: '8px 10px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px' }}>
                        <option value="symbol">Pairs</option>
                        <option value="session">Session</option>
                        <option value="confidence">Confidence</option>
                        <option value="timeframe">Timeframe</option>
                        <option value="direction">Direction</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 2: Long/Short + Rating */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 2, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '14px', color: '#22c55e', fontWeight: 700 }}>LONG {longPct}%</span>
                <div style={{ flex: 1, height: '10px', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${longPct}%`, background: '#22c55e' }} />
                  <div style={{ width: `${100 - longPct}%`, background: '#ef4444' }} />
                </div>
                <span style={{ fontSize: '14px', color: '#ef4444', fontWeight: 700 }}>{100 - longPct}% SHORT</span>
              </div>
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: '#888' }}>Avg Trade Rating</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '3px' }}>{[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= Math.round(parseFloat(avgRating)) ? '#22c55e' : '#2a2a35', fontSize: '18px' }}>★</span>)}</div>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{avgRating}</span>
                </div>
              </div>
            </div>

            {/* ROW 3: Stats + Donut | Trade Analysis */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              {/* Stats + Donut */}
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '20px', display: 'flex' }}>
                <div style={{ flex: 1 }}>
                  {[
                    { l: 'Avg. Trend', v: avgTrend },
                    { l: 'Avg. Rating', v: avgRating + '★' },
                    { l: 'Avg. PnL', v: (avgPnl >= 0 ? '+' : '') + '$' + avgPnl },
                    { l: 'Most Traded Pair', v: mostTradedPair },
                    { l: 'Most Used RR', v: mostUsedRR },
                    { l: 'Best RR', v: bestRR },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 5 ? '1px solid #1a1a22' : 'none' }}>
                      <span style={{ fontSize: '13px', color: '#888' }}>{item.l}</span>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{item.v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ width: '1px', background: '#1a1a22', margin: '0 20px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: '140px' }}>
                  <div style={{ fontSize: '10px', color: '#888', marginBottom: '12px', textTransform: 'uppercase' }}>Best Pair</div>
                  {(() => {
                    const ps = {}
                    trades.forEach(t => { if (!ps[t.symbol]) ps[t.symbol] = { w: 0, l: 0, pnl: 0 }; if (t.outcome === 'win') ps[t.symbol].w++; else if (t.outcome === 'loss') ps[t.symbol].l++; ps[t.symbol].pnl += parseFloat(t.pnl) || 0 })
                    const best = Object.entries(ps).sort((a, b) => b[1].pnl - a[1].pnl)[0]
                    if (!best) return <div style={{ color: '#666' }}>No data</div>
                    const wr = best[1].w + best[1].l > 0 ? Math.round((best[1].w / (best[1].w + best[1].l)) * 100) : 0
                    const size = 100, stroke = 10, r = (size - stroke) / 2, c = 2 * Math.PI * r
                    return (
                      <>
                        <div style={{ position: 'relative', width: size, height: size }}>
                          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a1a22" strokeWidth={stroke} />
                            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#22c55e" strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c * (1 - wr/100)} strokeLinecap="round" />
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{best[0]}</div>
                            <div style={{ fontSize: '18px', fontWeight: 700, color: '#22c55e' }}>{wr}%</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '11px', color: '#888' }}>
                          <span><span style={{ color: '#22c55e' }}>★</span> Wins</span>
                          <span><span style={{ color: '#ef4444' }}>★</span> Losses</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Trade Analysis */}
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '20px' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '16px', textTransform: 'uppercase' }}>Trade Analysis</div>
                <div style={{ display: 'flex', gap: '20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ padding: '10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px' }}>
                      <select value={analysisGroupBy} onChange={e => setAnalysisGroupBy(e.target.value)} style={{ width: '120px', padding: '8px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px' }}>
                        <option value="direction">Direction</option>
                        <option value="confidence">Confidence</option>
                        <option value="session">Session</option>
                        <option value="timeframe">Timeframe</option>
                      </select>
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>vs</div>
                    <div style={{ padding: '10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px' }}>
                      <select value={analysisMetric} onChange={e => setAnalysisMetric(e.target.value)} style={{ width: '120px', padding: '8px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px' }}>
                        <option value="avgpnl">Avg PnL</option>
                        <option value="winrate">Winrate</option>
                        <option value="pnl">Total PnL</option>
                        <option value="count">Trade Count</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' }}>
                    {(() => {
                      const groups = {}
                      trades.forEach(t => {
                        let key
                        if (analysisGroupBy === 'direction') key = t.direction ? t.direction.toUpperCase() : null
                        else if (analysisGroupBy === 'confidence') key = getExtraData(t).confidence
                        else if (analysisGroupBy === 'session') key = getExtraData(t).session
                        else key = getExtraData(t).timeframe
                        if (!key) return
                        if (!groups[key]) groups[key] = { w: 0, l: 0, pnl: 0, count: 0 }
                        groups[key].count++
                        groups[key].pnl += parseFloat(t.pnl) || 0
                        if (t.outcome === 'win') groups[key].w++
                        else if (t.outcome === 'loss') groups[key].l++
                      })
                      
                      return Object.entries(groups).map(([name, data]) => {
                        let displayValue, numValue
                        if (analysisMetric === 'avgpnl') { numValue = data.count > 0 ? data.pnl / data.count : 0; displayValue = (numValue >= 0 ? '+' : '') + '$' + Math.round(numValue) + '/trade' }
                        else if (analysisMetric === 'winrate') { numValue = (data.w + data.l) > 0 ? (data.w / (data.w + data.l)) * 100 : 0; displayValue = Math.round(numValue) + '%' }
                        else if (analysisMetric === 'pnl') { numValue = data.pnl; displayValue = (data.pnl >= 0 ? '+' : '') + '$' + Math.round(data.pnl) }
                        else { numValue = data.count; displayValue = data.count + ' trades' }
                        return { name, displayValue, numValue }
                      }).slice(0, 4).map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '14px', color: '#fff' }}>{item.name}:</span>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: item.numValue >= 0 ? '#22c55e' : '#ef4444' }}>{item.displayValue}</span>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 4: Performance + Streaks + Expectancy */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '20px' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '16px', textTransform: 'uppercase' }}>Performance Summary</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { l: 'Best Day', v: bestDay ? `+$${Math.round(bestDay.pnl)}` : '-', c: '#22c55e', sub: bestDay ? new Date(bestDay.date).toLocaleDateString() : '' },
                    { l: 'Worst Day', v: worstDay ? `$${Math.round(worstDay.pnl)}` : '-', c: '#ef4444', sub: worstDay ? new Date(worstDay.date).toLocaleDateString() : '' },
                    { l: 'Biggest Win', v: `+$${biggestWin}`, c: '#22c55e', sub: '' },
                    { l: 'Biggest Loss', v: `$${biggestLoss}`, c: '#ef4444', sub: '' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '12px', background: '#0a0a0e', borderRadius: '6px', border: '1px solid #1a1a22' }}>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>{item.l}</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: item.c }}>{item.v}</div>
                      {item.sub && <div style={{ fontSize: '10px', color: '#444', marginTop: '2px' }}>{item.sub}</div>}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '20px' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '16px', textTransform: 'uppercase' }}>Streaks & Consistency</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[
                    { l: 'Max Win Streak', v: consecutiveWins, c: '#22c55e' },
                    { l: 'Max Loss Streak', v: consecutiveLosses, c: '#ef4444' },
                    { l: 'Trading Days', v: tradingDays, c: '#fff' },
                    { l: 'Trades/Day', v: avgTradesPerDay, c: '#fff' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '12px', background: '#0a0a0e', borderRadius: '6px', border: '1px solid #1a1a22' }}>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>{item.l}</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: item.c }}>{item.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ width: '160px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px', textTransform: 'uppercase' }}>Expectancy</div>
                <div style={{ fontSize: '32px', fontWeight: 700, color: parseFloat(expectancy) >= 0 ? '#22c55e' : '#ef4444' }}>${expectancy}</div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>per trade</div>
              </div>
            </div>

            {/* ROW 5: More Stats */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '20px' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '16px', textTransform: 'uppercase' }}>Risk Management</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {[
                    { l: 'Avg RR', v: avgRR + 'R', c: '#fff' },
                    { l: 'Return on Risk', v: returnOnRisk + 'x', c: '#22c55e' },
                    { l: 'Best Session', v: bestSession, c: '#22c55e' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '14px', background: '#0a0a0e', borderRadius: '6px', border: '1px solid #1a1a22', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>{item.l}</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: item.c }}>{item.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '20px' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '16px', textTransform: 'uppercase' }}>Account Progress</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {[
                    { l: 'Starting', v: '$' + startingBalance.toLocaleString(), c: '#888' },
                    { l: 'Current', v: '$' + currentBalance.toLocaleString(), c: '#22c55e' },
                    { l: 'Growth', v: ((currentBalance / startingBalance - 1) * 100).toFixed(1) + '%', c: currentBalance >= startingBalance ? '#22c55e' : '#ef4444' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '14px', background: '#0a0a0e', borderRadius: '6px', border: '1px solid #1a1a22', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>{item.l}</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: item.c }}>{item.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ROW 6: Win/Loss Distribution + Session Analysis */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '20px' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '16px', textTransform: 'uppercase' }}>Win/Loss Breakdown</div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '13px', color: '#22c55e' }}>Wins: {wins}</span>
                      <span style={{ fontSize: '13px', color: '#ef4444' }}>Losses: {losses}</span>
                    </div>
                    <div style={{ height: '20px', borderRadius: '4px', overflow: 'hidden', display: 'flex', background: '#1a1a22' }}>
                      <div style={{ width: `${(wins / (wins + losses || 1)) * 100}%`, background: '#22c55e' }} />
                      <div style={{ width: `${(losses / (wins + losses || 1)) * 100}%`, background: '#ef4444' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#666' }}>Gross Profit: ${Math.round(grossProfit)}</span>
                      <span style={{ fontSize: '11px', color: '#666' }}>Gross Loss: ${Math.round(grossLoss)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '20px' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '16px', textTransform: 'uppercase' }}>Session Performance</div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {Object.entries(winsBySession).slice(0, 4).map(([sess, data]) => {
                    const wr = (data.w + data.l) > 0 ? Math.round((data.w / (data.w + data.l)) * 100) : 0
                    return (
                      <div key={sess} style={{ flex: 1, padding: '12px', background: '#0a0a0e', borderRadius: '6px', border: '1px solid #1a1a22', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>{sess}</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: wr >= 50 ? '#22c55e' : '#ef4444' }}>{wr}%</div>
                        <div style={{ fontSize: '10px', color: '#444', marginTop: '2px' }}>{data.w + data.l} trades</div>
                      </div>
                    )
                  })}
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
                <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Write {notesSubTab} Note</span>
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
              <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>{notesSubTab} Notes</span>
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
                {notesSubTab === 'custom' ? (
                  (notes.custom || []).length === 0 ? <div style={{ padding: '40px', textAlign: 'center', color: '#666', fontSize: '14px' }}>No custom notes yet.</div> : (notes.custom || []).map((note, idx) => (
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
                  Object.keys(notes[notesSubTab] || {}).length === 0 ? <div style={{ padding: '40px', textAlign: 'center', color: '#666', fontSize: '14px' }}>No {notesSubTab} notes yet.</div> : Object.entries(notes[notesSubTab] || {}).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([date, text]) => (
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
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '28px', width: '540px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', color: '#fff' }}>Log New Trade</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              {enabledInputs.map(input => (
                <div key={input.id} style={{ gridColumn: input.type === 'textarea' ? 'span 2' : 'span 1' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', textTransform: 'uppercase' }}>{input.label} {input.required && <span style={{ color: '#ef4444' }}>*</span>}</label>
                  {input.type === 'select' ? (
                    <select value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }}>
                      {input.options?.map(o => <option key={o} value={o.toLowerCase()}>{o}</option>)}
                    </select>
                  ) : input.type === 'textarea' ? (
                    <textarea value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} rows={3} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', resize: 'none', boxSizing: 'border-box' }} />
                  ) : input.type === 'rating' ? (
                    <div style={{ display: 'flex', gap: '8px' }}>{[1,2,3,4,5].map(i => <button key={i} onClick={() => setTradeForm({...tradeForm, [input.id]: String(i)})} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '24px', color: i <= parseInt(tradeForm[input.id] || 0) ? '#22c55e' : '#333' }}>★</button>)}</div>
                  ) : (
                    <input type={input.type} value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} step={input.type === 'number' ? '0.1' : undefined} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={addTrade} disabled={saving || !tradeForm.symbol || !tradeForm.pnl} style={{ flex: 1, padding: '14px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: (saving || !tradeForm.symbol || !tradeForm.pnl) ? 0.5 : 1 }}>{saving ? 'Saving...' : 'Save Trade'}</button>
              <button onClick={() => setShowAddTrade(false)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showEditInputs && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 101 }} onClick={() => setShowEditInputs(false)}>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '28px', width: '500px', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', color: '#fff' }}>Customize Columns</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {inputs.map((input, i) => (
                <div key={input.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#0a0a0e', borderRadius: '6px' }}>
                  <input type="checkbox" checked={input.enabled} onChange={e => updateInput(i, 'enabled', e.target.checked)} style={{ width: '18px', height: '18px' }} />
                  <input type="text" value={input.label} onChange={e => updateInput(i, 'label', e.target.value)} style={{ flex: 1, padding: '8px 12px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px' }} />
                  <select value={input.type} onChange={e => updateInput(i, 'type', e.target.value)} style={{ padding: '8px 12px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '6px', color: '#888', fontSize: '12px' }}>
                    {['text', 'number', 'date', 'select', 'textarea', 'rating'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {input.type === 'select' && <button onClick={() => openOptionsEditor(i)} style={{ padding: '6px 12px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px', cursor: 'pointer' }}>Options</button>}
                  {!['symbol', 'date', 'outcome', 'pnl'].includes(input.id) && <button onClick={() => deleteInput(i)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}>×</button>}
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
              <button onClick={saveOptions} style={{ flex: 1, padding: '14px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Save</button>
              <button onClick={() => setEditingOptions(null)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showExpandedNote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowExpandedNote(null)}>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '28px', width: '520px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#fff' }}>Trade Notes</h2>
            <div style={{ background: '#0a0a0e', borderRadius: '6px', padding: '16px', maxHeight: '320px', overflowY: 'auto', fontSize: '14px', color: '#fff', lineHeight: '1.7' }}>{showExpandedNote}</div>
            <button onClick={() => setShowExpandedNote(null)} style={{ marginTop: '16px', width: '100%', padding: '14px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Close</button>
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
