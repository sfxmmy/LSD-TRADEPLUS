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
  // Stats page dropdown filters
  const [graphType, setGraphType] = useState('pnl') // pnl, balance
  const [graphGroupBy, setGraphGroupBy] = useState('symbol') // symbol, session, confidence, timeframe
  const [compareMode, setCompareMode] = useState('time') // time, trades
  const [barGraphMetric, setBarGraphMetric] = useState('winrate') // winrate, pnl, count
  const [analysisGroupBy, setAnalysisGroupBy] = useState('confidence') // confidence, session, timeframe, direction
  const [analysisMetric, setAnalysisMetric] = useState('winrate') // winrate, pnl, rr
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
      else if (yAxis === 'trades' || yAxis === 'count') val = v.trades.length
      else if (yAxis === 'avgpnl') val = v.trades.length > 0 ? Math.round(v.pnl / v.trades.length) : 0
      else if (yAxis === 'avgrr') val = v.trades.length > 0 ? parseFloat((v.totalRR / v.trades.length).toFixed(1)) : 0
      return { label: k, value: val }
    }).sort((a, b) => b.value - a.value).slice(0, 8)
  }

  function BarChart({ data, showPercent = false, showCount = false, title, onRemove }) {
    if (!data?.length) return (
      <div style={{ padding: '16px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{title}</span>
          {onRemove && <button onClick={onRemove} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', fontSize: '14px' }}>×</button>}
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '12px' }}>No data available</div>
      </div>
    )
    const max = Math.max(...data.map(d => Math.abs(d.value)))
    return (
      <div style={{ padding: '16px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{title}</span>
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
                  {showPercent ? `${v}%` : showCount ? v : (v >= 0 ? '+' : '') + '$' + v.toFixed(0)}
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
      <div style={{ padding: '16px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', height: '100%' }}>
        <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '12px' }}>{title}</div>
        <div style={{ padding: '30px', textAlign: 'center', color: '#666', fontSize: '14px' }}>Need more trades for chart</div>
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
      <div style={{ padding: '16px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', height: '100%' }}>
        <div style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '12px' }}>{title}</div>
        <svg width="100%" height="180" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
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

  // Stats page equity curve - same style as dashboard
  function StatsEquityCurve() {
    const sortedTrades = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
    let cumPnl = 0
    const start = parseFloat(account?.starting_balance) || 10000
    const points = [{ balance: start, date: null }]
    sortedTrades.forEach(t => {
      cumPnl += parseFloat(t.pnl) || 0
      points.push({ balance: start + cumPnl, date: t.date })
    })
    
    if (points.length < 2) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '12px' }}>Need more trades</div>
    
    const maxBal = Math.max(...points.map(p => p.balance))
    const minBal = Math.min(...points.map(p => p.balance))
    const yMax = Math.ceil(maxBal / 1000) * 1000
    const yMin = Math.floor(minBal / 1000) * 1000
    const yRange = yMax - yMin || 1000
    
    const yLabels = []
    for (let v = yMin; v <= yMax; v += 1000) yLabels.push(v)
    
    const svgW = 100, svgH = 100
    const chartPoints = points.map((p, i) => ({
      x: points.length > 1 ? (i / (points.length - 1)) * svgW : svgW / 2,
      y: svgH - ((p.balance - yMin) / yRange) * svgH
    }))
    const pathD = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const areaD = pathD + ` L ${chartPoints[chartPoints.length - 1].x} ${svgH} L ${chartPoints[0].x} ${svgH} Z`
    
    // X labels
    const xLabels = []
    const datesWithTrades = points.filter(p => p.date)
    if (datesWithTrades.length > 0) {
      const numLabels = Math.min(4, datesWithTrades.length)
      for (let i = 0; i < numLabels; i++) {
        const idx = Math.floor(i * (datesWithTrades.length - 1) / Math.max(1, numLabels - 1))
        const d = new Date(datesWithTrades[idx].date)
        const pct = (idx + 1) / points.length * 100
        xLabels.push({ label: `${d.getDate()}/${d.getMonth()+1}`, pct })
      }
    }
    
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex' }}>
        <div style={{ width: '35px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: '18px', flexShrink: 0 }}>
          {[...yLabels].reverse().map((v, i) => (
            <span key={i} style={{ fontSize: '9px', color: '#888', lineHeight: 1 }}>${(v/1000).toFixed(0)}k</span>
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="statsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="0" x2="0" y2={svgH} stroke="#333" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1={svgH} x2={svgW} y2={svgH} stroke="#333" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              <path d={areaD} fill="url(#statsGrad)" />
              <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>
          <div style={{ height: '18px', position: 'relative', overflow: 'hidden' }}>
            {xLabels.map((l, i) => {
              const isFirst = i === 0, isLast = i === xLabels.length - 1
              const style = isFirst ? { position: 'absolute', left: '0', fontSize: '9px', color: '#888' }
                : isLast ? { position: 'absolute', right: '0', fontSize: '9px', color: '#888' }
                : { position: 'absolute', left: `${l.pct}%`, transform: 'translateX(-50%)', fontSize: '9px', color: '#888' }
              return <span key={i} style={style}>{l.label}</span>
            })}
          </div>
        </div>
      </div>
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
      <header style={{ padding: '12px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a22' }}>
        <a href="/" style={{ fontSize: '22px', fontWeight: 700, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>LSD</span>
          <span style={{ color: '#fff' }}>TRADE+</span>
        </a>
        <div style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.5px', color: '#fff' }}>JOURNAL AREA</div>
        <a href="/dashboard" style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '12px', textDecoration: 'none' }}>← Dashboard</a>
      </header>

      {/* Main Layout - Full width with sidebar */}
      <div style={{ display: 'flex', maxWidth: '1600px', margin: '0 auto' }}>
        
        {/* LEFT SIDEBAR - Large buttons */}
        <div style={{ width: '200px', padding: '12px 16px 0', borderRight: '1px solid #1a1a22', minHeight: 'calc(100vh - 50px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {['trades', 'statistics', 'notes'].map(tab => (
              <button 
                key={tab} 
                onClick={() => setActiveTab(tab)} 
                style={{ 
                  padding: '20px 24px', 
                  background: activeTab === tab ? '#22c55e' : 'transparent', 
                  border: activeTab === tab ? 'none' : '1px solid #1a1a22', 
                  borderRadius: '8px', 
                  color: activeTab === tab ? '#fff' : '#888', 
                  fontSize: '16px', 
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
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, padding: '12px 20px' }}>
          
          {/* Top Row: Name far left, buttons far right */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>{account?.name}</span>
              <span style={{ fontSize: '11px', color: '#555', padding: '4px 10px', background: '#141418', borderRadius: '4px' }}>{trades.length} Trades</span>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {activeTab === 'trades' && (
                <button onClick={() => setShowEditInputs(true)} style={{ padding: '12px 18px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '6px', color: '#888', fontSize: '13px', cursor: 'pointer' }}>Edit Columns</button>
              )}
              <button onClick={() => setShowAddTrade(true)} style={{ padding: '12px 22px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>+ LOG NEW TRADE</button>
            </div>
          </div>

          {/* TRADES TAB */}
          {activeTab === 'trades' && (
            <>
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', overflow: 'hidden' }}>
                {trades.length === 0 ? (
                  <div style={{ padding: '50px', textAlign: 'center', color: '#555', fontSize: '13px' }}>No trades yet. Click "+ LOG NEW TRADE" to add your first trade.</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#0a0a0e', zIndex: 5 }}>
                        <tr>
                          {['Symbol', 'W/L', 'PnL', '%', 'RR', 'Trend', 'Confidence', 'Rating', 'Image', 'Notes', 'Placed', 'Date', ''].map((h, i) => (
                            <th key={i} style={{ padding: '10px 12px', textAlign: 'center', color: '#555', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid #1a1a22', letterSpacing: '0.5px' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map((trade) => {
                          const extra = getExtraData(trade)
                          const pnlValue = parseFloat(trade.pnl) || 0
                          return (
                            <tr key={trade.id} style={{ borderBottom: '1px solid #141418' }}>
                              <td style={{ padding: '12px', fontWeight: 600, fontSize: '13px', textAlign: 'center' }}>{trade.symbol}</td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <span style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: trade.outcome === 'win' ? 'rgba(34,197,94,0.15)' : trade.outcome === 'loss' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)', color: trade.outcome === 'win' ? '#22c55e' : trade.outcome === 'loss' ? '#ef4444' : '#666' }}>
                                  {trade.outcome === 'win' ? 'WIN' : trade.outcome === 'loss' ? 'LOSS' : 'BE'}
                                </span>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: pnlValue >= 0 ? '#22c55e' : '#ef4444' }}>
                                {pnlValue >= 0 ? '+' : ''}${pnlValue.toFixed(0)}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#555' }}>{extra.riskPercent || '1'}%</td>
                              <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#666' }}>{trade.rr || '-'}</td>
                              <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: trade.direction === 'long' ? '#22c55e' : '#ef4444' }}>{trade.direction?.toUpperCase() || '-'}</td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                {extra.confidence && <span style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '10px', background: extra.confidence === 'High' ? 'rgba(34,197,94,0.1)' : extra.confidence === 'Low' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', color: extra.confidence === 'High' ? '#22c55e' : extra.confidence === 'Low' ? '#ef4444' : '#666' }}>{extra.confidence}</span>}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>
                                  {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= parseInt(extra.rating || 0) ? '#22c55e' : '#2a2a35', fontSize: '14px' }}>★</span>)}
                                </div>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                {trade.image_url ? (
                                  <button onClick={() => setShowExpandedImage(trade.image_url)} style={{ width: '26px', height: '26px', background: '#1a1a22', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                  </button>
                                ) : <div style={{ width: '26px', height: '26px', background: '#141418', borderRadius: '4px', margin: '0 auto' }} />}
                              </td>
                              <td style={{ padding: '12px', maxWidth: '150px' }}>
                                {trade.notes ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '11px', color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{trade.notes}</span>
                                    <button onClick={() => setShowExpandedNote(trade.notes)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px' }}>
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                                    </button>
                                  </div>
                                ) : <span style={{ fontSize: '11px', color: '#333' }}>-</span>}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px', color: '#555' }}>{getDaysAgo(trade.date)}</td>
                              <td style={{ padding: '12px', textAlign: 'center', fontSize: '11px', color: '#555' }}>{new Date(trade.date).getDate()}/{new Date(trade.date).getMonth()+1}</td>
                              <td style={{ padding: '12px', textAlign: 'center' }}><button onClick={() => deleteTrade(trade.id)} style={{ background: 'transparent', border: 'none', color: '#333', cursor: 'pointer', fontSize: '14px' }}>×</button></td>
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
                <div style={{ marginTop: '12px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '12px 16px' }}>
                  <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Equity Curve</div>
                  <div style={{ height: '100px' }}>
                    <MiniEquityCurve />
                  </div>
                </div>
              )}
            </>
          )}

          {/* STATISTICS TAB */}
          {activeTab === 'statistics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* ROW 1: Stats Column + Line Graph with Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: '12px' }}>
                
                {/* LEFT: Stats - Label: Value on same line */}
                <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px' }}>
                  {[
                    { l: 'Total PnL', v: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString()}`, c: totalPnl >= 0 ? '#22c55e' : '#ef4444' },
                    { l: 'Winrate', v: `${winrate}%`, c: winrate >= 50 ? '#22c55e' : '#ef4444' },
                    { l: 'Profit Factor', v: profitFactor, c: parseFloat(profitFactor) >= 1.5 ? '#22c55e' : '#fff' },
                    { l: 'Avg Win', v: `$${avgWin}`, c: '#22c55e' },
                    { l: 'Avg Loss', v: `$${avgLoss}`, c: '#ef4444' },
                    { l: 'Streak', v: `${streaks.cs >= 0 ? '+' : ''}${streaks.cs}`, c: streaks.cs >= 0 ? '#22c55e' : '#ef4444' },
                    { l: 'Best Streak', v: `+${streaks.best || 0}`, c: '#22c55e' },
                    { l: 'Worst Streak', v: `-${streaks.worst || 0}`, c: '#ef4444' },
                    { l: 'Total Wins', v: trades.filter(t => t.outcome === 'win').length, c: '#22c55e' },
                    { l: 'Total Losses', v: trades.filter(t => t.outcome === 'loss').length, c: '#ef4444' },
                    { l: 'Best Trade', v: `$${Math.max(...trades.map(t => parseFloat(t.pnl) || 0), 0).toFixed(0)}`, c: '#22c55e' },
                    { l: 'Worst Trade', v: `$${Math.min(...trades.map(t => parseFloat(t.pnl) || 0), 0).toFixed(0)}`, c: '#ef4444' },
                  ].map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 11 ? '1px solid #1a1a22' : 'none' }}>
                      <span style={{ fontSize: '11px', color: '#666' }}>{s.l}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: s.c }}>{s.v}</span>
                    </div>
                  ))}
                </div>

                {/* RIGHT: Line Graph + Controls in ONE box */}
                <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Equity Curve</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select value={graphType} onChange={e => setGraphType(e.target.value)} style={{ padding: '6px 10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '11px' }}>
                        <option value="pnl">Cumulative PnL</option>
                        <option value="balance">Balance</option>
                      </select>
                      <select value={compareMode} onChange={e => setCompareMode(e.target.value)} style={{ padding: '6px 10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '11px' }}>
                        <option value="time">vs Time</option>
                        <option value="trades">vs Trade #</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Line Chart with Hover */}
                  <div style={{ height: '220px', position: 'relative' }}>
                    {(() => {
                      if (trades.length < 2) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>Need at least 2 trades</div>
                      
                      const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
                      let dataPoints = []
                      let cumulative = account?.starting_balance || 10000
                      
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
                          <div style={{ width: '50px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '8px', fontSize: '9px', color: '#555' }}>
                            <span>${(maxY / 1000).toFixed(1)}k</span>
                            <span>${((maxY + minY) / 2000).toFixed(1)}k</span>
                            <span>${(minY / 1000).toFixed(1)}k</span>
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
                              <polyline points={points} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              {dataPoints.map((d, i) => (
                                <circle 
                                  key={i} 
                                  cx={getX(i)} 
                                  cy={getY(d.y)} 
                                  r={hoveredPoint === i ? 3 : 1.5} 
                                  fill={hoveredPoint === i ? '#fff' : '#22c55e'}
                                  stroke="#22c55e"
                                  strokeWidth="1"
                                  style={{ cursor: 'pointer', transition: 'r 0.1s' }}
                                  onMouseEnter={() => setHoveredPoint(i)}
                                />
                              ))}
                            </svg>
                            {/* Hover Tooltip */}
                            {hoveredPoint !== null && dataPoints[hoveredPoint] && (
                              <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#1a1a22', border: '1px solid #333', borderRadius: '6px', padding: '10px', fontSize: '11px', zIndex: 10 }}>
                                <div style={{ color: '#888', marginBottom: '4px' }}>{new Date(dataPoints[hoveredPoint].date).toLocaleDateString()}</div>
                                <div style={{ color: '#fff', fontWeight: 600 }}>{dataPoints[hoveredPoint].symbol}</div>
                                <div style={{ color: dataPoints[hoveredPoint].pnl >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                                  {dataPoints[hoveredPoint].pnl >= 0 ? '+' : ''}${dataPoints[hoveredPoint].pnl.toFixed(0)}
                                </div>
                                <div style={{ color: '#666', marginTop: '4px' }}>
                                  Total: ${dataPoints[hoveredPoint].y.toFixed(0)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  
                  {/* X-axis labels */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '50px', paddingTop: '8px', fontSize: '9px', color: '#555' }}>
                    {(() => {
                      const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
                      if (sorted.length < 2) return null
                      return compareMode === 'time' ? (
                        <>
                          <span>{new Date(sorted[0]?.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                          <span>{new Date(sorted[Math.floor(sorted.length/2)]?.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                          <span>{new Date(sorted[sorted.length-1]?.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                        </>
                      ) : (
                        <>
                          <span>Trade #1</span>
                          <span>#{Math.floor(sorted.length/2)}</span>
                          <span>#{sorted.length}</span>
                        </>
                      )
                    })()}
                  </div>
                </div>
              </div>

              {/* ROW 2: Bar Graph + Controls in ONE box */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Performance Breakdown</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <select value={barGraphMetric} onChange={e => setBarGraphMetric(e.target.value)} style={{ padding: '6px 10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '11px' }}>
                      <option value="winrate">Winrate</option>
                      <option value="pnl">Total PnL</option>
                      <option value="count">Trade Count</option>
                    </select>
                    <select value={graphGroupBy} onChange={e => setGraphGroupBy(e.target.value)} style={{ padding: '6px 10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '11px' }}>
                      <option value="symbol">by Pair</option>
                      <option value="session">by Session</option>
                      <option value="confidence">by Confidence</option>
                      <option value="timeframe">by Timeframe</option>
                      <option value="direction">by Direction</option>
                    </select>
                  </div>
                </div>
                
                {/* Bar Chart with Hover */}
                <div style={{ height: '200px' }}>
                  {(() => {
                    const groupedData = {}
                    trades.forEach(t => {
                      const key = graphGroupBy === 'confidence' ? (getExtraData(t).confidence || 'Unknown') : (t[graphGroupBy] || 'Unknown')
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
                        return { name, value, displayValue, winrate: wr, pnl: data.pnl, count: data.total, wins: data.wins, losses: data.losses }
                      })
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 10)
                    
                    if (entries.length === 0) return <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>No data</div>
                    
                    const maxVal = barGraphMetric === 'winrate' ? 100 : Math.max(...entries.map(e => Math.abs(e.value)), 1)
                    
                    return (
                      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ flex: 1, display: 'flex' }}>
                          <div style={{ width: '45px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: '9px', color: '#555' }}>
                            <span>{barGraphMetric === 'winrate' ? '100%' : barGraphMetric === 'pnl' ? '$' + Math.round(maxVal) : maxVal}</span>
                            <span>{barGraphMetric === 'winrate' ? '50%' : barGraphMetric === 'pnl' ? '$' + Math.round(maxVal/2) : Math.round(maxVal/2)}</span>
                            <span>0</span>
                          </div>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: '4px', borderLeft: '1px solid #333', borderBottom: '1px solid #333', paddingLeft: '8px', position: 'relative' }}>
                            {entries.map((item, i) => {
                              const heightPct = Math.max((Math.abs(item.value) / maxVal) * 100, 3)
                              const isGreen = barGraphMetric === 'winrate' ? item.value >= 50 : item.value >= 0
                              return (
                                <div 
                                  key={i} 
                                  style={{ flex: 1, maxWidth: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}
                                  onMouseEnter={() => setHoveredBar(i)}
                                  onMouseLeave={() => setHoveredBar(null)}
                                >
                                  <div style={{ fontSize: '9px', color: isGreen ? '#22c55e' : '#ef4444', marginBottom: '3px', fontWeight: 600 }}>{item.displayValue}</div>
                                  <div style={{ 
                                    width: '100%', 
                                    height: `${heightPct}%`, 
                                    background: isGreen ? 'linear-gradient(to top, #22c55e, #22c55eaa)' : 'linear-gradient(to top, #ef4444, #ef4444aa)',
                                    borderRadius: '3px 3px 0 0',
                                    cursor: 'pointer',
                                    transition: 'opacity 0.15s',
                                    opacity: hoveredBar === null || hoveredBar === i ? 1 : 0.5
                                  }} />
                                  {/* Hover tooltip */}
                                  {hoveredBar === i && (
                                    <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', background: '#1a1a22', border: '1px solid #333', borderRadius: '6px', padding: '8px', fontSize: '10px', whiteSpace: 'nowrap', zIndex: 20, marginBottom: '8px' }}>
                                      <div style={{ fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{item.name}</div>
                                      <div style={{ color: '#888' }}>Wins: <span style={{ color: '#22c55e' }}>{item.wins}</span> / Losses: <span style={{ color: '#ef4444' }}>{item.losses}</span></div>
                                      <div style={{ color: '#888' }}>WR: <span style={{ color: item.winrate >= 50 ? '#22c55e' : '#ef4444' }}>{item.winrate}%</span></div>
                                      <div style={{ color: '#888' }}>PnL: <span style={{ color: item.pnl >= 0 ? '#22c55e' : '#ef4444' }}>{item.pnl >= 0 ? '+' : ''}${Math.round(item.pnl)}</span></div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        <div style={{ display: 'flex', paddingLeft: '45px', paddingTop: '6px' }}>
                          {entries.map((item, i) => (
                            <div key={i} style={{ flex: 1, maxWidth: '60px', textAlign: 'center', fontSize: '9px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>

              {/* ROW 3: Long/Short Bar + Total Trades + More Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {/* Long/Short Bar */}
                <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase' }}>Direction Split</span>
                  {(() => {
                    const longCount = trades.filter(t => t.direction?.toLowerCase() === 'long').length
                    const shortCount = trades.filter(t => t.direction?.toLowerCase() === 'short').length
                    const total = longCount + shortCount || 1
                    const longPct = Math.round((longCount / total) * 100)
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 700, minWidth: '55px' }}>{longPct}% L</span>
                        <div style={{ flex: 1, height: '10px', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                          <div style={{ width: `${longPct}%`, background: '#22c55e' }} />
                          <div style={{ width: `${100-longPct}%`, background: '#ef4444' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700, minWidth: '55px', textAlign: 'right' }}>{100-longPct}% S</span>
                      </div>
                    )
                  })()}
                </div>
                
                {/* Total Trades */}
                <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase' }}>Total Trades</span>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>{trades.length}</span>
                </div>

                {/* Avg RR */}
                <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase' }}>Avg RR</span>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#22c55e' }}>
                    {(trades.reduce((s, t) => s + (parseFloat(t.rr) || 0), 0) / (trades.length || 1)).toFixed(2)}R
                  </span>
                </div>
              </div>

              {/* ROW 4: Best Pair Donut + Trade Analysis */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                
                {/* Best Pair with Donut + Extra Stats */}
                <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px', display: 'flex' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                      { l: 'Avg Trend', v: (() => { const l = trades.filter(t => t.direction?.toLowerCase() === 'long').length; const s = trades.filter(t => t.direction?.toLowerCase() === 'short').length; return l > s ? 'Long' : s > l ? 'Short' : 'Mixed' })() },
                      { l: 'Avg Rating', v: (trades.reduce((s, t) => s + (parseInt(getExtraData(t).rating) || 0), 0) / (trades.length || 1)).toFixed(1) + '★' },
                      { l: 'Avg PnL/Trade', v: `$${Math.round(totalPnl / (trades.length || 1))}` },
                      { l: 'Most Traded', v: (() => { const c = {}; trades.forEach(t => c[t.symbol] = (c[t.symbol] || 0) + 1); return Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || '-' })() },
                      { l: 'Best Session', v: (() => { const s = {}; trades.forEach(t => { const sess = t.session || 'Unknown'; if (!s[sess]) s[sess] = { w: 0, t: 0 }; s[sess].t++; if (t.outcome === 'win') s[sess].w++ }); const best = Object.entries(s).filter(([k]) => k !== 'Unknown').sort((a, b) => (b[1].w/b[1].t) - (a[1].w/a[1].t))[0]; return best ? best[0] : '-' })() },
                      { l: 'Best Timeframe', v: (() => { const s = {}; trades.forEach(t => { const tf = t.timeframe || 'Unknown'; if (!s[tf]) s[tf] = { w: 0, t: 0 }; s[tf].t++; if (t.outcome === 'win') s[tf].w++ }); const best = Object.entries(s).filter(([k]) => k !== 'Unknown').sort((a, b) => (b[1].w/b[1].t) - (a[1].w/a[1].t))[0]; return best ? best[0] : '-' })() },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: '#555' }}>{item.l}</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{item.v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ width: '1px', background: '#1a1a22', margin: '0 16px' }} />
                  <div style={{ width: '130px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {(() => {
                      const ps = {}
                      trades.forEach(t => { if (!ps[t.symbol]) ps[t.symbol] = { w: 0, l: 0, pnl: 0 }; if (t.outcome === 'win') ps[t.symbol].w++; else if (t.outcome === 'loss') ps[t.symbol].l++; ps[t.symbol].pnl += parseFloat(t.pnl) || 0 })
                      const best = Object.entries(ps).sort((a, b) => b[1].pnl - a[1].pnl)[0]
                      if (!best) return <div style={{ color: '#555', fontSize: '11px' }}>No data</div>
                      const wr = best[1].w + best[1].l > 0 ? Math.round((best[1].w / (best[1].w + best[1].l)) * 100) : 0
                      const size = 90, stroke = 7, r = (size - stroke) / 2, c = 2 * Math.PI * r
                      return (
                        <>
                          <div style={{ fontSize: '9px', color: '#555', marginBottom: '6px', textTransform: 'uppercase' }}>Best Pair</div>
                          <div style={{ position: 'relative', width: size, height: size }}>
                            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                              <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a1a22" strokeWidth={stroke} />
                              <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#22c55e" strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c * (1 - wr/100)} strokeLinecap="round" />
                            </svg>
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{best[0]}</div>
                              <div style={{ fontSize: '16px', fontWeight: 700, color: '#22c55e' }}>{wr}%</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '9px', color: '#666' }}>
                            <span><span style={{ color: '#22c55e' }}>●</span> {best[1].w}W</span>
                            <span><span style={{ color: '#333' }}>●</span> {best[1].l}L</span>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>

                {/* Trade Analysis - Fully Functional */}
                <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px', display: 'flex' }}>
                  <div style={{ width: '140px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: '9px', color: '#555', marginBottom: '10px', textTransform: 'uppercase' }}>Trade Analysis</div>
                    <select value={analysisGroupBy} onChange={e => setAnalysisGroupBy(e.target.value)} style={{ padding: '8px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '11px', marginBottom: '8px' }}>
                      <option value="confidence">Confidence</option>
                      <option value="session">Session</option>
                      <option value="timeframe">Timeframe</option>
                      <option value="direction">Direction</option>
                    </select>
                    <div style={{ fontSize: '10px', color: '#444', textAlign: 'center', margin: '4px 0' }}>vs</div>
                    <select value={analysisMetric} onChange={e => setAnalysisMetric(e.target.value)} style={{ padding: '8px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '11px' }}>
                      <option value="winrate">Winrate</option>
                      <option value="pnl">Total PnL</option>
                      <option value="avgpnl">Avg PnL</option>
                    </select>
                  </div>
                  <div style={{ width: '1px', background: '#1a1a22', margin: '0 16px' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '8px' }}>
                    {(() => {
                      const groups = {}
                      trades.forEach(t => {
                        let key
                        if (analysisGroupBy === 'confidence') key = getExtraData(t).confidence || 'Unknown'
                        else if (analysisGroupBy === 'session') key = t.session || 'Unknown'
                        else if (analysisGroupBy === 'timeframe') key = t.timeframe || 'Unknown'
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
                          let value, displayValue, isGood
                          if (analysisMetric === 'winrate') {
                            value = total > 0 ? Math.round((data.w / total) * 100) : 0
                            displayValue = value + '% wr'
                            isGood = value >= 50
                          } else if (analysisMetric === 'pnl') {
                            value = data.pnl
                            displayValue = (value >= 0 ? '+' : '') + '$' + Math.round(value)
                            isGood = value >= 0
                          } else {
                            value = total > 0 ? data.pnl / total : 0
                            displayValue = (value >= 0 ? '+' : '') + '$' + Math.round(value) + '/trade'
                            isGood = value >= 0
                          }
                          return { name, displayValue, isGood }
                        })
                        .slice(0, 5)
                        .map((item, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: '#666' }}>{item.name}</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: item.isGood ? '#22c55e' : '#ef4444' }}>{item.displayValue}</span>
                          </div>
                        ))
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* NOTES TAB - With Daily/Weekly/Custom sections */}
          {activeTab === 'notes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {/* Sub-tabs for Daily / Weekly / Custom */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                {['daily', 'weekly', 'custom'].map(sub => (
                  <button 
                    key={sub}
                    onClick={() => setNotesSubTab(sub)}
                    style={{ 
                      padding: '10px 20px', 
                      background: notesSubTab === sub ? '#22c55e' : 'transparent', 
                      border: notesSubTab === sub ? 'none' : '1px solid #1a1a22', 
                      borderRadius: '6px', 
                      color: notesSubTab === sub ? '#fff' : '#666', 
                      fontSize: '12px', 
                      fontWeight: 600, 
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              {/* Write New Note */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    Write {notesSubTab === 'custom' ? 'Custom Note' : notesSubTab + ' Note'}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {notesSubTab === 'custom' && (
                      <input 
                        type="text" 
                        placeholder="Note title..." 
                        value={customNoteTitle}
                        onChange={e => setCustomNoteTitle(e.target.value)}
                        style={{ padding: '6px 10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '11px', width: '150px' }} 
                      />
                    )}
                    <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} style={{ padding: '6px 10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '11px' }} />
                  </div>
                </div>
                <textarea 
                  value={noteText} 
                  onChange={e => setNoteText(e.target.value)} 
                  placeholder={notesSubTab === 'daily' ? "Write about your trading day..." : notesSubTab === 'weekly' ? "Summarize your trading week..." : "Write your custom note..."}
                  style={{ width: '100%', minHeight: '150px', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '13px', lineHeight: '1.7', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} 
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button 
                    onClick={() => {
                      if (!noteText.trim()) return
                      const newNotes = { ...notes }
                      if (notesSubTab === 'custom') {
                        if (!newNotes.custom) newNotes.custom = []
                        newNotes.custom.push({ title: customNoteTitle || 'Untitled', text: noteText, date: noteDate })
                      } else {
                        if (!newNotes[notesSubTab]) newNotes[notesSubTab] = {}
                        newNotes[notesSubTab][noteDate] = noteText
                      }
                      setNotes(newNotes)
                      saveNote()
                      setNoteText('')
                      setCustomNoteTitle('')
                    }} 
                    disabled={!noteText.trim()} 
                    style={{ padding: '10px 24px', background: noteText.trim() ? '#22c55e' : '#1a1a22', border: 'none', borderRadius: '6px', color: noteText.trim() ? '#fff' : '#555', fontWeight: 600, fontSize: '12px', cursor: noteText.trim() ? 'pointer' : 'not-allowed' }}
                  >
                    Save {notesSubTab.charAt(0).toUpperCase() + notesSubTab.slice(1)} Note
                  </button>
                </div>
              </div>

              {/* Notes List */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', fontWeight: 600 }}>
                  {notesSubTab.charAt(0).toUpperCase() + notesSubTab.slice(1)} Notes
                </div>
                
                {notesSubTab === 'custom' ? (
                  (notes.custom || []).length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#444', fontSize: '12px' }}>No custom notes yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                      {(notes.custom || []).map((note, idx) => (
                        <div key={idx} style={{ padding: '12px', background: '#0a0a0e', borderRadius: '8px', border: '1px solid #1a1a22' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>{note.title}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '10px', color: '#555' }}>{new Date(note.date).toLocaleDateString()}</span>
                              <button onClick={() => deleteNote('custom', idx)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '16px' }}>×</button>
                            </div>
                          </div>
                          <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{note.text}</div>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  Object.keys(notes[notesSubTab] || {}).length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#444', fontSize: '12px' }}>No {notesSubTab} notes yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                      {Object.entries(notes[notesSubTab] || {}).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([date, text]) => (
                        <div key={date} style={{ padding: '12px', background: '#0a0a0e', borderRadius: '8px', border: '1px solid #1a1a22' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>
                              {new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <button onClick={() => deleteNote(notesSubTab, date)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '16px' }}>×</button>
                          </div>
                          <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{text}</div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>
          )}
          </div>
        </div>

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
                      <select value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}>
                        {input.options?.map(o => <option key={o} value={o.toLowerCase()}>{o}</option>)}
                      </select>
                    ) : input.type === 'textarea' ? (
                      <textarea value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} rows={3} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px', resize: 'none', boxSizing: 'border-box' }} />
                    ) : input.type === 'rating' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>{[1,2,3,4,5].map(i => <button key={i} onClick={() => setTradeForm({...tradeForm, [input.id]: String(i)})} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '24px', color: i <= parseInt(tradeForm[input.id] || 0) ? '#22c55e' : '#333' }}>★</button>)}</div>
                    ) : (
                      <input type={input.type} value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} step={input.type === 'number' ? '0.1' : undefined} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={addTrade} disabled={saving || !tradeForm.symbol || !tradeForm.pnl} style={{ flex: 1, padding: '14px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer', opacity: (saving || !tradeForm.symbol || !tradeForm.pnl) ? 0.5 : 1 }}>{saving ? 'Saving...' : 'Save Trade'}</button>
                <button onClick={() => setShowAddTrade(false)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '6px', color: '#666', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
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
                    <input type="text" value={input.label} onChange={e => updateInput(i, 'label', e.target.value)} style={{ flex: 1, padding: '8px 12px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px' }} />
                    <select value={input.type} onChange={e => updateInput(i, 'type', e.target.value)} style={{ padding: '8px 12px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '6px', color: '#666', fontSize: '11px' }}>
                      {['text', 'number', 'date', 'select', 'textarea', 'rating'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {input.type === 'select' && <button onClick={() => openOptionsEditor(i)} style={{ padding: '6px 12px', background: '#22c55e', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '10px', cursor: 'pointer' }}>Options</button>}
                    {!['symbol', 'date', 'outcome', 'pnl'].includes(input.id) && <button onClick={() => deleteInput(i)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}>×</button>}
                  </div>
                ))}
              </div>
              <button onClick={addNewInput} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px dashed #1a1a22', borderRadius: '6px', color: '#555', fontSize: '12px', cursor: 'pointer', marginBottom: '18px' }}>+ Add New Field</button>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={saveInputs} style={{ flex: 1, padding: '14px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Save</button>
                <button onClick={() => setShowEditInputs(false)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '6px', color: '#666', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
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
                <select value={newChartX} onChange={e => setNewChartX(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}>
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
                <select value={newChartY} onChange={e => setNewChartY(e.target.value)} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }}>
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
                <button onClick={addNewChart} style={{ flex: 1, padding: '14px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Add Chart</button>
                <button onClick={() => setShowAddChart(false)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '6px', color: '#666', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {editingOptions !== null && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 102 }} onClick={() => setEditingOptions(null)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '24px', width: '340px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>Edit Options</h2>
              <p style={{ fontSize: '11px', color: '#555', marginBottom: '14px' }}>One option per line</p>
              <textarea value={optionsText} onChange={e => setOptionsText(e.target.value)} rows={8} style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px', resize: 'none', boxSizing: 'border-box', marginBottom: '16px' }} />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={saveOptions} style={{ flex: 1, padding: '14px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Save</button>
                <button onClick={() => setEditingOptions(null)} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '6px', color: '#666', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showExpandedNote && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowExpandedNote(null)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '24px', width: '500px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>Trade Notes</h2>
              <div style={{ background: '#0a0a0e', borderRadius: '6px', padding: '16px', maxHeight: '300px', overflowY: 'auto', fontSize: '14px', color: '#888', lineHeight: '1.7' }}>{showExpandedNote}</div>
              <button onClick={() => setShowExpandedNote(null)} style={{ marginTop: '16px', width: '100%', padding: '14px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '6px', color: '#666', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>Close</button>
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
