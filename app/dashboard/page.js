'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

// Color mappings for select options (same as account page) - textColor and bgColor
const optionStyles = {
  confidence: {
    High: { textColor: '#22c55e', bgColor: 'rgba(34,197,94,0.15)' },
    Medium: { textColor: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)' },
    Low: { textColor: '#ef4444', bgColor: 'rgba(239,68,68,0.15)' }
  },
  session: {
    London: { textColor: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)' },
    'New York': { textColor: '#22c55e', bgColor: 'rgba(34,197,94,0.15)' },
    Asian: { textColor: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)' },
    Overlap: { textColor: '#a855f7', bgColor: 'rgba(168,85,247,0.15)' }
  },
  timeframe: {
    '1m': { textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)' },
    '5m': { textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)' },
    '15m': { textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)' },
    '30m': { textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)' },
    '1H': { textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)' },
    '4H': { textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)' },
    'Daily': { textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)' }
  },
  direction: {
    Long: { textColor: '#22c55e', bgColor: 'rgba(34,197,94,0.15)' },
    Short: { textColor: '#ef4444', bgColor: 'rgba(239,68,68,0.15)' },
    long: { textColor: '#22c55e', bgColor: 'rgba(34,197,94,0.15)' },
    short: { textColor: '#ef4444', bgColor: 'rgba(239,68,68,0.15)' }
  }
}
function getOptionStyles(field, value) {
  if (!value) return { textColor: '#888', bgColor: null }
  const fieldStyles = optionStyles[field]
  if (fieldStyles && fieldStyles[value]) return fieldStyles[value]
  return { textColor: '#888', bgColor: null }
}

// Helper to extract value from option (supports both string and {value, textColor, bgColor} formats)
function getOptVal(o) { return typeof o === 'object' ? o.value : o }

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
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState('cards') // 'cards' or 'list'
  // Quick trade entry state
  const [quickTradeAccount, setQuickTradeAccount] = useState('')
  const [quickTradeSymbol, setQuickTradeSymbol] = useState('')
  const [quickTradeOutcome, setQuickTradeOutcome] = useState('win')
  const [quickTradePnl, setQuickTradePnl] = useState('')
  const [quickTradeRR, setQuickTradeRR] = useState('')
  const [quickTradeDate, setQuickTradeDate] = useState(new Date().toISOString().split('T')[0])
  const [quickTradeDirection, setQuickTradeDirection] = useState('long')
  const [quickTradeRating, setQuickTradeRating] = useState('')
  const [hoverRating, setHoverRating] = useState(0)
  const [quickTradeRiskPercent, setQuickTradeRiskPercent] = useState('')
  const [quickTradeConfidence, setQuickTradeConfidence] = useState('')
  const [quickTradeTimeframe, setQuickTradeTimeframe] = useState('')
  const [quickTradeSession, setQuickTradeSession] = useState('')
  const [quickTradeNotes, setQuickTradeNotes] = useState('')
  const [submittingTrade, setSubmittingTrade] = useState(false)
  const [quickTradeExtraData, setQuickTradeExtraData] = useState({})
  const [showAddInputModal, setShowAddInputModal] = useState(false)
  const [showEditInputsModal, setShowEditInputsModal] = useState(false)
  const [deleteInputConfirm, setDeleteInputConfirm] = useState(null)
  const [newInputLabel, setNewInputLabel] = useState('')
  const [newInputOptions, setNewInputOptions] = useState('')
  const [savingInput, setSavingInput] = useState(false)
  // Chart hover state
  const [hoverData, setHoverData] = useState(null)
  // Sidebar expand state
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  // Pagination state
  const TRADES_PER_PAGE = 100
  const [tradeCounts, setTradeCounts] = useState({}) // { accountId: totalCount }
  const [loadingMore, setLoadingMore] = useState(false)
  // Mobile trade entry modal
  const [showMobileTradeModal, setShowMobileTradeModal] = useState(false)
  // Journal dropdown state
  const [journalDropdownOpen, setJournalDropdownOpen] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => { loadData() }, [])

  // Check if user has valid subscription
  // 'admin' = admin user (ssiagos@hotmail.com)
  // 'subscribing' = paying subscriber
  // 'free subscription' = free access without paying
  // 'not subscribing' = no subscription, no access
  function hasValidSubscription(profile) {
    if (!profile) return false
    const { subscription_status } = profile

    // Admin has full access
    if (subscription_status === 'admin') return true

    // Active paying subscription
    if (subscription_status === 'subscribing') return true

    // Free subscription (giveaway, promo, etc.)
    if (subscription_status === 'free subscription') return true

    return false
  }

  async function loadData() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/login'; return }
    const { data: profile } = await supabase.from('profiles').select('subscription_status, subscription_end').eq('id', user.id).single()
    if (!hasValidSubscription(profile)) { window.location.href = '/pricing'; return }
    setUser(user)
    const { data: accountsData } = await supabase.from('accounts').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
    setAccounts(accountsData || [])
    if (accountsData?.length) {
      const tradesMap = {}
      const countsMap = {}
      for (const acc of accountsData) {
        // Get count first
        const { count } = await supabase.from('trades').select('*', { count: 'exact', head: true }).eq('account_id', acc.id)
        countsMap[acc.id] = count || 0
        // Load all trades for charts (sorted ascending by date)
        const { data: tradesData } = await supabase.from('trades').select('*').eq('account_id', acc.id).order('date', { ascending: true })
        tradesMap[acc.id] = tradesData || []
      }
      setTrades(tradesMap)
      setTradeCounts(countsMap)
    }
    setLoading(false)
  }

  // Load more trades for a specific account
  async function loadMoreTrades(accountId) {
    setLoadingMore(true)
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const currentTrades = trades[accountId] || []
    const offset = currentTrades.length
    const { data: moreTrades } = await supabase.from('trades').select('*').eq('account_id', accountId).order('date', { ascending: false }).range(offset, offset + TRADES_PER_PAGE - 1)
    if (moreTrades?.length) {
      setTrades(prev => ({
        ...prev,
        [accountId]: [...currentTrades, ...(moreTrades || []).reverse()].sort((a, b) => new Date(a.date) - new Date(b.date))
      }))
    }
    setLoadingMore(false)
  }

  // Check if account has more trades to load
  function hasMoreTrades(accountId) {
    return (trades[accountId]?.length || 0) < (tradeCounts[accountId] || 0)
  }

  async function handleSignOut() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  async function handleManageSubscription() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { alert('Please log in'); return }

    try {
      const res = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Could not open subscription management')
      }
    } catch (err) {
      alert('Error opening subscription portal')
    }
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

  async function submitQuickTrade() {
    if (!quickTradeAccount) { alert('Please select a journal'); return }
    if (!quickTradeSymbol?.trim()) { alert('Please enter a symbol'); return }
    if (!quickTradePnl || isNaN(parseFloat(quickTradePnl))) { alert('Please enter a valid PnL number'); return }
    if (quickTradeRR && isNaN(parseFloat(quickTradeRR))) { alert('Please enter a valid RR number'); return }
    setSubmittingTrade(true)
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

    // Build extra_data with all fields including rating
    const extraData = {
      ...quickTradeExtraData,
      riskPercent: quickTradeRiskPercent || '',
      confidence: quickTradeConfidence || '',
      timeframe: quickTradeTimeframe || '',
      session: quickTradeSession || '',
      rating: quickTradeRating || '',
    }

    const { data, error } = await supabase.from('trades').insert({
      account_id: quickTradeAccount,
      symbol: quickTradeSymbol.trim().toUpperCase(),
      outcome: quickTradeOutcome,
      pnl: parseFloat(quickTradePnl) || 0,
      rr: quickTradeRR || null,
      date: quickTradeDate,
      direction: quickTradeDirection,
      notes: quickTradeNotes || null,
      extra_data: JSON.stringify(extraData)
    }).select().single()
    if (error) { alert('Error: ' + error.message); setSubmittingTrade(false); return }
    // Add to local state
    setTrades(prev => ({
      ...prev,
      [quickTradeAccount]: [...(prev[quickTradeAccount] || []), data].sort((a, b) => new Date(a.date) - new Date(b.date))
    }))
    // Reset form
    setQuickTradeSymbol('')
    setQuickTradePnl('')
    setQuickTradeRR('')
    setQuickTradeRating('')
    setQuickTradeRiskPercent('')
    setQuickTradeConfidence('')
    setQuickTradeTimeframe('')
    setQuickTradeSession('')
    setQuickTradeNotes('')
    setQuickTradeExtraData({})
    setSubmittingTrade(false)
  }

  // Add custom input to selected journal
  async function saveCustomInput() {
    if (!newInputLabel.trim() || !newInputOptions.trim() || !quickTradeAccount) return
    setSavingInput(true)
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const selectedAccount = accounts.find(a => a.id === quickTradeAccount)
    let existingInputs = []
    try { existingInputs = JSON.parse(selectedAccount?.custom_inputs || '[]') } catch {}
    const newInput = {
      id: newInputLabel.toLowerCase().replace(/\s+/g, '_'),
      label: newInputLabel.trim(),
      type: 'select',
      options: newInputOptions.split(',').map(o => o.trim()).filter(o => o),
      enabled: true
    }
    const updatedInputs = [...existingInputs, newInput]
    const { error } = await supabase.from('accounts').update({ custom_inputs: JSON.stringify(updatedInputs) }).eq('id', quickTradeAccount)
    if (error) { alert('Error: ' + error.message); setSavingInput(false); return }
    setAccounts(accounts.map(a => a.id === quickTradeAccount ? { ...a, custom_inputs: JSON.stringify(updatedInputs) } : a))
    setNewInputLabel('')
    setNewInputOptions('')
    setShowAddInputModal(false)
    setSavingInput(false)
  }

  // Get custom inputs for selected journal
  function getSelectedAccountCustomInputs() {
    const selectedAccount = accounts.find(a => a.id === quickTradeAccount)
    if (!selectedAccount?.custom_inputs) return []
    try {
      const inputs = JSON.parse(selectedAccount.custom_inputs)
      return inputs.filter(i => i.enabled && i.type === 'select' && !['outcome', 'direction'].includes(i.id))
    } catch { return [] }
  }

  // Remove custom input from journal
  async function removeCustomInput(inputId) {
    if (!quickTradeAccount) return
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const selectedAccount = accounts.find(a => a.id === quickTradeAccount)
    let existingInputs = []
    try { existingInputs = JSON.parse(selectedAccount?.custom_inputs || '[]') } catch {}
    const updatedInputs = existingInputs.filter(i => i.id !== inputId)
    const { error } = await supabase.from('accounts').update({ custom_inputs: JSON.stringify(updatedInputs) }).eq('id', quickTradeAccount)
    if (error) { alert('Error: ' + error.message); return }
    setAccounts(accounts.map(a => a.id === quickTradeAccount ? { ...a, custom_inputs: JSON.stringify(updatedInputs) } : a))
  }

  // Set default account when accounts load
  useEffect(() => {
    if (accounts.length > 0 && !quickTradeAccount) {
      setQuickTradeAccount(accounts[0].id)
    }
  }, [accounts])

  // Get all trades across all accounts
  function getAllTrades() {
    const all = []
    accounts.forEach(acc => {
      const accTrades = trades[acc.id] || []
      accTrades.forEach(t => all.push({ ...t, accountName: acc.name, accountId: acc.id }))
    })
    return all.sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  // Calculate cumulative stats across all accounts
  function getCumulativeStats() {
    const allTrades = getAllTrades()
    const totalTrades = allTrades.length
    const wins = allTrades.filter(t => t.outcome === 'win').length
    const losses = allTrades.filter(t => t.outcome === 'loss').length
    const totalPnl = allTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
    const winrate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0
    const avgRR = totalTrades > 0 ? (allTrades.reduce((sum, t) => sum + (parseFloat(t.rr) || 0), 0) / totalTrades).toFixed(1) : '-'
    const grossProfit = allTrades.filter(t => parseFloat(t.pnl) > 0).reduce((sum, t) => sum + parseFloat(t.pnl), 0)
    const grossLoss = Math.abs(allTrades.filter(t => parseFloat(t.pnl) < 0).reduce((sum, t) => sum + parseFloat(t.pnl), 0))
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '-'
    const totalStartingBalance = accounts.reduce((sum, acc) => sum + (parseFloat(acc.starting_balance) || 0), 0)
    const currentBalance = totalStartingBalance + totalPnl
    const avgWin = wins > 0 ? (grossProfit / wins).toFixed(0) : 0
    const avgLoss = losses > 0 ? (grossLoss / losses).toFixed(0) : 0
    return { totalTrades, wins, losses, totalPnl, winrate, avgRR, profitFactor, totalStartingBalance, currentBalance, avgWin, avgLoss, grossProfit, grossLoss }
  }

  function EquityCurve({ accountTrades, startingBalance }) {
    const [hoverPoint, setHoverPoint] = useState(null)
    const svgRef = useRef(null)

    if (!accountTrades || accountTrades.length === 0) {
      return <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '14px' }}>No trades yet</div>
    }

    const start = parseFloat(startingBalance) || 10000
    let cumulative = start
    const points = [{ balance: cumulative, date: null, pnl: 0, idx: 0 }]
    accountTrades.forEach((t, i) => {
      cumulative += parseFloat(t.pnl) || 0
      points.push({ balance: cumulative, date: t.date, pnl: parseFloat(t.pnl) || 0, symbol: t.symbol, idx: i + 1 })
    })

    const maxBal = Math.max(...points.map(p => p.balance))
    const minBal = Math.min(...points.map(p => p.balance))
    const hasNegative = minBal < 0
    const belowStart = minBal < start // Red if balance ever went below starting
    // Calculate tight Y-axis range based on actual data
    const actualMin = Math.min(minBal, start)
    const actualRange = maxBal - actualMin || 1000
    const yStep = Math.ceil(actualRange / 6 / 1000) * 1000 || 1000
    const yMax = Math.ceil(maxBal / yStep) * yStep
    // yMin just one step below actual minimum - no huge gaps
    const yMin = Math.max(0, Math.floor(actualMin / yStep) * yStep)
    const yRange = yMax - yMin || yStep
    
    // Calculate zero line position (percentage from top) - for when actual balance goes negative
    const zeroY = hasNegative ? ((yMax - 0) / yRange) * 100 : null
    // Calculate starting balance line - always show if start is within range
    const startLineY = start >= yMin && start <= yMax ? ((yMax - start) / yRange) * 100 : null

    const yLabels = []
    for (let v = yMax; v >= yMin; v -= yStep) {
      yLabels.push(v)
    }

    const datesWithTrades = points.filter(p => p.date).map((p, idx) => ({ date: p.date, pointIdx: idx + 1 }))
    const xLabels = []
    if (datesWithTrades.length > 0) {
      const numLabels = Math.min(8, datesWithTrades.length)
      for (let i = 0; i < numLabels; i++) {
        const dataIdx = Math.floor(i * (datesWithTrades.length - 1) / Math.max(1, numLabels - 1))
        const item = datesWithTrades[dataIdx]
        const date = new Date(item.date)
        // Evenly space labels from 5% to 95% so ticks center on text
        const pct = numLabels > 1 ? 5 + (i / (numLabels - 1)) * 90 : 50
        xLabels.push({ label: `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`, pct })
      }
    }

    const svgW = 100, svgH = 100
    const chartPoints = points.map((p, i) => {
      const x = points.length > 1 ? (i / (points.length - 1)) * svgW : svgW / 2
      const y = svgH - ((p.balance - yMin) / yRange) * svgH
      return { x, y, ...p }
    })

    const pathD = chartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    // Area should fill to zero line if negative values exist, otherwise to bottom
    const areaBottom = hasNegative ? svgH - ((0 - yMin) / yRange) * svgH : svgH
    const areaD = pathD + ` L ${chartPoints[chartPoints.length - 1].x} ${areaBottom} L ${chartPoints[0].x} ${areaBottom} Z`

    // Split coloring: green above start, red below - only if balance actually went below start
    const startY = svgH - ((start - yMin) / yRange) * svgH
    const greenSegments = [], redSegments = []

    // Only calculate red segments if balance actually dropped below start
    if (belowStart) {
      for (let i = 0; i < chartPoints.length - 1; i++) {
        const p1 = chartPoints[i], p2 = chartPoints[i + 1]
        const above1 = p1.balance >= start, above2 = p2.balance >= start
        if (above1 === above2) {
          (above1 ? greenSegments : redSegments).push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
        } else {
          const t = (start - p1.balance) / (p2.balance - p1.balance)
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
    } else {
      // All green if never went below start
      for (let i = 0; i < chartPoints.length - 1; i++) {
        const p1 = chartPoints[i], p2 = chartPoints[i + 1]
        greenSegments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
      }
    }

    const greenPath = greenSegments.map(s => `M ${s.x1} ${s.y1} L ${s.x2} ${s.y2}`).join(' ')
    const redPath = belowStart ? redSegments.map(s => `M ${s.x1} ${s.y1} L ${s.x2} ${s.y2}`).join(' ') : ''
    // Build area fills for each segment (closed polygons to startY line)
    const greenAreaPath = greenSegments.map(s => `M ${s.x1} ${s.y1} L ${s.x2} ${s.y2} L ${s.x2} ${startY} L ${s.x1} ${startY} Z`).join(' ')
    const redAreaPath = belowStart ? redSegments.map(s => `M ${s.x1} ${s.y1} L ${s.x2} ${s.y2} L ${s.x2} ${startY} L ${s.x1} ${startY} Z`).join(' ') : ''

    function handleMouseMove(e) {
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const mouseXPct = ((e.clientX - rect.left) / rect.width) * svgW
      let closest = chartPoints[0], minDist = Math.abs(mouseXPct - chartPoints[0].x)
      chartPoints.forEach(p => { const d = Math.abs(mouseXPct - p.x); if (d < minDist) { minDist = d; closest = p } })
      if (minDist < 10) {
        setHoverPoint({
          ...closest,
          xPct: (closest.x / svgW) * 100,
          yPct: (closest.y / svgH) * 100
        })
      } else {
        setHoverPoint(null)
      }
    }

    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex' }}>
        {/* Y-axis - matches chart area height with spacer for x-axis */}
        <div style={{ width: '46px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            {yLabels.map((v, i) => {
              const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
              return (
                <div key={i} style={{ position: 'absolute', right: 0, top: `${topPct}%`, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: '#999', lineHeight: 1, textAlign: 'right' }}>{v >= 1000000 ? `$${(v/1000000).toFixed(1)}M` : v >= 1000 ? `$${(v/1000).toFixed(0)}k` : `$${v}`}</span>
                  <div style={{ width: '4px', height: '1px', background: '#2a2a35', marginLeft: '3px' }} />
                </div>
              )
            })}
            {/* Start balance on Y-axis */}
            {startLineY !== null && !yLabels.some(v => Math.abs(v - start) < (yLabels[0] - yLabels[1]) * 0.3) && (
              <div style={{ position: 'absolute', right: 0, top: `${startLineY}%`, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: 600 }}>{start >= 1000 ? `$${(start/1000).toFixed(0)}k` : `$${start}`}</span>
                <div style={{ width: '4px', height: '1px', background: '#22c55e', marginLeft: '3px' }} />
              </div>
            )}
          </div>
          <div style={{ height: '26px' }} />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'visible' }}>
          <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #2a2a35', borderBottom: hasNegative ? 'none' : '1px solid #2a2a35', overflow: 'visible' }}>
            {/* Horizontal grid lines - exact percentage positioning */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {yLabels.map((_, i) => {
                const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                return <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${topPct}%`, borderTop: '1px solid #1a1a22' }} />
              })}
            </div>
            <svg ref={svgRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }} viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverPoint(null)}>
              <defs>
                <linearGradient id="areaGradGreen" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="areaGradRed" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Start line inside SVG - stops before label */}
              {startLineY !== null && (
                <line x1="0" y1={startY} x2={svgW * 0.94} y2={startY} stroke="#666" strokeWidth="1" strokeDasharray="4,3" vectorEffect="non-scaling-stroke" />
              )}
              {greenAreaPath && <path d={greenAreaPath} fill="url(#areaGradGreen)" />}
              {redAreaPath && <path d={redAreaPath} fill="url(#areaGradRed)" />}
              {greenPath && <path d={greenPath} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
              {redPath && <path d={redPath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
            </svg>
            {/* Start label */}
            {startLineY !== null && (
              <span style={{ position: 'absolute', right: '4px', top: `${startLineY}%`, transform: 'translateY(-50%)', fontSize: '9px', color: '#888', background: '#0d0d12', padding: '0 4px' }}>
                Start
              </span>
            )}

            {/* Hover dot on the line */}
            {hoverPoint && (
              <div style={{ position: 'absolute', left: `${hoverPoint.xPct}%`, top: `${hoverPoint.yPct}%`, transform: 'translate(-50%, -50%)', width: '12px', height: '12px', borderRadius: '50%', background: hoverPoint.balance >= start ? '#22c55e' : '#ef4444', border: '2px solid #fff', pointerEvents: 'none', zIndex: 10 }} />
            )}
            
            {/* Tooltip next to the dot */}
            {hoverPoint && (
              <div style={{ position: 'absolute', left: `${hoverPoint.xPct}%`, top: `${hoverPoint.yPct}%`, transform: `translate(${hoverPoint.xPct > 80 ? 'calc(-100% - 15px)' : '15px'}, ${hoverPoint.yPct < 20 ? '0%' : hoverPoint.yPct > 80 ? '-100%' : '-50%'})`, background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '8px 12px', fontSize: '11px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
                <div style={{ color: '#999' }}>{hoverPoint.date ? new Date(hoverPoint.date).toLocaleDateString() : 'Start'}</div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>${hoverPoint.balance.toLocaleString()}</div>
                {hoverPoint.symbol && <div style={{ color: hoverPoint.pnl >= 0 ? '#22c55e' : '#ef4444' }}>{hoverPoint.symbol}: {hoverPoint.pnl >= 0 ? '+' : ''}${hoverPoint.pnl.toFixed(0)}</div>}
              </div>
            )}
            </div>

          <div style={{ height: '26px', position: 'relative', overflow: 'visible' }}>
            {xLabels.map((l, i) => {
              const isFirst = i === 0
              const isLast = i === xLabels.length - 1
              return (
                <div key={i} style={{ position: 'absolute', left: `${l.pct}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '1px', height: '5px', background: '#2a2a35' }} />
                  <span style={{ fontSize: '10px', color: '#999', whiteSpace: 'nowrap', marginTop: '3px' }}>{l.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  function getExtraData(t) {
    // First get extra_data (from JSONB)
    let extra = {}
    if (t.extra_data) {
      if (typeof t.extra_data === 'object') extra = t.extra_data
      else try { extra = JSON.parse(t.extra_data) } catch {}
    }
    // Fallback to direct columns if not in extra_data
    if (!extra.confidence && t.confidence) extra.confidence = t.confidence
    if (!extra.rating && t.rating) extra.rating = String(t.rating)
    if (!extra.timeframe && t.timeframe) extra.timeframe = t.timeframe
    if (!extra.session && t.session) extra.session = t.session
    if (!extra.riskPercent && t.risk) extra.riskPercent = String(t.risk)
    return extra
  }
  function formatDate(dateStr) { 
    const d = new Date(dateStr)
    return `${d.getDate()}/${d.getMonth()+1}/${String(d.getFullYear()).slice(-2)}`
  }
  function getDaysAgo(dateStr) { const d = Math.floor((new Date() - new Date(dateStr)) / 86400000); return d === 0 ? 'Today' : d === 1 ? '1d ago' : `${d}d ago` }

  if (loading) {
    return <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: '40px', marginBottom: '16px', fontWeight: 700 }}><span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE</span><span style={{ color: '#22c55e' }}>+</span></div><div style={{ color: '#999' }}>Loading...</div></div></div>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      {/* Header */}
      <header style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a22', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: '12px' }}>
        <a href="/" style={{ fontSize: isMobile ? '24px' : '32px', fontWeight: 700, textDecoration: 'none' }}>
          <span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE</span><span style={{ color: '#22c55e' }}>+</span>
        </a>
        {!isMobile && <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: '32px', fontWeight: 700, letterSpacing: '-0.5px', color: '#fff' }}>JOURNAL DASHBOARD</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* View Toggle - Grid/List */}
          <div style={{ display: 'flex', background: '#0a0a0f', borderRadius: '6px', overflow: 'hidden', border: '1px solid #1a1a22' }}>
            <button onClick={() => setViewMode('cards')} style={{ padding: '8px 10px', background: viewMode === 'cards' ? '#22c55e' : 'transparent', border: 'none', color: viewMode === 'cards' ? '#fff' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
            </button>
            <button onClick={() => setViewMode('list')} style={{ padding: '8px 10px', background: viewMode === 'list' ? '#22c55e' : 'transparent', border: 'none', color: viewMode === 'list' ? '#fff' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
            </button>
          </div>
          <button onClick={() => setShowModal(true)} style={{ padding: isMobile ? '8px 12px' : '12px 24px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: isMobile ? '12px' : '14px', cursor: 'pointer' }}>{isMobile ? '+ Add' : '+ Add Journal Account'}</button>
          <a href="/settings" style={{ padding: isMobile ? '8px' : '10px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#999', textDecoration: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </a>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '12px', maxWidth: '1800px', margin: '0 auto', padding: '16px', minHeight: 'calc(100vh - 80px)' }}>
        {/* Fixed Left Sidebar - Journal a Trade + Stats */}
        {!isMobile && accounts.length > 0 && (
          <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Trade Entry Card */}
            <div style={{ background: 'linear-gradient(180deg, #0f0f14 0%, #0a0a0f 100%)', border: '1px solid #1a1a22', borderRadius: '12px', padding: '16px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid #1a1a22' }}>
                <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600, letterSpacing: '0.5px' }}>LOG TRADE</span>
                {/* Expand Toggle - pops out modal */}
                {getSelectedAccountCustomInputs().length > 2 && (
                  <button onClick={() => setSidebarExpanded(true)} style={{ padding: '5px 7px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#666', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Expand">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Journal Select - Dropdown */}
              <div style={{ marginBottom: '12px', position: 'relative' }}>
                {/* Dropdown Header */}
                <button
                  onClick={() => setJournalDropdownOpen(!journalDropdownOpen)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.4)',
                    borderRadius: journalDropdownOpen ? '8px 8px 0 0' : '8px',
                    color: '#22c55e',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 0 12px rgba(34,197,94,0.15)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                    {accounts.find(a => a.id === quickTradeAccount)?.name || 'Select Journal'}
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: journalDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {/* Dropdown Content */}
                {journalDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#0d0d12',
                    border: '1px solid rgba(34,197,94,0.3)',
                    borderTop: 'none',
                    borderRadius: '0 0 8px 8px',
                    padding: '6px',
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}>
                    {accounts.map(acc => {
                      const isSelected = quickTradeAccount === acc.id
                      const accTrades = trades[acc.id] || []
                      const totalPnl = accTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
                      return (
                        <button
                          key={acc.id}
                          onClick={() => { setQuickTradeAccount(acc.id); setJournalDropdownOpen(false) }}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: isSelected ? 'rgba(34,197,94,0.15)' : '#0a0a0f',
                            border: `1px solid ${isSelected ? 'rgba(34,197,94,0.5)' : '#1a1a22'}`,
                            borderRadius: '6px',
                            color: isSelected ? '#22c55e' : '#999',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 0 10px rgba(34,197,94,0.2), inset 0 0 15px rgba(34,197,94,0.05)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: isSelected ? '#22c55e' : '#444',
                                boxShadow: isSelected ? '0 0 4px #22c55e' : 'none'
                              }} />
                              {acc.name}
                            </div>
                            <span style={{ fontSize: '11px', color: totalPnl >= 0 ? '#22c55e' : '#ef4444' }}>
                              {totalPnl >= 0 ? '+' : ''}${Math.round(totalPnl).toLocaleString()}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Core Fields Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #1a1a22' }}>
                {/* Symbol */}
                <div>
                  <label style={{ display: 'block', fontSize: '9px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Symbol</label>
                  <input type="text" value={quickTradeSymbol} onChange={e => setQuickTradeSymbol(e.target.value)} placeholder="XAUUSD" style={{ width: '100%', padding: '8px 10px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} />
                </div>
                {/* PnL */}
                <div>
                  <label style={{ display: 'block', fontSize: '9px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>P&L ($)</label>
                  <input type="number" value={quickTradePnl} onChange={e => setQuickTradePnl(e.target.value)} placeholder="0" style={{ width: '100%', padding: '8px 10px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Direction + Outcome Row */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #1a1a22' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '9px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Direction</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setQuickTradeDirection('long')} style={{ flex: 1, padding: '7px', background: quickTradeDirection === 'long' ? 'rgba(34,197,94,0.2)' : '#0a0a0f', border: `2px solid ${quickTradeDirection === 'long' ? '#22c55e' : '#1a1a22'}`, borderRadius: '6px', color: quickTradeDirection === 'long' ? '#22c55e' : '#666', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>LONG</button>
                    <button onClick={() => setQuickTradeDirection('short')} style={{ flex: 1, padding: '7px', background: quickTradeDirection === 'short' ? 'rgba(239,68,68,0.2)' : '#0a0a0f', border: `2px solid ${quickTradeDirection === 'short' ? '#ef4444' : '#1a1a22'}`, borderRadius: '6px', color: quickTradeDirection === 'short' ? '#ef4444' : '#666', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>SHORT</button>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '9px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Outcome</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setQuickTradeOutcome('win')} style={{ flex: 1, padding: '7px', background: quickTradeOutcome === 'win' ? 'rgba(34,197,94,0.2)' : '#0a0a0f', border: `2px solid ${quickTradeOutcome === 'win' ? '#22c55e' : '#1a1a22'}`, borderRadius: '6px', color: quickTradeOutcome === 'win' ? '#22c55e' : '#666', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>W</button>
                    <button onClick={() => setQuickTradeOutcome('loss')} style={{ flex: 1, padding: '7px', background: quickTradeOutcome === 'loss' ? 'rgba(239,68,68,0.2)' : '#0a0a0f', border: `2px solid ${quickTradeOutcome === 'loss' ? '#ef4444' : '#1a1a22'}`, borderRadius: '6px', color: quickTradeOutcome === 'loss' ? '#ef4444' : '#666', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>L</button>
                    <button onClick={() => setQuickTradeOutcome('be')} style={{ flex: 1, padding: '7px', background: quickTradeOutcome === 'be' ? 'rgba(255,255,255,0.1)' : '#0a0a0f', border: `2px solid ${quickTradeOutcome === 'be' ? '#888' : '#1a1a22'}`, borderRadius: '6px', color: quickTradeOutcome === 'be' ? '#888' : '#666', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>BE</button>
                  </div>
                </div>
              </div>

              {/* Secondary Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '9px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>RR</label>
                  <input type="text" value={quickTradeRR} onChange={e => setQuickTradeRR(e.target.value)} placeholder="2.5" style={{ width: '100%', padding: '8px 10px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '9px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>% Risk</label>
                  <input type="number" value={quickTradeRiskPercent} onChange={e => setQuickTradeRiskPercent(e.target.value)} placeholder="1" style={{ width: '100%', padding: '8px 10px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Date */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '9px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Date</label>
                <input type="date" value={quickTradeDate} onChange={e => setQuickTradeDate(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>

              {/* Optional Fields - Collapsible when not expanded */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '9px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Confidence</label>
                  <select value={quickTradeConfidence} onChange={e => setQuickTradeConfidence(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px' }}>
                    <option value="">-</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '9px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Rating</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'inline-flex', gap: '2px', padding: '6px 10px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px' }} onMouseLeave={() => setHoverRating(0)}>
                      {[1, 2, 3, 4, 5].map(star => {
                        const displayRating = hoverRating || parseFloat(quickTradeRating) || 0
                        const isFullStar = displayRating >= star
                        const isHalfStar = displayRating >= star - 0.5 && displayRating < star
                        return (
                          <div key={star} style={{ position: 'relative', width: '24px', height: '24px', cursor: 'pointer' }}
                            onMouseMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const x = e.clientX - rect.left; setHoverRating(x < rect.width / 2 ? star - 0.5 : star) }}
                            onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const x = e.clientX - rect.left; const newRating = x < rect.width / 2 ? star - 0.5 : star; setQuickTradeRating(parseFloat(quickTradeRating) === newRating ? '' : String(newRating)) }}>
                            <span style={{ position: 'absolute', color: '#2a2a35', fontSize: '24px', lineHeight: 1 }}>★</span>
                            {isHalfStar && <span style={{ position: 'absolute', color: '#22c55e', fontSize: '24px', lineHeight: 1, width: '12px', overflow: 'hidden' }}>★</span>}
                            {isFullStar && <span style={{ position: 'absolute', color: '#22c55e', fontSize: '24px', lineHeight: 1 }}>★</span>}
                          </div>
                        )
                      })}
                    </div>
                    <span style={{ background: '#1a1a22', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: '#fff', whiteSpace: 'nowrap', minWidth: '35px', textAlign: 'center' }}>
                      {hoverRating || parseFloat(quickTradeRating) || 0} / 5
                    </span>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '9px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Timeframe</label>
                  <select value={quickTradeTimeframe} onChange={e => setQuickTradeTimeframe(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px' }}>
                    <option value="">-</option>
                    <option value="1m">1m</option>
                    <option value="5m">5m</option>
                    <option value="15m">15m</option>
                    <option value="1H">1H</option>
                    <option value="4H">4H</option>
                    <option value="Daily">Daily</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '9px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Session</label>
                  <select value={quickTradeSession} onChange={e => setQuickTradeSession(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px' }}>
                    <option value="">-</option>
                    <option value="London">London</option>
                    <option value="New York">NY</option>
                    <option value="Asian">Asian</option>
                  </select>
                </div>
              </div>

              {/* Custom Inputs */}
              {getSelectedAccountCustomInputs().length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '12px' }}>
                  {getSelectedAccountCustomInputs().map(input => (
                    <div key={input.id}>
                      <label style={{ display: 'block', fontSize: '9px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>{(input.label || input.id).slice(0, 10)}</label>
                      <select value={quickTradeExtraData[input.id] || ''} onChange={e => setQuickTradeExtraData(prev => ({ ...prev, [input.id]: e.target.value }))} style={{ width: '100%', padding: '8px 10px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px' }}>
                        <option value="">-</option>
                        {(input.options || []).map(opt => <option key={getOptVal(opt)} value={getOptVal(opt)}>{getOptVal(opt)}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '9px', color: '#666', marginBottom: '4px', textTransform: 'uppercase' }}>Notes</label>
                <input type="text" value={quickTradeNotes} onChange={e => setQuickTradeNotes(e.target.value)} placeholder="Quick notes..." style={{ width: '100%', padding: '8px 10px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '12px', boxSizing: 'border-box' }} />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={submitQuickTrade} disabled={submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl} style={{ flex: 1, padding: '12px', background: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl) ? '#1a1a22' : 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)', border: 'none', borderRadius: '8px', color: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl) ? '#666' : '#fff', fontWeight: 600, fontSize: '13px', cursor: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl) ? 'none' : '0 0 20px rgba(147,51,234,0.5), 0 0 40px rgba(147,51,234,0.3)' }}>
                  {submittingTrade ? 'Adding...' : 'Log Trade'}
                </button>
                <button onClick={() => setShowEditInputsModal(true)} style={{ padding: '12px 14px', background: '#0a0a0f', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontWeight: 500, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  Edit
                </button>
              </div>
            </div>

            {/* Stats Card - Below Trade Entry */}
            <div style={{ background: '#0f0f14', border: '1px solid #1a1a22', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600, letterSpacing: '0.5px' }}>ALL STATS</span>
              </div>

              {(() => {
                const stats = getCumulativeStats()
                const allTrades = getAllTrades()

                // Build cumulative PnL data for mini chart
                let cumPnl = 0
                const sortedTrades = allTrades.slice().sort((a, b) => new Date(a.date) - new Date(b.date))
                const pnlPoints = sortedTrades.map(t => {
                  cumPnl += parseFloat(t.pnl) || 0
                  return { value: cumPnl, date: t.date, symbol: t.symbol, pnl: parseFloat(t.pnl) || 0 }
                })
                const maxPnl = pnlPoints.length > 0 ? Math.max(...pnlPoints.map(p => p.value), 0) : 0
                const minPnl = pnlPoints.length > 0 ? Math.min(...pnlPoints.map(p => p.value), 0) : 0
                const pnlRange = maxPnl - minPnl || 1
                const chartHeight = 60

                // Additional stats calculations
                const today = new Date().toISOString().split('T')[0]
                const todaysPnl = allTrades.filter(t => t.date === today).reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
                const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                const recentTrades = allTrades.filter(t => t.date >= last7Days).length
                const uniqueDays = new Set(allTrades.map(t => t.date)).size
                const dailyPnls = {}
                allTrades.forEach(t => { dailyPnls[t.date] = (dailyPnls[t.date] || 0) + (parseFloat(t.pnl) || 0) })
                const bestDay = Object.values(dailyPnls).length > 0 ? Math.max(...Object.values(dailyPnls)) : 0
                const worstDay = Object.values(dailyPnls).length > 0 ? Math.min(...Object.values(dailyPnls)) : 0

                return (
                  <div>
                    {/* Mini PnL Chart - Full Width with Tooltip */}
                    {pnlPoints.length > 1 && (() => {
                      const svgW = 200, svgH = 60
                      const chartPts = pnlPoints.map((p, i) => ({
                        x: pnlPoints.length > 1 ? (i / (pnlPoints.length - 1)) * svgW : svgW / 2,
                        y: svgH - ((p.value - minPnl) / pnlRange) * svgH,
                        ...p
                      }))
                      const pathD = chartPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
                      const areaD = `${pathD} L${svgW},${svgH} L0,${svgH} Z`
                      return (
                        <div style={{ background: '#0a0a0f', borderRadius: '6px', padding: '8px', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase' }}>Cumulative P&L</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: cumPnl >= 0 ? '#22c55e' : '#ef4444' }}>{cumPnl >= 0 ? '+' : ''}${Math.round(cumPnl).toLocaleString()}</span>
                          </div>
                          <div style={{ position: 'relative', height: `${chartHeight}px`, borderRadius: '4px', overflow: 'visible' }}>
                            <svg
                              width="100%"
                              height="100%"
                              viewBox={`0 0 ${svgW} ${svgH}`}
                              preserveAspectRatio="none"
                              style={{ display: 'block' }}
                              onMouseMove={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect()
                                const mouseX = ((e.clientX - rect.left) / rect.width) * svgW
                                let closest = chartPts[0], minDist = Math.abs(mouseX - chartPts[0].x)
                                chartPts.forEach(p => { const d = Math.abs(mouseX - p.x); if (d < minDist) { minDist = d; closest = p } })
                                if (minDist < 20) {
                                  setHoverData({ value: closest.value, date: closest.date, pnl: closest.pnl, symbol: closest.symbol, xPct: (closest.x / svgW) * 100, yPct: (closest.y / svgH) * 100 })
                                } else {
                                  setHoverData(null)
                                }
                              }}
                              onMouseLeave={() => setHoverData(null)}
                            >
                              {/* Zero line if needed */}
                              {minPnl < 0 && maxPnl > 0 && (
                                <line x1="0" y1={svgH - ((0 - minPnl) / pnlRange) * svgH} x2={svgW} y2={svgH - ((0 - minPnl) / pnlRange) * svgH} stroke="#333" strokeWidth="1" strokeDasharray="2,2" vectorEffect="non-scaling-stroke" />
                              )}
                              {/* Area fill */}
                              <path fill={cumPnl >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'} d={areaD} />
                              {/* PnL line */}
                              <path fill="none" stroke={cumPnl >= 0 ? '#22c55e' : '#ef4444'} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" d={pathD} />
                            </svg>
                            {/* Hover dot on the line */}
                            {hoverData && (
                              <div style={{ position: 'absolute', left: `${hoverData.xPct}%`, top: `${hoverData.yPct}%`, transform: 'translate(-50%, -50%)', width: '10px', height: '10px', borderRadius: '50%', background: hoverData.value >= 0 ? '#22c55e' : '#ef4444', border: '2px solid #fff', pointerEvents: 'none', zIndex: 10 }} />
                            )}
                            {/* Tooltip next to the dot */}
                            {hoverData && (
                              <div style={{ position: 'absolute', left: `${hoverData.xPct}%`, top: `${hoverData.yPct}%`, transform: `translate(${hoverData.xPct > 70 ? 'calc(-100% - 12px)' : '12px'}, -50%)`, background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
                                <div style={{ color: '#999' }}>{hoverData.date ? new Date(hoverData.date).toLocaleDateString() : 'Start'}</div>
                                <div style={{ fontWeight: 600, fontSize: '12px', color: hoverData.value >= 0 ? '#22c55e' : '#ef4444' }}>{hoverData.value >= 0 ? '+' : ''}${Math.round(hoverData.value).toLocaleString()}</div>
                                {hoverData.symbol && <div style={{ color: '#666', fontSize: '9px' }}>{hoverData.symbol}: {hoverData.pnl >= 0 ? '+' : ''}${Math.round(hoverData.pnl)}</div>}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}

                    {/* Stats Grid - Clean 2 columns, Logically Organized */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                      {[
                        { label: 'BALANCE', value: `$${stats.currentBalance.toLocaleString()}`, color: stats.currentBalance >= stats.totalStartingBalance ? '#22c55e' : '#ef4444' },
                        { label: 'TOTAL P&L', value: `${stats.totalPnl >= 0 ? '+' : ''}$${Math.abs(stats.totalPnl).toLocaleString()}`, color: stats.totalPnl >= 0 ? '#22c55e' : '#ef4444' },
                        { label: 'WINRATE', value: `${stats.winrate}%`, color: stats.winrate >= 50 ? '#22c55e' : '#ef4444' },
                        { label: 'PROFIT FACTOR', value: stats.profitFactor, color: stats.profitFactor === '-' ? '#666' : stats.profitFactor === '∞' ? '#22c55e' : parseFloat(stats.profitFactor) >= 1 ? '#22c55e' : '#ef4444' },
                        { label: 'AVG WIN', value: `+$${stats.avgWin}`, color: '#22c55e' },
                        { label: 'AVG LOSS', value: `-$${stats.avgLoss}`, color: '#ef4444' },
                        { label: 'GROSS PROFIT', value: `+$${stats.grossProfit.toLocaleString()}`, color: '#22c55e' },
                        { label: 'GROSS LOSS', value: `-$${stats.grossLoss.toLocaleString()}`, color: '#ef4444' },
                        { label: 'BEST DAY', value: `+$${bestDay.toLocaleString()}`, color: '#22c55e' },
                        { label: 'WORST DAY', value: `${worstDay >= 0 ? '+' : '-'}$${Math.abs(worstDay).toLocaleString()}`, color: worstDay >= 0 ? '#22c55e' : '#ef4444' },
                        { label: 'TRADES', value: stats.totalTrades, color: '#fff' },
                        { label: 'W/L', value: `${stats.wins}/${stats.losses}`, color: '#fff' },
                        { label: 'JOURNALS', value: accounts.length, color: '#fff' },
                        { label: 'DAYS TRADED', value: uniqueDays, color: '#fff' },
                        { label: 'LAST 7 DAYS', value: `${recentTrades} trades`, color: '#fff' },
                        { label: 'TODAY', value: `${todaysPnl >= 0 ? '+' : '-'}$${Math.abs(todaysPnl).toLocaleString()}`, color: todaysPnl >= 0 ? '#22c55e' : todaysPnl < 0 ? '#ef4444' : '#666' },
                      ].map((stat, i) => (
                        <div key={i} style={{ padding: '6px 8px', background: '#0a0a0f', borderRadius: '4px' }}>
                          <div style={{ fontSize: '8px', color: '#555', marginBottom: '1px', textTransform: 'uppercase' }}>{stat.label}</div>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* View Full Stats Button */}
                    {accounts.length > 0 && (
                      <a href={`/account/${accounts[0]?.id}?tab=statistics&cumulative=true`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '10px', padding: '10px', background: '#22c55e', borderRadius: '6px', color: '#fff', fontSize: '11px', fontWeight: 600, textDecoration: 'none' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                        View Full Stats
                      </a>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
        {accounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: isMobile ? '40px 20px' : '80px 40px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '10px' }}>
            <h2 style={{ fontSize: isMobile ? '20px' : '24px', marginBottom: '12px' }}>Welcome to LSDTRADE+</h2>
            <p style={{ color: '#999', marginBottom: '28px', fontSize: isMobile ? '14px' : '16px' }}>Create your first trading journal to get started</p>
            <button onClick={() => setShowModal(true)} style={{ padding: isMobile ? '12px 20px' : '14px 28px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: isMobile ? '14px' : '16px', cursor: 'pointer' }}>+ Create Your First Journal</button>
          </div>
        ) : (
          <>
          {/* List View */}
          {viewMode === 'list' ? (
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1a1a22' }}>
                    {['Journal', 'Balance', 'P&L', 'Winrate', 'Trades', 'Profit Factor', 'Avg RR', 'Actions'].map((h, i) => (
                      <th key={i} style={{ padding: '14px 16px', textAlign: i === 0 ? 'left' : 'center', color: '#999', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(account => {
                    const accTrades = trades[account.id] || []
                    const wins = accTrades.filter(t => t.outcome === 'win').length
                    const losses = accTrades.filter(t => t.outcome === 'loss').length
                    const totalPnl = accTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
                    const winrate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0
                    const avgRR = accTrades.length > 0 ? (accTrades.reduce((sum, t) => sum + (parseFloat(t.rr) || 0), 0) / accTrades.length).toFixed(1) : '-'
                    const currentBalance = (parseFloat(account.starting_balance) || 0) + totalPnl
                    const grossProfit = accTrades.filter(t => parseFloat(t.pnl) > 0).reduce((sum, t) => sum + parseFloat(t.pnl), 0)
                    const grossLoss = Math.abs(accTrades.filter(t => parseFloat(t.pnl) < 0).reduce((sum, t) => sum + parseFloat(t.pnl), 0))
                    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(1) : grossProfit > 0 ? '∞' : '-'
                    return (
                      <tr key={account.id} style={{ borderBottom: '1px solid #1a1a22' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>{account.name}</span>
                            <button onClick={() => { setEditName(account.name); setShowEditModal(account.id) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            </button>
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, fontSize: '14px', color: currentBalance >= (parseFloat(account.starting_balance) || 0) ? '#22c55e' : '#ef4444' }}>${currentBalance.toLocaleString()}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, fontSize: '14px', color: totalPnl >= 0 ? '#22c55e' : '#ef4444' }}>{totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString()}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '14px', color: winrate >= 50 ? '#22c55e' : '#ef4444' }}>{winrate}%</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '14px', color: '#999' }}>{accTrades.length}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '14px', color: profitFactor === '-' ? '#666' : profitFactor === '∞' ? '#22c55e' : parseFloat(profitFactor) >= 1 ? '#22c55e' : '#ef4444' }}>{profitFactor}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontSize: '14px', color: '#999' }}>{avgRR}R</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <a href={`/account/${account.id}`} style={{ padding: '8px 14px', background: '#22c55e', borderRadius: '4px', color: '#fff', fontWeight: 600, fontSize: '12px', textDecoration: 'none' }}>Enter</a>
                            <a href={`/account/${account.id}?tab=statistics`} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #22c55e', borderRadius: '4px', color: '#22c55e', fontWeight: 600, fontSize: '12px', textDecoration: 'none' }}>Stats</a>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {accounts.map(account => {
              const accTrades = trades[account.id] || []
              const wins = accTrades.filter(t => t.outcome === 'win').length
              const losses = accTrades.filter(t => t.outcome === 'loss').length
              const totalPnl = accTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
              const winrate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0
              const avgRR = accTrades.length > 0 ? (accTrades.reduce((sum, t) => sum + (parseFloat(t.rr) || 0), 0) / accTrades.length).toFixed(1) : '-'
              const currentBalance = (parseFloat(account.starting_balance) || 0) + totalPnl
              const grossProfit = accTrades.filter(t => parseFloat(t.pnl) > 0).reduce((sum, t) => sum + parseFloat(t.pnl), 0)
              const grossLoss = Math.abs(accTrades.filter(t => parseFloat(t.pnl) < 0).reduce((sum, t) => sum + parseFloat(t.pnl), 0))
              const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(1) : grossProfit > 0 ? '∞' : '-'
              const tradeDays = {}
              accTrades.forEach(t => { if (!tradeDays[t.date]) tradeDays[t.date] = 0; tradeDays[t.date] += parseFloat(t.pnl) || 0 })
              const consistency = Object.keys(tradeDays).length > 0 ? Math.round((Object.values(tradeDays).filter(v => v > 0).length / Object.keys(tradeDays).length) * 100) : 0
              const recentTrades = [...accTrades].reverse()

              return (
                <div key={account.id} style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '10px', overflow: 'hidden' }}>
                  {/* Account Name */}
                  <div style={{ padding: isMobile ? '14px 16px' : '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '14px' }}>
                      <span style={{ fontSize: isMobile ? '20px' : '28px', fontWeight: 700, color: '#fff' }}>{account.name}</span>
                      <button onClick={() => { setEditName(account.name); setShowEditModal(account.id) }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <svg width={isMobile ? '14' : '18'} height={isMobile ? '14' : '18'} viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Chart + Stats Row - aligned proportionally */}
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', padding: isMobile ? '0 16px 16px' : '0 24px 16px', gap: '12px', alignItems: 'stretch' }}>
                    {/* Chart - stretches to match stats height */}
                    <div style={{ flex: 1, minHeight: isMobile ? '250px' : '300px', overflow: 'visible', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <EquityCurve accountTrades={accTrades} startingBalance={account.starting_balance} />
                      </div>
                    </div>

                    {/* Stats - determines the height */}
                    <div style={{ width: isMobile ? '100%' : '200px', display: 'flex', flexDirection: isMobile ? 'row' : 'column', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '8px 10px' : '10px 14px', background: '#0a0a0e', borderRadius: '6px', border: '1px solid #1a1a22', flex: isMobile ? '1 1 100%' : '1' }}>
                        <span style={{ fontSize: isMobile ? '11px' : '12px', color: '#999' }}>Account Balance</span>
                        <span style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: 700, color: currentBalance >= (parseFloat(account.starting_balance) || 0) ? '#22c55e' : '#ef4444' }}>${currentBalance.toLocaleString()}</span>
                      </div>
                      {[
                        { label: 'Total PnL', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString()}`, color: totalPnl >= 0 ? '#22c55e' : '#ef4444' },
                        { label: 'Winrate', value: `${winrate}%`, color: '#fff' },
                        { label: 'Avg RR', value: `${avgRR}R`, color: '#fff' },
                        { label: 'Profit Factor', value: profitFactor, color: '#fff' },
                        { label: 'Trades', value: accTrades.length, color: '#fff' },
                        { label: 'Consistency', value: `${consistency}%`, color: '#fff' },
                      ].map((stat, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: isMobile ? '8px 10px' : '10px 14px', background: '#0a0a0e', borderRadius: '6px', border: '1px solid #1a1a22', flex: isMobile ? '1 1 48%' : '1' }}>
                          <span style={{ fontSize: isMobile ? '10px' : '12px', color: '#999' }}>{stat.label}</span>
                          <span style={{ fontSize: isMobile ? '13px' : '16px', fontWeight: 600, color: stat.color }}>{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Trades */}
                  <div style={{ padding: isMobile ? '0 16px 16px' : '0 24px 16px' }}>
                    <div style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', marginLeft: isMobile ? '0' : '42px' }}>Recent Trades</div>
                    {recentTrades.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '14px', border: '1px solid #1a1a22', borderRadius: '8px' }}>No trades yet</div>
                    ) : (
                      <div style={{ maxHeight: '200px', overflowY: 'auto', overflowX: 'auto', border: '1px solid #1a1a22', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? '600px' : 'auto' }}>
                          <thead style={{ position: 'sticky', top: 0, background: '#0d0d12' }}>
                            <tr style={{ borderBottom: '1px solid #1a1a22' }}>
                              {['Symbol', 'W/L', 'PnL', 'RR', '%', 'Dir', 'Confidence', 'Session', 'TF', 'Rating', 'Placed'].map((h, i) => (
                                <th key={i} style={{ padding: '10px', textAlign: 'center', color: '#999', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid #1a1a22' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {recentTrades.map((trade, idx) => {
                              const extra = getExtraData(trade)
                              return (
                                <tr key={trade.id} style={{ borderBottom: '1px solid #1a1a22' }}>
                                  <td style={{ padding: '12px', fontWeight: 600, fontSize: '14px', textAlign: 'center', color: '#fff' }}>{trade.symbol}</td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <span style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, background: trade.outcome === 'win' ? 'rgba(34,197,94,0.15)' : trade.outcome === 'loss' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)', color: trade.outcome === 'win' ? '#22c55e' : trade.outcome === 'loss' ? '#ef4444' : '#888' }}>
                                      {trade.outcome === 'win' ? 'WIN' : trade.outcome === 'loss' ? 'LOSS' : 'BE'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600, fontSize: '14px', color: parseFloat(trade.pnl) >= 0 ? '#22c55e' : '#ef4444' }}>{parseFloat(trade.pnl) >= 0 ? '+' : ''}${parseFloat(trade.pnl || 0).toFixed(0)}</td>
                                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600, fontSize: '14px', color: '#fff' }}>{trade.rr || '-'}</td>
                                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600, fontSize: '14px', color: '#fff' }}>{extra.riskPercent || '1'}%</td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    {trade.direction ? (
                                      (() => { const s = getOptionStyles('direction', trade.direction); return <span style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, background: s.bgColor || 'transparent', color: s.textColor }}>{trade.direction?.toUpperCase()}</span> })()
                                    ) : <span style={{ fontWeight: 600, fontSize: '14px', color: '#444' }}>-</span>}
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    {extra.confidence ? (
                                      (() => { const s = getOptionStyles('confidence', extra.confidence); return <span style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, background: s.bgColor || 'transparent', color: s.textColor }}>{extra.confidence}</span> })()
                                    ) : <span style={{ fontWeight: 600, fontSize: '14px', color: '#444' }}>-</span>}
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    {extra.session ? (
                                      (() => { const s = getOptionStyles('session', extra.session); return <span style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, background: s.bgColor || 'transparent', color: s.textColor }}>{extra.session}</span> })()
                                    ) : <span style={{ fontWeight: 600, fontSize: '14px', color: '#444' }}>-</span>}
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center' }}>
                                    {extra.timeframe ? (
                                      (() => { const s = getOptionStyles('timeframe', extra.timeframe); return <span style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, background: s.bgColor || 'transparent', color: s.textColor }}>{extra.timeframe}</span> })()
                                    ) : <span style={{ fontWeight: 600, fontSize: '14px', color: '#444' }}>-</span>}
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center', minWidth: '80px' }}>
                                    <div style={{ display: 'inline-flex', justifyContent: 'center', gap: '1px' }}>
                                      {[1,2,3,4,5].map(star => {
                                        const rating = parseFloat(extra.rating || 0)
                                        const isFullStar = rating >= star
                                        const isHalfStar = rating >= star - 0.5 && rating < star
                                        return (
                                          <span key={star} style={{ color: isFullStar ? '#22c55e' : isHalfStar ? '#22c55e' : '#2a2a35', fontSize: '12px' }}>★</span>
                                        )
                                      })}
                                    </div>
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600, fontSize: '14px', color: '#999' }}>{getDaysAgo(trade.date)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {/* Load More Button */}
                    {hasMoreTrades(account.id) && (
                      <button
                        onClick={() => loadMoreTrades(account.id)}
                        disabled={loadingMore}
                        style={{
                          width: '100%',
                          padding: '10px',
                          marginTop: '8px',
                          background: 'transparent',
                          border: '1px solid #2a2a35',
                          borderRadius: '6px',
                          color: '#999',
                          fontSize: '13px',
                          cursor: loadingMore ? 'not-allowed' : 'pointer',
                          opacity: loadingMore ? 0.6 : 1
                        }}
                      >
                        {loadingMore ? 'Loading...' : `Load More Trades (${accTrades.length} of ${tradeCounts[account.id] || 0})`}
                      </button>
                    )}
                  </div>

                  {/* Buttons */}
                  <div style={{ padding: '12px 24px 20px', display: 'flex', gap: '12px' }}>
                    <a href={`/account/${account.id}`} style={{ flex: 2, padding: '14px', background: '#22c55e', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '15px', textAlign: 'center', textDecoration: 'none' }}>ENTER JOURNAL</a>
                    <a href={`/account/${account.id}?tab=statistics`} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #22c55e', borderRadius: '6px', color: '#22c55e', fontWeight: 600, fontSize: '15px', textAlign: 'center', textDecoration: 'none' }}>SEE STATISTICS</a>
                  </div>
                </div>
              )
            })}
          </div>
          )}
          </>
        )}
        </div>

        {/* Modals */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowModal(false)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '10px', padding: '28px', width: '380px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Create New Journal</h2>
              <div style={{ marginBottom: '14px' }}><label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '6px', textTransform: 'uppercase' }}>Journal Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. FTMO 10k" autoFocus style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} /></div>
              <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '6px', textTransform: 'uppercase' }}>Starting Balance ($)</label><input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="e.g. 10000" style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} /></div>
              <div style={{ display: 'flex', gap: '12px' }}><button onClick={createJournal} disabled={creating || !name.trim() || !balance} style={{ flex: 1, padding: '12px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: (creating || !name.trim() || !balance) ? 0.5 : 1 }}>{creating ? 'Creating...' : 'Create'}</button><button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '6px', color: '#999', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancel</button></div>
            </div>
          </div>
        )}

        {showEditModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowEditModal(null)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '10px', padding: '28px', width: '380px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Edit Journal</h2>
              <div style={{ marginBottom: '20px' }}><label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '6px', textTransform: 'uppercase' }}>Journal Name</label><input type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} /></div>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}><button onClick={() => renameAccount(showEditModal)} disabled={!editName.trim()} style={{ flex: 1, padding: '12px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: !editName.trim() ? 0.5 : 1 }}>Save</button><button onClick={() => setShowEditModal(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '6px', color: '#999', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancel</button></div>
              <button onClick={() => { setShowDeleteModal(showEditModal); setShowEditModal(null) }} style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px solid #ef4444', borderRadius: '6px', color: '#ef4444', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Delete Journal</button>
            </div>
          </div>
        )}

        {showDeleteModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => { setShowDeleteModal(null); setDeleteConfirm('') }}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#ef4444' }}>Delete Journal?</h3>
              <p style={{ color: '#888', fontSize: '14px', marginBottom: '16px' }}>This action cannot be undone. All trades will be permanently deleted.</p>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Type "delete" to confirm</label>
                <input type="text" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="delete" style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => { setShowDeleteModal(null); setDeleteConfirm('') }} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '8px', color: '#888', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Cancel</button>
                <button onClick={() => deleteAccount(showDeleteModal)} disabled={deleteConfirm.toLowerCase() !== 'delete'} style={{ flex: 1, padding: '12px', background: deleteConfirm.toLowerCase() === 'delete' ? '#ef4444' : '#333', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: deleteConfirm.toLowerCase() === 'delete' ? 'pointer' : 'not-allowed' }}>Delete Forever</button>
              </div>
            </div>
          </div>
        )}

        {showAddInputModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => { setShowAddInputModal(false); setNewInputLabel(''); setNewInputOptions('') }}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '10px', padding: '28px', width: '380px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#22c55e' }}>Add Custom Input</h2>
              <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>Add a new dropdown field to your journal</p>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#777', marginBottom: '6px', textTransform: 'uppercase' }}>Input Label</label>
                <input type="text" value={newInputLabel} onChange={e => setNewInputLabel(e.target.value)} placeholder="e.g. Setup Type" autoFocus style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#777', marginBottom: '6px', textTransform: 'uppercase' }}>Options (comma separated)</label>
                <input type="text" value={newInputOptions} onChange={e => setNewInputOptions(e.target.value)} placeholder="e.g. Breakout, Pullback, Reversal" style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={saveCustomInput} disabled={savingInput || !newInputLabel.trim() || !newInputOptions.trim()} style={{ flex: 1, padding: '12px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: (savingInput || !newInputLabel.trim() || !newInputOptions.trim()) ? 0.5 : 1 }}>{savingInput ? 'Saving...' : 'Add Input'}</button>
                <button onClick={() => { setShowAddInputModal(false); setNewInputLabel(''); setNewInputOptions('') }} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '6px', color: '#888', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Inputs Modal */}
        {showEditInputsModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowEditInputsModal(false)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '24px', width: '420px', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>Edit Custom Inputs</h2>
                <button onClick={() => setShowEditInputsModal(false)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: '4px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Current Custom Inputs */}
              {getSelectedAccountCustomInputs().length > 0 ? (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '12px' }}>Current Inputs</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {getSelectedAccountCustomInputs().map(input => (
                      <div key={input.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#0a0a0f', borderRadius: '8px', border: '1px solid #1a1a22' }}>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: '#fff', marginBottom: '2px' }}>{input.label || input.id}</div>
                          <div style={{ fontSize: '11px', color: '#666' }}>{(input.options || []).join(', ')}</div>
                        </div>
                        <button onClick={() => setDeleteInputConfirm({ id: input.id, label: input.label || input.id })} style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#ef4444', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '20px', background: '#0a0a0f', borderRadius: '8px', border: '1px dashed #1a1a22' }}>
                  No custom inputs yet
                </div>
              )}

              {/* Add New Input Section */}
              <div style={{ borderTop: '1px solid #1a1a22', paddingTop: '20px' }}>
                <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '12px' }}>Add New Input</div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#777', marginBottom: '6px' }}>Label</label>
                  <input type="text" value={newInputLabel} onChange={e => setNewInputLabel(e.target.value)} placeholder="e.g. Setup Type" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#777', marginBottom: '6px' }}>Options (comma separated)</label>
                  <input type="text" value={newInputOptions} onChange={e => setNewInputOptions(e.target.value)} placeholder="e.g. Breakout, Pullback, Reversal" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <button onClick={() => { saveCustomInput(); }} disabled={savingInput || !newInputLabel.trim() || !newInputOptions.trim()} style={{ width: '100%', padding: '12px', background: (savingInput || !newInputLabel.trim() || !newInputOptions.trim()) ? '#1a1a22' : '#22c55e', border: 'none', borderRadius: '8px', color: (savingInput || !newInputLabel.trim() || !newInputOptions.trim()) ? '#666' : '#fff', fontWeight: 600, fontSize: '13px', cursor: (savingInput || !newInputLabel.trim() || !newInputOptions.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  {savingInput ? 'Adding...' : 'Add Input'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Input Confirmation Modal */}
        {deleteInputConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 101 }} onClick={() => setDeleteInputConfirm(null)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#ef4444' }}>Remove "{deleteInputConfirm.label}"?</h3>
              <p style={{ color: '#888', fontSize: '14px', marginBottom: '8px' }}>This input will be removed from your journal.</p>
              <p style={{ color: '#666', fontSize: '13px', marginBottom: '20px', padding: '10px 12px', background: '#0a0a0f', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>Your existing trade data for this field will be preserved.</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setDeleteInputConfirm(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '8px', color: '#888', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Cancel</button>
                <button
                  onClick={() => { removeCustomInput(deleteInputConfirm.id); setDeleteInputConfirm(null) }}
                  style={{ flex: 1, padding: '12px', background: '#ef4444', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Trade Entry Modal */}
        {showMobileTradeModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', zIndex: 100 }}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1a22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#fff', margin: 0 }}>Log Trade</h2>
              <button onClick={() => setShowMobileTradeModal(false)} style={{ background: 'transparent', border: 'none', color: '#999', padding: '8px', cursor: 'pointer' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Scrollable Form */}
            <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
              {/* Journal Select - Dropdown */}
              <div style={{ marginBottom: '16px', position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>Journal</label>
                {/* Dropdown Header */}
                <button
                  onClick={() => setJournalDropdownOpen(!journalDropdownOpen)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    background: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.4)',
                    borderRadius: journalDropdownOpen ? '10px 10px 0 0' : '10px',
                    color: '#22c55e',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 0 15px rgba(34,197,94,0.15)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                    {accounts.find(a => a.id === quickTradeAccount)?.name || 'Select Journal'}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: journalDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {/* Dropdown Content */}
                {journalDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#0d0d12',
                    border: '1px solid rgba(34,197,94,0.3)',
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    padding: '8px',
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
                  }}>
                    {accounts.map(acc => {
                      const isSelected = quickTradeAccount === acc.id
                      const accTrades = trades[acc.id] || []
                      const totalPnl = accTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
                      return (
                        <button
                          key={acc.id}
                          onClick={() => { setQuickTradeAccount(acc.id); setJournalDropdownOpen(false) }}
                          style={{
                            width: '100%',
                            padding: '12px 14px',
                            background: isSelected ? 'rgba(34,197,94,0.15)' : '#0a0a0f',
                            border: `1px solid ${isSelected ? 'rgba(34,197,94,0.5)' : '#1a1a22'}`,
                            borderRadius: '8px',
                            color: isSelected ? '#22c55e' : '#999',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease',
                            boxShadow: isSelected ? '0 0 12px rgba(34,197,94,0.2), inset 0 0 20px rgba(34,197,94,0.05)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: isSelected ? '#22c55e' : '#444',
                                boxShadow: isSelected ? '0 0 6px #22c55e' : 'none'
                              }} />
                              {acc.name}
                            </div>
                            <span style={{ fontSize: '13px', color: totalPnl >= 0 ? '#22c55e' : '#ef4444' }}>
                              {totalPnl >= 0 ? '+' : ''}${Math.round(totalPnl).toLocaleString()}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Symbol & PnL Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Symbol</label>
                  <input type="text" value={quickTradeSymbol} onChange={e => setQuickTradeSymbol(e.target.value)} placeholder="XAUUSD" style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>P&L ($)</label>
                  <input type="number" value={quickTradePnl} onChange={e => setQuickTradePnl(e.target.value)} placeholder="0" style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Direction */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>Direction</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setQuickTradeDirection('long')} style={{ flex: 1, padding: '14px', background: quickTradeDirection === 'long' ? 'rgba(34,197,94,0.2)' : '#0a0a0f', border: `2px solid ${quickTradeDirection === 'long' ? '#22c55e' : '#1a1a22'}`, borderRadius: '8px', color: quickTradeDirection === 'long' ? '#22c55e' : '#666', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>LONG</button>
                  <button onClick={() => setQuickTradeDirection('short')} style={{ flex: 1, padding: '14px', background: quickTradeDirection === 'short' ? 'rgba(239,68,68,0.2)' : '#0a0a0f', border: `2px solid ${quickTradeDirection === 'short' ? '#ef4444' : '#1a1a22'}`, borderRadius: '8px', color: quickTradeDirection === 'short' ? '#ef4444' : '#666', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>SHORT</button>
                </div>
              </div>

              {/* Outcome */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>Outcome</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setQuickTradeOutcome('win')} style={{ flex: 1, padding: '14px', background: quickTradeOutcome === 'win' ? 'rgba(34,197,94,0.2)' : '#0a0a0f', border: `2px solid ${quickTradeOutcome === 'win' ? '#22c55e' : '#1a1a22'}`, borderRadius: '8px', color: quickTradeOutcome === 'win' ? '#22c55e' : '#666', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>WIN</button>
                  <button onClick={() => setQuickTradeOutcome('loss')} style={{ flex: 1, padding: '14px', background: quickTradeOutcome === 'loss' ? 'rgba(239,68,68,0.2)' : '#0a0a0f', border: `2px solid ${quickTradeOutcome === 'loss' ? '#ef4444' : '#1a1a22'}`, borderRadius: '8px', color: quickTradeOutcome === 'loss' ? '#ef4444' : '#666', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>LOSS</button>
                  <button onClick={() => setQuickTradeOutcome('be')} style={{ flex: 1, padding: '14px', background: quickTradeOutcome === 'be' ? 'rgba(255,255,255,0.1)' : '#0a0a0f', border: `2px solid ${quickTradeOutcome === 'be' ? '#888' : '#1a1a22'}`, borderRadius: '8px', color: quickTradeOutcome === 'be' ? '#888' : '#666', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }}>BE</button>
                </div>
              </div>

              {/* RR & Risk Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>RR</label>
                  <input type="text" value={quickTradeRR} onChange={e => setQuickTradeRR(e.target.value)} placeholder="2.5" style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>% Risk</label>
                  <input type="number" value={quickTradeRiskPercent} onChange={e => setQuickTradeRiskPercent(e.target.value)} placeholder="1" style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Date */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Date</label>
                <input type="date" value={quickTradeDate} onChange={e => setQuickTradeDate(e.target.value)} max={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }} />
              </div>

              {/* Optional Fields - Collapsible Style */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Confidence</label>
                  <select value={quickTradeConfidence} onChange={e => setQuickTradeConfidence(e.target.value)} style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '15px' }}>
                    <option value="">-</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Timeframe</label>
                  <select value={quickTradeTimeframe} onChange={e => setQuickTradeTimeframe(e.target.value)} style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '15px' }}>
                    <option value="">-</option>
                    <option value="1m">1m</option>
                    <option value="5m">5m</option>
                    <option value="15m">15m</option>
                    <option value="1H">1H</option>
                    <option value="4H">4H</option>
                    <option value="Daily">Daily</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Session</label>
                  <select value={quickTradeSession} onChange={e => setQuickTradeSession(e.target.value)} style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '15px' }}>
                    <option value="">-</option>
                    <option value="London">London</option>
                    <option value="New York">New York</option>
                    <option value="Asian">Asian</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Rating</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'inline-flex', gap: '4px', padding: '10px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px' }} onMouseLeave={() => setHoverRating(0)}>
                      {[1, 2, 3, 4, 5].map(star => {
                        const displayRating = hoverRating || parseFloat(quickTradeRating) || 0
                        const isFullStar = displayRating >= star
                        const isHalfStar = displayRating >= star - 0.5 && displayRating < star
                        return (
                          <div key={star} style={{ position: 'relative', width: '28px', height: '28px', cursor: 'pointer' }}
                            onMouseMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const x = e.clientX - rect.left; setHoverRating(x < rect.width / 2 ? star - 0.5 : star) }}
                            onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const x = e.clientX - rect.left; const newRating = x < rect.width / 2 ? star - 0.5 : star; setQuickTradeRating(parseFloat(quickTradeRating) === newRating ? '' : String(newRating)) }}>
                            <span style={{ position: 'absolute', color: '#2a2a35', fontSize: '28px', lineHeight: 1 }}>★</span>
                            {isHalfStar && <span style={{ position: 'absolute', color: '#22c55e', fontSize: '28px', lineHeight: 1, width: '14px', overflow: 'hidden' }}>★</span>}
                            {isFullStar && <span style={{ position: 'absolute', color: '#22c55e', fontSize: '28px', lineHeight: 1 }}>★</span>}
                          </div>
                        )
                      })}
                    </div>
                    <span style={{ background: '#1a1a22', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', color: '#fff', whiteSpace: 'nowrap', minWidth: '45px', textAlign: 'center' }}>
                      {hoverRating || parseFloat(quickTradeRating) || 0} / 5
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Notes</label>
                <textarea value={quickTradeNotes} onChange={e => setQuickTradeNotes(e.target.value)} placeholder="Trade notes..." rows={3} style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '15px', resize: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Custom Inputs */}
              {getSelectedAccountCustomInputs().length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  {getSelectedAccountCustomInputs().map(input => (
                    <div key={input.id}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{input.label || input.id}</label>
                      <select value={quickTradeExtraData[input.id] || ''} onChange={e => setQuickTradeExtraData(prev => ({ ...prev, [input.id]: e.target.value }))} style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '15px' }}>
                        <option value="">-</option>
                        {(input.options || []).map(opt => <option key={getOptVal(opt)} value={getOptVal(opt)}>{getOptVal(opt)}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Fixed Bottom Button */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #1a1a22', background: '#0a0a0f' }}>
              <button
                onClick={() => { submitQuickTrade(); setShowMobileTradeModal(false); }}
                disabled={submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl) ? '#1a1a22' : 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl) ? '#666' : '#fff',
                  fontWeight: 700,
                  fontSize: '16px',
                  cursor: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl) ? 'not-allowed' : 'pointer',
                  boxShadow: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl) ? 'none' : '0 0 20px rgba(147,51,234,0.5), 0 0 40px rgba(147,51,234,0.3)'
                }}
              >
                {submittingTrade ? 'Adding Trade...' : 'Log Trade'}
              </button>
            </div>
          </div>
        )}

        {/* Expanded Trade Entry Modal (Desktop) */}
        {sidebarExpanded && !isMobile && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setSidebarExpanded(false)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '16px', padding: '28px', width: '500px', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #1a1a22' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                  <span style={{ fontSize: '18px', color: '#fff', fontWeight: 600 }}>LOG TRADE</span>
                </div>
                <button onClick={() => setSidebarExpanded(false)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: '4px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Journal Select */}
              <div style={{ marginBottom: '20px', position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '8px', textTransform: 'uppercase' }}>Journal</label>
                <button
                  onClick={() => setJournalDropdownOpen(!journalDropdownOpen)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.4)',
                    borderRadius: journalDropdownOpen ? '10px 10px 0 0' : '10px',
                    color: '#22c55e',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 0 12px rgba(34,197,94,0.15)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                    {accounts.find(a => a.id === quickTradeAccount)?.name || 'Select Journal'}
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: journalDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {journalDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#0d0d12',
                    border: '1px solid rgba(34,197,94,0.3)',
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                    padding: '6px',
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}>
                    {accounts.map(acc => {
                      const isSelected = quickTradeAccount === acc.id
                      const accTrades = trades[acc.id] || []
                      const totalPnl = accTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
                      return (
                        <button
                          key={acc.id}
                          onClick={() => { setQuickTradeAccount(acc.id); setJournalDropdownOpen(false) }}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            background: isSelected ? 'rgba(34,197,94,0.15)' : '#0a0a0f',
                            border: `1px solid ${isSelected ? 'rgba(34,197,94,0.5)' : '#1a1a22'}`,
                            borderRadius: '6px',
                            color: isSelected ? '#22c55e' : '#999',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSelected ? '#22c55e' : '#444' }} />
                              {acc.name}
                            </div>
                            <span style={{ fontSize: '12px', color: totalPnl >= 0 ? '#22c55e' : '#ef4444' }}>
                              {totalPnl >= 0 ? '+' : ''}${Math.round(totalPnl).toLocaleString()}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Core Fields - 2 columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Symbol</label>
                  <input type="text" value={quickTradeSymbol} onChange={e => setQuickTradeSymbol(e.target.value)} placeholder="XAUUSD" style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>P&L ($)</label>
                  <input type="number" value={quickTradePnl} onChange={e => setQuickTradePnl(e.target.value)} placeholder="0" style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Direction + Outcome */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Direction</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setQuickTradeDirection('long')} style={{ flex: 1, padding: '10px', background: quickTradeDirection === 'long' ? 'rgba(34,197,94,0.2)' : '#0a0a0f', border: `2px solid ${quickTradeDirection === 'long' ? '#22c55e' : '#1a1a22'}`, borderRadius: '8px', color: quickTradeDirection === 'long' ? '#22c55e' : '#666', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>LONG</button>
                    <button onClick={() => setQuickTradeDirection('short')} style={{ flex: 1, padding: '10px', background: quickTradeDirection === 'short' ? 'rgba(239,68,68,0.2)' : '#0a0a0f', border: `2px solid ${quickTradeDirection === 'short' ? '#ef4444' : '#1a1a22'}`, borderRadius: '8px', color: quickTradeDirection === 'short' ? '#ef4444' : '#666', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>SHORT</button>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Outcome</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setQuickTradeOutcome('win')} style={{ flex: 1, padding: '10px', background: quickTradeOutcome === 'win' ? 'rgba(34,197,94,0.2)' : '#0a0a0f', border: `2px solid ${quickTradeOutcome === 'win' ? '#22c55e' : '#1a1a22'}`, borderRadius: '8px', color: quickTradeOutcome === 'win' ? '#22c55e' : '#666', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>W</button>
                    <button onClick={() => setQuickTradeOutcome('loss')} style={{ flex: 1, padding: '10px', background: quickTradeOutcome === 'loss' ? 'rgba(239,68,68,0.2)' : '#0a0a0f', border: `2px solid ${quickTradeOutcome === 'loss' ? '#ef4444' : '#1a1a22'}`, borderRadius: '8px', color: quickTradeOutcome === 'loss' ? '#ef4444' : '#666', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>L</button>
                    <button onClick={() => setQuickTradeOutcome('be')} style={{ flex: 1, padding: '10px', background: quickTradeOutcome === 'be' ? 'rgba(255,255,255,0.1)' : '#0a0a0f', border: `2px solid ${quickTradeOutcome === 'be' ? '#888' : '#1a1a22'}`, borderRadius: '8px', color: quickTradeOutcome === 'be' ? '#888' : '#666', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>BE</button>
                  </div>
                </div>
              </div>

              {/* RR, Risk, Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>RR</label>
                  <input type="text" value={quickTradeRR} onChange={e => setQuickTradeRR(e.target.value)} placeholder="2.5" style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>% Risk</label>
                  <input type="number" value={quickTradeRiskPercent} onChange={e => setQuickTradeRiskPercent(e.target.value)} placeholder="1" style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Date</label>
                  <input type="date" value={quickTradeDate} onChange={e => setQuickTradeDate(e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Optional Fields - 2x2 grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Confidence</label>
                  <select value={quickTradeConfidence} onChange={e => setQuickTradeConfidence(e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px' }}>
                    <option value="">-</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Timeframe</label>
                  <select value={quickTradeTimeframe} onChange={e => setQuickTradeTimeframe(e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px' }}>
                    <option value="">-</option>
                    <option value="1m">1m</option>
                    <option value="5m">5m</option>
                    <option value="15m">15m</option>
                    <option value="1H">1H</option>
                    <option value="4H">4H</option>
                    <option value="Daily">Daily</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Session</label>
                  <select value={quickTradeSession} onChange={e => setQuickTradeSession(e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px' }}>
                    <option value="">-</option>
                    <option value="London">London</option>
                    <option value="New York">New York</option>
                    <option value="Asian">Asian</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Rating</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'inline-flex', gap: '3px', padding: '8px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px' }} onMouseLeave={() => setHoverRating(0)}>
                      {[1, 2, 3, 4, 5].map(star => {
                        const displayRating = hoverRating || parseFloat(quickTradeRating) || 0
                        const isFullStar = displayRating >= star
                        const isHalfStar = displayRating >= star - 0.5 && displayRating < star
                        return (
                          <div key={star} style={{ position: 'relative', width: '22px', height: '22px', cursor: 'pointer' }}
                            onMouseMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const x = e.clientX - rect.left; setHoverRating(x < rect.width / 2 ? star - 0.5 : star) }}
                            onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const x = e.clientX - rect.left; const newRating = x < rect.width / 2 ? star - 0.5 : star; setQuickTradeRating(parseFloat(quickTradeRating) === newRating ? '' : String(newRating)) }}>
                            <span style={{ position: 'absolute', color: '#2a2a35', fontSize: '22px', lineHeight: 1 }}>★</span>
                            {isHalfStar && <span style={{ position: 'absolute', color: '#22c55e', fontSize: '22px', lineHeight: 1, width: '11px', overflow: 'hidden' }}>★</span>}
                            {isFullStar && <span style={{ position: 'absolute', color: '#22c55e', fontSize: '22px', lineHeight: 1 }}>★</span>}
                          </div>
                        )
                      })}
                    </div>
                    <span style={{ background: '#1a1a22', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: '#fff' }}>
                      {hoverRating || parseFloat(quickTradeRating) || 0}/5
                    </span>
                  </div>
                </div>
              </div>

              {/* Custom Inputs */}
              {getSelectedAccountCustomInputs().length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                  {getSelectedAccountCustomInputs().map(input => (
                    <div key={input.id}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>{input.label || input.id}</label>
                      <select value={quickTradeExtraData[input.id] || ''} onChange={e => setQuickTradeExtraData(prev => ({ ...prev, [input.id]: e.target.value }))} style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px' }}>
                        <option value="">-</option>
                        {(input.options || []).map(opt => <option key={getOptVal(opt)} value={getOptVal(opt)}>{getOptVal(opt)}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Notes</label>
                <textarea value={quickTradeNotes} onChange={e => setQuickTradeNotes(e.target.value)} placeholder="Trade notes..." rows={3} style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', resize: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => { submitQuickTrade(); setSidebarExpanded(false); }}
                  disabled={submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl) ? '#1a1a22' : 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    color: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl) ? '#666' : '#fff',
                    fontWeight: 600,
                    fontSize: '15px',
                    cursor: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl) ? 'not-allowed' : 'pointer',
                    boxShadow: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl) ? 'none' : '0 0 20px rgba(147,51,234,0.5), 0 0 40px rgba(147,51,234,0.3)'
                  }}
                >
                  {submittingTrade ? 'Adding...' : 'Log Trade'}
                </button>
                <button onClick={() => setShowEditInputsModal(true)} style={{ padding: '14px 18px', background: '#0a0a0f', border: '1px solid #2a2a35', borderRadius: '10px', color: '#888', fontWeight: 500, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Floating Action Button */}
        {isMobile && accounts.length > 0 && !showMobileTradeModal && (
          <button
            onClick={() => setShowMobileTradeModal(true)}
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              border: 'none',
              boxShadow: '0 4px 20px rgba(34, 197, 94, 0.4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
