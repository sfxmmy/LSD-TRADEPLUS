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
    // Save to DB
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

  function getStatsByGroup(field, fromExtra = false) {
    const groups = {}
    trades.forEach(t => {
      const extra = getExtraData(t)
      let key = fromExtra ? extra[field] : t[field]
      if (!key) key = 'Unknown'
      if (!groups[key]) groups[key] = { trades: [], wins: 0, losses: 0, pnl: 0, totalRR: 0 }
      groups[key].trades.push(t)
      groups[key].pnl += parseFloat(t.pnl) || 0
      groups[key].totalRR += parseFloat(t.rr) || 0
      if (t.outcome === 'win') groups[key].wins++
      if (t.outcome === 'loss') groups[key].losses++
    })
    return groups
  }

  function getChartData(xAxis, yAxis) {
    const fromExtra = ['session', 'timeframe', 'confidence', 'rating'].includes(xAxis)
    const groups = getStatsByGroup(xAxis, fromExtra)
    return Object.entries(groups).filter(([k]) => k !== 'Unknown').map(([k, v]) => {
      let val = 0
      if (yAxis === 'winrate') val = (v.wins + v.losses) > 0 ? Math.round((v.wins / (v.wins + v.losses)) * 100) : 0
      else if (yAxis === 'pnl') val = v.pnl
      else if (yAxis === 'trades') val = v.trades.length
      else if (yAxis === 'avgpnl') val = v.trades.length > 0 ? Math.round(v.pnl / v.trades.length) : 0
      else if (yAxis === 'avgrr') val = v.trades.length > 0 ? parseFloat((v.totalRR / v.trades.length).toFixed(1)) : 0
      return { label: k, value: val }
    }).sort((a, b) => b.value - a.value).slice(0, 8)
  }

  function BarChart({ data, showPercent = false, title, onRemove }) {
    if (!data?.length) return (
      <div style={{ padding: '16px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{title}</span>
          {onRemove && <button onClick={onRemove} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', fontSize: '14px' }}>×</button>}
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: '#333', fontSize: '11px' }}>No data available</div>
      </div>
    )
    const max = Math.max(...data.map(d => Math.abs(d.value)))
    return (
      <div style={{ padding: '16px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{title}</span>
          {onRemove && <button onClick={onRemove} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', fontSize: '14px' }}>×</button>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {data.map((item, i) => {
            const v = item.value, pct = max > 0 ? (Math.abs(v) / max) * 100 : 0, pos = v >= 0
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '70px', fontSize: '12px', color: '#888', textAlign: 'right' }}>{item.label}</div>
                <div style={{ flex: 1, height: '24px', background: '#0a0a0e', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: pos ? '#22c55e' : '#ef4444', borderRadius: '4px', transition: 'width 0.3s' }} />
                </div>
                <div style={{ width: '60px', fontSize: '12px', fontWeight: 600, color: pos ? '#22c55e' : '#ef4444', textAlign: 'right' }}>
                  {showPercent ? `${v}%` : (v >= 0 ? '+' : '') + '$' + v.toFixed(0)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function DonutChart({ value, size = 110, strokeWidth = 12 }) {
    const r = (size - strokeWidth) / 2, c = 2 * Math.PI * r, o = c - (value / 100) * c
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a1a22" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#22c55e" strokeWidth={strokeWidth} strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`} />
        <text x={size/2} y={size/2} textAnchor="middle" dy="0.35em" fontSize="20" fontWeight="700" fill="#fff">{value}%</text>
      </svg>
    )
  }

  function LineChart({ title }) {
    // Build cumulative PnL data
    const sortedTrades = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
    let cumPnl = 0
    const dataPoints = sortedTrades.map((t, i) => {
      cumPnl += parseFloat(t.pnl) || 0
      return { x: i, y: cumPnl, date: t.date }
    })
    
    if (dataPoints.length < 2) return (
      <div style={{ padding: '16px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px' }}>
        <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '12px' }}>{title}</div>
        <div style={{ padding: '30px', textAlign: 'center', color: '#444', fontSize: '14px' }}>Need more trades for chart</div>
      </div>
    )
    
    const maxY = Math.max(...dataPoints.map(p => p.y))
    const minY = Math.min(...dataPoints.map(p => p.y))
    const yRange = maxY - minY || 100
    const width = 800, height = 200, padL = 55, padR = 15, padT = 15, padB = 35
    const chartW = width - padL - padR, chartH = height - padT - padB
    
    const points = dataPoints.map((p, i) => ({
      x: padL + (i / (dataPoints.length - 1)) * chartW,
      y: padT + chartH - ((p.y - minY) / yRange) * chartH
    }))
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaD = pathD + ` L ${points[points.length-1].x} ${padT + chartH} L ${padL} ${padT + chartH} Z`
    
    const yLabels = []
    const yStep = yRange / 4
    for (let i = 0; i <= 4; i++) {
      yLabels.push(Math.round(minY + yStep * i))
    }
    
    const xLabels = []
    const numXLabels = Math.min(5, dataPoints.length)
    for (let i = 0; i < numXLabels; i++) {
      const idx = Math.floor(i * (dataPoints.length - 1) / Math.max(1, numXLabels - 1))
      const d = new Date(dataPoints[idx].date)
      xLabels.push({ label: `${d.getDate()}/${d.getMonth()+1}/${String(d.getFullYear()).slice(-2)}`, x: padL + (idx / (dataPoints.length - 1)) * chartW })
    }
    
    return (
      <div style={{ padding: '16px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px' }}>
        <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '12px' }}>{title}</div>
        <svg width="100%" height="200" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#333" strokeWidth="1" />
          <line x1={padL} y1={padT + chartH} x2={padL + chartW} y2={padT + chartH} stroke="#333" strokeWidth="1" />
          <path d={areaD} fill="url(#lineGrad)" />
          <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {yLabels.map((v, i) => {
            const y = padT + chartH - ((v - minY) / yRange) * chartH
            return <text key={i} x={padL - 10} y={y + 4} fill="#888" fontSize="12" fontFamily="Arial, sans-serif" textAnchor="end">${v}</text>
          })}
          {xLabels.map((l, i) => <text key={i} x={l.x} y={height - 10} fill="#888" fontSize="12" fontFamily="Arial, sans-serif" textAnchor="middle">{l.label}</text>)}
        </svg>
      </div>
    )
  }

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

  if (loading) return <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', marginBottom: '16px' }}><span style={{ color: '#22c55e' }}>LSD</span>TRADE+</div><div style={{ color: '#888' }}>Loading...</div></div></div>

  // Stats calculations
  const wins = trades.filter(t => t.outcome === 'win').length
  const losses = trades.filter(t => t.outcome === 'loss').length
  const be = trades.filter(t => t.outcome === 'breakeven').length
  const totalPnl = trades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0)
  const winrate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0
  const avgRR = trades.length > 0 ? (trades.reduce((s, t) => s + (parseFloat(t.rr) || 0), 0) / trades.length).toFixed(2) : '0'
  const grossProfit = trades.filter(t => parseFloat(t.pnl) > 0).reduce((s, t) => s + parseFloat(t.pnl), 0)
  const grossLoss = Math.abs(trades.filter(t => parseFloat(t.pnl) < 0).reduce((s, t) => s + parseFloat(t.pnl), 0))
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '0'
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
      {/* Header */}
      <header style={{ padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a22' }}>
        <a href="/" style={{ fontSize: '28px', fontWeight: 700, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>LSD</span>
          <span style={{ color: '#fff' }}>TRADE+</span>
        </a>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px', color: '#fff' }}>JOURNAL AREA</div>
        <a href="/dashboard" style={{ padding: '14px 28px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '14px', textDecoration: 'none' }}>← Dashboard</a>
      </header>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px 40px' }}>
        {/* Account Name + Tabs + Buttons - all in one row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          {/* Left side: Name and tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <span style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>{account?.name}</span>
            <div style={{ height: '24px', width: '1px', background: '#1a1a22' }} />
            {['trades', 'statistics', 'notes'].map((tab, idx) => (
              <div key={tab} style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <button onClick={() => setActiveTab(tab)} style={{ padding: '10px 28px', background: activeTab === tab ? '#22c55e' : 'transparent', border: activeTab === tab ? 'none' : '1px solid #1a1a22', borderRadius: '6px', color: activeTab === tab ? '#fff' : '#aaa', fontWeight: 600, fontSize: '14px', cursor: 'pointer', textTransform: 'capitalize' }}>{tab}</button>
                {idx < 2 && <div style={{ height: '24px', width: '1px', background: '#1a1a22' }} />}
              </div>
            ))}
            <span style={{ fontSize: '13px', color: '#888', marginLeft: '8px' }}>{trades.length} Trades</span>
          </div>
          {/* Right side: Buttons pushed to edge */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {activeTab === 'trades' && (
              <button onClick={() => setShowEditInputs(true)} style={{ padding: '14px 24px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '6px', color: '#aaa', fontSize: '14px', cursor: 'pointer' }}>Edit Columns</button>
            )}
            <button onClick={() => setShowAddTrade(true)} style={{ padding: '14px 28px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>+ LOG NEW TRADE</button>
          </div>
        </div>

        {/* TRADES TAB */}
        {activeTab === 'trades' && (
          <>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', overflow: 'hidden' }}>
            {trades.length === 0 ? (
              <div style={{ padding: '50px', textAlign: 'center', color: '#666', fontSize: '14px' }}>No trades yet. Click "LOG NEW TRADE" to add your first trade.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#0a0a0e', zIndex: 5 }}>
                    <tr>
                      {['Symbol', 'W/L', 'PnL', '%', 'RR', 'Trend', 'Confidence', 'Rating', 'Image', 'Notes', 'Placed', 'Date', ''].map((h, i) => (
                        <th key={i} style={{ padding: '12px 14px', textAlign: 'center', color: '#888', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid #1a1a22' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade, idx) => {
                      const extra = getExtraData(trade)
                      return (
                        <tr key={trade.id} style={{ borderBottom: '1px solid #141418' }}>
                          <td style={{ padding: '14px', fontWeight: 600, fontSize: '13px', textAlign: 'center' }}>{trade.symbol}</td>
                          <td style={{ padding: '14px', textAlign: 'center' }}>
                            <span style={{ padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: trade.outcome === 'win' ? 'rgba(34,197,94,0.15)' : trade.outcome === 'loss' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)', color: trade.outcome === 'win' ? '#22c55e' : trade.outcome === 'loss' ? '#ef4444' : '#888' }}>
                              {trade.outcome === 'win' ? 'WIN' : trade.outcome === 'loss' ? 'LOSS' : 'BE'}
                            </span>
                          </td>
                          <td style={{ padding: '14px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: parseFloat(trade.pnl) >= 0 ? '#22c55e' : '#ef4444' }}>{parseFloat(trade.pnl) >= 0 ? '+' : ''}${parseFloat(trade.pnl || 0).toFixed(0)}</td>
                          <td style={{ padding: '14px', textAlign: 'center', fontSize: '13px', color: '#666' }}>{extra.riskPercent || '1'}%</td>
                          <td style={{ padding: '14px', textAlign: 'center', fontSize: '13px', color: '#888' }}>{trade.rr || '-'}</td>
                          <td style={{ padding: '14px', textAlign: 'center', fontSize: '13px', color: trade.direction === 'long' ? '#22c55e' : '#ef4444' }}>{trade.direction?.toUpperCase() || '-'}</td>
                          <td style={{ padding: '14px', textAlign: 'center' }}>
                            {extra.confidence && <span style={{ padding: '4px 12px', borderRadius: '4px', fontSize: '11px', background: extra.confidence === 'High' ? 'rgba(34,197,94,0.1)' : extra.confidence === 'Low' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', color: extra.confidence === 'High' ? '#22c55e' : extra.confidence === 'Low' ? '#ef4444' : '#888' }}>{extra.confidence}</span>}
                          </td>
                          <td style={{ padding: '14px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '3px' }}>
                              {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= parseInt(extra.rating || 0) ? '#22c55e' : '#2a2a35', fontSize: '16px' }}>★</span>)}
                            </div>
                          </td>
                          <td style={{ padding: '14px', textAlign: 'center' }}>
                            {trade.image_url ? (
                              <button onClick={() => setShowExpandedImage(trade.image_url)} style={{ width: '28px', height: '28px', background: '#1a1a22', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                              </button>
                            ) : <div style={{ width: '28px', height: '28px', background: '#141418', borderRadius: '4px', margin: '0 auto' }} />}
                          </td>
                          <td style={{ padding: '14px', maxWidth: '180px' }}>
                            {trade.notes ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{trade.notes}</span>
                                <button onClick={() => setShowExpandedNote(trade.notes)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px' }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                                </button>
                              </div>
                            ) : <span style={{ fontSize: '12px', color: '#333' }}>-</span>}
                          </td>
                          <td style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: '#666' }}>{getDaysAgo(trade.date)}</td>
                          <td style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: '#666' }}>{new Date(trade.date).getDate()}/{new Date(trade.date).getMonth()+1}</td>
                          <td style={{ padding: '14px', textAlign: 'center' }}><button onClick={() => deleteTrade(trade.id)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', fontSize: '16px' }}>×</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Small PnL Graph below trades */}
          {trades.length > 1 && (
            <div style={{ marginTop: '16px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>Equity Curve</div>
              <div style={{ height: '120px' }}>
                <MiniEquityCurve />
              </div>
            </div>
          )}
        </>
        )}

        {/* STATISTICS TAB */}
        {activeTab === 'statistics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Overview Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px' }}>
              {[
                { l: 'TOTAL PNL', v: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString()}`, c: totalPnl >= 0 ? '#22c55e' : '#ef4444' },
                { l: 'WINRATE', v: `${winrate}%`, c: winrate >= 50 ? '#22c55e' : '#ef4444' },
                { l: 'PROFIT FACTOR', v: profitFactor, c: '#fff' },
                { l: 'AVG RR', v: `${avgRR}R`, c: '#fff' },
                { l: 'AVG WIN', v: `+$${avgWin}`, c: '#22c55e' },
                { l: 'AVG LOSS', v: `-$${avgLoss}`, c: '#ef4444' },
              ].map((s, i) => (
                <div key={i} style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '18px' }}>
                  <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.5px', marginBottom: '8px' }}>{s.l}</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Win/Loss, Streaks, Long vs Short */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '18px' }}>
                <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', fontWeight: 600 }}>WIN/LOSS BREAKDOWN</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <DonutChart value={winrate} size={110} strokeWidth={12} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><div style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#22c55e' }} /><span style={{ fontSize: '13px', color: '#888' }}>{wins} Wins</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><div style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#ef4444' }} /><span style={{ fontSize: '13px', color: '#888' }}>{losses} Losses</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><div style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#555' }} /><span style={{ fontSize: '13px', color: '#888' }}>{be} BE</span></div>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#555', textAlign: 'center', marginTop: '12px' }}>Win Rate</div>
              </div>

              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '18px' }}>
                <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', fontWeight: 600 }}>TRADE STREAKS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '13px', color: '#888' }}>Current Streak</span><span style={{ fontSize: '16px', fontWeight: 600, color: streaks.cs >= 0 ? '#22c55e' : '#ef4444' }}>{streaks.cs >= 0 ? '+' : ''}{streaks.cs}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '13px', color: '#888' }}>Best Win Streak</span><span style={{ fontSize: '16px', fontWeight: 600, color: '#22c55e' }}>{streaks.mw}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: '13px', color: '#888' }}>Worst Loss Streak</span><span style={{ fontSize: '16px', fontWeight: 600, color: '#ef4444' }}>{streaks.ml}</span></div>
                </div>
              </div>

              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '18px' }}>
                <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', fontWeight: 600 }}>LONG VS SHORT</div>
                {(() => {
                  const d = getStatsByGroup('direction')
                  return ['long', 'short'].map((dir, i) => {
                    const data = d[dir] || { wins: 0, losses: 0, pnl: 0, trades: [] }
                    const wr = (data.wins + data.losses) > 0 ? Math.round((data.wins / (data.wins + data.losses)) * 100) : 0
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: i === 0 ? '14px' : 0 }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: dir === 'long' ? '#22c55e' : '#ef4444' }}>{dir.toUpperCase()}</div>
                          <div style={{ fontSize: '12px', color: '#555' }}>{wr}% winrate</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '11px', color: '#555' }}>{data.trades?.length || 0} trades</div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: data.pnl >= 0 ? '#22c55e' : '#ef4444' }}>{data.pnl >= 0 ? '+' : ''}${data.pnl.toFixed(0)}</div>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>

            {/* Line Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <LineChart title="Cumulative PnL Over Time" />
              <BarChart 
                data={getChartData('symbol', 'pnl')} 
                showPercent={false} 
                title="PnL by Symbol"
              />
            </div>

            {/* More Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              <BarChart 
                data={getChartData('session', 'winrate')} 
                showPercent={true} 
                title="Winrate by Session"
              />
              <BarChart 
                data={getChartData('confidence', 'winrate')} 
                showPercent={true} 
                title="Winrate by Confidence"
              />
            </div>

            {/* Edit Stats Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button onClick={() => setEditingStats(!editingStats)} style={{ padding: '8px 14px', background: editingStats ? '#ef4444' : 'transparent', border: editingStats ? 'none' : '1px solid #1a1a22', borderRadius: '5px', color: editingStats ? '#fff' : '#666', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                {editingStats ? 'Done Editing' : 'Edit Stats'}
              </button>
              {editingStats && (
                <button onClick={() => setShowAddChart(true)} style={{ padding: '8px 14px', background: '#22c55e', border: 'none', borderRadius: '5px', color: '#fff', fontSize: '11px', fontWeight: 600, cursor: 'pointer', marginLeft: '10px' }}>+ Add New Statistic</button>
              )}
            </div>

            {/* Custom Charts (only show in edit mode) */}
            {editingStats && customCharts.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                {customCharts.map(chart => (
                  <BarChart 
                    key={chart.id}
                    data={getChartData(chart.xAxis, chart.yAxis)} 
                    showPercent={chart.yAxis === 'winrate'} 
                    title={chart.title}
                    onRemove={() => removeChart(chart.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div>
            {/* Sub-tabs for note types */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {['daily', 'weekly', 'custom'].map(t => (
                <button key={t} onClick={() => setNotesSubTab(t)} style={{ padding: '10px 24px', background: notesSubTab === t ? '#22c55e' : '#0d0d12', border: notesSubTab === t ? 'none' : '1px solid #1a1a22', borderRadius: '6px', color: notesSubTab === t ? '#fff' : '#666', fontWeight: 600, fontSize: '12px', cursor: 'pointer', textTransform: 'capitalize' }}>{t} Notes</button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '16px' }}>
              {/* Add Note */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '20px' }}>
                <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', fontWeight: 600 }}>Add {notesSubTab} Note</div>
                {notesSubTab !== 'custom' && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '10px', color: '#555', marginBottom: '5px', textTransform: 'uppercase' }}>{notesSubTab === 'daily' ? 'Date' : 'Week Starting'}</label>
                    <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '5px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>
                )}
                {notesSubTab === 'custom' && (
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '10px', color: '#555', marginBottom: '5px', textTransform: 'uppercase' }}>Title</label>
                    <input type="text" value={customNoteTitle} onChange={e => setCustomNoteTitle(e.target.value)} placeholder="Note title..." style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '5px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} />
                  </div>
                )}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '10px', color: '#555', marginBottom: '5px', textTransform: 'uppercase' }}>Note Content</label>
                  <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Write your note..." rows={6} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '5px', color: '#fff', fontSize: '12px', resize: 'none', boxSizing: 'border-box' }} />
                </div>
                <button onClick={saveNote} disabled={!noteText.trim()} style={{ width: '100%', padding: '14px', background: '#22c55e', border: 'none', borderRadius: '5px', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer', opacity: !noteText.trim() ? 0.5 : 1 }}>Save Note</button>
              </div>

              {/* Notes List */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '20px' }}>
                <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px', fontWeight: 600 }}>Your {notesSubTab} Notes</div>
                
                {notesSubTab === 'daily' && (
                  Object.keys(notes.daily || {}).length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#444', fontSize: '12px' }}>No daily notes yet</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                      {Object.entries(notes.daily).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([date, text]) => (
                        <div key={date} style={{ padding: '14px', background: '#0a0a0e', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>{new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            <button onClick={() => deleteNote('daily', date)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', fontSize: '16px' }}>×</button>
                          </div>
                          <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.6' }}>{text}</div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {notesSubTab === 'weekly' && (
                  Object.keys(notes.weekly || {}).length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#444', fontSize: '12px' }}>No weekly notes yet</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                      {Object.entries(notes.weekly).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([week, text]) => (
                        <div key={week} style={{ padding: '14px', background: '#0a0a0e', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600 }}>Week of {new Date(week).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                            <button onClick={() => deleteNote('weekly', week)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', fontSize: '16px' }}>×</button>
                          </div>
                          <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.6' }}>{text}</div>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {notesSubTab === 'custom' && (
                  (notes.custom || []).length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#444', fontSize: '12px' }}>No custom notes yet</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                      {notes.custom.map((note, i) => (
                        <div key={i} style={{ padding: '14px', background: '#0a0a0e', borderRadius: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>{note.title}</span>
                            <button onClick={() => deleteNote('custom', i)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', fontSize: '16px' }}>×</button>
                          </div>
                          <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.6' }}>{note.text}</div>
                          <div style={{ fontSize: '10px', color: '#444', marginTop: '8px' }}>{new Date(note.date).toLocaleDateString('en-GB')}</div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODALS */}
        {showAddTrade && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowAddTrade(false)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '24px', width: '520px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>Log New Trade</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                {enabledInputs.map(input => (
                  <div key={input.id} style={{ gridColumn: input.type === 'textarea' ? 'span 2' : 'span 1' }}>
                    <label style={{ display: 'block', fontSize: '10px', color: '#555', marginBottom: '6px', textTransform: 'uppercase' }}>{input.label} {input.required && <span style={{ color: '#ef4444' }}>*</span>}</label>
                    {input.type === 'select' ? (
                      <select value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '5px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}>
                        {input.options?.map(o => <option key={o} value={o.toLowerCase()}>{o}</option>)}
                      </select>
                    ) : input.type === 'textarea' ? (
                      <textarea value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} rows={3} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '5px', color: '#fff', fontSize: '12px', resize: 'none', boxSizing: 'border-box' }} />
                    ) : input.type === 'rating' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>{[1,2,3,4,5].map(i => <button key={i} onClick={() => setTradeForm({...tradeForm, [input.id]: String(i)})} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '24px', color: i <= parseInt(tradeForm[input.id] || 0) ? '#22c55e' : '#333' }}>★</button>)}</div>
                    ) : (
                      <input type={input.type} value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} step={input.type === 'number' ? '0.1' : undefined} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '5px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={addTrade} disabled={saving || !tradeForm.symbol || !tradeForm.pnl} style={{ flex: 1, padding: '14px', background: '#22c55e', border: 'none', borderRadius: '5px', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer', opacity: (saving || !tradeForm.symbol || !tradeForm.pnl) ? 0.5 : 1 }}>{saving ? 'Saving...' : 'Save Trade'}</button>
                <button onClick={() => setShowAddTrade(false)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '5px', color: '#666', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showEditInputs && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 101 }} onClick={() => setShowEditInputs(false)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '24px', width: '480px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>Customize Columns</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
                {inputs.map((input, i) => (
                  <div key={input.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: '#0a0a0e', borderRadius: '6px' }}>
                    <input type="checkbox" checked={input.enabled} onChange={e => updateInput(i, 'enabled', e.target.checked)} style={{ width: '18px', height: '18px' }} />
                    <input type="text" value={input.label} onChange={e => updateInput(i, 'label', e.target.value)} style={{ flex: 1, padding: '8px 12px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '5px', color: '#fff', fontSize: '12px' }} />
                    <select value={input.type} onChange={e => updateInput(i, 'type', e.target.value)} style={{ padding: '8px 12px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '5px', color: '#666', fontSize: '11px' }}>
                      {['text', 'number', 'date', 'select', 'textarea', 'rating'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {input.type === 'select' && <button onClick={() => openOptionsEditor(i)} style={{ padding: '6px 12px', background: '#22c55e', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '10px', cursor: 'pointer' }}>Options</button>}
                    {!['symbol', 'date', 'outcome', 'pnl'].includes(input.id) && <button onClick={() => deleteInput(i)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}>×</button>}
                  </div>
                ))}
              </div>
              <button onClick={addNewInput} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px dashed #1a1a22', borderRadius: '5px', color: '#555', fontSize: '12px', cursor: 'pointer', marginBottom: '18px' }}>+ Add New Field</button>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={saveInputs} style={{ flex: 1, padding: '14px', background: '#22c55e', border: 'none', borderRadius: '5px', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Save</button>
                <button onClick={() => setShowEditInputs(false)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '5px', color: '#666', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showAddChart && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 101 }} onClick={() => setShowAddChart(false)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '24px', width: '400px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>Add New Chart</h2>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '10px', color: '#555', marginBottom: '6px', textTransform: 'uppercase' }}>X-Axis (Group By)</label>
                <select value={newChartX} onChange={e => setNewChartX(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '5px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}>
                  {[
                    { v: 'session', l: 'Session' },
                    { v: 'timeframe', l: 'Timeframe' },
                    { v: 'confidence', l: 'Confidence' },
                    { v: 'rating', l: 'Rating' },
                    { v: 'direction', l: 'Direction' },
                    { v: 'symbol', l: 'Symbol' },
                  ].map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '10px', color: '#555', marginBottom: '6px', textTransform: 'uppercase' }}>Y-Axis (Metric)</label>
                <select value={newChartY} onChange={e => setNewChartY(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '5px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}>
                  {[
                    { v: 'winrate', l: 'Win Rate (%)' },
                    { v: 'pnl', l: 'Total PnL ($)' },
                    { v: 'trades', l: 'Trade Count' },
                    { v: 'avgpnl', l: 'Average PnL ($)' },
                    { v: 'avgrr', l: 'Average RR' },
                  ].map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={addNewChart} style={{ flex: 1, padding: '14px', background: '#22c55e', border: 'none', borderRadius: '5px', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Add Chart</button>
                <button onClick={() => setShowAddChart(false)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '5px', color: '#666', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {editingOptions !== null && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 102 }} onClick={() => setEditingOptions(null)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '24px', width: '340px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>Edit Options</h2>
              <p style={{ fontSize: '11px', color: '#555', marginBottom: '14px' }}>One option per line</p>
              <textarea value={optionsText} onChange={e => setOptionsText(e.target.value)} rows={8} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '5px', color: '#fff', fontSize: '12px', resize: 'none', boxSizing: 'border-box', marginBottom: '16px' }} />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={saveOptions} style={{ flex: 1, padding: '14px', background: '#22c55e', border: 'none', borderRadius: '5px', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Save</button>
                <button onClick={() => setEditingOptions(null)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '5px', color: '#666', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showExpandedNote && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowExpandedNote(null)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '24px', width: '500px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>Trade Notes</h2>
              <div style={{ background: '#0a0a0e', borderRadius: '6px', padding: '16px', maxHeight: '300px', overflowY: 'auto', fontSize: '14px', color: '#888', lineHeight: '1.7' }}>{showExpandedNote}</div>
              <button onClick={() => setShowExpandedNote(null)} style={{ marginTop: '16px', width: '100%', padding: '14px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '5px', color: '#666', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        )}

        {showExpandedImage && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowExpandedImage(null)}>
            <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
              <img src={showExpandedImage} alt="Trade" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px' }} />
              <button onClick={() => setShowExpandedImage(null)} style={{ position: 'absolute', top: '-45px', right: '0', background: 'transparent', border: 'none', color: '#666', fontSize: '28px', cursor: 'pointer' }}>×</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
