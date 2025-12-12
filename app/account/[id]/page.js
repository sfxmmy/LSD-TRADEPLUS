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

const defaultCharts = [
  { id: 'chart1', xAxis: 'session', yAxis: 'winrate', title: 'Session vs Winrate' },
  { id: 'chart2', xAxis: 'symbol', yAxis: 'pnl', title: 'PnL by Symbol' },
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
  const [customCharts, setCustomCharts] = useState(defaultCharts)
  const [showAddChart, setShowAddChart] = useState(false)
  const [newChartX, setNewChartX] = useState('session')
  const [newChartY, setNewChartY] = useState('winrate')
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0])
  const [noteText, setNoteText] = useState('')
  const [customNoteTitle, setCustomNoteTitle] = useState('')
  const [editingStats, setEditingStats] = useState(false)
  const [graphType, setGraphType] = useState('pnl')
  const [graphGroupBy, setGraphGroupBy] = useState('symbol')
  const [compareMode, setCompareMode] = useState('time')
  const [barGraphMetric, setBarGraphMetric] = useState('winrate')
  const [analysisGroupBy, setAnalysisGroupBy] = useState('confidence')
  const [analysisMetric, setAnalysisMetric] = useState('winrate')
  const [hoveredPoint, setHoveredPoint] = useState(null)
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
    if (accountData.custom_charts) { try { setCustomCharts(JSON.parse(accountData.custom_charts)) } catch {} }
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

  async function saveCharts() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    await supabase.from('accounts').update({ custom_charts: JSON.stringify(customCharts) }).eq('id', accountId)
  }

  function addNewChart() {
    const newChart = { 
      id: `chart_${Date.now()}`, 
      xAxis: newChartX, 
      yAxis: newChartY, 
      title: `${newChartX.charAt(0).toUpperCase() + newChartX.slice(1)} vs ${newChartY === 'winrate' ? 'Win Rate' : newChartY === 'pnl' ? 'PnL' : newChartY === 'avgpnl' ? 'Avg PnL' : 'Trades'}` 
    }
    const updated = [...customCharts, newChart]
    setCustomCharts(updated)
    setShowAddChart(false)
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    supabase.from('accounts').update({ custom_charts: JSON.stringify(updated) }).eq('id', accountId)
  }

  function removeChart(chartId) {
    const updated = customCharts.filter(c => c.id !== chartId)
    setCustomCharts(updated)
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    supabase.from('accounts').update({ custom_charts: JSON.stringify(updated) }).eq('id', accountId)
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

  function MiniEquityCurve() {
    const sortedTrades = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
    let cumPnl = 0
    const dataPoints = sortedTrades.map(t => {
      cumPnl += parseFloat(t.pnl) || 0
      return cumPnl
    })
    if (dataPoints.length < 2) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '12px' }}>Need more trades</div>
    
    const maxY = Math.max(...dataPoints)
    const minY = Math.min(...dataPoints)
    const yRange = maxY - minY || 100
    
    const svgW = 100, svgH = 100
    const points = dataPoints.map((y, i) => ({
      x: (i / (dataPoints.length - 1)) * svgW,
      y: svgH - ((y - minY) / yRange) * svgH
    }))
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaD = pathD + ` L ${svgW} ${svgH} L 0 ${svgH} Z`
    
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="miniGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#miniGrad)" />
        <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    )
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px' }}>
          <span style={{ color: '#22c55e' }}>LSD</span>
          <span style={{ color: '#fff' }}>TRADE+</span>
        </div>
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

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      <header style={{ padding: '10px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a22' }}>
        <a href="/" style={{ fontSize: '20px', fontWeight: 700, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>LSD</span>
          <span style={{ color: '#fff' }}>TRADE+</span>
        </a>
        <div style={{ fontSize: '16px', fontWeight: 700, letterSpacing: '-0.5px', color: '#fff' }}>JOURNAL AREA</div>
        <a href="/dashboard" style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '12px', textDecoration: 'none' }}>← Dashboard</a>
      </header>

      <div style={{ display: 'flex', maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ width: '160px', borderRight: '1px solid #1a1a22', minHeight: 'calc(100vh - 49px)' }}>
          {['trades', 'statistics', 'notes'].map((tab, i) => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              style={{ 
                width: '100%',
                padding: '22px 16px', 
                background: activeTab === tab ? '#22c55e' : 'transparent', 
                border: 'none',
                borderBottom: '1px solid #1a1a22',
                color: activeTab === tab ? '#fff' : '#666', 
                fontSize: '14px', 
                fontWeight: 700, 
                textTransform: 'uppercase', 
                cursor: 'pointer', 
                textAlign: 'left',
                letterSpacing: '1px'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, padding: '0 20px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #1a1a22' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>{account?.name}</span>
              <span style={{ fontSize: '11px', color: '#888', padding: '4px 10px', background: '#1a1a22', borderRadius: '4px' }}>{trades.length} Trades</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {activeTab === 'trades' && (
                <button onClick={() => setShowEditInputs(true)} style={{ padding: '10px 16px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '6px', color: '#888', fontSize: '12px', cursor: 'pointer' }}>Edit Columns</button>
              )}
              <button onClick={() => setShowAddTrade(true)} style={{ padding: '10px 20px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>+ LOG NEW TRADE</button>
            </div>
          </div>

          {activeTab === 'trades' && (
            <>
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', overflow: 'hidden', marginTop: '12px' }}>
                {trades.length === 0 ? (
                  <div style={{ padding: '50px', textAlign: 'center', color: '#555', fontSize: '13px' }}>No trades yet. Click "+ LOG NEW TRADE" to add your first trade.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#0a0a0e' }}>
                          {['Symbol', 'W/L', 'PnL', '%', 'RR', 'Trend', 'Confidence', 'Rating', 'Image', 'Notes', 'Placed', 'Date', ''].map((h, i) => (
                            <th key={i} style={{ padding: '12px 10px', textAlign: 'center', color: '#888', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid #1a1a22' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map((trade) => {
                          const extra = getExtraData(trade)
                          const pnlValue = parseFloat(trade.pnl) || 0
                          return (
                            <tr key={trade.id} style={{ borderBottom: '1px solid #141418' }}>
                              <td style={{ padding: '14px 10px', fontWeight: 600, fontSize: '14px', textAlign: 'center' }}>{trade.symbol}</td>
                              <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                                <span style={{ padding: '4px 12px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: trade.outcome === 'win' ? 'rgba(34,197,94,0.15)' : trade.outcome === 'loss' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)', color: trade.outcome === 'win' ? '#22c55e' : trade.outcome === 'loss' ? '#ef4444' : '#666' }}>
                                  {trade.outcome === 'win' ? 'WIN' : trade.outcome === 'loss' ? 'LOSS' : 'BE'}
                                </span>
                              </td>
                              <td style={{ padding: '14px 10px', textAlign: 'center', fontWeight: 600, fontSize: '14px', color: pnlValue >= 0 ? '#22c55e' : '#ef4444' }}>
                                {pnlValue >= 0 ? '+' : ''}${pnlValue.toFixed(0)}
                              </td>
                              <td style={{ padding: '14px 10px', textAlign: 'center', fontSize: '14px', color: '#888' }}>{extra.riskPercent || '1'}%</td>
                              <td style={{ padding: '14px 10px', textAlign: 'center', fontSize: '14px', color: '#888' }}>{trade.rr || '-'}</td>
                              <td style={{ padding: '14px 10px', textAlign: 'center', fontSize: '14px', color: trade.direction === 'long' ? '#22c55e' : '#ef4444' }}>{trade.direction?.toUpperCase() || '-'}</td>
                              <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                                {extra.confidence && <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '12px', background: extra.confidence === 'High' ? 'rgba(34,197,94,0.1)' : extra.confidence === 'Low' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', color: extra.confidence === 'High' ? '#22c55e' : extra.confidence === 'Low' ? '#ef4444' : '#888' }}>{extra.confidence}</span>}
                              </td>
                              <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>
                                  {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= parseInt(extra.rating || 0) ? '#22c55e' : '#2a2a35', fontSize: '14px' }}>*</span>)}
                                </div>
                              </td>
                              <td style={{ padding: '14px 10px', textAlign: 'center' }}>
                                {trade.image_url ? (
                                  <button onClick={() => setShowExpandedImage(trade.image_url)} style={{ width: '28px', height: '28px', background: '#1a1a22', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                  </button>
                                ) : <div style={{ width: '28px', height: '28px', background: '#141418', borderRadius: '4px', margin: '0 auto' }} />}
                              </td>
                              <td style={{ padding: '14px 10px', maxWidth: '150px' }}>
                                {trade.notes ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{trade.notes}</span>
                                    <button onClick={() => setShowExpandedNote(trade.notes)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px' }}>
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                                    </button>
                                  </div>
                                ) : <span style={{ fontSize: '12px', color: '#333' }}>-</span>}
                              </td>
                              <td style={{ padding: '14px 10px', textAlign: 'center', fontSize: '14px', color: '#888' }}>{getDaysAgo(trade.date)}</td>
                              <td style={{ padding: '14px 10px', textAlign: 'center', fontSize: '14px', color: '#888' }}>{new Date(trade.date).getDate()}/{new Date(trade.date).getMonth()+1}</td>
                              <td style={{ padding: '14px 10px', textAlign: 'center' }}><button onClick={() => deleteTrade(trade.id)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', fontSize: '16px' }}>x</button></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              
              {trades.length > 1 && (
                <div style={{ marginTop: '12px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Equity Curve</div>
                  <div style={{ height: '100px' }}>
                    <MiniEquityCurve />
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'statistics' && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <div style={{ width: '180px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                {[
                  { l: 'Total PnL', v: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString()}`, c: totalPnl >= 0 ? '#22c55e' : '#ef4444' },
                  { l: 'Winrate', v: `${winrate}%`, c: winrate >= 50 ? '#22c55e' : '#ef4444' },
                  { l: 'Profit Factor', v: profitFactor, c: parseFloat(profitFactor) >= 1.5 ? '#22c55e' : '#fff' },
                  { l: 'Avg Win/Loss', v: `$${avgWin}/$${avgLoss}`, c: '#fff' },
                  { l: 'Current Streak', v: `${streaks.cs >= 0 ? '+' : ''}${streaks.cs}`, c: streaks.cs >= 0 ? '#22c55e' : '#ef4444' },
                  { l: 'Best Pair', v: (() => { const c = {}; trades.forEach(t => { if (!c[t.symbol]) c[t.symbol] = 0; c[t.symbol] += parseFloat(t.pnl) || 0 }); const best = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return best ? best[0] : '-' })(), c: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>{s.l}</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>

              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Equity Curve</span>
                    </div>
                    <div style={{ height: '200px', position: 'relative' }}>
                      {(() => {
                        if (trades.length < 2) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>Need at least 2 trades</div>
                        
                        const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
                        let dataPoints = []
                        let cumulative = parseFloat(account?.starting_balance) || 10000
                        
                        if (graphType === 'pnl') {
                          let runningPnl = 0
                          dataPoints = sorted.map((t, i) => {
                            runningPnl += parseFloat(t.pnl) || 0
                            return { x: i, y: runningPnl, date: t.date, pnl: parseFloat(t.pnl) || 0, symbol: t.symbol }
                          })
                        } else {
                          dataPoints = sorted.map((t, i) => {
                            cumulative += parseFloat(t.pnl) || 0
                            return { x: i, y: cumulative, date: t.date, pnl: parseFloat(t.pnl) || 0, symbol: t.symbol }
                          })
                        }
                        
                        const minY = Math.min(...dataPoints.map(d => d.y))
                        const maxY = Math.max(...dataPoints.map(d => d.y))
                        const range = maxY - minY || 1
                        const width = 100, height = 100, padding = 5
                        
                        const getX = (i) => padding + (i / (dataPoints.length - 1)) * (width - padding * 2)
                        const getY = (y) => height - padding - ((y - minY) / range) * (height - padding * 2)
                        
                        const points = dataPoints.map((d, i) => `${getX(i)},${getY(d.y)}`).join(' ')
                        const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`
                        
                        return (
                          <div style={{ height: '100%', display: 'flex' }}>
                            <div style={{ width: '45px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '8px', fontSize: '10px', color: '#666' }}>
                              <span>${graphType === 'pnl' ? maxY.toFixed(0) : (maxY/1000).toFixed(0) + 'k'}</span>
                              <span>${graphType === 'pnl' ? ((maxY+minY)/2).toFixed(0) : ((maxY+minY)/2000).toFixed(0) + 'k'}</span>
                              <span>${graphType === 'pnl' ? minY.toFixed(0) : (minY/1000).toFixed(0) + 'k'}</span>
                            </div>
                            <div style={{ flex: 1, position: 'relative' }} onMouseLeave={() => setHoveredPoint(null)}>
                              <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%' }} preserveAspectRatio="none">
                                <defs>
                                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
                                    <stop offset="100%" stopColor="#22c55e" stopOpacity="0.05" />
                                  </linearGradient>
                                </defs>
                                <polygon points={areaPoints} fill="url(#areaGrad)" />
                                <polyline points={points} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                {dataPoints.map((d, i) => (
                                  <circle key={i} cx={getX(i)} cy={getY(d.y)} r={hoveredPoint === i ? 3 : 1.5} fill={hoveredPoint === i ? '#fff' : '#22c55e'} stroke="#22c55e" strokeWidth="1" style={{ cursor: 'pointer' }} onMouseEnter={() => setHoveredPoint(i)} />
                                ))}
                              </svg>
                              {hoveredPoint !== null && dataPoints[hoveredPoint] && (
                                <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#1a1a22', border: '1px solid #333', borderRadius: '6px', padding: '10px', fontSize: '11px', zIndex: 10 }}>
                                  <div style={{ color: '#888', marginBottom: '4px' }}>{new Date(dataPoints[hoveredPoint].date).toLocaleDateString()}</div>
                                  <div style={{ color: '#fff', fontWeight: 600 }}>{dataPoints[hoveredPoint].symbol}</div>
                                  <div style={{ color: dataPoints[hoveredPoint].pnl >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{dataPoints[hoveredPoint].pnl >= 0 ? '+' : ''}${dataPoints[hoveredPoint].pnl.toFixed(0)}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '45px', paddingTop: '6px', fontSize: '10px', color: '#666' }}>
                      {(() => {
                        const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
                        if (sorted.length < 2) return null
                        return compareMode === 'time' ? (
                          <>
                            <span>{new Date(sorted[0]?.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</span>
                            <span>{new Date(sorted[sorted.length-1]?.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</span>
                          </>
                        ) : (
                          <>
                            <span>#1</span>
                            <span>#{sorted.length}</span>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                  <div style={{ width: '120px', marginLeft: '16px' }}>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '6px' }}>Graph to show</div>
                    <select value={graphType} onChange={e => setGraphType(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '12px', marginBottom: '12px' }}>
                      <option value="pnl">PnL</option>
                      <option value="balance">Balance</option>
                    </select>
                    <div style={{ fontSize: '10px', color: '#666', marginBottom: '6px' }}>compared to</div>
                    <select value={compareMode} onChange={e => setCompareMode(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '12px' }}>
                      <option value="time">Time</option>
                      <option value="trades">Trade #</option>
                    </select>
                  </div>
                </div>
                
                <div style={{ borderTop: '1px solid #1a1a22', paddingTop: '16px', marginTop: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ height: '180px' }}>
                        {(() => {
                          const groupedData = {}
                          trades.forEach(t => {
                            let key
                            if (graphGroupBy === 'symbol') key = t.symbol
                            else if (graphGroupBy === 'session') key = getExtraData(t).session || t.session
                            else if (graphGroupBy === 'confidence') key = getExtraData(t).confidence
                            else if (graphGroupBy === 'timeframe') key = getExtraData(t).timeframe || t.timeframe
                            else if (graphGroupBy === 'direction') key = t.direction
                            if (!key) key = 'Unknown'
                            if (!groupedData[key]) groupedData[key] = { wins: 0, losses: 0, total: 0, pnl: 0 }
                            groupedData[key].total++
                            groupedData[key].pnl += parseFloat(t.pnl) || 0
                            if (t.outcome === 'win') groupedData[key].wins++
                            else if (t.outcome === 'loss') groupedData[key].losses++
                          })
                          
                          const entries = Object.entries(groupedData)
                            .filter(([k]) => k && k !== 'Unknown' && k !== 'undefined')
                            .map(([name, data]) => {
                              const wr = data.wins + data.losses > 0 ? Math.round((data.wins / (data.wins + data.losses)) * 100) : 0
                              let value, displayValue
                              if (barGraphMetric === 'winrate') { value = wr; displayValue = wr + '%' }
                              else if (barGraphMetric === 'pnl') { value = data.pnl; displayValue = (data.pnl >= 0 ? '+' : '') + '$' + Math.round(data.pnl) }
                              else { value = data.total; displayValue = data.total.toString() }
                              return { name, value, displayValue, winrate: wr, pnl: data.pnl, count: data.total }
                            })
                            .sort((a, b) => b.value - a.value)
                            .slice(0, 8)
                          
                          if (entries.length === 0) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>No data</div>
                          
                          const maxVal = barGraphMetric === 'winrate' ? 100 : Math.max(...entries.map(e => Math.abs(e.value)), 1)
                          
                          return (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                              <div style={{ flex: 1, display: 'flex' }}>
                                <div style={{ width: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '10px', color: '#666' }}>
                                  <span>{barGraphMetric === 'winrate' ? '100%' : '$' + Math.round(maxVal)}</span>
                                  <span>{barGraphMetric === 'winrate' ? '50%' : '$' + Math.round(maxVal/2)}</span>
                                  <span>0{barGraphMetric === 'winrate' ? '%' : ''}</span>
                                </div>
                                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '6px', borderLeft: '1px solid #333', borderBottom: '1px solid #333', paddingLeft: '8px' }}>
                                  {entries.map((item, i) => {
                                    const heightPct = Math.max((Math.abs(item.value) / maxVal) * 100, 3)
                                    const isGreen = barGraphMetric === 'winrate' ? item.value >= 50 : item.value >= 0
                                    return (
                                      <div key={i} style={{ flex: 1, maxWidth: '50px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }} onMouseEnter={() => setHoveredBar(i)} onMouseLeave={() => setHoveredBar(null)}>
                                        <div style={{ fontSize: '10px', color: isGreen ? '#22c55e' : '#ef4444', marginBottom: '4px', fontWeight: 600 }}>{item.displayValue}</div>
                                        <div style={{ width: '100%', height: `${heightPct}%`, background: isGreen ? 'linear-gradient(to top, #22c55e, #22c55ecc)' : 'linear-gradient(to top, #ef4444, #ef4444cc)', borderRadius: '4px 4px 0 0', opacity: hoveredBar === null || hoveredBar === i ? 1 : 0.5, transition: 'opacity 0.15s' }} />
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                              <div style={{ display: 'flex', paddingLeft: '40px', paddingTop: '6px' }}>
                                {entries.map((item, i) => (
                                  <div key={i} style={{ flex: 1, maxWidth: '50px', textAlign: 'center', fontSize: '10px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                                ))}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                    <div style={{ width: '120px', marginLeft: '16px' }}>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '6px' }}>Graph to show</div>
                      <select value={barGraphMetric} onChange={e => setBarGraphMetric(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '12px', marginBottom: '12px' }}>
                        <option value="winrate">Winrate</option>
                        <option value="pnl">PnL</option>
                        <option value="count">Trade Count</option>
                      </select>
                      <div style={{ fontSize: '10px', color: '#666', marginBottom: '6px' }}>compared to</div>
                      <select value={graphGroupBy} onChange={e => setGraphGroupBy(e.target.value)} style={{ width: '100%', padding: '8px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '12px' }}>
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
          )}

          {activeTab === 'statistics' && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 700 }}>LONG {(() => { const l = trades.filter(t => t.direction === 'long').length; const s = trades.filter(t => t.direction === 'short').length; return Math.round((l/(l+s||1))*100) })()}%</span>
                <div style={{ flex: 1, height: '10px', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                  {(() => { const l = trades.filter(t => t.direction === 'long').length; const s = trades.filter(t => t.direction === 'short').length; const pct = Math.round((l/(l+s||1))*100); return <><div style={{ width: `${pct}%`, background: '#22c55e' }} /><div style={{ width: `${100-pct}%`, background: '#ef4444' }} /></> })()}
                </div>
                <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700 }}>{(() => { const l = trades.filter(t => t.direction === 'long').length; const s = trades.filter(t => t.direction === 'short').length; return 100 - Math.round((l/(l+s||1))*100) })()}% SHORT</span>
              </div>
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Total Amount of Trades</span>
                <span style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>{trades.length}</span>
              </div>
            </div>
          )}

          {activeTab === 'statistics' && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                {[
                  { l: 'Avg. Trend', v: trades.filter(t => t.direction === 'long').length >= trades.filter(t => t.direction === 'short').length ? 'Long' : 'Short' },
                  { l: 'Avg. Rating', v: (trades.reduce((s, t) => s + (parseInt(getExtraData(t).rating) || 0), 0) / (trades.length || 1)).toFixed(1) + '*' },
                  { l: 'Avg. PnL', v: '$' + Math.round(totalPnl / (trades.length || 1)) },
                  { l: 'Most Traded Pair', v: (() => { const c = {}; trades.forEach(t => c[t.symbol] = (c[t.symbol] || 0) + 1); return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || '-' })() },
                  { l: 'Most Used RR', v: (() => { const c = {}; trades.forEach(t => { const rr = Math.round(parseFloat(t.rr) || 0); c[rr] = (c[rr] || 0) + 1 }); return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] + 'R' || '-' })() },
                  { l: 'Best RR', v: (() => { const best = trades.filter(t => t.outcome === 'win').sort((a, b) => (parseFloat(b.rr) || 0) - (parseFloat(a.rr) || 0))[0]; return best ? `${best.rr}R (100%)` : '-' })() },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 5 ? '1px solid #1a1a22' : 'none' }}>
                    <span style={{ fontSize: '12px', color: '#666' }}>{item.l}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{item.v}</span>
                  </div>
                ))}
              </div>
              
              <div style={{ width: '200px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: '10px', color: '#666', marginBottom: '10px', textTransform: 'uppercase' }}>Best Pair</div>
                {(() => {
                  const ps = {}
                  trades.forEach(t => { if (!ps[t.symbol]) ps[t.symbol] = { w: 0, l: 0, pnl: 0 }; if (t.outcome === 'win') ps[t.symbol].w++; else if (t.outcome === 'loss') ps[t.symbol].l++; ps[t.symbol].pnl += parseFloat(t.pnl) || 0 })
                  const best = Object.entries(ps).sort((a, b) => b[1].pnl - a[1].pnl)[0]
                  if (!best) return <div style={{ color: '#555' }}>No data</div>
                  const wr = best[1].w + best[1].l > 0 ? Math.round((best[1].w / (best[1].w + best[1].l)) * 100) : 0
                  const size = 100, stroke = 8, r = (size - stroke) / 2, c = 2 * Math.PI * r
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
                        <span>* Wins</span>
                        <span>* Losses</span>
                      </div>
                    </>
                  )
                })()}
              </div>

              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '10px', color: '#666', marginBottom: '12px', textTransform: 'uppercase' }}>Trade Analysis</div>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <select value={analysisGroupBy} onChange={e => setAnalysisGroupBy(e.target.value)} style={{ flex: 1, padding: '8px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '12px' }}>
                    <option value="confidence">Confidence</option>
                    <option value="session">Session</option>
                    <option value="timeframe">Timeframe</option>
                    <option value="direction">Direction</option>
                  </select>
                  <span style={{ color: '#444', alignSelf: 'center' }}>vs</span>
                  <select value={analysisMetric} onChange={e => setAnalysisMetric(e.target.value)} style={{ flex: 1, padding: '8px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '12px' }}>
                    <option value="winrate">Winrate</option>
                    <option value="pnl">PnL</option>
                    <option value="avgpnl">Avg PnL</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(() => {
                    const groups = {}
                    trades.forEach(t => {
                      let key
                      if (analysisGroupBy === 'confidence') key = getExtraData(t).confidence || 'Unknown'
                      else if (analysisGroupBy === 'session') key = getExtraData(t).session || t.session || 'Unknown'
                      else if (analysisGroupBy === 'timeframe') key = getExtraData(t).timeframe || t.timeframe || 'Unknown'
                      else key = t.direction || 'Unknown'
                      if (!groups[key]) groups[key] = { w: 0, l: 0, pnl: 0 }
                      if (t.outcome === 'win') groups[key].w++
                      else if (t.outcome === 'loss') groups[key].l++
                      groups[key].pnl += parseFloat(t.pnl) || 0
                    })
                    
                    return Object.entries(groups)
                      .filter(([k]) => k && k !== 'Unknown')
                      .map(([name, data]) => {
                        const total = data.w + data.l
                        let displayValue
                        if (analysisMetric === 'winrate') displayValue = (total > 0 ? Math.round((data.w / total) * 100) : 0) + '% wr'
                        else if (analysisMetric === 'pnl') displayValue = (data.pnl >= 0 ? '+' : '') + '$' + Math.round(data.pnl)
                        else displayValue = (total > 0 ? (data.pnl >= 0 ? '+' : '') + '$' + Math.round(data.pnl / total) : '$0') + '/trade'
                        return { name, displayValue }
                      })
                      .slice(0, 4)
                      .map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>{item.name}:</span>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{item.displayValue}</span>
                        </div>
                      ))
                  })()}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {['daily', 'weekly', 'custom'].map(sub => (
                  <button key={sub} onClick={() => setNotesSubTab(sub)} style={{ padding: '12px 24px', background: notesSubTab === sub ? '#22c55e' : 'transparent', border: notesSubTab === sub ? 'none' : '1px solid #1a1a22', borderRadius: '6px', color: notesSubTab === sub ? '#fff' : '#666', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{sub}</button>
                ))}
              </div>

              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Write {notesSubTab} Note</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {notesSubTab === 'custom' && <input type="text" placeholder="Note title..." value={customNoteTitle} onChange={e => setCustomNoteTitle(e.target.value)} style={{ padding: '6px 10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '12px', width: '150px' }} />}
                    <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} style={{ padding: '6px 10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '12px' }} />
                  </div>
                </div>
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder={`Write your ${notesSubTab} note...`} style={{ width: '100%', minHeight: '120px', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', lineHeight: '1.6', resize: 'vertical', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button onClick={saveNote} disabled={!noteText.trim()} style={{ padding: '10px 20px', background: noteText.trim() ? '#22c55e' : '#1a1a22', border: 'none', borderRadius: '6px', color: noteText.trim() ? '#fff' : '#555', fontWeight: 600, fontSize: '12px', cursor: noteText.trim() ? 'pointer' : 'not-allowed' }}>Save Note</button>
                </div>
              </div>

              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>{notesSubTab} Notes</span>
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                  {notesSubTab === 'custom' ? (
                    (notes.custom || []).length === 0 ? <div style={{ padding: '20px', textAlign: 'center', color: '#444' }}>No custom notes yet.</div> : (notes.custom || []).map((note, idx) => (
                      <div key={idx} style={{ padding: '12px', background: '#0a0a0e', borderRadius: '6px', border: '1px solid #1a1a22' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 600 }}>{note.title}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', color: '#555' }}>{new Date(note.date).toLocaleDateString()}</span>
                            <button onClick={() => deleteNote('custom', idx)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer' }}>x</button>
                          </div>
                        </div>
                        <div style={{ fontSize: '13px', color: '#888', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{note.text}</div>
                      </div>
                    ))
                  ) : (
                    Object.keys(notes[notesSubTab] || {}).length === 0 ? <div style={{ padding: '20px', textAlign: 'center', color: '#444' }}>No {notesSubTab} notes yet.</div> : Object.entries(notes[notesSubTab] || {}).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([date, text]) => (
                      <div key={date} style={{ padding: '12px', background: '#0a0a0e', borderRadius: '6px', border: '1px solid #1a1a22' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 600 }}>{new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          <button onClick={() => deleteNote(notesSubTab, date)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer' }}>x</button>
                        </div>
                        <div style={{ fontSize: '13px', color: '#888', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{text}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showAddTrade && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowAddTrade(false)}>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '24px', width: '520px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Log New Trade</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
              {enabledInputs.map(input => (
                <div key={input.id} style={{ gridColumn: input.type === 'textarea' ? 'span 2' : 'span 1' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>{input.label} {input.required && <span style={{ color: '#ef4444' }}>*</span>}</label>
                  {input.type === 'select' ? (
                    <select value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}>
                      {input.options?.map(o => <option key={o} value={o.toLowerCase()}>{o}</option>)}
                    </select>
                  ) : input.type === 'textarea' ? (
                    <textarea value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} rows={3} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', resize: 'none', boxSizing: 'border-box' }} />
                  ) : input.type === 'rating' ? (
                    <div style={{ display: 'flex', gap: '8px' }}>{[1,2,3,4,5].map(i => <button key={i} onClick={() => setTradeForm({...tradeForm, [input.id]: String(i)})} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '24px', color: i <= parseInt(tradeForm[input.id] || 0) ? '#22c55e' : '#333' }}>*</button>)}</div>
                  ) : (
                    <input type={input.type} value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} step={input.type === 'number' ? '0.1' : undefined} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={addTrade} disabled={saving || !tradeForm.symbol || !tradeForm.pnl} style={{ flex: 1, padding: '14px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: (saving || !tradeForm.symbol || !tradeForm.pnl) ? 0.5 : 1 }}>{saving ? 'Saving...' : 'Save Trade'}</button>
              <button onClick={() => setShowAddTrade(false)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '6px', color: '#666', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showEditInputs && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 101 }} onClick={() => setShowEditInputs(false)}>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '24px', width: '480px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Customize Columns</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              {inputs.map((input, i) => (
                <div key={input.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#0a0a0e', borderRadius: '6px' }}>
                  <input type="checkbox" checked={input.enabled} onChange={e => updateInput(i, 'enabled', e.target.checked)} style={{ width: '18px', height: '18px' }} />
                  <input type="text" value={input.label} onChange={e => updateInput(i, 'label', e.target.value)} style={{ flex: 1, padding: '8px 12px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px' }} />
                  <select value={input.type} onChange={e => updateInput(i, 'type', e.target.value)} style={{ padding: '8px 12px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '6px', color: '#888', fontSize: '12px' }}>
                    {['text', 'number', 'date', 'select', 'textarea', 'rating'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {input.type === 'select' && <button onClick={() => openOptionsEditor(i)} style={{ padding: '6px 12px', background: '#22c55e', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px', cursor: 'pointer' }}>Options</button>}
                  {!['symbol', 'date', 'outcome', 'pnl'].includes(input.id) && <button onClick={() => deleteInput(i)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}>x</button>}
                </div>
              ))}
            </div>
            <button onClick={addNewInput} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px dashed #1a1a22', borderRadius: '6px', color: '#555', fontSize: '13px', cursor: 'pointer', marginBottom: '18px' }}>+ Add New Field</button>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={saveInputs} style={{ flex: 1, padding: '14px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Save</button>
              <button onClick={() => setShowEditInputs(false)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '6px', color: '#666', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editingOptions !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 102 }} onClick={() => setEditingOptions(null)}>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '24px', width: '340px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '14px' }}>Edit Options</h2>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '14px' }}>One option per line</p>
            <textarea value={optionsText} onChange={e => setOptionsText(e.target.value)} rows={8} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', resize: 'none', boxSizing: 'border-box', marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={saveOptions} style={{ flex: 1, padding: '14px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Save</button>
              <button onClick={() => setEditingOptions(null)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '6px', color: '#666', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showExpandedNote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowExpandedNote(null)}>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '24px', width: '500px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '14px' }}>Trade Notes</h2>
            <div style={{ background: '#0a0a0e', borderRadius: '6px', padding: '16px', maxHeight: '300px', overflowY: 'auto', fontSize: '14px', color: '#888', lineHeight: '1.7' }}>{showExpandedNote}</div>
            <button onClick={() => setShowExpandedNote(null)} style={{ marginTop: '16px', width: '100%', padding: '14px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '6px', color: '#666', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}

      {showExpandedImage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowExpandedImage(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={showExpandedImage} alt="Trade" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px' }} />
            <button onClick={() => setShowExpandedImage(null)} style={{ position: 'absolute', top: '-45px', right: '0', background: 'transparent', border: 'none', color: '#666', fontSize: '28px', cursor: 'pointer' }}>x</button>
          </div>
        </div>
      )}
    </div>
  )
}
