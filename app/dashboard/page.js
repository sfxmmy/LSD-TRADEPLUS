'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

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

// Get option styles from account's custom_inputs (uses journal's actual settings)
function getAccountOptionStyles(account, field, value) {
  if (!value) return { textColor: '#fff', bgColor: null, borderColor: null }

  // Try to get styles from account's custom_inputs
  try {
    const customInputs = account?.custom_inputs ? JSON.parse(account.custom_inputs) : null
    if (customInputs) {
      const input = customInputs.find(i => i.id === field)
      if (input?.options) {
        const opt = input.options.find(o => {
          const optVal = typeof o === 'object' ? o.value : o
          return optVal?.toLowerCase() === value?.toLowerCase()
        })
        if (opt && typeof opt === 'object') {
          return {
            textColor: opt.textColor || opt.color || '#fff',
            bgColor: opt.bgColor || null,
            borderColor: opt.borderColor || null
          }
        }
      }
    }
  } catch (e) {}

  // Fallback to static option styles
  const fieldStyles = optionStyles[field]
  if (fieldStyles && fieldStyles[value]) return { ...fieldStyles[value], borderColor: null }
  return { textColor: '#fff', bgColor: null, borderColor: null }
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [trades, setTrades] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(null)
  const [showObjectiveLinesMap, setShowObjectiveLinesMap] = useState({}) // Track objective lines visibility per account
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [profitTarget, setProfitTarget] = useState('')
  const [maxDrawdown, setMaxDrawdown] = useState('')
  const [consistencyEnabled, setConsistencyEnabled] = useState(false)
  const [consistencyPct, setConsistencyPct] = useState('30')
  const [editName, setEditName] = useState('')
  const [editProfitTarget, setEditProfitTarget] = useState('')
  const [editMaxDrawdown, setEditMaxDrawdown] = useState('')
  const [editConsistencyEnabled, setEditConsistencyEnabled] = useState(false)
  const [editConsistencyPct, setEditConsistencyPct] = useState('30')
  // Daily Drawdown state (create modal)
  const [dailyDdEnabled, setDailyDdEnabled] = useState(false)
  const [dailyDdPct, setDailyDdPct] = useState('')
  const [dailyDdType, setDailyDdType] = useState('static') // 'static' or 'trailing'
  const [dailyDdLocksAt, setDailyDdLocksAt] = useState('start_balance') // 'start_balance' or 'custom'
  const [dailyDdLocksAtPct, setDailyDdLocksAtPct] = useState('') // custom % above start
  const [dailyDdResetTime, setDailyDdResetTime] = useState('00:00')
  const [dailyDdResetTimezone, setDailyDdResetTimezone] = useState('Europe/London')
  // Max Drawdown state (create modal)
  const [maxDdEnabled, setMaxDdEnabled] = useState(false)
  const [maxDdPct, setMaxDdPct] = useState('')
  const [maxDdLocksAtPct, setMaxDdLocksAtPct] = useState('') // custom % above start for max DD
  const [maxDdType, setMaxDdType] = useState('static')
  const [maxDdTrailingStopsAt, setMaxDdTrailingStopsAt] = useState('never')
  // Daily Drawdown state (edit modal)
  const [editDailyDdEnabled, setEditDailyDdEnabled] = useState(false)
  const [editDailyDdPct, setEditDailyDdPct] = useState('')
  const [editDailyDdType, setEditDailyDdType] = useState('static') // 'static' or 'trailing'
  const [editDailyDdLocksAt, setEditDailyDdLocksAt] = useState('start_balance') // 'start_balance' or 'custom'
  const [editDailyDdLocksAtPct, setEditDailyDdLocksAtPct] = useState('') // custom % above start
  const [editDailyDdResetTime, setEditDailyDdResetTime] = useState('00:00')
  const [editDailyDdResetTimezone, setEditDailyDdResetTimezone] = useState('Europe/London')
  // Max Drawdown state (edit modal)
  const [editMaxDdEnabled, setEditMaxDdEnabled] = useState(false)
  const [editMaxDdPct, setEditMaxDdPct] = useState('')
  const [editMaxDdType, setEditMaxDdType] = useState('static')
  const [editMaxDdTrailingStopsAt, setEditMaxDdTrailingStopsAt] = useState('never')
  const [editMaxDdLocksAtPct, setEditMaxDdLocksAtPct] = useState('') // custom % above start for max DD
  const [creating, setCreating] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [viewMode, setViewMode] = useState('cards') // 'cards' or 'list'
  // Import journal state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importStep, setImportStep] = useState(1) // 1: upload, 2: mapping, 3: preview
  const [importFile, setImportFile] = useState(null)
  const [importData, setImportData] = useState([])
  const [importHeaders, setImportHeaders] = useState([])
  const [importMapping, setImportMapping] = useState({})
  const [importJournalName, setImportJournalName] = useState('')
  const [importStartingBalance, setImportStartingBalance] = useState('')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
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
  const [dashHover, setDashHover] = useState(null) // Hover state for dashboard graph
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
    const { data, error } = await supabase.from('accounts').insert({
      user_id: user.id,
      name: name.trim(),
      starting_balance: parseFloat(balance) || 0,
      profit_target: profitTarget ? parseFloat(profitTarget) : null,
      max_drawdown: maxDrawdown ? parseFloat(maxDrawdown) : null,
      consistency_enabled: consistencyEnabled,
      consistency_pct: consistencyPct ? parseFloat(consistencyPct) : 30,
      daily_dd_enabled: dailyDdEnabled,
      daily_dd_pct: dailyDdPct ? parseFloat(dailyDdPct) : null,
      daily_dd_type: dailyDdType,
      daily_dd_locks_at: dailyDdLocksAt,
      daily_dd_locks_at_pct: dailyDdLocksAtPct ? parseFloat(dailyDdLocksAtPct) : null,
      daily_dd_reset_time: dailyDdResetTime || '00:00',
      daily_dd_reset_timezone: dailyDdResetTimezone || 'Europe/London',
      max_dd_enabled: maxDdEnabled,
      max_dd_pct: maxDdPct ? parseFloat(maxDdPct) : null,
      max_dd_type: maxDdType,
      max_dd_trailing_stops_at: maxDdTrailingStopsAt,
      max_dd_locks_at_pct: maxDdLocksAtPct ? parseFloat(maxDdLocksAtPct) : null
    }).select().single()
    if (error) { alert('Error: ' + error.message); setCreating(false); return }
    setAccounts([...accounts, data])
    setTrades({ ...trades, [data.id]: [] })
    setName(''); setBalance(''); setProfitTarget(''); setMaxDrawdown(''); setConsistencyEnabled(false); setConsistencyPct('30'); setDailyDdEnabled(false); setDailyDdPct(''); setDailyDdType('static'); setDailyDdLocksAt('start_balance'); setDailyDdLocksAtPct(''); setDailyDdResetTime('00:00'); setDailyDdResetTimezone('Europe/London'); setMaxDdEnabled(false); setMaxDdPct(''); setMaxDdType('static'); setMaxDdTrailingStopsAt('never'); setMaxDdLocksAtPct(''); setShowModal(false); setCreating(false)
  }

  async function updateAccount(accountId) {
    if (!editName.trim()) return
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { error } = await supabase.from('accounts').update({
      name: editName.trim(),
      profit_target: editProfitTarget ? parseFloat(editProfitTarget) : null,
      max_drawdown: editMaxDrawdown ? parseFloat(editMaxDrawdown) : null,
      consistency_enabled: editConsistencyEnabled,
      consistency_pct: editConsistencyPct ? parseFloat(editConsistencyPct) : 30,
      daily_dd_enabled: editDailyDdEnabled,
      daily_dd_pct: editDailyDdPct ? parseFloat(editDailyDdPct) : null,
      daily_dd_type: editDailyDdType,
      daily_dd_locks_at: editDailyDdLocksAt,
      daily_dd_locks_at_pct: editDailyDdLocksAtPct ? parseFloat(editDailyDdLocksAtPct) : null,
      daily_dd_reset_time: editDailyDdResetTime || '00:00',
      daily_dd_reset_timezone: editDailyDdResetTimezone || 'Europe/London',
      max_dd_enabled: editMaxDdEnabled,
      max_dd_pct: editMaxDdPct ? parseFloat(editMaxDdPct) : null,
      max_dd_type: editMaxDdType,
      max_dd_trailing_stops_at: editMaxDdTrailingStopsAt,
      max_dd_locks_at_pct: editMaxDdLocksAtPct ? parseFloat(editMaxDdLocksAtPct) : null
    }).eq('id', accountId)
    if (error) { alert('Failed to update journal: ' + error.message); return }
    setAccounts(accounts.map(a => a.id === accountId ? {
      ...a,
      name: editName.trim(),
      profit_target: editProfitTarget ? parseFloat(editProfitTarget) : null,
      max_drawdown: editMaxDrawdown ? parseFloat(editMaxDrawdown) : null,
      consistency_enabled: editConsistencyEnabled,
      consistency_pct: editConsistencyPct ? parseFloat(editConsistencyPct) : 30,
      daily_dd_enabled: editDailyDdEnabled,
      daily_dd_pct: editDailyDdPct ? parseFloat(editDailyDdPct) : null,
      daily_dd_type: editDailyDdType,
      daily_dd_locks_at: editDailyDdLocksAt,
      daily_dd_locks_at_pct: editDailyDdLocksAtPct ? parseFloat(editDailyDdLocksAtPct) : null,
      daily_dd_reset_time: editDailyDdResetTime || '00:00',
      daily_dd_reset_timezone: editDailyDdResetTimezone || 'Europe/London',
      max_dd_enabled: editMaxDdEnabled,
      max_dd_pct: editMaxDdPct ? parseFloat(editMaxDdPct) : null,
      max_dd_type: editMaxDdType,
      max_dd_trailing_stops_at: editMaxDdTrailingStopsAt,
      max_dd_locks_at_pct: editMaxDdLocksAtPct ? parseFloat(editMaxDdLocksAtPct) : null
    } : a))
    setShowEditModal(null); setEditName(''); setEditProfitTarget(''); setEditMaxDrawdown(''); setEditConsistencyEnabled(false); setEditConsistencyPct('30'); setEditDailyDdEnabled(false); setEditDailyDdPct(''); setEditDailyDdType('static'); setEditDailyDdLocksAt('start_balance'); setEditDailyDdLocksAtPct(''); setEditDailyDdResetTime('00:00'); setEditDailyDdResetTimezone('Europe/London'); setEditMaxDdEnabled(false); setEditMaxDdPct(''); setEditMaxDdType('static'); setEditMaxDdTrailingStopsAt('never'); setEditMaxDdLocksAtPct('')
  }

  async function deleteAccount(accountId) {
    if (deleteConfirm.toLowerCase() !== 'delete') return
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { error } = await supabase.from('accounts').delete().eq('id', accountId)
    if (error) { alert('Failed to delete journal: ' + error.message); return }
    setAccounts(accounts.filter(a => a.id !== accountId))
    const newTrades = { ...trades }; delete newTrades[accountId]; setTrades(newTrades)
    setShowDeleteModal(null); setDeleteConfirm('')
  }

  // Import journal functions
  const knownFields = [
    { id: 'symbol', label: 'Symbol', type: 'text', aliases: ['symbol', 'pair', 'ticker', 'instrument', 'asset', 'currency', 'market', 'coin', 'stock', 'forex', 'crypto', 'name', 'trade'] },
    { id: 'pnl', label: 'PnL ($)', type: 'number', aliases: ['pnl', 'p&l', 'p/l', 'profit', 'profit/loss', 'profit loss', 'net profit', 'net pnl', 'gain', 'return', 'amount', 'realized', 'realised', 'result', 'earnings', 'money', 'value', '$', 'usd', 'gbp', 'eur', 'returns'] },
    { id: 'outcome', label: 'W/L', type: 'select', aliases: ['outcome', 'win/loss', 'w/l', 'win loss', 'trade result', 'won/lost', 'status', 'success', 'winner', 'loser'] },
    { id: 'direction', label: 'Direction', type: 'select', aliases: ['direction', 'side', 'position', 'long/short', 'buy/sell', 'trade type', 'order type', 'action', 'order', 'bias'] },
    { id: 'rr', label: 'RR', type: 'number', aliases: ['rr', 'r:r', 'risk reward', 'risk/reward', 'r/r', 'reward ratio', 'risk to reward', 'r', 'reward', 'ratio'] },
    { id: 'date', label: 'Date', type: 'date', aliases: ['date', 'trade date', 'entry date', 'open date', 'day', 'opened', 'entry', 'when', 'datetime', 'timestamp', 'time stamp', 'open', 'created', 'executed'] },
    { id: 'time', label: 'Time', type: 'time', aliases: ['time', 'entry time', 'open time', 'trade time', 'clock', 'hour'] },
    { id: 'riskPercent', label: '% Risk', type: 'number', aliases: ['risk', 'risk %', '% risk', 'risk percent', 'lot size', 'position size', 'size', 'lots', 'volume', 'qty', 'quantity', 'units'] },
    { id: 'confidence', label: 'Confidence', type: 'select', aliases: ['confidence', 'conviction', 'certainty', 'conf', 'sure', 'feeling'] },
    { id: 'session', label: 'Session', type: 'select', aliases: ['session', 'market session', 'trading session', 'london', 'new york', 'asian', 'sydney'] },
    { id: 'timeframe', label: 'Timeframe', type: 'select', aliases: ['timeframe', 'time frame', 'chart', 'tf', 'period', 'interval', 'candle', 'candles'] },
    { id: 'notes', label: 'Notes', type: 'textarea', aliases: ['notes', 'comments', 'description', 'remarks', 'thoughts', 'analysis', 'review', 'journal', 'memo', 'text', 'comment', 'note', 'reason', 'why', 'setup'] },
    { id: 'rating', label: 'Rating', type: 'rating', aliases: ['rating', 'score', 'grade', 'quality', 'stars', 'rank', 'points'] }
  ]

  // Parse various date formats (DD/MM/YYYY, D/M/YY, MM-DD-YYYY, etc.)
  function parseFlexibleDate(value) {
    if (!value) return null
    const strValue = String(value).trim()

    // Excel serial date (number > 10000)
    if (!isNaN(value) && parseFloat(value) > 10000) {
      const excelEpoch = new Date(1899, 11, 30)
      const parsed = new Date(excelEpoch.getTime() + parseFloat(value) * 86400000)
      if (!isNaN(parsed.getTime())) return parsed
    }

    // Try ISO format first (YYYY-MM-DD)
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(strValue)) {
      const parsed = new Date(strValue)
      if (!isNaN(parsed.getTime())) return parsed
    }

    // Handle DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY (and single digit variants)
    const dmyMatch = strValue.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/)
    if (dmyMatch) {
      let [, d, m, y] = dmyMatch
      d = parseInt(d); m = parseInt(m); y = parseInt(y)
      // Handle 2-digit year
      if (y < 100) y += y < 50 ? 2000 : 1900
      // Assume DD/MM/YYYY if day > 12, otherwise could be ambiguous
      // Default to DD/MM/YYYY (more common internationally)
      if (d <= 31 && m <= 12) {
        const parsed = new Date(y, m - 1, d)
        if (!isNaN(parsed.getTime())) return parsed
      }
      // Try MM/DD/YYYY if first didn't work
      if (m <= 31 && d <= 12) {
        const parsed = new Date(y, d - 1, m)
        if (!isNaN(parsed.getTime())) return parsed
      }
    }

    // Handle YYYY/MM/DD
    const ymdMatch = strValue.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/)
    if (ymdMatch) {
      const [, y, m, d] = ymdMatch
      const parsed = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
      if (!isNaN(parsed.getTime())) return parsed
    }

    // Handle month names: "25 Jan 2024", "Jan 25, 2024", "25-Jan-24"
    const monthNames = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
    const monthMatch = strValue.toLowerCase().match(/(\d{1,2})[\s\-\/]*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-\/,]*(\d{2,4})/i)
    if (monthMatch) {
      let [, d, mon, y] = monthMatch
      d = parseInt(d); y = parseInt(y)
      if (y < 100) y += y < 50 ? 2000 : 1900
      const parsed = new Date(y, monthNames[mon], d)
      if (!isNaN(parsed.getTime())) return parsed
    }
    const monthMatch2 = strValue.toLowerCase().match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-\/]*(\d{1,2})[\s,\-\/]+(\d{2,4})/i)
    if (monthMatch2) {
      let [, mon, d, y] = monthMatch2
      d = parseInt(d); y = parseInt(y)
      if (y < 100) y += y < 50 ? 2000 : 1900
      const parsed = new Date(y, monthNames[mon], d)
      if (!isNaN(parsed.getTime())) return parsed
    }

    // Fallback to native Date parsing
    const fallback = new Date(strValue)
    if (!isNaN(fallback.getTime())) return fallback

    return null
  }

  // Parse PnL value (handles $, %, various formats)
  function parsePnlValue(value, startingBalance = 0) {
    if (value === null || value === undefined || value === '') return { value: 0, isPercent: false }
    const strValue = String(value).trim()

    // Check if it's a percentage
    const isPercent = strValue.includes('%')

    // Remove currency symbols and formatting
    let cleanedValue = strValue
      .replace(/[$€£¥₹₽¥₩]/g, '') // Currency symbols
      .replace(/%/g, '')           // Percent sign
      .replace(/,/g, '')           // Thousands separator
      .replace(/\s/g, '')          // Whitespace
      .replace(/^\((.+)\)$/, '-$1') // Accounting format (500) -> -500

    const parsed = parseFloat(cleanedValue)
    if (isNaN(parsed)) return { value: 0, isPercent: false }

    return { value: parsed, isPercent }
  }

  function handleImportFile(file) {
    setImportError('')
    // Validate file type
    const validExtensions = ['.xlsx', '.xls', '.csv']
    const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    if (!validExtensions.includes(fileExt)) {
      setImportError(`Invalid file type "${fileExt}". Please upload an Excel (.xlsx, .xls) or CSV file.`)
      return
    }
    // Warn for large files (> 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setImportError('Warning: Large file detected. This may take a moment to process.')
    }
    setImportFile(file)
    const reader = new FileReader()
    reader.onerror = () => {
      setImportError('Error reading file. Please try again.')
    }
    reader.onload = (e) => {
      try {
        const data = e.target.result
        let workbook
        if (file.name.toLowerCase().endsWith('.csv')) {
          workbook = XLSX.read(data, { type: 'string' })
        } else {
          workbook = XLSX.read(data, { type: 'array' })
        }
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setImportError('No sheets found in the file')
          return
        }
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 })
        if (jsonData.length < 1) { setImportError('File appears to be empty'); return }
        if (jsonData.length < 2) { setImportError('File must have at least a header row and one data row'); return }
        const headers = jsonData[0].map(h => String(h || '').trim())
        // Check for at least one non-empty header
        if (!headers.some(h => h.length > 0)) {
          setImportError('No valid column headers found in the first row')
          return
        }
        const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
        if (rows.length === 0) {
          setImportError('No data rows found (all rows are empty)')
          return
        }
        // Warn for large row counts
        if (rows.length > 5000) {
          setImportError(`File contains ${rows.length.toLocaleString()} rows. Maximum is 5000 trades per import. Please split your file.`)
          return
        }
        if (rows.length > 1000) {
          setImportError(`Note: ${rows.length.toLocaleString()} trades found. Large imports may take a moment.`)
        }
        setImportHeaders(headers)
        setImportData(rows)
        // Auto-detect column mappings with stricter matching
        const mapping = {}
        headers.forEach((header, idx) => {
          if (!header) return // Skip empty headers
          const headerLower = header.toLowerCase().trim()
          for (const field of knownFields) {
            // Stricter matching: header must equal alias OR be a reasonable substring match
            const matched = field.aliases.some(alias => {
              // Exact match
              if (headerLower === alias) return true
              // Header contains alias (but alias must be at least 3 chars to avoid false positives)
              if (alias.length >= 3 && headerLower.includes(alias)) return true
              // Alias contains header (header must be at least 3 chars)
              if (headerLower.length >= 3 && alias.includes(headerLower)) return true
              return false
            })
            if (matched && !Object.values(mapping).includes(field.id)) {
              mapping[idx] = field.id
              break
            }
          }
        })
        setImportMapping(mapping)
        setImportJournalName(file.name.replace(/\.(xlsx|xls|csv)$/i, ''))
        setImportStep(2)
      } catch (err) {
        setImportError('Error parsing file: ' + (err.message || 'Unknown error. Make sure the file is a valid Excel or CSV file.'))
      }
    }
    if (file.name.toLowerCase().endsWith('.csv')) {
      reader.readAsText(file)
    } else {
      reader.readAsArrayBuffer(file)
    }
  }

  async function processImport() {
    if (!user) { setImportError('You must be logged in to import'); return }
    if (!importJournalName.trim()) { setImportError('Please enter a journal name'); return }
    if (importData.length === 0) { setImportError('No data to import'); return }
    if (importData.length > 5000) { setImportError('Maximum 5000 trades per import. Please split your file.'); return }
    setImporting(true)
    setImportError('')
    try {
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      // Build custom_inputs from unmapped columns (as custom fields)
      // Use a copy of importMapping to avoid mutating state
      const finalMapping = { ...importMapping }
      const customInputs = []
      const usedFieldIds = new Set()
      importHeaders.forEach((header, idx) => {
        if (!finalMapping[idx] && header) {
          // Detect field type from data
          const sampleValues = importData.slice(0, 10).map(row => row[idx]).filter(v => v !== null && v !== undefined && v !== '')
          let fieldType = 'text'
          if (sampleValues.length > 0) {
            const uniqueValues = [...new Set(sampleValues.map(v => String(v).trim()))]
            if (uniqueValues.every(v => !isNaN(parseFloat(v)))) fieldType = 'number'
            else if (uniqueValues.length <= 10 && uniqueValues.length < sampleValues.length * 0.5) fieldType = 'select'
          }
          // Generate unique fieldId to avoid collisions
          // Reserved system field IDs that cannot be used for custom inputs
          const reservedIds = ['symbol', 'pnl', 'outcome', 'direction', 'rr', 'date', 'time', 'notes', 'rating', 'account_id', 'id', 'extra_data', 'created_at']
          let baseId = header.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'field'
          let fieldId = baseId
          let counter = 1
          // Avoid collisions with existing IDs and reserved system fields
          while (usedFieldIds.has(fieldId) || reservedIds.includes(fieldId)) {
            fieldId = `${baseId}_${counter}`
            counter++
          }
          usedFieldIds.add(fieldId)
          customInputs.push({
            id: fieldId,
            label: header,
            type: fieldType,
            enabled: true,
            options: fieldType === 'select' ? [...new Set(importData.map(row => row[idx]).filter(v => v !== null && v !== undefined && v !== '').map(v => String(v).trim()))] : []
          })
          finalMapping[idx] = fieldId
        }
      })
      // Create account with custom inputs
      const { data: accountData, error: accountError } = await supabase.from('accounts').insert({
        user_id: user.id,
        name: importJournalName.trim(),
        starting_balance: parseFloat(importStartingBalance) || 0,
        custom_inputs: customInputs.length > 0 ? JSON.stringify(customInputs) : null
      }).select().single()
      if (accountError) throw accountError
      // Process and insert trades
      const startingBal = parseFloat(importStartingBalance) || 0
      const tradesToInsert = []
      for (const row of importData) {
        const trade = { account_id: accountData.id }
        const extraData = {}
        for (const [colIdx, fieldId] of Object.entries(finalMapping)) {
          const value = row[parseInt(colIdx)]
          if (value === null || value === undefined || value === '') continue
          const strValue = String(value).trim()
          // Map to trade fields or extra_data
          if (['symbol', 'pnl', 'outcome', 'direction', 'rr', 'date'].includes(fieldId)) {
            if (fieldId === 'pnl') {
              // Parse PnL (handles $, %, various formats)
              const { value: pnlValue, isPercent } = parsePnlValue(strValue)
              if (isPercent && startingBal > 0) {
                // Convert percentage to dollar amount
                trade[fieldId] = (pnlValue / 100) * startingBal
              } else {
                trade[fieldId] = pnlValue
              }
            } else if (fieldId === 'rr') {
              // RR can be null if not provided
              const { value: rrValue } = parsePnlValue(strValue)
              trade[fieldId] = rrValue !== 0 ? rrValue : null
            }
            else if (fieldId === 'date') {
              // Use flexible date parser
              const parsedDate = parseFlexibleDate(value)
              if (parsedDate) {
                trade.date = parsedDate.toISOString().split('T')[0]
              }
            } else if (fieldId === 'outcome') {
              const lower = strValue.toLowerCase().trim()
              if (lower.includes('win') || lower === 'w' || lower === '1' || lower === 'won' || lower === 'profit' || lower === 'tp' || lower === 'target') trade.outcome = 'win'
              else if (lower.includes('loss') || lower.includes('lose') || lower.includes('lost') || lower === '-1' || lower === '0' || lower === 'sl' || lower === 'stop') trade.outcome = 'loss'
              else if (lower.includes('be') || lower.includes('break') || lower.includes('even') || lower === 'scratch') trade.outcome = 'breakeven'
              else trade.outcome = strValue
            } else if (fieldId === 'direction') {
              const lower = strValue.toLowerCase().trim()
              if (lower.includes('long') || lower.includes('buy') || lower === 'b' || lower === 'bull' || lower === 'bullish' || lower === 'call') trade.direction = 'long'
              else if (lower.includes('short') || lower.includes('sell') || lower === 's' || lower === 'bear' || lower === 'bearish' || lower === 'put') trade.direction = 'short'
              else if (lower === 'l') trade.direction = 'long'
              else trade.direction = strValue
            } else {
              trade[fieldId] = strValue
            }
          } else {
            extraData[fieldId] = strValue
          }
        }
        if (!trade.date) trade.date = new Date().toISOString().split('T')[0]
        // Stringify extra_data to match the expected format
        trade.extra_data = Object.keys(extraData).length > 0 ? JSON.stringify(extraData) : null
        tradesToInsert.push(trade)
      }
      let insertedTrades = []
      if (tradesToInsert.length > 0) {
        // Insert in batches of 500 to avoid API limits
        const batchSize = 500
        for (let i = 0; i < tradesToInsert.length; i += batchSize) {
          const batch = tradesToInsert.slice(i, i + batchSize)
          const { data: batchData, error: tradesError } = await supabase.from('trades').insert(batch).select()
          if (tradesError) throw tradesError
          insertedTrades = insertedTrades.concat(batchData || [])
        }
      }
      // Update local state with actual inserted trades (with DB IDs)
      setAccounts([...accounts, accountData])
      setTrades({ ...trades, [accountData.id]: insertedTrades.sort((a, b) => new Date(a.date) - new Date(b.date)) })
      setTradeCounts({ ...tradeCounts, [accountData.id]: insertedTrades.length })
      setShowImportModal(false)
      setImporting(false)
      // Brief success indication (modal closes, user sees new journal)
    } catch (err) {
      setImportError('Import failed: ' + (err.message || 'Unknown error'))
      setImporting(false)
    }
  }

  async function submitQuickTrade() {
    if (!quickTradeAccount) { alert('Please select a journal'); return }
    if (!quickTradeSymbol?.trim()) { alert('Please enter a symbol'); return }
    if (!quickTradePnl || isNaN(parseFloat(quickTradePnl))) { alert('Please enter a valid PnL number'); return }
    if (quickTradeRR && isNaN(parseFloat(quickTradeRR))) { alert('Please enter a valid RR number'); return }
    setSubmittingTrade(true)
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

    // Build extra_data with all fields including rating
    // Convert custom input IDs to labels for readability
    const customInputs = getSelectedAccountCustomInputs()
    const convertedExtraData = {}
    Object.entries(quickTradeExtraData).forEach(([id, value]) => {
      const input = customInputs.find(i => i.id === id)
      const key = input?.label || id // Use label if found, fallback to id
      convertedExtraData[key] = value
    })

    const extraData = {
      ...convertedExtraData,
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

  function EquityCurve({ accountTrades, startingBalance, account, showObjectiveLines = false }) {
    const [hoverPoint, setHoverPoint] = useState(null)
    const [hoverLine, setHoverLine] = useState(null) // { type: 'maxDd' | 'dailyDd' | 'target' | 'start', value: number, y: number }
    const svgRef = useRef(null)

    // Check if prop firm rules are configured
    const hasPropFirmRules = account?.profit_target || account?.max_drawdown || account?.max_dd_enabled || account?.daily_dd_enabled

    if (!accountTrades || accountTrades.length === 0) {
      return <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '14px' }}>No trades yet</div>
    }

    // Helper to get trade time from extra_data
    const getTradeTime = (trade) => {
      if (trade.extra_data) {
        const extra = typeof trade.extra_data === 'object' ? trade.extra_data : (() => { try { return JSON.parse(trade.extra_data) } catch { return {} } })()
        return extra.time || null
      }
      return null
    }

    // Helper to create sortable datetime from date and time
    const getDateTime = (trade) => {
      if (!trade.date) return new Date(0) // Fallback for trades without dates (shouldn't happen)
      const time = getTradeTime(trade) || '00:00'
      const dateTime = new Date(`${trade.date}T${time}`)
      return isNaN(dateTime.getTime()) ? new Date(trade.date) : dateTime // Fallback if time format is invalid
    }

    // Sort trades by date and time for accurate sequencing
    const sortedTrades = [...accountTrades].sort((a, b) => getDateTime(a) - getDateTime(b))

    const start = parseFloat(startingBalance) || 10000
    let cumulative = start
    const points = [{ balance: cumulative, date: null, time: null, pnl: 0, idx: 0 }]
    sortedTrades.forEach((t, i) => {
      cumulative += parseFloat(t.pnl) || 0
      points.push({ balance: cumulative, date: t.date, time: getTradeTime(t), pnl: parseFloat(t.pnl) || 0, symbol: t.symbol, idx: i + 1 })
    })

    let maxBal = Math.max(...points.map(p => p.balance))
    let minBal = Math.min(...points.map(p => p.balance))

    // Include prop firm target/floor in range (legacy) - clamp values to valid ranges
    const maxDDParsed = parseFloat(account?.max_drawdown)
    const ptParsed = parseFloat(account?.profit_target)
    const maxDDClamped = !isNaN(maxDDParsed) ? Math.min(99, Math.max(0, maxDDParsed)) : 0
    const ptClamped = !isNaN(ptParsed) ? Math.min(500, Math.max(0, ptParsed)) : 0
    const ddFloor = maxDDClamped > 0 ? start * (1 - maxDDClamped / 100) : null
    const profitTarget = ptClamped > 0 ? start * (1 + ptClamped / 100) : null

    // New Daily Drawdown calculation (orange line - resets each day at configured time)
    // Floor recalculates from previous day's closing balance at the configured reset time
    const dailyDdEnabled = account?.daily_dd_enabled
    const dailyDdPctRaw = parseFloat(account?.daily_dd_pct)
    const dailyDdPct = !isNaN(dailyDdPctRaw) ? Math.min(99, Math.max(0, dailyDdPctRaw)) : 0
    const dailyDdResetTime = account?.daily_dd_reset_time || '00:00'
    const dailyDdResetTimezone = account?.daily_dd_reset_timezone || 'Europe/London'

    // Helper to get trading day for a trade based on reset time
    // If trade is before reset time, it belongs to previous day's session
    const getTradingDay = (tradeDate, tradeTime) => {
      if (!tradeDate) return null
      // Parse reset time safely (default to midnight if invalid)
      const resetParts = (dailyDdResetTime || '00:00').split(':')
      const resetHour = parseInt(resetParts[0]) || 0
      const resetMin = parseInt(resetParts[1]) || 0

      // Parse trade datetime
      const tradeDateTime = new Date(`${tradeDate}T${tradeTime || '12:00'}`)
      if (isNaN(tradeDateTime.getTime())) {
        // Fallback if datetime is invalid - just use the date
        return new Date(tradeDate).toDateString()
      }

      const tradeHour = tradeDateTime.getHours()
      const tradeMinute = tradeDateTime.getMinutes()

      // If trade is before reset time, it belongs to previous day's session
      if (tradeHour < resetHour || (tradeHour === resetHour && tradeMinute < resetMin)) {
        const prevDay = new Date(tradeDateTime)
        prevDay.setDate(prevDay.getDate() - 1)
        return prevDay.toDateString()
      }
      return tradeDateTime.toDateString()
    }

    let dailyDdFloorPoints = []
    const dailyDdType = account?.daily_dd_type || 'static'
    const dailyDdLocksAt = account?.daily_dd_locks_at || 'start_balance'
    const dailyDdLocksAtPctValue = parseFloat(account?.daily_dd_locks_at_pct) || 0
    if (dailyDdEnabled && dailyDdPct > 0) {
      // Group trades by trading day (accounting for reset time) and calculate daily floor
      // For trailing type, track highest floor and lock when threshold reached
      let currentDayStart = start
      let currentTradingDay = null
      let isLocked = false
      let lockedFloor = null
      // Calculate lock threshold based on dailyDdLocksAt setting
      const getLockThreshold = () => {
        if (dailyDdLocksAt === 'start_balance') return start
        if (dailyDdLocksAt === 'custom' && dailyDdLocksAtPctValue > 0) return start * (1 + dailyDdLocksAtPctValue / 100)
        return start
      }
      const lockThreshold = getLockThreshold()

      points.forEach((p, i) => {
        if (i === 0) {
          // Starting point - floor based on starting balance
          const floor = start * (1 - dailyDdPct / 100)
          dailyDdFloorPoints.push({ idx: i, floor, isNewDay: true })
        } else {
          const tradingDay = getTradingDay(p.date, p.time)
          const isNewDay = tradingDay && tradingDay !== currentTradingDay

          if (isNewDay) {
            // New trading day - recalculate floor from previous day's closing balance
            const prevBalance = points[i - 1].balance
            currentDayStart = currentTradingDay ? prevBalance : start
            currentTradingDay = tradingDay
          }

          let floor = currentDayStart * (1 - dailyDdPct / 100)

          // For trailing type, check if should lock
          if (dailyDdType === 'trailing' && !isLocked) {
            // Check if floor has reached lock threshold
            if (floor >= lockThreshold) {
              isLocked = true
              lockedFloor = lockThreshold
              floor = lockedFloor
            }
          } else if (dailyDdType === 'trailing' && isLocked) {
            // Keep at locked level
            floor = lockedFloor
          }

          dailyDdFloorPoints.push({ idx: i, floor, isNewDay })
        }
      })
    }

    // New Max Drawdown calculation (red line - static or trailing) - clamp to valid range
    const maxDdEnabled = account?.max_dd_enabled
    const maxDdPctRaw = parseFloat(account?.max_dd_pct)
    const maxDdPct = !isNaN(maxDdPctRaw) ? Math.min(99, Math.max(0, maxDdPctRaw)) : 0
    const maxDdType = account?.max_dd_type || 'static'
    const maxDdStopsAt = account?.max_dd_trailing_stops_at || 'never'
    const maxDdLocksAtPctValue = parseFloat(account?.max_dd_locks_at_pct) || 0
    let maxDdFloorPoints = []
    let maxDdStaticFloor = null
    if (maxDdEnabled && maxDdPct > 0) {
      if (maxDdType === 'static') {
        // Static - simple horizontal line
        maxDdStaticFloor = start * (1 - maxDdPct / 100)
      } else {
        // Trailing - floor moves up as balance increases
        let peak = start
        let trailingFloor = start * (1 - maxDdPct / 100)
        let isLocked = false
        let lockedFloor = null
        // Calculate lock threshold based on maxDdStopsAt setting
        const getLockThreshold = () => {
          if (maxDdStopsAt === 'initial') return start
          if (maxDdStopsAt === 'custom' && maxDdLocksAtPctValue > 0) return start * (1 + maxDdLocksAtPctValue / 100)
          return null // 'never' - no threshold
        }
        const lockThreshold = getLockThreshold()

        points.forEach((p, i) => {
          if (!isLocked && p.balance > peak) {
            peak = p.balance
            const newFloor = peak * (1 - maxDdPct / 100)
            // Check if trailing should stop (lock)
            if (lockThreshold && newFloor >= lockThreshold) {
              isLocked = true
              lockedFloor = lockThreshold
              trailingFloor = lockedFloor
            } else {
              trailingFloor = newFloor
            }
          } else if (isLocked) {
            // Keep at locked level
            trailingFloor = lockedFloor
          }
          maxDdFloorPoints.push({ idx: i, floor: trailingFloor })
        })
      }
    }

    // Track the lowest DD floor for padding calculation
    let lowestDdFloor = null

    // Only include DD floors/profit target in range when zoomed out
    if (showObjectiveLines) {
      // Include new DD floors in range calculation
      if (dailyDdFloorPoints.length > 0) {
        const minDailyFloor = Math.min(...dailyDdFloorPoints.map(p => p.floor))
        minBal = Math.min(minBal, minDailyFloor)
        lowestDdFloor = lowestDdFloor ? Math.min(lowestDdFloor, minDailyFloor) : minDailyFloor
      }
      if (maxDdStaticFloor) {
        minBal = Math.min(minBal, maxDdStaticFloor)
        lowestDdFloor = lowestDdFloor ? Math.min(lowestDdFloor, maxDdStaticFloor) : maxDdStaticFloor
      }
      if (maxDdFloorPoints.length > 0) {
        const minTrailingFloor = Math.min(...maxDdFloorPoints.map(p => p.floor))
        minBal = Math.min(minBal, minTrailingFloor)
        lowestDdFloor = lowestDdFloor ? Math.min(lowestDdFloor, minTrailingFloor) : minTrailingFloor
      }
      // Include legacy floor/target in range
      if (ddFloor) {
        minBal = Math.min(minBal, ddFloor)
        lowestDdFloor = lowestDdFloor ? Math.min(lowestDdFloor, ddFloor) : ddFloor
      }
      if (profitTarget) maxBal = Math.max(maxBal, profitTarget)
    }

    const hasNegative = minBal < 0
    const belowStart = minBal < start // Red if balance ever went below starting

    // Calculate tight Y-axis range based on actual data
    const actualMin = Math.min(minBal, start)
    const actualMax = Math.max(maxBal, start)
    const dataRange = actualMax - actualMin || 1000

    // To get 1/8 of TOTAL graph height as padding on each side:
    // If data takes 6/8 of total, padding = dataRange / 6 on each side
    const paddingAmount = dataRange / 6

    let yMax, yMin
    if (!showObjectiveLines) {
      // Tight fit: data + 1/8 padding on each side (total = dataRange * 4/3)
      yMax = actualMax + paddingAmount
      yMin = actualMin - paddingAmount
      // Don't go negative if not needed
      if (yMin < 0 && actualMin >= 0) yMin = 0
    } else {
      // Expanded fit for objective lines
      yMax = actualMax + paddingAmount
      yMin = actualMin - paddingAmount
      // Ensure profit target fits with padding
      if (profitTarget) yMax = Math.max(yMax, profitTarget + paddingAmount)
      // Ensure DD floors fit with padding
      if (lowestDdFloor !== null) yMin = Math.min(yMin, lowestDdFloor - paddingAmount)
    }

    // Calculate step size to get ~6 unique labels based on display range
    const displayRange = yMax - yMin || 1000
    const targetLabels = 6
    const rawStep = displayRange / (targetLabels - 1)

    // Round to a nice step value
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
    const normalized = rawStep / magnitude
    let niceStep
    if (normalized <= 1) niceStep = magnitude
    else if (normalized <= 2) niceStep = 2 * magnitude
    else if (normalized <= 2.5) niceStep = 2.5 * magnitude
    else if (normalized <= 5) niceStep = 5 * magnitude
    else niceStep = 10 * magnitude

    const yStep = niceStep
    yMax = Math.ceil(yMax / yStep) * yStep
    yMin = Math.floor(yMin / yStep) * yStep
    // Don't go negative if data is all positive
    if (yMin < 0 && actualMin >= 0 && !showObjectiveLines) yMin = 0

    const yRange = yMax - yMin || yStep

    // Calculate zero line position (percentage from top) - for when actual balance goes negative
    const zeroY = hasNegative ? ((yMax - 0) / yRange) * 100 : null
    // Calculate starting balance line
    const startLineY = ((yMax - start) / yRange) * 100
    // Calculate prop firm lines - always show if they exist
    const ddFloorY = ddFloor ? ((yMax - ddFloor) / yRange) * 100 : null
    const profitTargetY = profitTarget ? ((yMax - profitTarget) / yRange) * 100 : null

    const yLabels = []
    for (let v = yMax; v >= yMin; v -= yStep) {
      yLabels.push(v)
    }

    // Format y-axis label with appropriate precision based on step size
    const formatYLabel = (v) => {
      if (Math.abs(v) >= 1000000) return `$${(v/1000000).toFixed(1)}M`
      if (Math.abs(v) >= 1000) {
        // Use decimal precision when step is small to avoid duplicate labels
        const needsDecimal = yStep < 1000
        return needsDecimal ? `$${(v/1000).toFixed(1)}k` : `$${(v/1000).toFixed(0)}k`
      }
      return `$${v}`
    }

    const datesWithTrades = points.filter(p => p.date).map((p, idx) => ({ date: p.date, pointIdx: idx + 1 }))
    const xLabels = []
    if (datesWithTrades.length > 0) {
      const firstDate = new Date(datesWithTrades[0].date)
      const lastDate = new Date(datesWithTrades[datesWithTrades.length - 1].date)
      const totalDays = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)))

      // Determine interval and number of labels based on date range (supports up to 100 years)
      let intervalDays, numLabels
      if (totalDays <= 12) {
        intervalDays = 1
        numLabels = totalDays + 1
      } else if (totalDays <= 84) {
        intervalDays = 7
        numLabels = Math.min(12, Math.ceil(totalDays / 7) + 1)
      } else if (totalDays <= 180) {
        intervalDays = 14
        numLabels = Math.min(12, Math.ceil(totalDays / 14) + 1)
      } else if (totalDays <= 365) {
        intervalDays = 30
        numLabels = Math.min(12, Math.ceil(totalDays / 30) + 1)
      } else if (totalDays <= 730) {
        // 1-2 years: every 2 months
        intervalDays = 60
        numLabels = Math.min(12, Math.ceil(totalDays / 60) + 1)
      } else if (totalDays <= 1825) {
        // 2-5 years: quarterly
        intervalDays = 90
        numLabels = Math.min(12, Math.ceil(totalDays / 90) + 1)
      } else if (totalDays <= 3650) {
        // 5-10 years: every 6 months
        intervalDays = 180
        numLabels = Math.min(12, Math.ceil(totalDays / 180) + 1)
      } else if (totalDays <= 9125) {
        // 10-25 years: yearly
        intervalDays = 365
        numLabels = Math.min(12, Math.ceil(totalDays / 365) + 1)
      } else if (totalDays <= 18250) {
        // 25-50 years: every 2 years
        intervalDays = 730
        numLabels = Math.min(12, Math.ceil(totalDays / 730) + 1)
      } else {
        // 50-100 years: every 5 years
        intervalDays = 1825
        numLabels = Math.min(12, Math.ceil(totalDays / 1825) + 1)
      }

      // Generate labels from actual trade dates (evenly spaced selection)
      const actualLabels = Math.min(numLabels, datesWithTrades.length, 12)
      for (let i = 0; i < actualLabels; i++) {
        // Pick evenly spaced indices from actual trade dates
        const idx = actualLabels > 1 ? Math.round(i * (datesWithTrades.length - 1) / (actualLabels - 1)) : 0
        const trade = datesWithTrades[idx]
        if (trade?.date) {
          const d = new Date(trade.date)
          // Position based on the trade's actual position in the points array (5% to 95% range)
          const pct = datesWithTrades.length > 1 ? 5 + (idx / (datesWithTrades.length - 1)) * 90 : 50
          xLabels.push({ label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`, pct })
        }
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

    // Build SVG path for daily DD floor line (orange, stepped stair-step pattern)
    // Skip drawing when floor >= profit target to avoid overlap
    // Uses stepped pattern: horizontal line then vertical jump for each day change (_|_|_)
    let dailyDdPath = ''
    let dailyDdLastY = null
    if (dailyDdFloorPoints.length > 0) {
      const ddChartPoints = dailyDdFloorPoints.map((p, i) => {
        const x = points.length > 1 ? (p.idx / (points.length - 1)) * svgW : svgW / 2
        const y = svgH - ((p.floor - yMin) / yRange) * svgH
        // Track if floor is at or above profit target (should skip drawing)
        const aboveProfitTarget = profitTarget && p.floor >= profitTarget
        return { x, y, floor: p.floor, isNewDay: p.isNewDay, aboveProfitTarget }
      })
      // Build stepped path: skip segments where floor >= profit target to avoid overlap
      let pathParts = []
      let inPath = false
      for (let i = 0; i < ddChartPoints.length; i++) {
        const p = ddChartPoints[i]
        const prevP = i > 0 ? ddChartPoints[i - 1] : null

        if (p.aboveProfitTarget) {
          // Don't draw when at or above profit target
          inPath = false
          continue
        }

        if (!inPath) {
          // Start a new path segment
          pathParts.push(`M ${p.x} ${p.y}`)
          inPath = true
        } else {
          // Continue path: horizontal first, then vertical
          pathParts.push(`H ${p.x}`)
          if (prevP && p.y !== prevP.y && !prevP.aboveProfitTarget) {
            pathParts.push(`V ${p.y}`)
          }
        }
      }
      dailyDdPath = pathParts.join(' ')
      // Get last point Y position for label (as percentage) - find last visible point
      const lastVisiblePoint = ddChartPoints.filter(p => !p.aboveProfitTarget).pop()
      if (lastVisiblePoint) {
        dailyDdLastY = ((yMax - lastVisiblePoint.floor) / yRange) * 100
      }
    }

    // Build SVG path for trailing max DD floor line (red, follows curve)
    let trailingMaxDdPath = ''
    let trailingMaxDdLastY = null
    if (maxDdFloorPoints.length > 0) {
      const maxDdChartPoints = maxDdFloorPoints.map(p => {
        const x = points.length > 1 ? (p.idx / (points.length - 1)) * svgW : svgW / 2
        const y = svgH - ((p.floor - yMin) / yRange) * svgH
        return { x, y, floor: p.floor }
      })
      trailingMaxDdPath = maxDdChartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      // Get last point Y position for label (as percentage)
      const lastFloor = maxDdFloorPoints[maxDdFloorPoints.length - 1].floor
      trailingMaxDdLastY = ((yMax - lastFloor) / yRange) * 100
    }

    // Static max DD floor Y position (for horizontal line)
    const maxDdStaticFloorY = maxDdStaticFloor ? ((yMax - maxDdStaticFloor) / yRange) * 100 : null

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
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Chart row - Y-axis and chart area aligned */}
        <div style={{ flex: 1, display: 'flex' }}>
          {/* Y-axis labels */}
          <div style={{ width: '30px', flexShrink: 0, position: 'relative', borderRight: '1px solid #2a2a35', borderBottom: '1px solid transparent', overflow: 'visible' }}>
            {yLabels.map((v, i) => {
              const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
              return (
                <>
                  <span key={`label-${i}`} style={{ position: 'absolute', right: '5px', top: `${topPct}%`, transform: 'translateY(-50%)', fontSize: '10px', color: '#999', lineHeight: 1, textAlign: 'right' }}>{formatYLabel(v)}</span>
                  <div key={`tick-${i}`} style={{ position: 'absolute', right: 0, top: `${topPct}%`, width: '4px', borderTop: '1px solid #333' }} />
                </>
              )
            })}
            {/* Grey start value on Y-axis */}
            {startLineY !== null && (
              <>
                <span style={{ position: 'absolute', right: '5px', top: `${startLineY}%`, transform: 'translateY(-50%)', fontSize: '10px', color: '#888', lineHeight: 1, fontWeight: 600, textAlign: 'right' }}>{formatYLabel(start)}</span>
                <div style={{ position: 'absolute', right: 0, top: `${startLineY}%`, width: '4px', borderTop: '1px solid #888' }} />
              </>
            )}
          </div>
          {/* Chart area */}
          <div style={{ flex: 1, position: 'relative', overflow: 'visible', borderBottom: '1px solid #2a2a35' }}>
                        {/* Legend - shows above top grid line when objective lines are visible */}
            {showObjectiveLines && (
              <div style={{
                position: 'absolute',
                top: '4px',
                left: '8px',
                display: 'flex',
                gap: '12px',
                zIndex: 15,
                background: 'rgba(10, 10, 15, 0.85)',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '16px', height: '0', borderTop: '2px dashed #666' }} />
                  <span style={{ fontSize: '9px', color: '#666', fontWeight: 500 }}>Start</span>
                </div>
                {profitTargetY !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '16px', height: '0', borderTop: '2px solid #22c55e' }} />
                    <span style={{ fontSize: '9px', color: '#22c55e', fontWeight: 500 }}>Profit Target {account?.profit_target}%</span>
                  </div>
                )}
                {(maxDdStaticFloorY !== null || trailingMaxDdPath) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '16px', height: '0', borderTop: '2px solid #ef4444' }} />
                    <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 500 }}>
                      Max Drawdown {account?.max_dd_enabled ? `(${account?.max_dd_type === 'trailing' ? 'trailing' : 'static'}) ${account?.max_dd_pct}%` : `${account?.max_drawdown}%`}
                    </span>
                  </div>
                )}
                {dailyDdPath && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '16px', height: '0', borderTop: '2px solid #f97316' }} />
                    <span style={{ fontSize: '9px', color: '#f97316', fontWeight: 500 }}>Daily Drawdown ({account?.daily_dd_type === 'trailing' ? 'trailing' : 'static'}) {account?.daily_dd_pct}%</span>
                  </div>
                )}
              </div>
            )}
            {/* Horizontal grid lines - skip last one since borderBottom is X-axis */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {yLabels.map((_, i) => {
                if (i === yLabels.length - 1) return null
                const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                return <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${topPct}%`, borderTop: '1px solid rgba(51,51,51,0.5)' }} />
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
              {greenAreaPath && <path d={greenAreaPath} fill="url(#areaGradGreen)" />}
              {redAreaPath && <path d={redAreaPath} fill="url(#areaGradRed)" />}
              {greenPath && <path d={greenPath} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
              {redPath && <path d={redPath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
              {/* Daily DD floor line - orange, follows balance curve (only when showing objectives) */}
              {showObjectiveLines && dailyDdPath && <path d={dailyDdPath} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
              {/* Trailing Max DD floor line - red, follows peak curve (only when showing objectives) */}
              {showObjectiveLines && trailingMaxDdPath && <path d={trailingMaxDdPath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
            </svg>
            {/* Start line - CSS positioned for consistent fixed gap */}
            {startLineY !== null && (
              <div style={{ position: 'absolute', left: 0, right: 0, top: `${startLineY}%`, borderTop: '1px dashed #666', zIndex: 1 }} />
            )}
            {/* DD Floor line - red solid (legacy) - only when showing objectives */}
            {showObjectiveLines && ddFloorY !== null && !maxDdEnabled && (
              <div
                style={{ position: 'absolute', left: 0, right: 0, top: `${ddFloorY}%`, height: '12px', transform: 'translateY(-50%)', cursor: 'pointer', zIndex: 2 }}
                onMouseEnter={() => setHoverLine({ type: 'maxDd', value: ddFloor, y: ddFloorY, label: 'Max Drawdown' })}
                onMouseLeave={() => setHoverLine(null)}
              >
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '2px solid #ef4444' }} />
              </div>
            )}
            {/* Static Max DD floor line - red solid horizontal - only when showing objectives */}
            {showObjectiveLines && maxDdStaticFloorY !== null && (
              <div
                style={{ position: 'absolute', left: 0, right: 0, top: `${maxDdStaticFloorY}%`, height: '12px', transform: 'translateY(-50%)', cursor: 'pointer', zIndex: 2 }}
                onMouseEnter={() => setHoverLine({ type: 'maxDd', value: maxDdStaticFloor, y: maxDdStaticFloorY, label: 'Max Drawdown' })}
                onMouseLeave={() => setHoverLine(null)}
              >
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '2px solid #ef4444' }} />
              </div>
            )}
            {/* Profit target line - green solid - only when showing objectives */}
            {showObjectiveLines && profitTargetY !== null && (
              <div
                style={{ position: 'absolute', left: 0, right: 0, top: `${profitTargetY}%`, height: '12px', transform: 'translateY(-50%)', cursor: 'pointer', zIndex: 2 }}
                onMouseEnter={() => setHoverLine({ type: 'target', value: profitTarget, y: profitTargetY, label: 'Target' })}
                onMouseLeave={() => setHoverLine(null)}
              >
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '2px solid #22c55e' }} />
              </div>
            )}
            {/* Objective line hover tooltip */}
            {hoverLine && (
              <div style={{
                position: 'absolute',
                left: '50%',
                top: `${hoverLine.y}%`,
                transform: 'translate(-50%, -100%)',
                background: '#1a1a22',
                border: `1px solid ${hoverLine.type === 'target' ? '#22c55e' : hoverLine.type === 'dailyDd' ? '#f97316' : '#ef4444'}`,
                borderRadius: '6px',
                padding: '6px 10px',
                fontSize: '11px',
                whiteSpace: 'nowrap',
                zIndex: 15,
                pointerEvents: 'none',
                marginTop: '-8px'
              }}>
                <div style={{ color: hoverLine.type === 'target' ? '#22c55e' : hoverLine.type === 'dailyDd' ? '#f97316' : '#ef4444', fontWeight: 600 }}>
                  {hoverLine.label}: ${hoverLine.value?.toLocaleString()}
                </div>
              </div>
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
        </div>

        {/* X-axis row - spacer + labels */}
        <div style={{ display: 'flex', height: '26px' }}>
          <div style={{ width: '30px', flexShrink: 0 }} />
          <div style={{ flex: 1, position: 'relative', overflow: 'visible' }}>
            {xLabels.map((l, i) => (
              <div key={i} style={{ position: 'absolute', left: `${l.pct}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '1px', height: '4px', background: '#2a2a35' }} />
                <span style={{ fontSize: '10px', color: '#999', whiteSpace: 'nowrap', marginTop: '4px' }}>{l.label}</span>
              </div>
            ))}
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
    return <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: '40px', marginBottom: '16px', fontWeight: 700 }}><span style={{ color: '#22c55e' }}>TRADE</span><span style={{ color: '#fff' }}>SAVE</span><span style={{ color: '#22c55e' }}>+</span></div><div style={{ color: '#999' }}>Loading...</div></div></div>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      {/* Header */}
      <header style={{ padding: '4px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a22', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: '12px' }}>
        <a href="/" style={{ fontSize: isMobile ? '28px' : '42px', fontWeight: 700, textDecoration: 'none', letterSpacing: '-0.5px' }}>
          <span style={{ color: '#22c55e' }}>TRADE</span><span style={{ color: '#fff' }}>SAVE</span><span style={{ color: '#22c55e' }}>+</span>
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
          <button onClick={() => setShowModal(true)} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{isMobile ? '+ Add' : '+ Add Journal'}</button>
          <button onClick={() => { setShowImportModal(true); setImportStep(1); setImportFile(null); setImportData([]); setImportHeaders([]); setImportMapping({}); setImportJournalName(''); setImportStartingBalance(''); setImportError('') }} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 0 15px rgba(147,51,234,0.3)' }}>{isMobile ? 'Import' : 'Import Journal'}</button>
          <a href="/settings" style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '13px', textDecoration: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} title="Settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </a>
        </div>
      </header>

      <div style={{ maxWidth: '1800px', margin: '0 auto', padding: '16px', minHeight: 'calc(100vh - 80px)' }}>
        {/* Main Layout: LOG TRADE Sidebar (left) + Main Content (right 2/3) */}
        {!isMobile && accounts.length > 0 ? (
          <div style={{ display: 'flex', gap: '20px' }}>
            {/* LOG TRADE Widget - Fixed Left Sidebar */}
            <div style={{ width: '280px', flexShrink: 0, background: 'linear-gradient(135deg, #0f0f14 0%, #0a0a0f 100%)', border: '1px solid #1a1a22', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', alignSelf: 'flex-start' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(34,197,94,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                      <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 700, letterSpacing: '1px' }}>LOG TRADE</span>
                    </div>
                    {getSelectedAccountCustomInputs().length > 2 && (
                      <button onClick={() => setSidebarExpanded(true)} style={{ padding: '6px 8px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', color: '#22c55e', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Expand">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Journal Select - Dropdown */}
                  <div style={{ marginBottom: '14px', position: 'relative' }}>
                    <button onClick={() => setJournalDropdownOpen(!journalDropdownOpen)} style={{ width: '100%', padding: '10px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: journalDropdownOpen ? '10px 10px 0 0' : '10px', color: '#22c55e', fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 4px #22c55e' }} />
                        {accounts.find(a => a.id === quickTradeAccount)?.name || 'Select Journal'}
                      </div>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: journalDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                    {journalDropdownOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0d0d12', border: '1px solid rgba(34,197,94,0.3)', borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '6px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                        {accounts.map(acc => {
                          const isSelected = quickTradeAccount === acc.id
                          const accTrades = trades[acc.id] || []
                          const totalPnl = accTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
                          return (
                            <button key={acc.id} onClick={() => { setQuickTradeAccount(acc.id); setJournalDropdownOpen(false) }} style={{ width: '100%', padding: '10px 12px', background: isSelected ? 'rgba(34,197,94,0.12)' : '#0a0a0f', border: `1px solid ${isSelected ? 'rgba(34,197,94,0.4)' : '#1a1a22'}`, borderRadius: '8px', color: isSelected ? '#22c55e' : '#999', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: isSelected ? '#22c55e' : '#444' }} />
                                  {acc.name}
                                </div>
                                <span style={{ fontSize: '11px', color: totalPnl >= 0 ? '#22c55e' : '#ef4444' }}>{totalPnl >= 0 ? '+' : ''}${Math.round(totalPnl).toLocaleString()}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Core Fields Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '9px', color: '#555', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Symbol</label>
                      <input type="text" value={quickTradeSymbol} onChange={e => setQuickTradeSymbol(e.target.value)} placeholder="XAUUSD" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', transition: 'border-color 0.2s' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '9px', color: '#555', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>P&L ($)</label>
                      <input type="number" value={quickTradePnl} onChange={e => setQuickTradePnl(e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                  </div>

                  {/* Direction + Outcome Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '9px', color: '#555', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Direction</label>
                      <select value={quickTradeDirection} onChange={e => setQuickTradeDirection(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: quickTradeDirection === 'long' ? '#22c55e' : quickTradeDirection === 'short' ? '#ef4444' : '#fff', fontSize: '13px', boxSizing: 'border-box', cursor: 'pointer' }}>
                        <option value="long">Long</option>
                        <option value="short">Short</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '9px', color: '#555', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Outcome</label>
                      <select value={quickTradeOutcome} onChange={e => setQuickTradeOutcome(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: quickTradeOutcome === 'win' ? '#22c55e' : quickTradeOutcome === 'loss' ? '#ef4444' : '#f59e0b', fontSize: '13px', boxSizing: 'border-box', cursor: 'pointer' }}>
                        <option value="win">Win</option>
                        <option value="loss">Loss</option>
                        <option value="be">Breakeven</option>
                      </select>
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

                  {/* Optional Fields */}
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
                                {isHalfStar && <span style={{ position: 'absolute', color: '#22c55e', fontSize: '24px', lineHeight: 1, width: '48%', overflow: 'hidden' }}>★</span>}
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
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={submitQuickTrade} disabled={submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate} style={{ flex: 1, padding: '12px', background: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate) ? '#1a1a22' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', border: 'none', borderRadius: '10px', color: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate) ? '#555' : '#fff', fontWeight: 700, fontSize: '13px', cursor: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate) ? 'none' : '0 4px 20px rgba(34,197,94,0.4)' }}>
                      {submittingTrade ? 'Adding...' : 'Log Trade'}
                    </button>
                    <button onClick={() => setShowEditInputsModal(true)} style={{ padding: '12px 14px', background: '#0a0a0f', border: '1px solid #2a2a35', borderRadius: '10px', color: '#666', fontWeight: 500, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                  </div>
                </div>

              {/* Right Content Area (Overall Stats + Journal Cards) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Overall Stats */}
                {(() => {
                  const stats = getCumulativeStats()
                  const allTrades = getAllTrades()
                  let cumPnl = 0
                  const sortedTrades = allTrades.slice().sort((a, b) => new Date(a.date) - new Date(b.date))
                  const pnlPoints = sortedTrades.map(t => {
                    cumPnl += parseFloat(t.pnl) || 0
                    return { value: cumPnl, date: t.date, symbol: t.symbol, pnl: parseFloat(t.pnl) || 0 }
                  })
                  const today = new Date().toISOString().split('T')[0]
                  const todaysPnl = allTrades.filter(t => t.date === today).reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
                  const uniqueDays = new Set(allTrades.map(t => t.date)).size
                  const dailyPnls = {}
                  allTrades.forEach(t => { dailyPnls[t.date] = (dailyPnls[t.date] || 0) + (parseFloat(t.pnl) || 0) })
                  const bestDay = Object.values(dailyPnls).length > 0 ? Math.max(...Object.values(dailyPnls)) : 0
                  const worstDay = Object.values(dailyPnls).length > 0 ? Math.min(...Object.values(dailyPnls)) : 0

                  // Additional stats calculations
                  const winningTrades = allTrades.filter(t => t.outcome === 'win')
                  const losingTrades = allTrades.filter(t => t.outcome === 'loss')
                  const avgRR = allTrades.length > 0 ? (allTrades.reduce((sum, t) => sum + (parseFloat(t.rr) || 0), 0) / allTrades.length).toFixed(1) : '-'
                  const expectancy = allTrades.length > 0 ? Math.round(cumPnl / allTrades.length) : 0
                  const avgWin = winningTrades.length > 0 ? Math.round(winningTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0) / winningTrades.length) : 0
                  const avgLoss = losingTrades.length > 0 ? Math.round(losingTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0) / losingTrades.length) : 0
                  const longTrades = allTrades.filter(t => t.direction === 'long' || t.direction === 'Long')
                  const shortTrades = allTrades.filter(t => t.direction === 'short' || t.direction === 'Short')
                  const longWins = longTrades.filter(t => t.outcome === 'win').length
                  const shortWins = shortTrades.filter(t => t.outcome === 'win').length
                  const longWR = longTrades.length > 0 ? Math.round((longWins / longTrades.length) * 100) : 0
                  const shortWR = shortTrades.length > 0 ? Math.round((shortWins / shortTrades.length) * 100) : 0
                  const profitableDays = Object.values(dailyPnls).filter(v => v > 0).length
                  const dayWR = uniqueDays > 0 ? Math.round((profitableDays / uniqueDays) * 100) : 0
                  const consistency = uniqueDays > 0 ? Math.round((profitableDays / uniqueDays) * 100) : 0
                  // Win/Loss streaks
                  let winStreak = 0, lossStreak = 0, currentWin = 0, currentLoss = 0
                  sortedTrades.forEach(t => {
                    if (t.outcome === 'win') { currentWin++; currentLoss = 0; if (currentWin > winStreak) winStreak = currentWin }
                    else if (t.outcome === 'loss') { currentLoss++; currentWin = 0; if (currentLoss > lossStreak) lossStreak = currentLoss }
                  })

                  return (
                    <div style={{ background: 'linear-gradient(135deg, #0f0f14 0%, #0a0a0f 100%)', border: '1px solid #1a1a22', borderRadius: '16px', padding: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                      {/* Title + PnL + % Change */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>Overall Stats</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: cumPnl >= 0 ? '#22c55e' : '#ef4444' }}>{cumPnl >= 0 ? '+' : ''}${Math.round(cumPnl).toLocaleString()}</div>
                          <div style={{ padding: '4px 8px', background: cumPnl >= 0 ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: cumPnl >= 0 ? '#22c55e' : '#ef4444' }}>
                            {(() => {
                              const pctChange = stats.totalStartingBalance > 0 ? ((cumPnl / stats.totalStartingBalance) * 100).toFixed(1) : '0.0'
                              return `${parseFloat(pctChange) >= 0 ? '+' : ''}${pctChange}%`
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Graph Section - 12px from left border */}
                      <div style={{ marginLeft: '12px', marginBottom: '12px' }}>
                        {(() => {
                          const startBal = stats.totalStartingBalance || 0
                          let runningBal = startBal
                          const balancePoints = [{ value: startBal, date: null, symbol: null, pnl: 0 }]
                          sortedTrades.forEach(t => {
                            runningBal += parseFloat(t.pnl) || 0
                            balancePoints.push({ value: runningBal, date: t.date, symbol: t.symbol, pnl: parseFloat(t.pnl) || 0 })
                          })

                          if (balancePoints.length < 2) {
                            return <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '12px' }}>No data yet</div>
                          }

                          const svgW = 100, svgH = 100
                          const allValues = balancePoints.map(p => p.value)
                          const dataMin = Math.min(...allValues, startBal)
                          const dataMax = Math.max(...allValues, startBal)
                          const dataRange = dataMax - dataMin || 1000
                          const paddingAmt = dataRange / 6

                          let yMin = dataMin - paddingAmt
                          let yMax = dataMax + paddingAmt
                          if (yMin < 0 && dataMin >= 0) yMin = 0

                          const displayRange = yMax - yMin || 1000
                          const targetLabels = 6
                          const rawStep = displayRange / (targetLabels - 1)
                          const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
                          const normalized = rawStep / magnitude
                          let niceStep
                          if (normalized <= 1) niceStep = magnitude
                          else if (normalized <= 2) niceStep = 2 * magnitude
                          else if (normalized <= 2.5) niceStep = 2.5 * magnitude
                          else if (normalized <= 5) niceStep = 5 * magnitude
                          else niceStep = 10 * magnitude

                          yMax = Math.ceil(yMax / niceStep) * niceStep
                          yMin = Math.floor(yMin / niceStep) * niceStep
                          if (yMin < 0 && dataMin >= 0) yMin = 0
                          const yRange = yMax - yMin || niceStep

                          const yLabels = []
                          for (let v = yMax; v >= yMin; v -= niceStep) yLabels.push(v)

                          const formatY = (v) => {
                            if (Math.abs(v) >= 1000000) return `$${(v/1000000).toFixed(1)}M`
                            if (Math.abs(v) >= 1000) return `$${(v/1000).toFixed(niceStep < 1000 ? 1 : 0)}k`
                            return `$${v}`
                          }

                          const xLabels = []
                          if (sortedTrades.length > 0) {
                            const firstDate = new Date(sortedTrades[0].date)
                            const lastDate = new Date(sortedTrades[sortedTrades.length - 1].date)
                            const totalDays = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)))
                            const numLabels = Math.min(6, sortedTrades.length + 1)
                            for (let i = 0; i < numLabels; i++) {
                              const pct = numLabels > 1 ? 5 + (i / (numLabels - 1)) * 90 : 50
                              const dateOffset = numLabels > 1 ? Math.round((i / (numLabels - 1)) * totalDays) : 0
                              const labelDate = new Date(firstDate.getTime() + dateOffset * 24 * 60 * 60 * 1000)
                              xLabels.push({ label: `${String(labelDate.getDate()).padStart(2, '0')}/${String(labelDate.getMonth() + 1).padStart(2, '0')}`, pct })
                            }
                          }

                          const chartPts = balancePoints.map((p, i) => ({
                            x: (i / (balancePoints.length - 1)) * svgW,
                            y: svgH - ((p.value - yMin) / yRange) * svgH,
                            balance: p.value,
                            date: p.date,
                            symbol: p.symbol,
                            pnl: p.pnl
                          }))

                          const startLineY = ((yMax - startBal) / yRange) * 100
                          const startSvgY = svgH - ((startBal - yMin) / yRange) * svgH

                          const greenSegs = [], redSegs = []
                          for (let i = 0; i < chartPts.length - 1; i++) {
                            const p1 = chartPts[i], p2 = chartPts[i + 1]
                            const above1 = p1.balance >= startBal, above2 = p2.balance >= startBal
                            if (above1 === above2) {
                              (above1 ? greenSegs : redSegs).push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
                            } else {
                              const t = (startBal - p1.balance) / (p2.balance - p1.balance)
                              const ix = p1.x + t * (p2.x - p1.x)
                              if (above1) {
                                greenSegs.push({ x1: p1.x, y1: p1.y, x2: ix, y2: startSvgY })
                                redSegs.push({ x1: ix, y1: startSvgY, x2: p2.x, y2: p2.y })
                              } else {
                                redSegs.push({ x1: p1.x, y1: p1.y, x2: ix, y2: startSvgY })
                                greenSegs.push({ x1: ix, y1: startSvgY, x2: p2.x, y2: p2.y })
                              }
                            }
                          }

                          const mkPath = segs => segs.map(s => `M${s.x1},${s.y1}L${s.x2},${s.y2}`).join('')
                          const mkArea = segs => segs.map(s => `M${s.x1},${s.y1}L${s.x2},${s.y2}L${s.x2},${startSvgY}L${s.x1},${startSvgY}Z`).join('')

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <div style={{ display: 'flex', height: '180px' }}>
                                {/* Y-axis */}
                                <div style={{ width: '36px', flexShrink: 0, position: 'relative', borderRight: '1px solid #2a2a35', overflow: 'visible' }}>
                                  {yLabels.map((v, i) => {
                                    const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                                    return (
                                      <Fragment key={i}>
                                        <span style={{ position: 'absolute', right: '6px', top: `${topPct}%`, transform: 'translateY(-50%)', fontSize: '8px', color: '#888', lineHeight: 1, whiteSpace: 'nowrap' }}>{formatY(v)}</span>
                                        <div style={{ position: 'absolute', right: 0, top: `${topPct}%`, width: '4px', borderTop: '1px solid #2a2a35' }} />
                                      </Fragment>
                                    )
                                  })}
                                  {startLineY >= 0 && startLineY <= 100 && (
                                    <Fragment>
                                      <span style={{ position: 'absolute', right: '6px', top: `${startLineY}%`, transform: 'translateY(-50%)', fontSize: '8px', color: '#666', lineHeight: 1, whiteSpace: 'nowrap', fontWeight: 600 }}>{formatY(startBal)}</span>
                                      <div style={{ position: 'absolute', right: 0, top: `${startLineY}%`, width: '4px', borderTop: '1px solid #666' }} />
                                    </Fragment>
                                  )}
                                </div>
                                {/* Chart area */}
                                <div style={{ flex: 1, position: 'relative', borderBottom: '1px solid #2a2a35', overflow: 'visible' }}>
                                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                                    {yLabels.map((_, i) => {
                                      const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                                      if (i === yLabels.length - 1) return null
                                      return <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${topPct}%`, borderTop: '1px solid rgba(51,51,51,0.5)' }} />
                                    })}
                                  </div>
                                  {startLineY >= 0 && startLineY <= 100 && (
                                    <div style={{ position: 'absolute', left: 0, right: 0, top: `${startLineY}%`, borderTop: '1px dashed #555', zIndex: 1 }} />
                                  )}
                                  <svg
                                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 2 }}
                                    viewBox={`0 0 ${svgW} ${svgH}`}
                                    preserveAspectRatio="none"
                                    onMouseMove={e => {
                                      const rect = e.currentTarget.getBoundingClientRect()
                                      const mouseX = ((e.clientX - rect.left) / rect.width) * svgW
                                      let closest = chartPts[0], minDist = Math.abs(mouseX - chartPts[0].x)
                                      chartPts.forEach(p => {
                                        const d = Math.abs(mouseX - p.x)
                                        if (d < minDist) { minDist = d; closest = p }
                                      })
                                      setDashHover({ ...closest, xPct: (closest.x / svgW) * 100, yPct: (closest.y / svgH) * 100 })
                                    }}
                                    onMouseLeave={() => setDashHover(null)}
                                  >
                                    <defs>
                                      <linearGradient id="dashGr" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" /><stop offset="100%" stopColor="#22c55e" stopOpacity="0" /></linearGradient>
                                      <linearGradient id="dashRd" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" /><stop offset="100%" stopColor="#ef4444" stopOpacity="0" /></linearGradient>
                                    </defs>
                                    <path d={mkArea(greenSegs)} fill="url(#dashGr)" />
                                    <path d={mkArea(redSegs)} fill="url(#dashRd)" />
                                    <path d={mkPath(greenSegs)} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                    <path d={mkPath(redSegs)} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                  </svg>
                                  {dashHover && <div style={{ position: 'absolute', left: `${dashHover.xPct}%`, top: `${dashHover.yPct}%`, transform: 'translate(-50%, -50%)', width: '10px', height: '10px', borderRadius: '50%', background: dashHover.balance >= startBal ? '#22c55e' : '#ef4444', border: '2px solid #fff', pointerEvents: 'none', zIndex: 10 }} />}
                                  {dashHover && (
                                    <div style={{ position: 'absolute', left: `${dashHover.xPct}%`, top: `${dashHover.yPct}%`, transform: `translate(${dashHover.xPct > 70 ? 'calc(-100% - 12px)' : '12px'}, ${dashHover.yPct < 25 ? '0%' : dashHover.yPct > 75 ? '-100%' : '-50%'})`, background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '8px 12px', fontSize: '11px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
                                      <div style={{ color: '#888', fontSize: '10px' }}>{dashHover.date ? new Date(dashHover.date).toLocaleDateString() : 'Start'}</div>
                                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>${dashHover.balance?.toLocaleString()}</div>
                                      {dashHover.symbol && <div style={{ color: dashHover.pnl >= 0 ? '#22c55e' : '#ef4444', marginTop: '2px' }}>{dashHover.symbol}: {dashHover.pnl >= 0 ? '+' : ''}${dashHover.pnl?.toFixed(0)}</div>}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* X-axis - 12px margin bottom */}
                              <div style={{ display: 'flex', marginBottom: '12px' }}>
                                <div style={{ width: '36px', flexShrink: 0 }} />
                                <div style={{ flex: 1, height: '22px', position: 'relative' }}>
                                  {xLabels.map((l, i) => (
                                    <div key={i} style={{ position: 'absolute', left: `${l.pct}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                      <div style={{ width: '1px', height: '4px', background: '#2a2a35' }} />
                                      <span style={{ fontSize: '8px', color: '#888', marginTop: '2px', whiteSpace: 'nowrap' }}>{l.label}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )
                        })()}
                      </div>

                      {/* Stats Row - 2 columns, label left, value right */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', marginBottom: '12px' }}>
                        {[
                          { label: 'Total PnL', value: `${cumPnl >= 0 ? '+' : ''}$${Math.round(cumPnl).toLocaleString()}`, color: cumPnl >= 0 ? '#22c55e' : '#ef4444' },
                          { label: 'Total Trades', value: stats.totalTrades, color: '#fff' },
                          { label: 'Winrate', value: `${stats.winrate}%`, color: stats.winrate >= 50 ? '#22c55e' : '#ef4444' },
                          { label: 'Profit Factor', value: stats.profitFactor, color: stats.profitFactor === '-' ? '#666' : stats.profitFactor === '∞' ? '#22c55e' : parseFloat(stats.profitFactor) >= 1 ? '#22c55e' : '#ef4444' },
                          { label: 'Avg RR', value: avgRR, color: '#fff' },
                          { label: 'Expectancy', value: `${expectancy >= 0 ? '+' : ''}$${expectancy}`, color: expectancy >= 0 ? '#22c55e' : '#ef4444' },
                          { label: 'Avg Win', value: `+$${avgWin}`, color: '#22c55e' },
                          { label: 'Avg Loss', value: `${avgLoss >= 0 ? '+' : ''}$${avgLoss}`, color: avgLoss >= 0 ? '#22c55e' : '#ef4444' },
                          { label: 'Long WR', value: `${longWR}%`, color: longWR >= 50 ? '#22c55e' : '#ef4444' },
                          { label: 'Short WR', value: `${shortWR}%`, color: shortWR >= 50 ? '#22c55e' : '#ef4444' },
                          { label: 'Day WR', value: `${dayWR}%`, color: dayWR >= 50 ? '#22c55e' : '#ef4444' },
                          { label: 'Consistency', value: `${consistency}%`, color: consistency >= 50 ? '#22c55e' : '#ef4444' },
                          { label: 'Win Streak', value: winStreak, color: '#22c55e' },
                          { label: 'Loss Streak', value: lossStreak, color: '#ef4444' },
                        ].map((s, i) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                            <span style={{ fontSize: '12px', color: '#888' }}>{s.label}</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: s.color }}>{s.value}</span>
                          </div>
                        ))}
                      </div>

                      {/* Recent Trades Row - Horizontal */}
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Recent Trades</div>
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto' }}>
                          {(() => {
                            const recent = allTrades.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10)
                            if (recent.length === 0) return <div style={{ padding: '12px', textAlign: 'center', color: '#444', fontSize: '11px' }}>No trades</div>
                            return recent.map((t, i) => {
                              const pnl = parseFloat(t.pnl) || 0
                              const isWin = t.outcome === 'win'
                              return (
                                <div key={i} style={{ flex: '0 0 auto', padding: '8px 12px', background: '#0d0d12', borderRadius: '6px', border: '1px solid #1a1a22', minWidth: '80px', textAlign: 'center' }}>
                                  <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>{t.symbol || '-'}</div>
                                  <div style={{ fontSize: '13px', fontWeight: 700, color: pnl >= 0 ? '#22c55e' : '#ef4444', marginBottom: '4px' }}>{pnl >= 0 ? '+' : ''}${Math.round(pnl)}</div>
                                  <span style={{ fontSize: '8px', padding: '2px 6px', borderRadius: '3px', fontWeight: 700, background: isWin ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: isWin ? '#22c55e' : '#ef4444' }}>{isWin ? 'WIN' : 'LOSS'}</span>
                                </div>
                              )
                            })
                          })()}
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Journal Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
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
                    const isProfitable = totalPnl >= 0

                    // Calculate equity curve points for mini graph
                    const startingBalance = parseFloat(account.starting_balance) || 0
                    let cumBalance = startingBalance
                    const sortedTrades = accTrades.slice().sort((a, b) => new Date(a.date) - new Date(b.date))
                    const balancePoints = [{ value: startingBalance }]
                    sortedTrades.forEach(t => {
                      cumBalance += parseFloat(t.pnl) || 0
                      balancePoints.push({ value: cumBalance })
                    })

                    // Get objective lines
                    const profitTargetPct = parseFloat(account.profit_target)
                    const profitTarget = !isNaN(profitTargetPct) && profitTargetPct > 0 ? startingBalance * (1 + profitTargetPct / 100) : null
                    const maxDdPct = parseFloat(account.max_dd_enabled ? account.max_dd_pct : account.max_drawdown)
                    const maxDdFloor = !isNaN(maxDdPct) && maxDdPct > 0 ? startingBalance * (1 - maxDdPct / 100) : null

                    // Calculate range including objective lines
                    let maxBal = balancePoints.length > 0 ? Math.max(...balancePoints.map(p => p.value)) : startingBalance
                    let minBal = balancePoints.length > 0 ? Math.min(...balancePoints.map(p => p.value)) : startingBalance
                    if (profitTarget) maxBal = Math.max(maxBal, profitTarget)
                    if (maxDdFloor) minBal = Math.min(minBal, maxDdFloor)

                    return (
                      <div key={account.id} style={{ background: 'linear-gradient(135deg, #0f0f14 0%, #0a0a0f 100%)', border: '1px solid #1a1a22', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                        {/* Header - Title + PnL + % Change */}
                        <div style={{ padding: '16px 18px', borderBottom: `1px solid ${isProfitable ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, background: isProfitable ? 'linear-gradient(135deg, rgba(34,197,94,0.05) 0%, transparent 100%)' : 'linear-gradient(135deg, rgba(239,68,68,0.05) 0%, transparent 100%)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{account.name}</span>
                              <button onClick={(e) => { e.stopPropagation(); setEditName(account.name); setEditProfitTarget(account.profit_target || ''); setEditMaxDrawdown(account.max_drawdown || ''); setEditConsistencyEnabled(account.consistency_enabled || false); setEditConsistencyPct(account.consistency_pct || '30'); setEditDailyDdEnabled(account.daily_dd_enabled || false); setEditDailyDdPct(account.daily_dd_pct || ''); setEditDailyDdType(account.daily_dd_type || 'static'); setEditDailyDdLocksAt(account.daily_dd_locks_at || 'start_balance'); setEditDailyDdLocksAtPct(account.daily_dd_locks_at_pct || ''); setEditDailyDdResetTime(account.daily_dd_reset_time || '00:00'); setEditDailyDdResetTimezone(account.daily_dd_reset_timezone || 'Europe/London'); setEditMaxDdEnabled(account.max_dd_enabled || false); setEditMaxDdPct(account.max_dd_pct || ''); setEditMaxDdType(account.max_dd_type || 'static'); setEditMaxDdTrailingStopsAt(account.max_dd_trailing_stops_at || 'never'); setEditMaxDdLocksAtPct(account.max_dd_locks_at_pct || ''); setShowEditModal(account.id) }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #2a2a35', borderRadius: '6px', cursor: 'pointer', padding: '4px 6px', display: 'flex', alignItems: 'center' }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                              </button>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ fontSize: '18px', fontWeight: 800, color: isProfitable ? '#22c55e' : '#ef4444' }}>{totalPnl >= 0 ? '+' : ''}${totalPnl.toLocaleString()}</div>
                              <div style={{ padding: '4px 8px', background: isProfitable ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', borderRadius: '6px', fontSize: '12px', fontWeight: 700, color: isProfitable ? '#22c55e' : '#ef4444' }}>
                                {(() => {
                                  const startBal = parseFloat(account.starting_balance) || 0
                                  const pctChange = startBal > 0 ? ((totalPnl / startBal) * 100).toFixed(1) : '0.0'
                                  return `${parseFloat(pctChange) >= 0 ? '+' : ''}${pctChange}%`
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Mini Graph with objective lines */}
                        <div style={{ padding: '12px 18px' }}>
                          <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {balancePoints.length > 1 ? (() => {
                              const svgW = 250, svgH = 100
                              // Add padding to range
                              const dataRange = maxBal - minBal || 1000
                              const paddingAmount = dataRange / 8
                              const yMax = maxBal + paddingAmount
                              const yMin = minBal - paddingAmount
                              const yRange = yMax - yMin || 1

                              // Calculate starting balance Y position
                              const startY = svgH - ((startingBalance - yMin) / yRange) * svgH
                              const startLineYPct = ((yMax - startingBalance) / yRange) * 100

                              // Calculate objective line positions
                              const profitTargetYPct = profitTarget ? ((yMax - profitTarget) / yRange) * 100 : null
                              const maxDdFloorYPct = maxDdFloor ? ((yMax - maxDdFloor) / yRange) * 100 : null

                              const chartPts = balancePoints.map((p, i) => ({
                                x: (i / (balancePoints.length - 1)) * svgW,
                                y: svgH - ((p.value - yMin) / yRange) * svgH,
                                balance: p.value
                              }))

                              // Build split paths (green above start, red below)
                              const greenSegments = [], redSegments = []
                              for (let i = 0; i < chartPts.length - 1; i++) {
                                const p1 = chartPts[i], p2 = chartPts[i + 1]
                                const above1 = p1.balance >= startingBalance, above2 = p2.balance >= startingBalance
                                if (above1 === above2) {
                                  const arr = above1 ? greenSegments : redSegments
                                  arr.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
                                } else {
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
                              const buildPath = (segs) => segs.map((s) => `M ${s.x1} ${s.y1} L ${s.x2} ${s.y2}`).join(' ')
                              const buildAreaPath = (segs) => segs.map(s => `M ${s.x1} ${s.y1} L ${s.x2} ${s.y2} L ${s.x2} ${startY} L ${s.x1} ${startY} Z`).join(' ')
                              const greenPath = buildPath(greenSegments)
                              const redPath = buildPath(redSegments)
                              const greenAreaPath = buildAreaPath(greenSegments)
                              const redAreaPath = buildAreaPath(redSegments)

                              return (
                                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                  {/* Starting balance dashed line */}
                                  {startLineYPct >= 0 && startLineYPct <= 100 && (
                                    <div style={{ position: 'absolute', left: 0, right: 0, top: `${startLineYPct}%`, borderTop: '1px dashed #555', zIndex: 1 }} />
                                  )}
                                  {/* Profit target line - green */}
                                  {profitTargetYPct !== null && profitTargetYPct >= 0 && profitTargetYPct <= 100 && (
                                    <div style={{ position: 'absolute', left: 0, right: 0, top: `${profitTargetYPct}%`, borderTop: '1px solid #22c55e', zIndex: 1 }} />
                                  )}
                                  {/* Max DD floor line - red */}
                                  {maxDdFloorYPct !== null && maxDdFloorYPct >= 0 && maxDdFloorYPct <= 100 && (
                                    <div style={{ position: 'absolute', left: 0, right: 0, top: `${maxDdFloorYPct}%`, borderTop: '1px solid #ef4444', zIndex: 1 }} />
                                  )}
                                  <svg width="100%" height="100%" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none" style={{ position: 'relative', zIndex: 2 }}>
                                    <defs>
                                      <linearGradient id={`eqGreenMini${account.id}`} x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" /><stop offset="100%" stopColor="#22c55e" stopOpacity="0" /></linearGradient>
                                      <linearGradient id={`eqRedMini${account.id}`} x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" /><stop offset="100%" stopColor="#ef4444" stopOpacity="0" /></linearGradient>
                                    </defs>
                                    {greenAreaPath && <path d={greenAreaPath} fill={`url(#eqGreenMini${account.id})`} />}
                                    {redAreaPath && <path d={redAreaPath} fill={`url(#eqRedMini${account.id})`} />}
                                    {greenPath && <path d={greenPath} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                                    {redPath && <path d={redPath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                                  </svg>
                                </div>
                              )
                            })() : (
                              <span style={{ color: '#444', fontSize: '12px' }}>No trades yet</span>
                            )}
                          </div>
                        </div>

                        {/* 6 Stats in 2 Columns - horizontal format like account page */}
                        <div style={{ padding: '0 18px 14px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                            {[
                              { label: 'Win Rate', value: `${winrate}%`, color: winrate >= 50 ? '#22c55e' : '#ef4444' },
                              { label: 'Profit Factor', value: profitFactor, color: profitFactor === '-' ? '#666' : profitFactor === '∞' ? '#22c55e' : parseFloat(profitFactor) >= 1 ? '#22c55e' : '#ef4444' },
                              { label: 'Avg RR', value: `${avgRR}R`, color: '#fff' },
                              { label: 'Trades', value: accTrades.length, color: '#8b5cf6' },
                              { label: 'W / L', value: `${wins} / ${losses}`, color: '#fff' },
                              { label: 'Consistency', value: `${consistency}%`, color: consistency >= 50 ? '#3b82f6' : '#666' },
                            ].map((stat, i) => (
                              <div key={i} style={{ padding: '6px 10px', background: '#0d0d12', borderRadius: '6px', border: '1px solid #1a1a22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11px', color: '#888', fontWeight: 500 }}>{stat.label}</span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: stat.color }}>{stat.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Buttons */}
                        <div onClick={e => e.stopPropagation()} style={{ padding: '14px 18px', display: 'flex', gap: '10px', borderTop: '1px solid #1a1a22', background: 'rgba(0,0,0,0.2)' }}>
                          <a href={`/account/${account.id}`} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '12px', textAlign: 'center', textDecoration: 'none', boxShadow: '0 4px 16px rgba(34,197,94,0.3)' }}>ENTER JOURNAL</a>
                          <a href={`/account/${account.id}?tab=statistics`} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid rgba(34,197,94,0.5)', borderRadius: '10px', color: '#22c55e', fontWeight: 600, fontSize: '12px', textAlign: 'center', textDecoration: 'none' }}>SEE STATISTICS</a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
        ) : (
          /* Mobile View OR No Accounts - Show Welcome Screen */
          <div style={{ textAlign: 'center', padding: isMobile ? '40px 20px' : '80px 40px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '10px' }}>
            <h2 style={{ fontSize: isMobile ? '20px' : '24px', marginBottom: '12px' }}>Welcome to TRADESAVE+</h2>
            <p style={{ color: '#999', marginBottom: '28px', fontSize: isMobile ? '14px' : '16px' }}>Create your first trading journal to get started</p>
            <button onClick={() => setShowModal(true)} style={{ padding: isMobile ? '12px 20px' : '14px 28px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: isMobile ? '14px' : '16px', cursor: 'pointer' }}>+ Create Your First Journal</button>
          </div>
        )}

        {/* Modals */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowModal(false)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '10px', padding: '28px', width: '420px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Create New Journal</h2>

              {/* Journal Type Selector */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '10px', textTransform: 'uppercase' }}>Journal Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button type="button" onClick={() => setJournalType('overall')} style={{ padding: '14px 12px', background: journalType === 'overall' ? 'rgba(34,197,94,0.15)' : '#0a0a0f', border: journalType === 'overall' ? '2px solid #22c55e' : '1px solid #1a1a22', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: journalType === 'overall' ? '#22c55e' : '#fff', marginBottom: '4px' }}>Overall Journal</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>Simple tracking</div>
                  </button>
                  <button type="button" onClick={() => setJournalType('propfirm')} style={{ padding: '14px 12px', background: journalType === 'propfirm' ? 'rgba(34,197,94,0.15)' : '#0a0a0f', border: journalType === 'propfirm' ? '2px solid #22c55e' : '1px solid #1a1a22', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: journalType === 'propfirm' ? '#22c55e' : '#fff', marginBottom: '4px' }}>Prop Firm Journal</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>With objectives & rules</div>
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}><label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '6px', textTransform: 'uppercase' }}>Journal Name</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={journalType === 'propfirm' ? 'e.g. FTMO 10k Challenge' : 'e.g. Personal Trading'} autoFocus style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} /></div>
              <div style={{ marginBottom: journalType === 'propfirm' ? '14px' : '20px' }}><label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '6px', textTransform: 'uppercase' }}>Starting Balance ($)</label><input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="e.g. 10000" style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} /></div>

              {/* Prop Firm Rules - Only show for propfirm type */}
              {journalType === 'propfirm' && (
                <>
                  {/* Profit Target & Consistency */}
                  <div style={{ background: '#0a0a0f', border: '1px solid #22c55e', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                      <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Objectives</span>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Profit Target (%)</label>
                      <input type="number" step="0.1" min="0" max="500" value={profitTarget} onChange={e => setProfitTarget(e.target.value)} placeholder="e.g. 10" style={{ width: '100%', padding: '10px 12px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#0d0d12', borderRadius: '6px', border: '1px solid #1a1a22' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={consistencyEnabled} onChange={e => setConsistencyEnabled(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#22c55e', cursor: 'pointer' }} />
                        <span style={{ fontSize: '12px', color: '#999' }}>Consistency Rule</span>
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input type="number" min="1" max="100" value={consistencyPct} onChange={e => setConsistencyPct(e.target.value)} disabled={!consistencyEnabled} style={{ width: '50px', padding: '6px 8px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '4px', color: consistencyEnabled ? '#fff' : '#555', fontSize: '12px', textAlign: 'center', opacity: consistencyEnabled ? 1 : 0.5 }} />
                        <span style={{ fontSize: '10px', color: '#666' }}>% max/day</span>
                      </div>
                    </div>
                  </div>

                  {/* Daily Drawdown */}
                  <div style={{ background: '#0a0a0f', border: '1px solid #f97316', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: dailyDdEnabled ? '12px' : '0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f97316' }} />
                        <span style={{ fontSize: '11px', color: '#f97316', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Daily Drawdown</span>
                      </div>
                      <input type="checkbox" checked={dailyDdEnabled} onChange={e => setDailyDdEnabled(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#f97316', cursor: 'pointer' }} />
                    </div>
                    {dailyDdEnabled && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Percentage (%)</label>
                            <input type="number" step="0.1" min="0" max="99" value={dailyDdPct} onChange={e => setDailyDdPct(e.target.value)} placeholder="e.g. 5" style={{ width: '100%', padding: '10px 12px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Type</label>
                            <select value={dailyDdType} onChange={e => setDailyDdType(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer' }}>
                              <option value="static">Static</option>
                              <option value="trailing">Trailing</option>
                            </select>
                          </div>
                        </div>
                        {dailyDdType === 'trailing' && (
                          <div style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Locks At</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <select value={dailyDdLocksAt} onChange={e => setDailyDdLocksAt(e.target.value)} style={{ flex: 1, padding: '10px 12px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer' }}>
                                <option value="start_balance">Start Balance</option>
                                <option value="custom">Custom % Above Start</option>
                              </select>
                              {dailyDdLocksAt === 'custom' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ color: '#666', fontSize: '12px' }}>+</span>
                                  <input type="number" step="0.1" min="0.1" max="100" value={dailyDdLocksAtPct} onChange={e => setDailyDdLocksAtPct(e.target.value)} placeholder="5" style={{ width: '60px', padding: '10px 8px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', textAlign: 'center', boxSizing: 'border-box' }} />
                                  <span style={{ color: '#666', fontSize: '12px' }}>%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Resets At</label>
                            <input type="time" value={dailyDdResetTime} onChange={e => setDailyDdResetTime(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Timezone</label>
                            <select value={dailyDdResetTimezone} onChange={e => setDailyDdResetTimezone(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer' }}>
                              <option value="Europe/London">UK (London)</option>
                              <option value="America/New_York">US Eastern</option>
                              <option value="America/Chicago">US Central</option>
                              <option value="UTC">UTC</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Max Drawdown */}
                  <div style={{ background: '#0a0a0f', border: '1px solid #ef4444', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: maxDdEnabled ? '12px' : '0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                        <span style={{ fontSize: '11px', color: '#ef4444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Max Drawdown</span>
                      </div>
                      <input type="checkbox" checked={maxDdEnabled} onChange={e => setMaxDdEnabled(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#ef4444', cursor: 'pointer' }} />
                    </div>
                    {maxDdEnabled && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Percentage (%)</label>
                            <input type="number" step="0.1" min="0" max="99" value={maxDdPct} onChange={e => setMaxDdPct(e.target.value)} placeholder="e.g. 10" style={{ width: '100%', padding: '10px 12px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Type</label>
                            <select value={maxDdType} onChange={e => setMaxDdType(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer' }}>
                              <option value="static">Static</option>
                              <option value="trailing">Trailing</option>
                            </select>
                          </div>
                        </div>
                        {maxDdType === 'trailing' && (
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Locks At</label>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <select value={maxDdTrailingStopsAt} onChange={e => setMaxDdTrailingStopsAt(e.target.value)} style={{ flex: 1, padding: '10px 12px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer' }}>
                                <option value="initial">Start Balance</option>
                                <option value="custom">Custom % Above Start</option>
                                <option value="never">Never (always trails)</option>
                              </select>
                              {maxDdTrailingStopsAt === 'custom' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ color: '#666', fontSize: '12px' }}>+</span>
                                  <input type="number" step="0.1" min="0.1" max="100" value={maxDdLocksAtPct} onChange={e => setMaxDdLocksAtPct(e.target.value)} placeholder="5" style={{ width: '60px', padding: '10px 8px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', textAlign: 'center', boxSizing: 'border-box' }} />
                                  <span style={{ color: '#666', fontSize: '12px' }}>%</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '12px' }}><button onClick={createJournal} disabled={creating || !name.trim() || !balance} style={{ flex: 1, padding: '12px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: (creating || !name.trim() || !balance) ? 0.5 : 1 }}>{creating ? 'Creating...' : 'Create'}</button><button onClick={() => { setShowModal(false); setName(''); setBalance(''); setJournalType('overall'); setProfitTarget(''); setMaxDrawdown(''); setConsistencyEnabled(false); setDailyDdEnabled(false); setMaxDdEnabled(false) }} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '6px', color: '#999', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancel</button></div>
            </div>
          </div>
        )}

        {showEditModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }} onClick={() => setShowEditModal(null)}>
            <div style={{ background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '12px', padding: '24px', width: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', color: '#fff' }}>Edit Journal</h2>

              {/* Journal Name */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Journal Name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus style={{ width: '100%', padding: '14px 16px', background: '#141418', border: '1px solid #2a2a35', borderRadius: '8px', color: '#fff', fontSize: '15px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = '#22c55e'} onBlur={e => e.target.style.borderColor = '#2a2a35'} />
              </div>

              {/* Prop Firm Section */}
              <div style={{ background: '#141418', border: '1px solid #22c55e', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
                  <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prop Firm Rules</span>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Profit Target (%)</label>
                  <input type="number" step="0.1" min="0" max="500" value={editProfitTarget} onChange={e => setEditProfitTarget(e.target.value)} placeholder="e.g. 10" style={{ width: '100%', padding: '12px 14px', background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#0d0d12', borderRadius: '6px', border: '1px solid #2a2a35' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editConsistencyEnabled} onChange={e => setEditConsistencyEnabled(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#22c55e', cursor: 'pointer' }} />
                    <span style={{ fontSize: '13px', color: '#ccc' }}>Consistency Rule</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="number" min="1" max="100" value={editConsistencyPct} onChange={e => setEditConsistencyPct(e.target.value)} disabled={!editConsistencyEnabled} style={{ width: '55px', padding: '6px 8px', background: '#141418', border: '1px solid #2a2a35', borderRadius: '4px', color: editConsistencyEnabled ? '#fff' : '#555', fontSize: '13px', textAlign: 'center', opacity: editConsistencyEnabled ? 1 : 0.5 }} />
                    <span style={{ fontSize: '11px', color: '#666' }}>% max/day</span>
                  </div>
                </div>
              </div>

              {/* Daily Drawdown Section */}
              <div style={{ background: '#141418', border: '1px solid #f97316', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editDailyDdEnabled ? '14px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f97316' }} />
                    <span style={{ fontSize: '12px', color: '#f97316', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Daily Drawdown</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editDailyDdEnabled} onChange={e => setEditDailyDdEnabled(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#f97316' }} />
                  </label>
                </div>
                {editDailyDdEnabled && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Percentage (%)</label>
                        <input type="number" step="0.1" min="0" max="99" value={editDailyDdPct} onChange={e => setEditDailyDdPct(e.target.value)} placeholder="e.g. 5" style={{ width: '100%', padding: '12px 14px', background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Type</label>
                        <select value={editDailyDdType} onChange={e => setEditDailyDdType(e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer' }}>
                          <option value="static">Static</option>
                          <option value="trailing">Trailing</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#555', marginBottom: '14px' }}>
                      {editDailyDdType === 'static' ? 'Fixed daily limit from start-of-day balance (never trails)' : 'Trails up with balance until it locks, then becomes static'}
                    </div>
                    {editDailyDdType === 'trailing' && (
                      <div style={{ marginBottom: '14px' }}>
                        <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Locks At</label>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <select value={editDailyDdLocksAt} onChange={e => setEditDailyDdLocksAt(e.target.value)} style={{ flex: 1, padding: '12px 14px', background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer' }}>
                            <option value="start_balance">Start Balance</option>
                            <option value="custom">Custom % Above Start</option>
                          </select>
                          {editDailyDdLocksAt === 'custom' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#666', fontSize: '14px' }}>+</span>
                              <input type="number" step="0.1" min="0.1" max="100" value={editDailyDdLocksAtPct} onChange={e => setEditDailyDdLocksAtPct(e.target.value)} placeholder="5" style={{ width: '70px', padding: '12px 10px', background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '14px', textAlign: 'center', boxSizing: 'border-box' }} />
                              <span style={{ color: '#666', fontSize: '14px' }}>%</span>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>Once locked, daily DD floor becomes static at that level</div>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Resets At</label>
                        <input type="time" value={editDailyDdResetTime} onChange={e => setEditDailyDdResetTime(e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Timezone</label>
                        <select value={editDailyDdResetTimezone} onChange={e => setEditDailyDdResetTimezone(e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer' }}>
                          <option value="Europe/London">UK (London)</option>
                          <option value="America/New_York">US Eastern (New York)</option>
                          <option value="America/Chicago">US Central (Chicago)</option>
                          <option value="America/Los_Angeles">US Pacific (Los Angeles)</option>
                          <option value="Asia/Tokyo">Japan (Tokyo)</option>
                          <option value="Asia/Hong_Kong">Hong Kong</option>
                          <option value="Asia/Singapore">Singapore</option>
                          <option value="Europe/Paris">Central Europe (Paris)</option>
                          <option value="Australia/Sydney">Australia (Sydney)</option>
                          <option value="UTC">UTC</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Max Drawdown Section */}
              <div style={{ background: '#141418', border: '1px solid #ef4444', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editMaxDdEnabled ? '14px' : '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Max Drawdown</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editMaxDdEnabled} onChange={e => setEditMaxDdEnabled(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#ef4444' }} />
                  </label>
                </div>
                {editMaxDdEnabled && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Percentage (%)</label>
                        <input type="number" step="0.1" min="0" max="99" value={editMaxDdPct} onChange={e => setEditMaxDdPct(e.target.value)} placeholder="e.g. 10" style={{ width: '100%', padding: '12px 14px', background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Type</label>
                        <select value={editMaxDdType} onChange={e => setEditMaxDdType(e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer' }}>
                          <option value="static">Static</option>
                          <option value="trailing">Trailing</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#555', marginBottom: editMaxDdType === 'trailing' ? '14px' : '0' }}>
                      {editMaxDdType === 'static' ? 'Fixed floor at initial balance minus DD% (never changes)' : 'Floor trails up with highest balance, never down'}
                    </div>
                    {editMaxDdType === 'trailing' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Locks At</label>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <select value={editMaxDdTrailingStopsAt} onChange={e => setEditMaxDdTrailingStopsAt(e.target.value)} style={{ flex: 1, padding: '12px 14px', background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer' }}>
                            <option value="initial">Start Balance</option>
                            <option value="custom">Custom % Above Start</option>
                            <option value="never">Never (always trails)</option>
                          </select>
                          {editMaxDdTrailingStopsAt === 'custom' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#666', fontSize: '14px' }}>+</span>
                              <input type="number" step="0.1" min="0.1" max="100" value={editMaxDdLocksAtPct} onChange={e => setEditMaxDdLocksAtPct(e.target.value)} placeholder="5" style={{ width: '70px', padding: '12px 10px', background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '14px', textAlign: 'center', boxSizing: 'border-box' }} />
                              <span style={{ color: '#666', fontSize: '14px' }}>%</span>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>Once locked, max DD floor becomes permanently fixed</div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <button onClick={() => updateAccount(showEditModal)} disabled={!editName.trim()} style={{ flex: 1, padding: '14px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: !editName.trim() ? 0.5 : 1, transition: 'opacity 0.2s' }}>Save Changes</button>
                <button onClick={() => { setShowEditModal(null); setEditName(''); setEditProfitTarget(''); setEditMaxDrawdown('') }} style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              </div>
              <button onClick={() => { setShowDeleteModal(showEditModal); setShowEditModal(null) }} style={{ width: '100%', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', fontWeight: 500, fontSize: '13px', cursor: 'pointer' }}>Delete Journal</button>
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

              {/* Direction + Outcome Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Direction</label>
                  <select value={quickTradeDirection} onChange={e => setQuickTradeDirection(e.target.value)} style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: quickTradeDirection === 'long' ? '#22c55e' : quickTradeDirection === 'short' ? '#ef4444' : '#fff', fontSize: '15px', boxSizing: 'border-box' }}>
                    <option value="long">Long</option>
                    <option value="short">Short</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Outcome</label>
                  <select value={quickTradeOutcome} onChange={e => setQuickTradeOutcome(e.target.value)} style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: quickTradeOutcome === 'win' ? '#22c55e' : quickTradeOutcome === 'loss' ? '#ef4444' : '#f59e0b', fontSize: '15px', boxSizing: 'border-box' }}>
                    <option value="win">Win</option>
                    <option value="loss">Loss</option>
                    <option value="be">Breakeven</option>
                  </select>
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
                            {isHalfStar && <span style={{ position: 'absolute', color: '#22c55e', fontSize: '28px', lineHeight: 1, width: '48%', overflow: 'hidden' }}>★</span>}
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
                disabled={submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate) ? '#1a1a22' : 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate) ? '#666' : '#fff',
                  fontWeight: 700,
                  fontSize: '16px',
                  cursor: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate) ? 'not-allowed' : 'pointer',
                  boxShadow: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate) ? 'none' : '0 0 20px rgba(147,51,234,0.5), 0 0 40px rgba(147,51,234,0.3)'
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
                  <select value={quickTradeDirection} onChange={e => setQuickTradeDirection(e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: quickTradeDirection === 'long' ? '#22c55e' : quickTradeDirection === 'short' ? '#ef4444' : '#fff', fontSize: '14px', boxSizing: 'border-box' }}>
                    <option value="long">Long</option>
                    <option value="short">Short</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#666', marginBottom: '6px', textTransform: 'uppercase' }}>Outcome</label>
                  <select value={quickTradeOutcome} onChange={e => setQuickTradeOutcome(e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: quickTradeOutcome === 'win' ? '#22c55e' : quickTradeOutcome === 'loss' ? '#ef4444' : '#f59e0b', fontSize: '14px', boxSizing: 'border-box' }}>
                    <option value="win">Win</option>
                    <option value="loss">Loss</option>
                    <option value="be">Breakeven</option>
                  </select>
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
                            {isHalfStar && <span style={{ position: 'absolute', color: '#22c55e', fontSize: '22px', lineHeight: 1, width: '48%', overflow: 'hidden' }}>★</span>}
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
                  disabled={submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate) ? '#1a1a22' : 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    color: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate) ? '#666' : '#fff',
                    fontWeight: 600,
                    fontSize: '15px',
                    cursor: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate) ? 'not-allowed' : 'pointer',
                    boxShadow: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate) ? 'none' : '0 0 20px rgba(147,51,234,0.5), 0 0 40px rgba(147,51,234,0.3)'
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

        {/* Import Journal Modal */}
        {showImportModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowImportModal(false)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '28px', width: '90%', maxWidth: importStep === 3 ? '800px' : '480px', maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#9333ea', margin: 0 }}>Import Journal</h2>
                  <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Step {importStep} of 3: {importStep === 1 ? 'Upload File' : importStep === 2 ? 'Map Columns' : 'Preview & Import'}</p>
                </div>
                <button onClick={() => setShowImportModal(false)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: '4px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Step 1: File Upload */}
              {importStep === 1 && (
                <div>
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#9333ea' }}
                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#2a2a35' }}
                    onDrop={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#2a2a35'; const file = e.dataTransfer.files[0]; if (file) handleImportFile(file) }}
                    style={{ border: '2px dashed #2a2a35', borderRadius: '12px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
                    onClick={() => document.getElementById('importFileInput').click()}
                  >
                    <input id="importFileInput" type="file" accept=".xlsx,.xls,.csv" onChange={(e) => { if (e.target.files[0]) handleImportFile(e.target.files[0]) }} style={{ display: 'none' }} />
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(147,51,234,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <p style={{ color: '#fff', fontSize: '15px', fontWeight: 500, marginBottom: '6px' }}>Drop your file here</p>
                    <p style={{ color: '#666', fontSize: '13px' }}>or click to browse</p>
                    <p style={{ color: '#555', fontSize: '11px', marginTop: '12px' }}>Supports .xlsx, .xls, and .csv files</p>
                  </div>

                  {/* Format Guide */}
                  <div style={{ marginTop: '20px', padding: '16px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#9333ea' }}>Required Format</span>
                    </div>
                    <p style={{ fontSize: '11px', color: '#888', marginBottom: '12px', lineHeight: 1.5 }}>
                      Your file must contain <strong style={{ color: '#fff' }}>one row per trade</strong>. Summary data (weekly/monthly totals) cannot be imported.
                    </p>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>Required columns:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                      <span style={{ padding: '4px 8px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '4px', color: '#22c55e', fontSize: '10px' }}>Symbol / Pair</span>
                      <span style={{ padding: '4px 8px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '4px', color: '#22c55e', fontSize: '10px' }}>PnL ($)</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px' }}>Recommended columns:</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                      <span style={{ padding: '4px 8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '4px', color: '#3b82f6', fontSize: '10px' }}>Date</span>
                      <span style={{ padding: '4px 8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '4px', color: '#3b82f6', fontSize: '10px' }}>Win/Loss</span>
                      <span style={{ padding: '4px 8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '4px', color: '#3b82f6', fontSize: '10px' }}>Direction</span>
                      <span style={{ padding: '4px 8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '4px', color: '#3b82f6', fontSize: '10px' }}>RR</span>
                    </div>
                    <div style={{ background: '#0d0d12', borderRadius: '6px', padding: '10px', border: '1px solid #1a1a22' }}>
                      <div style={{ fontSize: '10px', color: '#555', marginBottom: '6px' }}>Example format:</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#888', lineHeight: 1.6 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', color: '#9333ea', marginBottom: '4px' }}>
                          <span>Date</span><span>Symbol</span><span>Direction</span><span>PnL</span><span>Outcome</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                          <span>2024-01-15</span><span>EURUSD</span><span>Long</span><span>$150</span><span>Win</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                          <span>2024-01-16</span><span>GBPJPY</span><span>Short</span><span>-$80</span><span>Loss</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {importError && <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '13px' }}>{importError}</div>}
                </div>
              )}

              {/* Step 2: Column Mapping */}
              {importStep === 2 && (
                <div>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#777', marginBottom: '6px', textTransform: 'uppercase' }}>Journal Name</label>
                        <input type="text" value={importJournalName} onChange={e => setImportJournalName(e.target.value)} placeholder="My Journal" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#777', marginBottom: '6px', textTransform: 'uppercase' }}>Starting Balance ($)</label>
                        <input type="number" value={importStartingBalance} onChange={e => setImportStartingBalance(e.target.value)} placeholder="10000" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '12px' }}>Map Your Columns</div>
                  <p style={{ color: '#888', fontSize: '12px', marginBottom: '12px' }}>Auto-detected fields are highlighted. Unmapped columns will be created as custom inputs.</p>

                  {/* Warning if essential columns not mapped */}
                  {(!Object.values(importMapping).includes('symbol') || !Object.values(importMapping).includes('pnl')) && (
                    <div style={{ marginBottom: '16px', padding: '10px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <div style={{ fontSize: '12px', color: '#f59e0b' }}>
                        <strong>Missing required columns:</strong>
                        {!Object.values(importMapping).includes('symbol') && <span> Symbol/Pair</span>}
                        {!Object.values(importMapping).includes('symbol') && !Object.values(importMapping).includes('pnl') && <span>,</span>}
                        {!Object.values(importMapping).includes('pnl') && <span> PnL</span>}
                        <div style={{ color: '#b45309', fontSize: '11px', marginTop: '4px' }}>Please map these columns or your data may not display correctly.</div>
                      </div>
                    </div>
                  )}

                  {/* Warning if no date column */}
                  {!Object.values(importMapping).includes('date') && Object.values(importMapping).includes('symbol') && Object.values(importMapping).includes('pnl') && (
                    <div style={{ marginBottom: '16px', padding: '10px 12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                      <span style={{ fontSize: '11px', color: '#3b82f6' }}>No date column mapped. All trades will use today's date.</span>
                    </div>
                  )}

                  {/* Warning if PnL mapped but looks like percentages and no starting balance */}
                  {Object.values(importMapping).includes('pnl') && !importStartingBalance && (() => {
                    const pnlColIdx = Object.entries(importMapping).find(([_, v]) => v === 'pnl')?.[0]
                    if (pnlColIdx !== undefined) {
                      const samplePnls = importData.slice(0, 20).map(row => row[parseInt(pnlColIdx)]).filter(v => v != null)
                      const hasPercent = samplePnls.some(v => String(v).includes('%'))
                      const allSmall = samplePnls.length > 0 && samplePnls.every(v => {
                        const num = parseFloat(String(v).replace(/[^0-9.\-]/g, ''))
                        return !isNaN(num) && Math.abs(num) < 20
                      })
                      if (hasPercent || allSmall) {
                        return (
                          <div style={{ marginBottom: '16px', padding: '10px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" style={{ flexShrink: 0, marginTop: '2px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            <span style={{ fontSize: '11px', color: '#f59e0b' }}>
                              <strong>PnL values look like percentages.</strong> Enter a Starting Balance above to convert % to $ amounts, or values will be used as-is.
                            </span>
                          </div>
                        )
                      }
                    }
                    return null
                  })()}
                  <div style={{ maxHeight: '300px', overflow: 'auto', marginBottom: '20px' }}>
                    {importHeaders.map((header, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: importMapping[idx] ? 'rgba(147,51,234,0.05)' : '#0a0a0f', border: `1px solid ${importMapping[idx] ? 'rgba(147,51,234,0.3)' : '#1a1a22'}`, borderRadius: '8px', marginBottom: '8px' }}>
                        <div style={{ flex: 1, fontSize: '13px', color: header ? '#fff' : '#666', fontWeight: 500, fontStyle: header ? 'normal' : 'italic' }}>{header || `(Column ${idx + 1})`}</div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg>
                        <select
                          value={importMapping[idx] || ''}
                          onChange={(e) => {
                            const newMapping = { ...importMapping }
                            if (e.target.value) newMapping[idx] = e.target.value
                            else delete newMapping[idx]
                            setImportMapping(newMapping)
                          }}
                          style={{ width: '140px', padding: '8px 10px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: importMapping[idx] ? '#9333ea' : '#666', fontSize: '12px' }}
                        >
                          <option value="">Custom Input</option>
                          {knownFields.map(field => (
                            <option key={field.id} value={field.id} disabled={Object.values(importMapping).includes(field.id) && importMapping[idx] !== field.id}>{field.label}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => { setImportStep(1); setImportFile(null) }} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '8px', color: '#888', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Back</button>
                    <button onClick={() => setImportStep(3)} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Preview</button>
                  </div>
                  {importError && <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '13px' }}>{importError}</div>}
                </div>
              )}

              {/* Step 3: Preview & Import */}
              {importStep === 3 && (
                <div>
                  <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'rgba(147,51,234,0.1)', border: '1px solid rgba(147,51,234,0.3)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
                      <span style={{ color: '#9333ea', fontWeight: 600 }}>{importJournalName}</span>
                      <span style={{ color: '#666' }}>•</span>
                      <span style={{ color: '#888' }}>{importData.length} trades</span>
                      {importStartingBalance && <>
                        <span style={{ color: '#666' }}>•</span>
                        <span style={{ color: '#888' }}>Starting: ${parseFloat(importStartingBalance).toLocaleString()}</span>
                      </>}
                    </div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', marginBottom: '8px' }}>Preview (first 5 rows)</div>
                  <div style={{ overflow: 'auto', marginBottom: '20px', border: '1px solid #1a1a22', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ background: '#0a0a0f' }}>
                          {importHeaders.map((header, idx) => (
                            <th key={idx} style={{ padding: '10px 12px', textAlign: 'left', color: importMapping[idx] ? '#9333ea' : '#666', fontWeight: 500, borderBottom: '1px solid #1a1a22', whiteSpace: 'nowrap' }}>
                              {importMapping[idx] ? knownFields.find(f => f.id === importMapping[idx])?.label || header || `Column ${idx + 1}` : header || `Column ${idx + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {importData.slice(0, 5).map((row, rowIdx) => (
                          <tr key={rowIdx} style={{ background: rowIdx % 2 === 0 ? '#0d0d12' : '#0a0a0f' }}>
                            {importHeaders.map((_, colIdx) => (
                              <td key={colIdx} style={{ padding: '8px 12px', color: '#ccc', borderBottom: '1px solid #1a1a22', whiteSpace: 'nowrap' }}>{row[colIdx] ?? '-'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setImportStep(2)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '8px', color: '#888', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Back</button>
                    <button onClick={processImport} disabled={importing || !importJournalName.trim()} style={{ flex: 1, padding: '12px', background: (importing || !importJournalName.trim()) ? '#1a1a22' : 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)', border: 'none', borderRadius: '8px', color: (importing || !importJournalName.trim()) ? '#666' : '#fff', fontWeight: 600, fontSize: '14px', cursor: (importing || !importJournalName.trim()) ? 'not-allowed' : 'pointer', boxShadow: (importing || !importJournalName.trim()) ? 'none' : '0 0 15px rgba(147,51,234,0.3)' }}>
                      {importing ? 'Importing...' : `Import ${importData.length} Trades`}
                    </button>
                  </div>
                  {importError && <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#ef4444', fontSize: '13px' }}>{importError}</div>}
                </div>
              )}
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
