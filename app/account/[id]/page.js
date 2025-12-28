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
  { id: 'image', label: 'Image', type: 'file', required: false, enabled: true, fixed: false },
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
  const [equityCurveGroupBy, setEquityCurveGroupBy] = useState('total')
  const [selectedCurveLines, setSelectedCurveLines] = useState({})
  const [showLinesDropdown, setShowLinesDropdown] = useState(false)
  const [enlargedChart, setEnlargedChart] = useState(null)
  const [includeDaysNotTraded, setIncludeDaysNotTraded] = useState(false)
  const [analysisGroupBy, setAnalysisGroupBy] = useState('direction')
  const [analysisMetric, setAnalysisMetric] = useState('avgpnl')
  const [pairAnalysisType, setPairAnalysisType] = useState('best')
  const [tooltip, setTooltip] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [hoverPoint, setHoverPoint] = useState(null)
  const [barHover, setBarHover] = useState(null)
  const [dailyPnlHover, setDailyPnlHover] = useState(null)
  const [hasNewInputs, setHasNewInputs] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const tradesScrollRef = useRef(null)
  const fixedScrollRef = useRef(null)
  const [tradesScrollWidth, setTradesScrollWidth] = useState(0)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Sync scroll between trades table and fixed scrollbar
  useEffect(() => {
    const tradesEl = tradesScrollRef.current
    const fixedEl = fixedScrollRef.current
    if (!tradesEl || !fixedEl) return

    const updateScrollWidth = () => {
      if (tradesEl.scrollWidth) setTradesScrollWidth(tradesEl.scrollWidth)
    }
    updateScrollWidth()

    const syncToFixed = () => { if (fixedEl) fixedEl.scrollLeft = tradesEl.scrollLeft }
    const syncToTrades = () => { if (tradesEl) tradesEl.scrollLeft = fixedEl.scrollLeft }

    tradesEl.addEventListener('scroll', syncToFixed)
    fixedEl.addEventListener('scroll', syncToTrades)

    const resizeObserver = new ResizeObserver(updateScrollWidth)
    resizeObserver.observe(tradesEl)

    return () => {
      tradesEl.removeEventListener('scroll', syncToFixed)
      fixedEl.removeEventListener('scroll', syncToTrades)
      resizeObserver.disconnect()
    }
  }, [activeTab, trades])

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
  const mostProfitableRR = (() => { const c = {}; trades.forEach(t => { const rr = Math.round(parseFloat(t.rr) || 0); if (rr > 0) c[rr] = (c[rr] || 0) + (parseFloat(t.pnl) || 0) }); const best = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return best ? best[0] + 'R' : '-' })()
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

  // Consistency score (% of winning days)
  const consistencyScore = (() => {
    const byDay = {}
    trades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + (parseFloat(t.pnl) || 0) })
    const days = Object.values(byDay)
    if (days.length === 0) return 0
    const winningDays = days.filter(pnl => pnl > 0).length
    return Math.round((winningDays / days.length) * 100)
  })()

  // Monthly growth %
  const monthlyGrowth = (() => {
    if (trades.length === 0) return '0'
    const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
    const firstDate = new Date(sorted[0].date)
    const lastDate = new Date(sorted[sorted.length - 1].date)
    const monthsDiff = Math.max(1, (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + (lastDate.getMonth() - firstDate.getMonth()) + 1)
    const totalGrowth = ((currentBalance / startingBalance) - 1) * 100
    return (totalGrowth / monthsDiff).toFixed(1)
  })()

  // Daily PnL data for net daily chart
  const dailyPnL = (() => {
    const byDay = {}
    trades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + (parseFloat(t.pnl) || 0) })
    return Object.entries(byDay).sort((a, b) => new Date(a[0]) - new Date(b[0])).map(([date, pnl]) => ({ date, pnl }))
  })()

  const tabTitles = { trades: 'TRADING AREA', statistics: 'STATISTICS AREA', notes: 'NOTES AREA' }
  const tabDescriptions = {
    trades: 'View and manage all your trades. Add new trades and track performance.',
    statistics: 'Detailed statistics, charts, and breakdowns by pair, session, and more.',
    notes: 'Keep daily, weekly, and custom notes about your trading journey.'
  }

  // Tooltip component that follows mouse with smooth edge handling
  const Tooltip = ({ data }) => {
    if (!data) return null
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
    const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800
    const tooltipWidth = 140
    const tooltipHeight = 80
    
    // Calculate position with smooth edge transitions
    let left = mousePos.x + 15
    let top = mousePos.y + 15
    
    // Smooth horizontal transition near edges
    if (mousePos.x > windowWidth - 180) {
      left = mousePos.x - tooltipWidth - 15
    }
    // Smooth vertical transition near edges
    if (mousePos.y > windowHeight - 120) {
      top = mousePos.y - tooltipHeight - 15
    }
    
    return (
      <div style={{ 
        position: 'fixed', 
        left, 
        top, 
        background: '#1a1a22', 
        border: '1px solid #2a2a35', 
        borderRadius: '8px', 
        padding: '10px 14px', 
        fontSize: '12px', 
        zIndex: 1000, 
        pointerEvents: 'none', 
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        transition: 'left 0.1s ease, top 0.1s ease'
      }}>
        <div style={{ color: '#888', marginBottom: '4px' }}>{data.date}</div>
        <div style={{ fontWeight: 700, fontSize: '16px', color: '#fff' }}>${data.value?.toLocaleString()}</div>
        {data.extra && <div style={{ color: data.extra.color || '#22c55e', marginTop: '4px' }}>{data.extra.text}</div>}
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', background: '#0a0a0f', overflow: activeTab === 'trades' ? 'hidden' : 'auto' }} onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}>
      {/* Global scrollbar styles */}
      <style>{`
        .trades-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
        .trades-scroll::-webkit-scrollbar-track { background: #1a1a22; border-radius: 5px; }
        .trades-scroll::-webkit-scrollbar-thumb { background: #22c55e; border-radius: 5px; }
        .trades-scroll::-webkit-scrollbar-thumb:hover { background: #16a34a; }
        .trades-scroll::-webkit-scrollbar-corner { background: #0a0a0f; }
      `}</style>
      {/* Global Tooltip */}
      <Tooltip data={tooltip} />

      {/* FIXED HEADER */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: isMobile ? '10px 16px' : '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a22', background: '#0a0a0f' }}>
        <a href="/" style={{ fontSize: isMobile ? '20px' : '28px', fontWeight: 800, textDecoration: 'none', letterSpacing: '-0.5px' }}><span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE</span><span style={{ color: '#22c55e' }}>+</span></a>
        {!isMobile && <div style={{ fontSize: '32px', fontWeight: 700, color: '#fff' }}>{tabTitles[activeTab]}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isMobile && (
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '16px', cursor: 'pointer' }}>☰</button>
          )}
          <a href="/dashboard" style={{ padding: isMobile ? '8px 12px' : '10px 20px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#fff', fontSize: isMobile ? '12px' : '14px', textDecoration: 'none' }}>← Dashboard</a>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobile && showMobileMenu && (
        <div style={{ position: 'fixed', top: '53px', left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 100, padding: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {['trades', 'statistics', 'notes'].map((tab) => (
              <button 
                key={tab} 
                onClick={() => { setActiveTab(tab); setShowMobileMenu(false); if (tab === 'statistics') setHasNewInputs(false) }} 
                style={{ 
                  width: '100%', padding: '16px 20px',
                  background: activeTab === tab ? '#22c55e' : 'transparent', 
                  border: activeTab === tab ? 'none' : '1px solid #2a2a35',
                  borderRadius: '8px', color: activeTab === tab ? '#fff' : '#888', 
                  fontSize: '16px', fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer', textAlign: 'center'
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          <button onClick={() => setShowAddTrade(true)} style={{ width: '100%', marginTop: '16px', padding: '16px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '16px', cursor: 'pointer' }}>+ LOG NEW TRADE</button>
        </div>
      )}

      {/* FIXED SUBHEADER - connected to sidebar with no gap */}
      {!isMobile && (
        <div style={{ position: 'fixed', top: '57px', left: '180px', right: 0, zIndex: 40, padding: '14px 24px', background: '#0a0a0f', borderBottom: '1px solid #1a1a22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '26px', fontWeight: 700, color: '#fff' }}>{account?.name}</span>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {activeTab === 'trades' && (
              <button onClick={() => setShowEditInputs(true)} style={{ padding: '10px 24px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#fff', fontSize: '14px', cursor: 'pointer' }}>Edit Columns</button>
            )}
            <button onClick={() => setShowAddTrade(true)} style={{ padding: '10px 28px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>+ LOG NEW TRADE</button>
          </div>
        </div>
      )}

      {/* Mobile Subheader */}
      {isMobile && (
        <div style={{ position: 'fixed', top: '53px', left: 0, right: 0, zIndex: 40, padding: '10px 16px', background: '#0a0a0f', borderBottom: '1px solid #1a1a22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{account?.name}</span>
          <button onClick={() => setShowAddTrade(true)} style={{ padding: '8px 16px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}>+ ADD</button>
        </div>
      )}

      {/* FIXED SIDEBAR - desktop only, starts under header */}
      {!isMobile && (
        <div style={{ position: 'fixed', top: '57px', left: 0, bottom: 0, width: '180px', padding: '16px 12px', background: '#0a0a0f', zIndex: 45, display: 'flex', flexDirection: 'column', paddingTop: '72px', borderRight: '1px solid #1a1a22' }}>
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
                fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer', textAlign: 'center'
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 'auto', padding: '14px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px' }}>
          <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.5' }}>{tabDescriptions[activeTab]}</div>
        </div>
      </div>
      )}

      {/* MAIN CONTENT */}
      <div style={{ marginLeft: isMobile ? 0 : '180px', marginTop: isMobile ? '100px' : '124px', padding: isMobile ? '12px' : '0' }}>

        {/* TRADES TAB */}
        {activeTab === 'trades' && (
          <div style={{ position: 'relative', height: 'calc(100vh - 124px)' }}>
            {trades.length === 0 ? (
              <div style={{ padding: isMobile ? '40px 20px' : '60px', textAlign: 'center', color: '#888', fontSize: '15px' }}>No trades yet. Click "+ LOG NEW TRADE" to add your first trade.</div>
            ) : (
              <>
              <div
                ref={tradesScrollRef}
                className="trades-scroll"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: '16px',
                  overflowX: 'scroll',
                  overflowY: 'scroll',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#2a2a35 #0a0a0f'
                }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1200px' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#0a0a0f' }}>
                    <tr>
                      {['Symbol', 'W/L', 'PnL', '%', 'RR', ...customInputs.map(i => i.label), 'Date', ''].map((h, i) => (
                        <th key={i} style={{ padding: isMobile ? '10px 8px' : '14px 12px', textAlign: 'center', color: '#888', fontSize: isMobile ? '11px' : '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid #1a1a22', background: '#0a0a0f' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade) => {
                      const extra = getExtraData(trade)
                      const pnlValue = parseFloat(trade.pnl) || 0
                      const noteContent = trade.notes || extra.notes || ''
                      return (
                        <tr key={trade.id} style={{ borderBottom: '1px solid #141418' }}>
                          <td style={{ padding: isMobile ? '10px 8px' : '14px 12px', fontWeight: 600, fontSize: isMobile ? '14px' : '16px', textAlign: 'center', color: '#fff' }}>{trade.symbol}</td>
                          <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                            <span style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, background: trade.outcome === 'win' ? 'rgba(34,197,94,0.15)' : trade.outcome === 'loss' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)', color: trade.outcome === 'win' ? '#22c55e' : trade.outcome === 'loss' ? '#ef4444' : '#888' }}>
                              {trade.outcome === 'win' ? 'WIN' : trade.outcome === 'loss' ? 'LOSS' : 'BE'}
                            </span>
                          </td>
                          <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 600, fontSize: '16px', color: pnlValue >= 0 ? '#22c55e' : '#ef4444' }}>{pnlValue >= 0 ? '+' : ''}${pnlValue.toFixed(0)}</td>
                          <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: '14px', color: '#fff' }}>{extra.riskPercent || '1'}%</td>
                          <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: '14px', color: '#fff' }}>{trade.rr || '-'}</td>
                          {customInputs.map(inp => (
                            <td key={inp.id} style={{ padding: '14px 12px', textAlign: 'center', fontSize: '14px', color: '#fff', verticalAlign: 'middle' }}>
                              {inp.type === 'rating' ? (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>
                                  {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= parseInt(extra[inp.id] || 0) ? '#22c55e' : '#2a2a35', fontSize: '14px' }}>★</span>)}
                                </div>
                              ) : inp.id === 'image' && extra[inp.id] ? (
                                <button onClick={() => setShowExpandedImage(extra[inp.id])} style={{ width: '36px', height: '36px', background: '#1a1a22', borderRadius: '6px', border: '1px solid #2a2a35', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', overflow: 'hidden' }}>
                                  <img src={extra[inp.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
                                </button>
                              ) : inp.id === 'notes' ? (
                                noteContent ? (
                                  <div onClick={() => setShowExpandedNote(noteContent)} style={{ cursor: 'pointer', color: '#888', fontSize: '12px', maxWidth: '160px', margin: '0 auto', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textAlign: 'left' }}>{noteContent}</div>
                                ) : <span style={{ color: '#444' }}>-</span>
                              ) : (
                                <span style={{ color: inp.id === 'confidence' && extra[inp.id] === 'High' ? '#22c55e' : inp.id === 'confidence' && extra[inp.id] === 'Low' ? '#ef4444' : inp.id === 'direction' ? (trade.direction === 'long' ? '#22c55e' : '#ef4444') : '#fff' }}>
                                  {inp.id === 'direction' ? trade.direction?.toUpperCase() : extra[inp.id] || '-'}
                                </span>
                              )}
                            </td>
                          ))}
                          <td style={{ padding: '14px 12px', textAlign: 'center', fontSize: '14px', color: '#fff' }}>{new Date(trade.date).toLocaleDateString()}</td>
                          <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                            <button onClick={() => setDeleteConfirmId(trade.id)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '18px' }}>×</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {/* Fixed horizontal scrollbar at bottom */}
              <div
                ref={fixedScrollRef}
                className="trades-scroll"
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '16px',
                  overflowX: 'scroll',
                  overflowY: 'hidden',
                  background: '#0a0a0f'
                }}
              >
                <div style={{ width: tradesScrollWidth, height: '1px' }} />
              </div>
              </>
            )}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => { setDeleteConfirmId(null); setDeleteConfirmText('') }}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: '18px', marginBottom: '12px', color: '#fff' }}>Delete Trade?</h3>
              <p style={{ color: '#888', fontSize: '14px', marginBottom: '16px' }}>This action cannot be undone. Type <span style={{ color: '#ef4444', fontWeight: 600 }}>delete</span> to confirm.</p>
              <input 
                type="text" 
                value={deleteConfirmText} 
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="Type 'delete' to confirm"
                style={{ width: '100%', padding: '12px', background: '#0a0a0e', border: '1px solid #2a2a35', borderRadius: '8px', color: '#fff', fontSize: '14px', marginBottom: '16px' }}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => { setDeleteConfirmId(null); setDeleteConfirmText('') }} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', cursor: 'pointer' }}>Cancel</button>
                <button 
                  onClick={() => { if (deleteConfirmText.toLowerCase() === 'delete') { deleteTrade(deleteConfirmId); setDeleteConfirmId(null); setDeleteConfirmText('') } }}
                  style={{ flex: 1, padding: '12px', background: deleteConfirmText.toLowerCase() === 'delete' ? '#ef4444' : '#333', border: 'none', borderRadius: '8px', color: '#fff', cursor: deleteConfirmText.toLowerCase() === 'delete' ? 'pointer' : 'not-allowed', fontWeight: 600 }}
                  disabled={deleteConfirmText.toLowerCase() !== 'delete'}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STATISTICS TAB */}
        {activeTab === 'statistics' && (
          <div style={{ padding: isMobile ? '0' : '16px 24px' }}>
            {/* ROW 1: Stats + Graphs - both graphs same height, aligned with Total Trades bottom */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px', marginBottom: '16px' }}>
              {/* Stats Column */}
              <div style={{ width: isMobile ? '100%' : '200px', display: 'flex', flexDirection: isMobile ? 'row' : 'column', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: '6px' }}>
                {[
                  { l: 'Total PnL', v: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString()}`, c: totalPnl >= 0 ? '#22c55e' : '#ef4444' },
                  { l: 'Winrate', v: `${winrate}%`, c: winrate >= 50 ? '#22c55e' : '#ef4444' },
                  { l: 'Profit Factor', v: profitFactor, c: '#fff' },
                  { l: 'Avg Win', v: `+$${avgWin}`, c: '#22c55e' },
                  { l: 'Avg Loss', v: `-$${avgLoss}`, c: '#ef4444' },
                  { l: 'Streak', v: `${streaks.cs >= 0 ? '+' : ''}${streaks.cs}`, c: streaks.cs >= 0 ? '#22c55e' : '#ef4444' },
                  { l: 'Best Pair', v: mostTradedPair, c: '#22c55e' },
                ].map((s, i) => (
                  <div key={i} style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: isMobile ? '8px 10px' : '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: isMobile ? '1 1 45%' : 'none' }}>
                    <span style={{ fontSize: isMobile ? '11px' : '13px', color: '#888' }}>{s.l}</span>
                    <span style={{ fontSize: isMobile ? '14px' : '18px', fontWeight: 700, color: s.c }}>{s.v}</span>
                  </div>
                ))}
                <div style={{ background: '#0d0d12', border: '2px solid #22c55e', borderRadius: '8px', padding: isMobile ? '10px' : '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', flex: isMobile ? '1 1 100%' : 'none' }}>
                  <span style={{ fontSize: isMobile ? '12px' : '13px', color: '#888' }}>Total Trades</span>
                  <span style={{ fontSize: isMobile ? '22px' : '28px', fontWeight: 700, color: '#22c55e' }}>{trades.length}</span>
                </div>
              </div>

              {/* Graphs - side by side */}
              <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
                {/* Equity Curve with groupBy dropdown */}
                <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', position: 'relative', minHeight: isMobile ? '280px' : '340px' }}>
                  {(() => {
                    // Calculate visible lines first so we can compute dynamic Start/Current
                    const sorted = trades.length >= 2 ? [...trades].sort((a, b) => new Date(a.date) - new Date(b.date)) : []
                    const lineColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4']
                    
                    let lines = []
                    let displayStart = startingBalance
                    let displayCurrent = currentBalance
                    
                    if (sorted.length >= 2) {
                      if (equityCurveGroupBy === 'total') {
                        let cum = startingBalance
                        const points = [{ balance: cum, date: null, pnl: 0 }]
                        sorted.forEach(t => { cum += parseFloat(t.pnl) || 0; points.push({ balance: cum, date: t.date, pnl: parseFloat(t.pnl) || 0, symbol: t.symbol }) })
                        lines = [{ name: 'Total', points, color: '#22c55e' }]
                      } else {
                        const groups = {}
                        sorted.forEach(t => {
                          let key
                          if (equityCurveGroupBy === 'symbol') key = t.symbol
                          else if (equityCurveGroupBy === 'direction') key = t.direction
                          else key = getExtraData(t)[equityCurveGroupBy] || 'Unknown'
                          if (!groups[key]) groups[key] = []
                          groups[key].push(t)
                        })
                        
                        const groupNames = Object.keys(groups).slice(0, 9)
                        groupNames.forEach((name, idx) => {
                          let cum = 0
                          const pts = [{ balance: 0, date: sorted[0]?.date, pnl: 0 }]
                          groups[name].forEach(t => {
                            cum += parseFloat(t.pnl) || 0
                            pts.push({ balance: cum, date: t.date, pnl: parseFloat(t.pnl) || 0, symbol: t.symbol })
                          })
                          lines.push({ name, points: pts, color: lineColors[idx % lineColors.length] })
                        })
                      }
                    }
                    
                    const visibleLines = equityCurveGroupBy === 'total' ? lines : lines.filter(l => selectedCurveLines[l.name] !== false)
                    
                    // Calculate dynamic Start/Current based on visible lines
                    if (equityCurveGroupBy !== 'total' && visibleLines.length > 0) {
                      displayStart = 0
                      displayCurrent = visibleLines.reduce((sum, line) => {
                        const lastPt = line.points[line.points.length - 1]
                        return sum + (lastPt?.balance || 0)
                      }, 0)
                    }
                    
                    return (
                      <>
                        {/* Header row with title, stats, controls and enlarge button */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Equity Curve</span>
                            <span style={{ fontSize: '11px', color: '#666' }}>Start: <span style={{ color: '#fff' }}>${displayStart.toLocaleString()}</span></span>
                            <span style={{ fontSize: '11px', color: '#666' }}>Current: <span style={{ color: displayCurrent >= displayStart ? '#22c55e' : '#ef4444' }}>${Math.round(displayCurrent).toLocaleString()}</span></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select value={equityCurveGroupBy} onChange={e => { setEquityCurveGroupBy(e.target.value); setSelectedCurveLines({}) }} style={{ padding: '4px 8px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '11px', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }}>
                              <option value="total">Total PnL</option>
                              <option value="symbol">By Pair</option>
                              <option value="direction">By Direction</option>
                              <option value="confidence">By Confidence</option>
                              <option value="session">By Session</option>
                            </select>
                            {/* Filter dropdown in header when grouped */}
                            {equityCurveGroupBy !== 'total' && lines.length > 0 && (
                              <div style={{ position: 'relative' }}>
                                <button
                                  onClick={() => setShowLinesDropdown(!showLinesDropdown)}
                                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '11px', cursor: 'pointer' }}
                                >
                                  <span>Filter</span>
                                  <span style={{ fontSize: '8px', transform: showLinesDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                                </button>
                                {showLinesDropdown && (
                                  <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 100, background: '#141418', border: '1px solid #2a2a35', borderRadius: '4px', padding: '8px', marginTop: '4px', minWidth: '160px', maxHeight: '200px', overflowY: 'auto' }}>
                                    {lines.map((line, idx) => (
                                      <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#888', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', background: selectedCurveLines[line.name] !== false ? 'rgba(34, 197, 94, 0.1)' : 'transparent' }}>
                                        <input type="checkbox" checked={selectedCurveLines[line.name] !== false} onChange={e => setSelectedCurveLines(prev => ({ ...prev, [line.name]: e.target.checked }))} style={{ width: '12px', height: '12px', accentColor: line.color }} />
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: line.color }} />
                                        <span style={{ color: selectedCurveLines[line.name] !== false ? '#fff' : '#888' }}>{line.name}</span>
                                      </label>
                                    ))}
                                    <div style={{ borderTop: '1px solid #2a2a35', marginTop: '6px', paddingTop: '6px', display: 'flex', gap: '6px' }}>
                                      <button onClick={() => setSelectedCurveLines(lines.reduce((acc, l) => ({ ...acc, [l.name]: true }), {}))} style={{ flex: 1, padding: '3px 6px', background: '#22c55e', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '10px', cursor: 'pointer' }}>All</button>
                                      <button onClick={() => setSelectedCurveLines(lines.reduce((acc, l) => ({ ...acc, [l.name]: false }), {}))} style={{ flex: 1, padding: '3px 6px', background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '4px', color: '#888', fontSize: '10px', cursor: 'pointer' }}>None</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            <button onClick={() => setEnlargedChart(enlargedChart === 'equity' ? null : 'equity')} style={{ background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '4px', padding: '4px 8px', color: '#888', fontSize: '10px', cursor: 'pointer' }}>⛶</button>
                          </div>
                        </div>
                        {/* Graph area - full width now */}
                        <div style={{ flex: 1, position: 'relative', display: 'flex', minHeight: '200px' }}>
                          {sorted.length < 2 ? (
                            <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Need 2+ trades</div>
                          ) : (() => {
                            const allBalances = visibleLines.flatMap(l => l.points.map(p => p.balance))
                            const maxBal = Math.max(...allBalances)
                            const minBal = Math.min(...allBalances)
                            const range = maxBal - minBal || 1000
                            
                            // More labels when enlarged
                            const targetLabels = enlargedChart === 'equity' ? 10 : 6
                            const getNiceStep = (r, tgt) => {
                              const raw = r / tgt
                              const mag = Math.pow(10, Math.floor(Math.log10(raw)))
                              const normalized = raw / mag
                              if (normalized <= 1) return mag
                              if (normalized <= 2) return 2 * mag
                              if (normalized <= 5) return 5 * mag
                              return 10 * mag
                            }
                            const yStep = getNiceStep(range, targetLabels) || 100
                            const yMax = Math.ceil(maxBal / yStep) * yStep
                            const yMin = minBal >= 0 ? Math.floor(minBal / yStep) * yStep : Math.floor(minBal / yStep) * yStep
                            const yRange = yMax - yMin || yStep
                            
                            const yLabels = []
                            for (let v = yMax; v >= yMin; v -= yStep) yLabels.push(v)
                            
                            const hasNegative = minBal < 0
                            const belowStart = equityCurveGroupBy === 'total' && minBal < startingBalance
                            const zeroY = hasNegative ? ((yMax - 0) / yRange) * 100 : null
                            // Starting balance line - always show if within range
                            const startLineY = equityCurveGroupBy === 'total' && !hasNegative && startingBalance >= yMin && startingBalance <= yMax ? ((yMax - startingBalance) / yRange) * 100 : null
                            
                            const svgW = 100, svgH = 100
                            
                            // Calculate starting balance Y position in SVG coordinates
                            const startY = svgH - ((startingBalance - yMin) / yRange) * svgH

                            const lineData = visibleLines.map(line => {
                              const chartPoints = line.points.map((p, i) => ({
                                x: line.points.length > 1 ? (i / (line.points.length - 1)) * svgW : svgW / 2,
                                y: svgH - ((p.balance - yMin) / yRange) * svgH,
                                ...p,
                                lineName: line.name,
                                lineColor: line.color
                              }))
                              const pathD = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

                              // For total mode, create split paths (green above start, red below)
                              let greenPath = '', redPath = ''
                              if (equityCurveGroupBy === 'total') {
                                const greenSegments = [], redSegments = []
                                for (let i = 0; i < chartPoints.length - 1; i++) {
                                  const p1 = chartPoints[i], p2 = chartPoints[i + 1]
                                  const above1 = p1.balance >= startingBalance, above2 = p2.balance >= startingBalance

                                  if (above1 === above2) {
                                    // Both points same side - add to appropriate array
                                    const arr = above1 ? greenSegments : redSegments
                                    arr.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
                                  } else {
                                    // Crossing - find intersection point
                                    const t = (startingBalance - p1.balance) / (p2.balance - p1.balance)
                                    const ix = p1.x + t * (p2.x - p1.x), iy = startY
                                    if (above1) {
                                      greenSegments.push({ x1: p1.x, y1: p1.y, x2: ix, y2: iy })
                                      redSegments.push({ x1: ix, y1: iy, x2: p2.x, y2: p2.y })
                                    } else {
                                      redSegments.push({ x1: p1.x, y1: p1.y, x2: ix, y2: iy })
                                      greenSegments.push({ x1: ix, y1: iy, x2: p2.x, y2: p2.y })
                                    }
                                  }
                                }
                                // Build continuous paths from segments
                                const buildPath = (segs) => segs.map((s, i) => `M ${s.x1} ${s.y1} L ${s.x2} ${s.y2}`).join(' ')
                                greenPath = buildPath(greenSegments)
                                redPath = buildPath(redSegments)
                                // Build area fills for each segment (closed polygons to startY line)
                                const buildAreaPath = (segs) => segs.map(s => `M ${s.x1} ${s.y1} L ${s.x2} ${s.y2} L ${s.x2} ${startY} L ${s.x1} ${startY} Z`).join(' ')
                                var greenAreaPath = buildAreaPath(greenSegments)
                                var redAreaPath = buildAreaPath(redSegments)
                              }

                              // For multi-line mode, create a narrow shadow below the line (not overlapping with other lines)
                              let areaPath = null
                              if (equityCurveGroupBy !== 'total' && chartPoints.length > 1) {
                                const shadowDepth = 8 // Fixed depth in SVG units
                                const offsetPoints = chartPoints.map(p => ({ x: p.x, y: Math.min(p.y + shadowDepth, svgH) }))
                                areaPath = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') +
                                  offsetPoints.slice().reverse().map((p, i) => `${i === 0 ? ' L' : ' L'} ${p.x} ${p.y}`).join('') + ' Z'
                              }

                              return { ...line, chartPoints, pathD, greenPath, redPath, greenAreaPath, redAreaPath, areaPath }
                            })
                            
                            const mainLine = lineData[0]
                            // Area should fill to zero line if negative values exist, otherwise to bottom
                            const areaBottom = hasNegative ? svgH - ((0 - yMin) / yRange) * svgH : svgH
                            const areaD = equityCurveGroupBy === 'total' && mainLine ? mainLine.pathD + ` L ${mainLine.chartPoints[mainLine.chartPoints.length - 1].x} ${areaBottom} L ${mainLine.chartPoints[0].x} ${areaBottom} Z` : null
                            
                            // Generate X-axis labels (more evenly spaced dates) - double digit format
                            const xLabelCount = 10
                            const xLabels = []
                            for (let i = 0; i < xLabelCount; i++) {
                              const idx = Math.floor(i * (sorted.length - 1) / (xLabelCount - 1))
                              const trade = sorted[idx]
                              if (trade?.date) {
                                const d = new Date(trade.date)
                                xLabels.push({ label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, pct: (i / (xLabelCount - 1)) * 100 })
                              }
                            }

                            return (
                              <>
                                <div style={{ width: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0, paddingRight: '2px', paddingBottom: '22px' }}>
                                  {yLabels.map((v, i) => <span key={i} style={{ fontSize: '8px', color: '#888', lineHeight: 1, textAlign: 'right' }}>{equityCurveGroupBy === 'total' ? `$${(v/1000).toFixed(v >= 1000 ? 0 : 1)}k` : `$${v}`}</span>)}
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                  <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #333', borderBottom: hasNegative ? 'none' : '1px solid #333' }}>
                                    {/* Horizontal grid lines */}
                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                                      {yLabels.map((_, i) => <div key={i} style={{ borderTop: '1px solid #1a1a22' }} />)}
                                    </div>
                                    {/* Zero line if negative */}
                                    {zeroY !== null && (
                                      <div style={{ position: 'absolute', left: 0, right: 0, top: `${zeroY}%`, borderTop: '1px solid #444', zIndex: 1 }} />
                                    )}
                                    {/* Starting balance dotted line */}
                                    {startLineY !== null && (
                                      <div style={{ position: 'absolute', left: 0, right: 0, top: `${startLineY}%`, borderTop: '1px dashed #666', zIndex: 1 }}>
                                        <span style={{ position: 'absolute', right: '4px', top: '-10px', fontSize: '8px', color: '#888' }}>Start</span>
                                      </div>
                                    )}
                                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none"
                                      onMouseMove={e => {
                                        const rect = e.currentTarget.getBoundingClientRect()
                                        const mouseX = ((e.clientX - rect.left) / rect.width) * svgW

                                        // For single line (total mode), use X-distance only like dashboard
                                        // For multiple lines, use 2D distance
                                        if (equityCurveGroupBy === 'total' && lineData.length === 1) {
                                          const mainLine = lineData[0]
                                          let closest = mainLine.chartPoints[0], minDist = Math.abs(mouseX - mainLine.chartPoints[0].x)
                                          mainLine.chartPoints.forEach(p => {
                                            const d = Math.abs(mouseX - p.x)
                                            if (d < minDist) { minDist = d; closest = p }
                                          })
                                          setHoverPoint({ ...closest, xPct: (closest.x / svgW) * 100, yPct: (closest.y / svgH) * 100, lineName: mainLine.name, lineColor: mainLine.color })
                                        } else {
                                          const mouseY = ((e.clientY - rect.top) / rect.height) * svgH
                                          let closestPoint = null, closestDist = Infinity, closestLine = null
                                          lineData.forEach(line => {
                                            line.chartPoints.forEach(p => {
                                              const dist = Math.sqrt(Math.pow(mouseX - p.x, 2) + Math.pow(mouseY - p.y, 2))
                                              if (dist < closestDist) { closestDist = dist; closestPoint = p; closestLine = line }
                                            })
                                          })
                                          if (closestDist < 15 && closestPoint) {
                                            setHoverPoint({ ...closestPoint, xPct: (closestPoint.x / svgW) * 100, yPct: (closestPoint.y / svgH) * 100, lineName: closestLine.name, lineColor: closestLine.color })
                                          } else { setHoverPoint(null) }
                                        }
                                      }}
                                      onMouseLeave={() => setHoverPoint(null)}
                                    >
                                      <defs>
                                        <linearGradient id="eqGreen" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" /><stop offset="100%" stopColor="#22c55e" stopOpacity="0" /></linearGradient>
                                        <linearGradient id="eqRed" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" /><stop offset="100%" stopColor="#ef4444" stopOpacity="0" /></linearGradient>
                                      </defs>
                                      {equityCurveGroupBy === 'total' && lineData[0] ? (
                                        <>
                                          {lineData[0].greenAreaPath && <path d={lineData[0].greenAreaPath} fill="url(#eqGreen)" />}
                                          {lineData[0].redAreaPath && <path d={lineData[0].redAreaPath} fill="url(#eqRed)" />}
                                          {lineData[0].greenPath && <path d={lineData[0].greenPath} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                                          {lineData[0].redPath && <path d={lineData[0].redPath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                                        </>
                                      ) : (() => {
                                        // Sort lines by average Y position (ascending = top lines first)
                                        const sortedLines = [...lineData].map((line, origIdx) => {
                                          const avgY = line.chartPoints.reduce((sum, p) => sum + p.y, 0) / line.chartPoints.length
                                          return { ...line, origIdx, avgY }
                                        }).sort((a, b) => a.avgY - b.avgY) // Top lines first (lowest Y)

                                        return (
                                          <>
                                            <defs>
                                              {/* Create clipPath for each line - clips glow to region between this line and next line below */}
                                              {sortedLines.map((line, sortIdx) => {
                                                const pts = line.chartPoints
                                                const nextLine = sortedLines[sortIdx + 1]
                                                // Clip region: from this line down to next line (or bottom)
                                                let clipPath
                                                if (nextLine) {
                                                  // Interpolate next line's Y at each X position of current line
                                                  const nextPts = nextLine.chartPoints
                                                  const bottomPts = pts.map(p => {
                                                    // Find closest X in nextLine and get its Y
                                                    let closestIdx = 0, minDist = Infinity
                                                    nextPts.forEach((np, ni) => {
                                                      const dist = Math.abs(np.x - p.x)
                                                      if (dist < minDist) { minDist = dist; closestIdx = ni }
                                                    })
                                                    return { x: p.x, y: nextPts[closestIdx].y }
                                                  })
                                                  clipPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') +
                                                    bottomPts.slice().reverse().map(p => ` L ${p.x} ${p.y}`).join('') + ' Z'
                                                } else {
                                                  // Last line - clip to bottom of SVG
                                                  clipPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') +
                                                    ` L ${pts[pts.length - 1].x} ${svgH} L ${pts[0].x} ${svgH} Z`
                                                }
                                                return <clipPath key={`clip${line.origIdx}`} id={`clip${line.origIdx}`}><path d={clipPath} /></clipPath>
                                              })}
                                              {/* Gradient for each line */}
                                              {sortedLines.map((line) => (
                                                <linearGradient key={`grad${line.origIdx}`} id={`grad${line.origIdx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                                  <stop offset="0%" stopColor={line.color} stopOpacity="0.3" />
                                                  <stop offset="100%" stopColor={line.color} stopOpacity="0" />
                                                </linearGradient>
                                              ))}
                                            </defs>
                                            {/* Draw gradient areas with clipPaths */}
                                            {sortedLines.map((line) => {
                                              const pts = line.chartPoints
                                              const areaPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') +
                                                ` L ${pts[pts.length - 1].x} ${svgH} L ${pts[0].x} ${svgH} Z`
                                              return <path key={`area${line.origIdx}`} d={areaPath} fill={`url(#grad${line.origIdx})`} clipPath={`url(#clip${line.origIdx})`} />
                                            })}
                                            {/* Draw all lines on top */}
                                            {lineData.map((line, idx) => (
                                              <path key={`line${idx}`} d={line.pathD} fill="none" stroke={line.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                            ))}
                                          </>
                                        )
                                      })()}
                                    </svg>
                                    {hoverPoint && <div style={{ position: 'absolute', left: `${hoverPoint.xPct}%`, top: `${hoverPoint.yPct}%`, transform: 'translate(-50%, -50%)', width: '10px', height: '10px', borderRadius: '50%', background: equityCurveGroupBy === 'total' ? (hoverPoint.balance >= startingBalance ? '#22c55e' : '#ef4444') : (hoverPoint.lineColor || '#22c55e'), border: '2px solid #fff', pointerEvents: 'none', zIndex: 10 }} />}
                                    {hoverPoint && (
                                      <div style={{ position: 'absolute', left: `${hoverPoint.xPct}%`, top: `${hoverPoint.yPct}%`, transform: `translate(${hoverPoint.xPct > 80 ? 'calc(-100% - 15px)' : '15px'}, ${hoverPoint.yPct < 20 ? '0%' : hoverPoint.yPct > 80 ? '-100%' : '-50%'})`, background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '8px 12px', fontSize: '11px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
                                        {hoverPoint.lineName && equityCurveGroupBy !== 'total' && <div style={{ color: hoverPoint.lineColor, fontWeight: 600, marginBottom: '2px' }}>{hoverPoint.lineName}</div>}
                                        <div style={{ color: '#888' }}>{hoverPoint.date ? new Date(hoverPoint.date).toLocaleDateString() : 'Start'}</div>
                                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>${hoverPoint.balance?.toLocaleString()}</div>
                                        {hoverPoint.symbol && <div style={{ color: hoverPoint.pnl >= 0 ? '#22c55e' : '#ef4444' }}>{hoverPoint.symbol}: {hoverPoint.pnl >= 0 ? '+' : ''}${hoverPoint.pnl?.toFixed(0)}</div>}
                                      </div>
                                    )}
                                    {/* Legend */}
                                    <div style={{ position: 'absolute', bottom: '4px', left: '4px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(13,13,18,0.9)', padding: '3px 6px', borderRadius: '3px', fontSize: '9px' }}>
                                      {equityCurveGroupBy === 'total' ? (
                                        <>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <div style={{ width: '10px', height: '2px', background: '#22c55e' }} />
                                            <span style={{ color: '#888' }}>Above</span>
                                          </div>
                                          {belowStart && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                              <div style={{ width: '10px', height: '2px', background: '#ef4444' }} />
                                              <span style={{ color: '#888' }}>Below</span>
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        lineData.map((line, idx) => (
                                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <div style={{ width: '10px', height: '2px', background: line.color }} />
                                            <span style={{ color: '#888' }}>{line.name}</span>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                  {/* X-axis with tick marks and date labels */}
                                  <div style={{ height: '22px', position: 'relative', marginLeft: '1px' }}>
                                    {xLabels.map((l, i) => (
                                      <div key={i} style={{ position: 'absolute', left: `${l.pct}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ width: '1px', height: '6px', background: '#444' }} />
                                        <span style={{ fontSize: '9px', color: '#888', marginTop: '2px' }}>{l.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </>
                    )
                  })()}
                </div>

                {/* Bar Chart - with title and Y-axis */}
                <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', minHeight: isMobile ? '280px' : '340px' }}>
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
                    
                    if (entries.length === 0) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>No data</div>
                    
                    const maxVal = barGraphMetric === 'winrate' ? 100 : Math.max(...entries.map(e => Math.abs(e.val)), 1)
                    const getNiceMax = (v) => {
                      if (v <= 5) return 5
                      if (v <= 10) return 10
                      if (v <= 25) return 25
                      if (v <= 50) return 50
                      if (v <= 100) return 100
                      if (v <= 250) return 250
                      if (v <= 500) return 500
                      if (v <= 1000) return 1000
                      return Math.ceil(v / 500) * 500
                    }
                    const niceMax = barGraphMetric === 'winrate' ? 100 : getNiceMax(maxVal)
                    // More labels when enlarged
                    const labelCount = enlargedChart === 'bar' ? 10 : 6
                    const yLabels = []
                    for (let i = 0; i <= labelCount - 1; i++) {
                      const val = Math.round((1 - i / (labelCount - 1)) * niceMax)
                      yLabels.push(barGraphMetric === 'winrate' ? val + '%' : (barGraphMetric === 'pnl' || barGraphMetric === 'avgpnl' ? '$' + val : val))
                    }
                    
                    return (
                      <>
                        {/* Header row with title, controls and enlarge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Performance by {graphGroupBy === 'symbol' ? 'Pair' : graphGroupBy}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select value={barGraphMetric} onChange={e => setBarGraphMetric(e.target.value)} style={{ padding: '4px 8px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '11px', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }}>
                              <option value="winrate">Winrate</option>
                              <option value="pnl">PnL</option>
                              <option value="avgpnl">Avg PnL</option>
                              <option value="count">Count</option>
                            </select>
                            <select value={graphGroupBy} onChange={e => setGraphGroupBy(e.target.value)} style={{ padding: '4px 8px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '11px', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }}>
                              <option value="symbol">Pairs</option>
                              <option value="direction">Direction</option>
                              <option value="session">Session</option>
                              <option value="confidence">Confidence</option>
                              <option value="timeframe">Timeframe</option>
                            </select>
                            <button onClick={() => setEnlargedChart(enlargedChart === 'bar' ? null : 'bar')} style={{ background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '4px', padding: '4px 8px', color: '#888', fontSize: '10px', cursor: 'pointer' }}>⛶</button>
                          </div>
                        </div>
                        {/* Graph - full width */}
                        <div style={{ flex: 1, display: 'flex', minHeight: '200px' }}>
                          <div style={{ width: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0, paddingRight: '2px', paddingBottom: '28px' }}>
                            {yLabels.map((v, i) => <span key={i} style={{ fontSize: '8px', color: '#888', lineHeight: 1, textAlign: 'right' }}>{v}</span>)}
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #333', borderBottom: '1px solid #333' }}>
                              {/* Horizontal grid lines */}
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                                {yLabels.map((_, i) => <div key={i} style={{ borderTop: '1px solid #1a1a22' }} />)}
                              </div>
                              {/* Bars */}
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: '6px', padding: '0 4px' }}>
                                {entries.map((item, i) => {
                                  const hPct = Math.max((Math.abs(item.val) / niceMax) * 100, 5)
                                  const isGreen = barGraphMetric === 'winrate' ? item.val >= 50 : item.val >= 0
                                  const isHovered = barHover === i
                                  return (
                                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}
                                      onMouseEnter={() => setBarHover(i)}
                                      onMouseLeave={() => setBarHover(null)}
                                    >
                                      <div style={{ fontSize: '10px', color: isGreen ? '#22c55e' : '#ef4444', marginBottom: '2px', fontWeight: 600 }}>{item.disp}</div>
                                      <div style={{ width: '100%', maxWidth: '50px', height: `${hPct}%`, background: `linear-gradient(to bottom, ${isGreen ? `rgba(34, 197, 94, ${0.1 + (hPct / 100) * 0.25})` : `rgba(239, 68, 68, ${0.1 + (hPct / 100) * 0.25})`} 0%, transparent 100%)`, border: `2px solid ${isGreen ? '#22c55e' : '#ef4444'}`, borderBottom: 'none', borderRadius: '3px 3px 0 0', position: 'relative', cursor: 'pointer' }}>
                                        {isHovered && (
                                          <>
                                            <div style={{ position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', width: '10px', height: '10px', borderRadius: '50%', background: isGreen ? '#22c55e' : '#ef4444', border: '2px solid #fff', zIndex: 5 }} />
                                            <div style={{ position: 'absolute', bottom: '0px', left: 'calc(50% + 10px)', background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
                                              <div style={{ fontWeight: 700, color: '#fff', fontSize: '12px', marginBottom: '2px' }}>{item.name}</div>
                                              <div style={{ fontWeight: 600, color: isGreen ? '#22c55e' : '#ef4444' }}>{item.disp}</div>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                            <div style={{ paddingTop: '6px', marginLeft: '1px' }}>
                              <div style={{ display: 'flex', gap: '6px', padding: '0 4px' }}>
                                {entries.map((item, i) => (
                                  <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '10px', color: '#ccc', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', background: '#0d0d12', padding: '2px 4px', borderRadius: '3px', border: '1px solid #2a2a35' }}>{item.name}</div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* ROW 2: Direction + Sentiment bars */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Direction</span>
                <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 700 }}>{longPct}% Long</span>
                <div style={{ flex: 1, height: '10px', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${longPct}%`, background: '#22c55e' }} />
                  <div style={{ width: `${100 - longPct}%`, background: '#ef4444' }} />
                </div>
                <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: 700 }}>{100 - longPct}% Short</span>
              </div>
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Sentiment</span>
                <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 700 }}>{winrate}% Bullish</span>
                <div style={{ flex: 1, height: '10px', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${winrate}%`, background: '#22c55e' }} />
                  <div style={{ width: `${100 - winrate}%`, background: '#ef4444' }} />
                </div>
                <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: 700 }}>{100 - winrate}% Bearish</span>
              </div>
            </div>

            {/* ROW 3: Net Daily PnL + Right Column (Average Rating + PnL by Day + Streaks) */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              {/* Net Daily PnL - bars fill full width */}
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', color: '#888', textTransform: 'uppercase' }}>Net Daily PnL</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#888', cursor: 'pointer', background: includeDaysNotTraded ? '#22c55e' : '#1a1a22', padding: '4px 10px', borderRadius: '4px', border: '1px solid #2a2a35' }}>
                    <span style={{ color: includeDaysNotTraded ? '#fff' : '#888' }}>{includeDaysNotTraded ? '✓' : ''}</span>
                    <input type="checkbox" checked={includeDaysNotTraded} onChange={e => setIncludeDaysNotTraded(e.target.checked)} style={{ display: 'none' }} />
                    <span style={{ color: includeDaysNotTraded ? '#fff' : '#888' }}>Include non-trading days</span>
                  </label>
                </div>
                <div style={{ height: '200px', display: 'flex' }}>
                  {dailyPnL.length === 0 ? <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>No data</div> : (() => {
                    let displayData = dailyPnL
                    if (includeDaysNotTraded && dailyPnL.length > 1) {
                      const sorted = [...dailyPnL].sort((a, b) => new Date(a.date) - new Date(b.date))
                      const startDate = new Date(sorted[0].date)
                      const endDate = new Date(sorted[sorted.length - 1].date)
                      const pnlByDate = {}
                      dailyPnL.forEach(d => { pnlByDate[d.date] = d.pnl })
                      displayData = []
                      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                        const dateStr = d.toISOString().split('T')[0]
                        displayData.push({ date: dateStr, pnl: pnlByDate[dateStr] || 0 })
                      }
                    }
                    
                    const maxAbs = Math.max(...displayData.map(x => Math.abs(x.pnl)), 1)
                    const getNiceMax = (v) => {
                      if (v <= 50) return Math.ceil(v / 10) * 10
                      if (v <= 100) return Math.ceil(v / 20) * 20
                      if (v <= 250) return Math.ceil(v / 50) * 50
                      if (v <= 500) return Math.ceil(v / 100) * 100
                      if (v <= 1000) return Math.ceil(v / 200) * 200
                      return Math.ceil(v / 500) * 500
                    }
                    const yMax = getNiceMax(maxAbs)
                    const yStep = yMax / 5
                    const yLabels = []
                    for (let v = yMax; v >= 0; v -= yStep) yLabels.push(Math.round(v))
                    
                    const sortedData = [...displayData].sort((a, b) => new Date(a.date) - new Date(b.date))
                    
                    // Generate X-axis labels (evenly spaced across the chart) - double digit format
                    const xLabelCount = Math.min(sortedData.length, 15)
                    const xLabels = []
                    for (let i = 0; i < xLabelCount; i++) {
                      const idx = Math.floor(i * (sortedData.length - 1) / Math.max(1, xLabelCount - 1))
                      const d = new Date(sortedData[idx]?.date)
                      // Use evenly spaced percentages based on label index, not data index
                      xLabels.push({ label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, pct: xLabelCount > 1 ? (i / (xLabelCount - 1)) * 100 : 50 })
                    }
                    
                    return (
                      <>
                        <div style={{ width: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0, paddingRight: '2px', paddingBottom: '18px' }}>
                          {yLabels.map((v, i) => <span key={i} style={{ fontSize: '8px', color: '#888', textAlign: 'right' }}>{i === yLabels.length - 1 ? '$0' : `$${v}`}</span>)}
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                          <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #333', borderBottom: '1px solid #333' }}>
                            {/* Horizontal grid lines */}
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                              {yLabels.map((_, i) => <div key={i} style={{ borderTop: '1px solid #1a1a22' }} />)}
                            </div>
                            {/* Bars */}
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: '1px', padding: '0 2px' }}>
                              {sortedData.map((d, i) => {
                                const hPct = yMax > 0 ? (Math.abs(d.pnl) / yMax) * 100 : 0
                                const isPositive = d.pnl >= 0
                                const isHovered = dailyPnlHover === i
                                const hasData = d.pnl !== 0
                                return (
                                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}
                                    onMouseEnter={() => setDailyPnlHover(i)}
                                    onMouseLeave={() => setDailyPnlHover(null)}
                                  >
                                    <div style={{ width: '100%', height: hasData ? `${Math.max(hPct, 2)}%` : '2px', background: hasData ? (isPositive ? '#22c55e' : '#ef4444') : '#333', borderRadius: '2px 2px 0 0', position: 'relative' }}>
                                      {isHovered && (
                                        <>
                                          <div style={{ position: 'absolute', bottom: hasData ? '4px' : '-2px', left: '50%', transform: 'translateX(-50%)', width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', border: '2px solid #fff', zIndex: 5 }} />
                                          <div style={{ position: 'absolute', bottom: '0px', left: 'calc(50% + 10px)', background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
                                            <div style={{ color: '#888' }}>{new Date(d.date).toLocaleDateString()}</div>
                                            <div style={{ fontWeight: 600, color: hasData ? (isPositive ? '#22c55e' : '#ef4444') : '#666' }}>{hasData ? ((isPositive ? '+' : '-') + '$' + Math.abs(d.pnl).toFixed(0)) : 'No trades'}</div>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                          {/* X-axis with tick marks and date labels */}
                          <div style={{ height: '22px', position: 'relative', marginLeft: '1px' }}>
                            {xLabels.map((l, i) => (
                              <div key={i} style={{ position: 'absolute', left: `${l.pct}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: '1px', height: '6px', background: '#444' }} />
                                <span style={{ fontSize: '9px', color: '#888', marginTop: '2px' }}>{l.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Right column - wider, all boxes equal height */}
              <div style={{ width: '420px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Top row: Average Rating + PnL by Day */}
                <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                  {/* Average Rating - title on left side */}
                  <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '8px' }}>Average Rating</div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= Math.round(parseFloat(avgRating)) ? '#22c55e' : '#2a2a35', fontSize: '28px' }}>★</span>)}
                      </div>
                      <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>{avgRating}</div>
                    </div>
                  </div>

                  {/* PnL by Day - bars proportionate to PnL */}
                  <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '10px' }}>PnL by Day</div>
                    {(() => {
                      const dayNames = ['M', 'T', 'W', 'T', 'F']
                      const dayPnL = [0, 0, 0, 0, 0]
                      trades.forEach(t => {
                        const day = new Date(t.date).getDay()
                        if (day >= 1 && day <= 5) dayPnL[day - 1] += parseFloat(t.pnl) || 0
                      })
                      const maxPnL = Math.max(...dayPnL.map(p => Math.abs(p)), 1)
                      return (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <div style={{ flex: 1, display: 'flex', gap: '4px', alignItems: 'flex-end', marginBottom: '4px' }}>
                            {dayPnL.map((pnl, i) => {
                              const heightPct = Math.max((Math.abs(pnl) / maxPnL) * 100, 10)
                              return (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                                  <div style={{ fontSize: '10px', color: pnl >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600, marginBottom: '2px' }}>
                                    {pnl >= 0 ? '+' : ''}{Math.round(pnl)}
                                  </div>
                                  <div style={{ width: '100%', height: `${heightPct}%`, background: pnl >= 0 ? '#22c55e' : '#ef4444', borderRadius: '3px 3px 0 0', minHeight: '4px' }} />
                                </div>
                              )
                            })}
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {dayNames.map((name, i) => (
                              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '11px', fontWeight: 600, color: '#888' }}>{name}</div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Streaks & Consistency - taller */}
                <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>Streaks & Consistency</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', flex: 1 }}>
                    {[
                      { l: 'Max Wins', v: streaks.mw, c: '#22c55e' },
                      { l: 'Max Losses', v: streaks.ml, c: '#ef4444' },
                      { l: 'Days', v: tradingDays, c: '#fff' },
                      { l: 'Trades/Day', v: avgTradesPerDay, c: '#fff' },
                    ].map((item, i) => (
                      <div key={i} style={{ padding: '10px', background: '#0a0a0e', borderRadius: '6px', border: '1px solid #1a1a22', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>{item.l}</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: item.c }}>{item.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ROW 4: Stats + Donut + Performance + Trade Analysis + Expectancy */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              {/* Stats + Donut */}
              <div style={{ width: '320px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px', display: 'flex' }}>
                <div style={{ flex: 1 }}>
                  {[
                    { l: 'Avg. Trend', v: avgTrend },
                    { l: 'Avg. Rating', v: avgRating + '★' },
                    { l: 'Avg Trade PnL', v: (avgPnl >= 0 ? '+' : '') + '$' + avgPnl },
                    { l: 'Most Traded', v: mostTradedPair },
                    { l: 'Most Used RR', v: mostUsedRR },
                    { l: 'Best RR', v: mostProfitableRR },
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < 5 ? '1px solid #1a1a22' : 'none' }}>
                      <span style={{ fontSize: '12px', color: '#888' }}>{item.l}</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{item.v}</span>
                    </div>
                  ))}
                </div>
                <div style={{ width: '1px', background: '#1a1a22', margin: '0 10px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '110px' }}>
                  <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>Pair Analysis</div>
                  <select value={pairAnalysisType} onChange={e => setPairAnalysisType(e.target.value)} style={{ fontSize: '9px', color: '#ccc', marginBottom: '6px', background: '#141418', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', boxShadow: '0 0 6px rgba(255,255,255,0.1)' }}>
                    <option value="best">Best Pair</option>
                    <option value="worst">Worst Pair</option>
                    <option value="most">Most Used</option>
                  </select>
                  {(() => {
                    const ps = {}
                    trades.forEach(t => { if (!ps[t.symbol]) ps[t.symbol] = { w: 0, l: 0, pnl: 0, count: 0 }; if (t.outcome === 'win') ps[t.symbol].w++; else if (t.outcome === 'loss') ps[t.symbol].l++; ps[t.symbol].pnl += parseFloat(t.pnl) || 0; ps[t.symbol].count++ })
                    let selected
                    if (pairAnalysisType === 'best') selected = Object.entries(ps).sort((a, b) => b[1].pnl - a[1].pnl)[0]
                    else if (pairAnalysisType === 'worst') selected = Object.entries(ps).sort((a, b) => a[1].pnl - b[1].pnl)[0]
                    else selected = Object.entries(ps).sort((a, b) => b[1].count - a[1].count)[0]
                    if (!selected) return <div style={{ color: '#666' }}>No data</div>
                    const wr = selected[1].w + selected[1].l > 0 ? Math.round((selected[1].w / (selected[1].w + selected[1].l)) * 100) : 0
                    const size = 70, stroke = 7, r = (size - stroke) / 2, c = 2 * Math.PI * r
                    return (
                      <>
                        <div style={{ position: 'relative', width: size, height: size }}>
                          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ef4444" strokeWidth={stroke} />
                            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#22c55e" strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c * (1 - wr/100)} strokeLinecap="butt" />
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#fff' }}>{selected[0]}</div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#22c55e' }}>{wr}%</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '8px' }}>
                          <span><span style={{ color: '#22c55e' }}>●</span> Win</span>
                          <span><span style={{ color: '#ef4444' }}>●</span> Loss</span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Performance - compact */}
              <div style={{ width: '280px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '10px' }}>Performance</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {[
                    { l: 'Best Day', v: bestDay ? `+$${Math.round(bestDay.pnl)}` : '-', c: '#22c55e' },
                    { l: 'Worst Day', v: worstDay ? `$${Math.round(worstDay.pnl)}` : '-', c: '#ef4444' },
                    { l: 'Biggest Win', v: `+$${biggestWin}`, c: '#22c55e' },
                    { l: 'Biggest Loss', v: `$${biggestLoss}`, c: '#ef4444' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '8px', background: '#0a0a0e', borderRadius: '4px', border: '1px solid #1a1a22', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#888', marginBottom: '3px' }}>{item.l}</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: item.c }}>{item.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trade Analysis - narrower with green border */}
              <div style={{ flex: 1, background: '#0d0d12', border: '2px solid #22c55e', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '10px' }}>Trade Analysis</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <select value={analysisGroupBy} onChange={e => setAnalysisGroupBy(e.target.value)} style={{ flex: 1, padding: '8px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }}>
                    <option value="direction">Direction</option>
                    <option value="confidence">Confidence</option>
                    <option value="session">Session</option>
                    <option value="timeframe">Timeframe</option>
                    {getCustomSelectInputs().filter(i => !['direction', 'session', 'confidence', 'timeframe'].includes(i.id)).map(inp => (
                      <option key={inp.id} value={inp.id}>{inp.label}</option>
                    ))}
                  </select>
                  <select value={analysisMetric} onChange={e => setAnalysisMetric(e.target.value)} style={{ flex: 1, padding: '8px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '12px', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }}>
                    <option value="avgpnl">Avg PnL</option>
                    <option value="winrate">Winrate</option>
                    <option value="pnl">Total PnL</option>
                    <option value="count">Count</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                        <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#0a0a0e', borderRadius: '4px' }}>
                          <span style={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}>{name}:</span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: val >= 0 ? '#22c55e' : '#ef4444' }}>{disp}</span>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* Expectancy widgets - compact */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '110px' }}>
                <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', marginBottom: '2px' }}>Avg Loss Exp.</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#ef4444' }}>-${avgLoss}</div>
                  <div style={{ fontSize: '8px', color: '#666' }}>per trade</div>
                </div>
                <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', marginBottom: '2px' }}>Expectancy</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: parseFloat(expectancy) >= 0 ? '#22c55e' : '#ef4444' }}>${expectancy}</div>
                  <div style={{ fontSize: '8px', color: '#666' }}>per trade</div>
                </div>
              </div>
            </div>

            {/* ROW 5: Risk + Progress - 4 items each */}
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '13px', color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>Risk Management</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  {[
                    { l: 'Avg RR', v: avgRR + 'R', c: '#fff' },
                    { l: 'Risk/Reward', v: returnOnRisk + 'x', c: '#22c55e' },
                    { l: 'Profit Factor', v: profitFactor, c: '#fff' },
                    { l: 'Consistency', v: consistencyScore + '%', c: consistencyScore >= 50 ? '#22c55e' : '#ef4444' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '12px', background: '#0a0a0e', borderRadius: '6px', border: '1px solid #1a1a22', textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '6px' }}>{item.l}</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: item.c }}>{item.v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '13px', color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>Account Progress</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  {[
                    { l: 'Starting', v: '$' + startingBalance.toLocaleString(), c: '#888' },
                    { l: 'Current', v: '$' + currentBalance.toLocaleString(), c: '#22c55e' },
                    { l: 'Growth', v: ((currentBalance / startingBalance - 1) * 100).toFixed(1) + '%', c: currentBalance >= startingBalance ? '#22c55e' : '#ef4444' },
                    { l: 'Monthly', v: monthlyGrowth + '%', c: parseFloat(monthlyGrowth) >= 0 ? '#22c55e' : '#ef4444' },
                  ].map((item, i) => (
                    <div key={i} style={{ padding: '12px', background: '#0a0a0e', borderRadius: '6px', border: '1px solid #1a1a22', textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', color: '#888', marginBottom: '6px' }}>{item.l}</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: item.c }}>{item.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Auto-generated widgets for custom inputs */}
            {(() => {
              const customInputs = getCustomSelectInputs().filter(i => !['direction', 'session', 'confidence', 'timeframe', 'symbol'].includes(i.id))
              if (customInputs.length === 0) return null
              return (
                <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
                  {customInputs.map(input => {
                    // Calculate stats for this custom input
                    const stats = {}
                    trades.forEach(t => {
                      const val = getExtraData(t)[input.id] || 'Not Set'
                      if (!stats[val]) stats[val] = { wins: 0, losses: 0, pnl: 0, count: 0 }
                      if (t.outcome === 'win') stats[val].wins++
                      else if (t.outcome === 'loss') stats[val].losses++
                      stats[val].pnl += parseFloat(t.pnl) || 0
                      stats[val].count++
                    })
                    const entries = Object.entries(stats).sort((a, b) => b[1].count - a[1].count).slice(0, 5)
                    if (entries.length === 0) return null
                    const maxCount = Math.max(...entries.map(e => e[1].count))

                    return (
                      <div key={input.id} style={{ flex: '1 1 280px', maxWidth: '350px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px' }}>
                        <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', marginBottom: '12px' }}>By {input.label}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {entries.map(([val, data], idx) => {
                            const wr = data.wins + data.losses > 0 ? Math.round((data.wins / (data.wins + data.losses)) * 100) : 0
                            const barWidth = (data.count / maxCount) * 100
                            return (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '70px', fontSize: '11px', color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</div>
                                <div style={{ flex: 1, height: '18px', background: '#1a1a22', borderRadius: '3px', position: 'relative', overflow: 'hidden' }}>
                                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${barWidth}%`, background: data.pnl >= 0 ? '#22c55e' : '#ef4444', opacity: 0.3, borderRadius: '3px' }} />
                                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px', fontSize: '9px' }}>
                                    <span style={{ color: '#888' }}>{data.count} trades</span>
                                    <span style={{ color: wr >= 50 ? '#22c55e' : '#ef4444' }}>{wr}% WR</span>
                                  </div>
                                </div>
                                <div style={{ width: '55px', fontSize: '10px', fontWeight: 600, color: data.pnl >= 0 ? '#22c55e' : '#ef4444', textAlign: 'right' }}>{data.pnl >= 0 ? '+' : ''}${Math.round(data.pnl)}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div style={{ padding: isMobile ? '0' : '16px 24px' }}>
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
          </div>
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
                    <select value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} style={{ width: '100%', padding: '10px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }}>
                      {input.options?.map(o => <option key={o} value={o.toLowerCase()}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={input.type} value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} step={input.type === 'number' ? '0.01' : undefined} style={{ width: '100%', padding: '10px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }} />
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
                        <select value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} style={{ width: '100%', padding: '10px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }}>
                          {input.options?.map(o => <option key={o} value={o.toLowerCase()}>{o}</option>)}
                        </select>
                      ) : input.type === 'textarea' ? (
                        <textarea value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} rows={3} style={{ width: '100%', padding: '10px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '14px', resize: 'none', boxSizing: 'border-box', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }} />
                      ) : input.type === 'rating' ? (
                        <div style={{ display: 'flex', gap: '6px' }}>{[1,2,3,4,5].map(i => <button key={i} type="button" onClick={() => setTradeForm({...tradeForm, [input.id]: String(i)})} style={{ width: '40px', height: '40px', background: '#141418', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '20px', color: i <= parseInt(tradeForm[input.id] || 0) ? '#22c55e' : '#555', boxShadow: '0 0 8px rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>★</button>)}</div>
                      ) : input.type === 'file' ? (
                        <div 
                          style={{ 
                            width: '100%', padding: '20px', background: '#0a0a0e', border: '2px dashed #2a2a35', borderRadius: '8px', 
                            textAlign: 'center', cursor: 'pointer', position: 'relative', boxSizing: 'border-box',
                            ...(tradeForm[input.id] ? { borderColor: '#22c55e', borderStyle: 'solid' } : {})
                          }}
                          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#22c55e' }}
                          onDragLeave={e => { e.currentTarget.style.borderColor = tradeForm[input.id] ? '#22c55e' : '#2a2a35' }}
                          onDrop={e => {
                            e.preventDefault()
                            e.currentTarget.style.borderColor = '#22c55e'
                            const file = e.dataTransfer.files[0]
                            if (file && file.type.startsWith('image/')) {
                              const reader = new FileReader()
                              reader.onloadend = () => setTradeForm({...tradeForm, [input.id]: reader.result})
                              reader.readAsDataURL(file)
                            }
                          }}
                          onClick={() => document.getElementById('image-upload-input').click()}
                        >
                          <input id="image-upload-input" type="file" accept="image/*" onChange={e => {
                            const file = e.target.files[0]
                            if (file) {
                              const reader = new FileReader()
                              reader.onloadend = () => setTradeForm({...tradeForm, [input.id]: reader.result})
                              reader.readAsDataURL(file)
                            }
                          }} style={{ display: 'none' }} />
                          {tradeForm[input.id] ? (
                            <div>
                              <img src={tradeForm[input.id]} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100px', borderRadius: '4px', marginBottom: '8px' }} />
                              <div style={{ color: '#22c55e', fontSize: '12px' }}>✓ Image uploaded</div>
                              <button type="button" onClick={e => { e.stopPropagation(); setTradeForm({...tradeForm, [input.id]: ''}) }} style={{ marginTop: '8px', padding: '4px 12px', background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '4px', color: '#888', fontSize: '11px', cursor: 'pointer' }}>Remove</button>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
                              <div style={{ color: '#888', fontSize: '13px' }}>Drop image here or click to upload</div>
                              <div style={{ color: '#666', fontSize: '11px', marginTop: '4px' }}>PNG, JPG up to 5MB</div>
                            </div>
                          )}
                        </div>
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
                  <input type="checkbox" checked={input.enabled} onChange={e => !input.fixed && updateInput(i, 'enabled', e.target.checked)} disabled={input.fixed} style={{ width: '18px', height: '18px', accentColor: '#22c55e' }} />
                  <input type="text" value={input.label} onChange={e => updateInput(i, 'label', e.target.value)} disabled={input.fixed} style={{ flex: 1, padding: '8px 12px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#fff', fontSize: '13px', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }} />
                  <select value={input.type} onChange={e => updateInput(i, 'type', e.target.value)} disabled={input.fixed} style={{ padding: '8px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: '#888', fontSize: '12px', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }}>
                    {['text', 'number', 'date', 'select', 'textarea', 'rating', 'file'].map(t => <option key={t} value={t}>{t}</option>)}
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

      {/* Enlarged Chart Modal */}
      {enlargedChart && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setEnlargedChart(null)}>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '24px', width: '90vw', maxWidth: '1200px', height: '80vh' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>{enlargedChart === 'equity' ? 'Equity Curve' : enlargedChart === 'bar' ? 'Performance by ' + (graphGroupBy === 'symbol' ? 'Pair' : graphGroupBy) : 'Net Daily PnL'}</span>
                {enlargedChart === 'equity' && (
                  <>
                    <span style={{ fontSize: '12px', color: '#666' }}>Start: <span style={{ color: '#fff' }}>${startingBalance.toLocaleString()}</span></span>
                    <span style={{ fontSize: '12px', color: '#666' }}>Current: <span style={{ color: currentBalance >= startingBalance ? '#22c55e' : '#ef4444' }}>${Math.round(currentBalance).toLocaleString()}</span></span>
                    <select value={equityCurveGroupBy} onChange={e => { setEquityCurveGroupBy(e.target.value); setSelectedCurveLines({}) }} style={{ padding: '4px 8px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '11px', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }}>
                      <option value="total">Total PnL</option>
                      <option value="symbol">By Pair</option>
                      <option value="direction">By Direction</option>
                      <option value="confidence">By Confidence</option>
                      <option value="session">By Session</option>
                    </select>
                  </>
                )}
                {enlargedChart === 'equity' && equityCurveGroupBy !== 'total' && (
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowLinesDropdown(!showLinesDropdown) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px', background: '#1a1a22', border: '1px solid #2a2a35',
                        borderRadius: '4px', color: '#888', fontSize: '11px', cursor: 'pointer'
                      }}
                    >
                      <span>Lines</span>
                      <span style={{ transform: showLinesDropdown ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                    </button>
                    {showLinesDropdown && (
                      <div onClick={e => e.stopPropagation()} style={{
                        position: 'absolute', top: '100%', left: 0, zIndex: 200,
                        background: '#141418', border: '1px solid #2a2a35', borderRadius: '4px',
                        padding: '8px', marginTop: '4px', minWidth: '180px', maxHeight: '300px', overflowY: 'auto'
                      }}>
                        {(() => {
                          const lineColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4']
                          const sorted = trades.length >= 2 ? [...trades].sort((a, b) => new Date(a.date) - new Date(b.date)) : []
                          const groups = {}
                          sorted.forEach(t => {
                            let key = equityCurveGroupBy === 'symbol' ? t.symbol : equityCurveGroupBy === 'direction' ? t.direction : getExtraData(t)[equityCurveGroupBy] || 'Unknown'
                            if (!groups[key]) groups[key] = true
                          })
                          const lineNames = Object.keys(groups).slice(0, 9)
                          return (
                            <>
                              {lineNames.map((name, idx) => (
                                <label key={idx} style={{
                                  display: 'flex', alignItems: 'center', gap: '8px',
                                  fontSize: '11px', color: '#888', cursor: 'pointer',
                                  padding: '6px 8px', borderRadius: '4px',
                                  background: selectedCurveLines[name] !== false ? 'rgba(34, 197, 94, 0.1)' : 'transparent'
                                }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedCurveLines[name] !== false}
                                    onChange={e => setSelectedCurveLines(prev => ({ ...prev, [name]: e.target.checked }))}
                                    style={{ width: '14px', height: '14px', accentColor: lineColors[idx % lineColors.length] }}
                                  />
                                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: lineColors[idx % lineColors.length] }} />
                                  <span style={{ color: selectedCurveLines[name] !== false ? '#fff' : '#888' }}>{name}</span>
                                </label>
                              ))}
                              <div style={{ borderTop: '1px solid #2a2a35', marginTop: '8px', paddingTop: '8px', display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => setSelectedCurveLines(lineNames.reduce((acc, n) => ({ ...acc, [n]: true }), {}))}
                                  style={{ flex: 1, padding: '4px 8px', background: '#22c55e', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '10px', cursor: 'pointer' }}
                                >All</button>
                                <button
                                  onClick={() => setSelectedCurveLines(lineNames.reduce((acc, n) => ({ ...acc, [n]: false }), {}))}
                                  style={{ flex: 1, padding: '4px 8px', background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '4px', color: '#888', fontSize: '10px', cursor: 'pointer' }}
                                >None</button>
                              </div>
                            </>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )}
                {enlargedChart === 'bar' && (
                  <>
                    <select value={barGraphMetric} onChange={e => setBarGraphMetric(e.target.value)} style={{ padding: '4px 8px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '11px', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }}>
                      <option value="winrate">Winrate</option>
                      <option value="pnl">PnL</option>
                      <option value="trades">Trades</option>
                      <option value="avgRR">Avg RR</option>
                    </select>
                    <select value={graphGroupBy} onChange={e => setGraphGroupBy(e.target.value)} style={{ padding: '4px 8px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '11px', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }}>
                      <option value="symbol">Pairs</option>
                      <option value="direction">Direction</option>
                      <option value="session">Session</option>
                      <option value="confidence">Confidence</option>
                    </select>
                  </>
                )}
              </div>
              <button onClick={() => setEnlargedChart(null)} style={{ background: 'transparent', border: 'none', color: '#888', fontSize: '28px', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ height: 'calc(100% - 60px)', display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {enlargedChart === 'equity' && (() => {
                const sorted = trades.length >= 2 ? [...trades].sort((a, b) => new Date(a.date) - new Date(b.date)) : []
                if (sorted.length < 2) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Need 2+ trades</div>

                const lineColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4']
                let lines = []

                if (equityCurveGroupBy === 'total') {
                  let cum = startingBalance
                  const points = [{ balance: cum, date: null, pnl: 0 }]
                  sorted.forEach(t => { cum += parseFloat(t.pnl) || 0; points.push({ balance: cum, date: t.date, pnl: parseFloat(t.pnl) || 0, symbol: t.symbol }) })
                  lines = [{ name: 'Total', points, color: '#22c55e' }]
                } else {
                  const groups = {}
                  sorted.forEach(t => {
                    let key = equityCurveGroupBy === 'symbol' ? t.symbol : equityCurveGroupBy === 'direction' ? t.direction : getExtraData(t)[equityCurveGroupBy] || 'Unknown'
                    if (!groups[key]) groups[key] = []
                    groups[key].push(t)
                  })
                  Object.keys(groups).slice(0, 9).forEach((name, idx) => {
                    let cum = 0
                    const pts = [{ balance: 0, date: sorted[0]?.date, pnl: 0 }]
                    groups[name].forEach(t => { cum += parseFloat(t.pnl) || 0; pts.push({ balance: cum, date: t.date, pnl: parseFloat(t.pnl) || 0, symbol: t.symbol }) })
                    lines.push({ name, points: pts, color: lineColors[idx % lineColors.length] })
                  })
                }

                const visibleLines = equityCurveGroupBy === 'total' ? lines : lines.filter(l => selectedCurveLines[l.name] !== false)
                const allBalances = visibleLines.flatMap(l => l.points.map(p => p.balance))
                const maxBal = Math.max(...allBalances)
                const minBal = Math.min(...allBalances)
                const range = maxBal - minBal || 1000
                const yStep = Math.ceil(range / 10 / 100) * 100 || 100
                const yMax = Math.ceil(maxBal / yStep) * yStep
                const yMin = Math.floor(minBal / yStep) * yStep
                const yRange = yMax - yMin || yStep
                const hasNegative = minBal < 0
                const belowStartEnl = equityCurveGroupBy === 'total' && minBal < startingBalance
                const zeroY = hasNegative ? ((yMax - 0) / yRange) * 100 : null

                const yLabels = []
                for (let v = yMax; v >= yMin; v -= yStep) yLabels.push(v)

                // X-axis labels - double digit format
                const xLabelCount = 15
                const xLabels = []
                for (let i = 0; i < xLabelCount; i++) {
                  const idx = Math.floor(i * (sorted.length - 1) / (xLabelCount - 1))
                  const trade = sorted[idx]
                  if (trade?.date) {
                    const d = new Date(trade.date)
                    xLabels.push({ label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, pct: (i / (xLabelCount - 1)) * 100 })
                  }
                }

                const svgW = 100, svgH = 100
                const startYEnl = svgH - ((startingBalance - yMin) / yRange) * svgH
                const lineData = visibleLines.map(line => {
                  const chartPoints = line.points.map((p, i) => ({
                    x: line.points.length > 1 ? (i / (line.points.length - 1)) * svgW : svgW / 2,
                    y: svgH - ((p.balance - yMin) / yRange) * svgH,
                    ...p
                  }))
                  const pathD = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

                  // Split coloring for total mode
                  let greenPath = '', redPath = ''
                  if (equityCurveGroupBy === 'total') {
                    const greenSegments = [], redSegments = []
                    for (let i = 0; i < chartPoints.length - 1; i++) {
                      const p1 = chartPoints[i], p2 = chartPoints[i + 1]
                      const above1 = p1.balance >= startingBalance, above2 = p2.balance >= startingBalance
                      if (above1 === above2) {
                        (above1 ? greenSegments : redSegments).push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
                      } else {
                        const t = (startingBalance - p1.balance) / (p2.balance - p1.balance)
                        const ix = p1.x + t * (p2.x - p1.x), iy = startYEnl
                        if (above1) {
                          greenSegments.push({ x1: p1.x, y1: p1.y, x2: ix, y2: iy })
                          redSegments.push({ x1: ix, y1: iy, x2: p2.x, y2: p2.y })
                        } else {
                          redSegments.push({ x1: p1.x, y1: p1.y, x2: ix, y2: iy })
                          greenSegments.push({ x1: ix, y1: iy, x2: p2.x, y2: p2.y })
                        }
                      }
                    }
                    greenPath = greenSegments.map(s => `M ${s.x1} ${s.y1} L ${s.x2} ${s.y2}`).join(' ')
                    redPath = redSegments.map(s => `M ${s.x1} ${s.y1} L ${s.x2} ${s.y2}`).join(' ')
                    // Build area fills for each segment (closed polygons to startY line)
                    var greenAreaPath = greenSegments.map(s => `M ${s.x1} ${s.y1} L ${s.x2} ${s.y2} L ${s.x2} ${startYEnl} L ${s.x1} ${startYEnl} Z`).join(' ')
                    var redAreaPath = redSegments.map(s => `M ${s.x1} ${s.y1} L ${s.x2} ${s.y2} L ${s.x2} ${startYEnl} L ${s.x1} ${startYEnl} Z`).join(' ')
                  }

                  return { ...line, chartPoints, pathD, greenPath, redPath, greenAreaPath, redAreaPath }
                })

                const mainLine = lineData[0]
                const areaBottom = hasNegative ? svgH - ((0 - yMin) / yRange) * svgH : svgH
                const areaD = equityCurveGroupBy === 'total' && mainLine ? mainLine.pathD + ` L ${mainLine.chartPoints[mainLine.chartPoints.length - 1].x} ${areaBottom} L ${mainLine.chartPoints[0].x} ${areaBottom} Z` : null

                return (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, display: 'flex' }}>
                      <div style={{ width: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0, paddingBottom: '20px', paddingRight: '4px' }}>
                        {yLabels.map((v, i) => <span key={i} style={{ fontSize: '10px', color: '#888', textAlign: 'right' }}>{equityCurveGroupBy === 'total' ? `$${(v/1000).toFixed(v >= 1000 ? 0 : 1)}k` : `$${v}`}</span>)}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #333', borderBottom: hasNegative ? 'none' : '1px solid #333' }}>
                          {/* Horizontal grid lines */}
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                            {yLabels.map((_, i) => <div key={i} style={{ borderTop: '1px solid #1a1a22' }} />)}
                          </div>
                          {zeroY !== null && <div style={{ position: 'absolute', left: 0, right: 0, top: `${zeroY}%`, borderTop: '2px solid #666', zIndex: 1 }}><span style={{ position: 'absolute', left: '-60px', top: '-8px', fontSize: '11px', color: '#888' }}>$0</span></div>}
                          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none"
                            onMouseMove={e => {
                              const rect = e.currentTarget.getBoundingClientRect()
                              const mouseX = ((e.clientX - rect.left) / rect.width) * svgW
                              const mouseY = ((e.clientY - rect.top) / rect.height) * svgH

                              let closestPoint = null, closestDist = Infinity, closestLine = null
                              lineData.forEach(line => {
                                line.chartPoints.forEach(p => {
                                  const dist = Math.sqrt(Math.pow(mouseX - p.x, 2) + Math.pow(mouseY - p.y, 2))
                                  if (dist < closestDist) { closestDist = dist; closestPoint = p; closestLine = line }
                                })
                              })

                              if (closestDist < 10 && closestPoint) {
                                setHoverPoint({ ...closestPoint, xPct: (closestPoint.x / svgW) * 100, yPct: (closestPoint.y / svgH) * 100, lineName: closestLine.name, lineColor: closestLine.color })
                              } else { setHoverPoint(null) }
                            }}
                            onMouseLeave={() => setHoverPoint(null)}
                          >
                            <defs>
                              <linearGradient id="eqGEnlG" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" /><stop offset="100%" stopColor="#22c55e" stopOpacity="0" /></linearGradient>
                              <linearGradient id="eqGEnlR" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" /><stop offset="100%" stopColor="#ef4444" stopOpacity="0" /></linearGradient>
                            </defs>
                            {equityCurveGroupBy === 'total' && lineData[0] ? (
                              <>
                                {lineData[0].greenAreaPath && <path d={lineData[0].greenAreaPath} fill="url(#eqGEnlG)" />}
                                {lineData[0].redAreaPath && <path d={lineData[0].redAreaPath} fill="url(#eqGEnlR)" />}
                                {lineData[0].greenPath && <path d={lineData[0].greenPath} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
                                {lineData[0].redPath && <path d={lineData[0].redPath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
                              </>
                            ) : (() => {
                              // Sort lines by average Y position (ascending = top lines first)
                              const sortedLines = [...lineData].map((line, origIdx) => {
                                const avgY = line.chartPoints.reduce((sum, p) => sum + p.y, 0) / line.chartPoints.length
                                return { ...line, origIdx, avgY }
                              }).sort((a, b) => a.avgY - b.avgY) // Top lines first (lowest Y)

                              return (
                                <>
                                  <defs>
                                    {/* Create clipPath for each line - clips glow to region between this line and next line below */}
                                    {sortedLines.map((line, sortIdx) => {
                                      const pts = line.chartPoints
                                      const nextLine = sortedLines[sortIdx + 1]
                                      let clipPath
                                      if (nextLine) {
                                        const nextPts = nextLine.chartPoints
                                        const bottomPts = pts.map(p => {
                                          let closestIdx = 0, minDist = Infinity
                                          nextPts.forEach((np, ni) => {
                                            const dist = Math.abs(np.x - p.x)
                                            if (dist < minDist) { minDist = dist; closestIdx = ni }
                                          })
                                          return { x: p.x, y: nextPts[closestIdx].y }
                                        })
                                        clipPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') +
                                          bottomPts.slice().reverse().map(p => ` L ${p.x} ${p.y}`).join('') + ' Z'
                                      } else {
                                        clipPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') +
                                          ` L ${pts[pts.length - 1].x} ${svgH} L ${pts[0].x} ${svgH} Z`
                                      }
                                      return <clipPath key={`clipEnl${line.origIdx}`} id={`clipEnl${line.origIdx}`}><path d={clipPath} /></clipPath>
                                    })}
                                    {/* Gradient for each line */}
                                    {sortedLines.map((line) => (
                                      <linearGradient key={`gradEnl${line.origIdx}`} id={`gradEnl${line.origIdx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor={line.color} stopOpacity="0.3" />
                                        <stop offset="100%" stopColor={line.color} stopOpacity="0" />
                                      </linearGradient>
                                    ))}
                                  </defs>
                                  {/* Draw gradient areas with clipPaths */}
                                  {sortedLines.map((line) => {
                                    const pts = line.chartPoints
                                    const areaPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') +
                                      ` L ${pts[pts.length - 1].x} ${svgH} L ${pts[0].x} ${svgH} Z`
                                    return <path key={`areaEnl${line.origIdx}`} d={areaPath} fill={`url(#gradEnl${line.origIdx})`} clipPath={`url(#clipEnl${line.origIdx})`} />
                                  })}
                                  {/* Draw all lines on top */}
                                  {lineData.map((line, idx) => (
                                    <path key={`line${idx}`} d={line.pathD} fill="none" stroke={line.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                  ))}
                                </>
                              )
                            })()}
                          </svg>
                          {hoverPoint && <div style={{ position: 'absolute', left: `${hoverPoint.xPct}%`, top: `${hoverPoint.yPct}%`, transform: 'translate(-50%, -50%)', width: '12px', height: '12px', borderRadius: '50%', background: equityCurveGroupBy === 'total' ? (hoverPoint.balance >= startingBalance ? '#22c55e' : '#ef4444') : (hoverPoint.lineColor || '#22c55e'), border: '2px solid #fff', pointerEvents: 'none', zIndex: 10 }} />}
                          {hoverPoint && (
                            <div style={{ position: 'absolute', left: `${hoverPoint.xPct}%`, top: `${hoverPoint.yPct}%`, transform: `translate(${hoverPoint.xPct > 80 ? 'calc(-100% - 15px)' : '15px'}, ${hoverPoint.yPct < 20 ? '0%' : hoverPoint.yPct > 80 ? '-100%' : '-50%'})`, background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '10px 14px', fontSize: '12px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
                              {hoverPoint.lineName && equityCurveGroupBy !== 'total' && <div style={{ color: hoverPoint.lineColor, fontWeight: 600, marginBottom: '4px' }}>{hoverPoint.lineName}</div>}
                              <div style={{ color: '#888' }}>{hoverPoint.date ? new Date(hoverPoint.date).toLocaleDateString() : 'Start'}</div>
                              <div style={{ fontWeight: 600, fontSize: '16px', color: '#fff' }}>${hoverPoint.balance?.toLocaleString()}</div>
                              {hoverPoint.symbol && <div style={{ color: hoverPoint.pnl >= 0 ? '#22c55e' : '#ef4444' }}>{hoverPoint.symbol}: {hoverPoint.pnl >= 0 ? '+' : ''}${hoverPoint.pnl?.toFixed(0)}</div>}
                            </div>
                          )}
                        </div>
                        {/* X-axis with tick marks and labels */}
                        <div style={{ height: '26px', position: 'relative' }}>
                          {xLabels.map((l, i) => (
                            <div key={i} style={{ position: 'absolute', left: `${l.pct}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              <div style={{ width: '1px', height: '8px', background: '#444' }} />
                              <span style={{ fontSize: '10px', color: '#888', marginTop: '2px' }}>{l.label}</span>
                            </div>
                          ))}
                        </div>
                        {/* Legend */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '8px 0', flexWrap: 'wrap' }}>
                          {equityCurveGroupBy === 'total' ? (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '16px', height: '3px', background: '#22c55e' }} />
                                <span style={{ fontSize: '10px', color: '#888' }}>Above</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '16px', height: '3px', background: '#ef4444' }} />
                                <span style={{ fontSize: '10px', color: '#888' }}>Below</span>
                              </div>
                            </>
                          ) : (
                            lineData.map((line, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '16px', height: '3px', background: line.color }} />
                                <span style={{ fontSize: '10px', color: '#888' }}>{line.name}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
              {enlargedChart === 'bar' && (() => {
                const groupedData = {}
                trades.forEach(t => {
                  let key = graphGroupBy === 'symbol' ? t.symbol : graphGroupBy === 'direction' ? t.direction : getExtraData(t)[graphGroupBy]
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
                }).sort((a, b) => b.val - a.val).slice(0, 12)
                
                if (entries.length === 0) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>No data</div>

                const maxVal = barGraphMetric === 'winrate' ? 100 : Math.max(...entries.map(e => Math.abs(e.val)), 1)
                const niceMax = barGraphMetric === 'winrate' ? 100 : Math.ceil(maxVal / 100) * 100 || 100

                // Generate Y-axis labels
                const yLabelCount = 6
                const yLabelsBar = []
                for (let i = 0; i < yLabelCount; i++) {
                  const val = Math.round((niceMax / (yLabelCount - 1)) * (yLabelCount - 1 - i))
                  if (barGraphMetric === 'winrate') yLabelsBar.push(val + '%')
                  else if (barGraphMetric === 'pnl' || barGraphMetric === 'avgpnl') yLabelsBar.push('$' + val)
                  else yLabelsBar.push(val.toString())
                }

                return (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ flex: 1, display: 'flex' }}>
                      <div style={{ width: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0, paddingBottom: '30px', paddingRight: '4px' }}>
                        {yLabelsBar.map((v, i) => <span key={i} style={{ fontSize: '10px', color: '#888', textAlign: 'right' }}>{v}</span>)}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #333', borderBottom: '1px solid #333' }}>
                          {/* Horizontal grid lines */}
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
                            {yLabelsBar.map((_, i) => <div key={i} style={{ borderTop: '1px solid #1a1a22' }} />)}
                          </div>
                          {/* Bars */}
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: '12px', padding: '0 20px' }}>
                            {entries.map((item, i) => {
                              const hPct = Math.max((Math.abs(item.val) / niceMax) * 100, 5)
                              const isGreen = barGraphMetric === 'winrate' ? item.val >= 50 : item.val >= 0
                              const isHovered = barHover === i
                              return (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}
                                  onMouseEnter={() => setBarHover(i)}
                                  onMouseLeave={() => setBarHover(null)}
                                >
                                  <div style={{ fontSize: '14px', color: isGreen ? '#22c55e' : '#ef4444', marginBottom: '4px', fontWeight: 600 }}>{item.disp}</div>
                                  <div style={{ width: '100%', maxWidth: '80px', height: `${hPct}%`, background: `linear-gradient(to bottom, ${isGreen ? `rgba(34, 197, 94, ${0.1 + (hPct / 100) * 0.25})` : `rgba(239, 68, 68, ${0.1 + (hPct / 100) * 0.25})`} 0%, transparent 100%)`, border: `2px solid ${isGreen ? '#22c55e' : '#ef4444'}`, borderBottom: 'none', borderRadius: '6px 6px 0 0', minHeight: '20px', position: 'relative', cursor: 'pointer' }}>
                                    {isHovered && (
                                      <>
                                        <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', width: '10px', height: '10px', borderRadius: '50%', background: isGreen ? '#22c55e' : '#ef4444', border: '2px solid #fff', zIndex: 5 }} />
                                        <div style={{ position: 'absolute', bottom: '0px', left: 'calc(50% + 12px)', background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
                                          <div style={{ fontWeight: 700, color: '#fff', fontSize: '14px', marginBottom: '2px' }}>{item.name}</div>
                                          <div style={{ fontWeight: 600, fontSize: '16px', color: isGreen ? '#22c55e' : '#ef4444' }}>{item.disp}</div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                        {/* X-axis labels */}
                        <div style={{ height: '30px', display: 'flex', gap: '12px', padding: '8px 20px 0' }}>
                          {entries.map((item, i) => (
                            <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: '#888' }}>{item.name}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
              </div>
              {/* Stats Sidebar */}
              <div style={{ width: '220px', background: '#0a0a0e', borderRadius: '8px', border: '1px solid #1a1a22', padding: '8px', flexShrink: 0 }}>
                <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>Statistics</div>
                {(() => {
                  // Calculate stats based on selected lines/data - same for both charts
                  let filteredTrades = []
                  if (enlargedChart === 'equity') {
                    if (equityCurveGroupBy === 'total') {
                      filteredTrades = trades
                    } else {
                      const selectedKeys = Object.keys(selectedCurveLines).filter(k => selectedCurveLines[k] !== false)
                      if (selectedKeys.length > 0) {
                        filteredTrades = trades.filter(t => {
                          const key = equityCurveGroupBy === 'symbol' ? t.symbol : equityCurveGroupBy === 'direction' ? t.direction : (JSON.parse(t.extra_data || '{}')[equityCurveGroupBy] || 'Unknown')
                          return selectedKeys.includes(key)
                        })
                      }
                    }
                  } else if (enlargedChart === 'bar') {
                    filteredTrades = trades
                  }

                  const wins = filteredTrades.filter(t => parseFloat(t.pnl) > 0)
                  const losses = filteredTrades.filter(t => parseFloat(t.pnl) < 0)
                  const totalPnl = filteredTrades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0)
                  const winrate = filteredTrades.length > 0 ? ((wins.length / filteredTrades.length) * 100).toFixed(1) : '0'
                  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + parseFloat(t.pnl), 0) / wins.length : 0
                  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + parseFloat(t.pnl), 0) / losses.length) : 0
                  const profitFactor = avgLoss > 0 ? ((avgWin * wins.length) / (avgLoss * losses.length)).toFixed(2) : wins.length > 0 ? '∞' : '0'
                  const biggestWin = wins.length > 0 ? Math.max(...wins.map(t => parseFloat(t.pnl))) : 0
                  const biggestLoss = losses.length > 0 ? Math.min(...losses.map(t => parseFloat(t.pnl))) : 0
                  const avgPnl = filteredTrades.length > 0 ? totalPnl / filteredTrades.length : 0
                  const expectancy = filteredTrades.length > 0 ? (parseFloat(winrate) / 100 * avgWin - (1 - parseFloat(winrate) / 100) * avgLoss).toFixed(0) : 0
                  const avgRR = avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : avgWin > 0 ? '∞' : '0'
                  const breakeven = filteredTrades.filter(t => parseFloat(t.pnl) === 0).length
                  // Calculate streak
                  let currentStreak = 0, maxWinStreak = 0, maxLossStreak = 0, tempStreak = 0
                  filteredTrades.forEach(t => {
                    if (parseFloat(t.pnl) > 0) { tempStreak = tempStreak > 0 ? tempStreak + 1 : 1; maxWinStreak = Math.max(maxWinStreak, tempStreak) }
                    else if (parseFloat(t.pnl) < 0) { tempStreak = tempStreak < 0 ? tempStreak - 1 : -1; maxLossStreak = Math.max(maxLossStreak, Math.abs(tempStreak)) }
                    currentStreak = tempStreak
                  })
                  // Daily streak calculation
                  const dailyPnlByDate = {}
                  filteredTrades.forEach(t => { dailyPnlByDate[t.date] = (dailyPnlByDate[t.date] || 0) + (parseFloat(t.pnl) || 0) })
                  const sortedDates = Object.keys(dailyPnlByDate).sort()
                  let currentDayStreak = 0, maxDayWinStreak = 0, maxDayLossStreak = 0, tempDayStreak = 0
                  sortedDates.forEach(d => {
                    const pnl = dailyPnlByDate[d]
                    if (pnl > 0) { tempDayStreak = tempDayStreak > 0 ? tempDayStreak + 1 : 1; maxDayWinStreak = Math.max(maxDayWinStreak, tempDayStreak) }
                    else if (pnl < 0) { tempDayStreak = tempDayStreak < 0 ? tempDayStreak - 1 : -1; maxDayLossStreak = Math.max(maxDayLossStreak, Math.abs(tempDayStreak)) }
                    currentDayStreak = tempDayStreak
                  })
                  const greenDays = Object.values(dailyPnlByDate).filter(p => p > 0).length
                  const redDays = Object.values(dailyPnlByDate).filter(p => p < 0).length
                  const totalDays = sortedDates.length

                  const stats = [
                    { label: 'Total P&L', value: `${totalPnl >= 0 ? '+' : ''}$${Math.round(totalPnl).toLocaleString()}`, color: totalPnl >= 0 ? '#22c55e' : '#ef4444' },
                    { label: 'Trades', value: `${filteredTrades.length} (${wins.length}W/${losses.length}L${breakeven > 0 ? `/${breakeven}BE` : ''})` },
                    { label: 'Winrate', value: `${winrate}%`, color: parseFloat(winrate) >= 50 ? '#22c55e' : '#ef4444' },
                    { label: 'Profit Factor', value: profitFactor, color: parseFloat(profitFactor) >= 1 ? '#22c55e' : '#ef4444' },
                    { label: 'Avg RR', value: `${avgRR}R`, color: parseFloat(avgRR) >= 1 ? '#22c55e' : '#ef4444' },
                    { label: 'Avg Win', value: `+$${Math.round(avgWin).toLocaleString()}`, color: '#22c55e' },
                    { label: 'Avg Loss', value: `-$${Math.round(avgLoss).toLocaleString()}`, color: '#ef4444' },
                    { label: 'Avg Trade', value: `${avgPnl >= 0 ? '+' : ''}$${Math.round(avgPnl).toLocaleString()}`, color: avgPnl >= 0 ? '#22c55e' : '#ef4444' },
                    { label: 'Expectancy', value: `$${expectancy}`, color: parseFloat(expectancy) >= 0 ? '#22c55e' : '#ef4444' },
                    { label: 'Best Trade', value: `+$${Math.round(biggestWin).toLocaleString()}`, color: '#22c55e' },
                    { label: 'Worst Trade', value: `$${Math.round(biggestLoss).toLocaleString()}`, color: '#ef4444' },
                    { label: 'Trade Streak', value: currentStreak >= 0 ? `+${currentStreak}` : `${currentStreak}`, color: currentStreak >= 0 ? '#22c55e' : '#ef4444' },
                    { label: 'Best Trade Streak', value: `+${maxWinStreak}W / -${maxLossStreak}L` },
                    { label: 'Days Traded', value: `${totalDays} (${greenDays}G/${redDays}R)`, color: greenDays >= redDays ? '#22c55e' : '#ef4444' },
                    { label: 'Day Streak', value: currentDayStreak >= 0 ? `+${currentDayStreak}` : `${currentDayStreak}`, color: currentDayStreak >= 0 ? '#22c55e' : '#ef4444' },
                    { label: 'Best Day Streak', value: `+${maxDayWinStreak}G / -${maxDayLossStreak}R` },
                  ]

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {stats.map((stat, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 5px', background: '#0d0d12', borderRadius: '2px' }}>
                          <span style={{ fontSize: '8px', color: '#666' }}>{stat.label}</span>
                          <span style={{ fontSize: '9px', fontWeight: 600, color: stat.color || '#fff' }}>{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
