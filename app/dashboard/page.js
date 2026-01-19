'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import * as XLSX from 'xlsx'
import { hasValidSubscription } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase'
import { ToastContainer, showToast } from '@/components/Toast'

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

// Format currency with 2 decimal places
function formatCurrency(num) {
  const val = parseFloat(num) || 0
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Default inputs for Edit Inputs modal
const defaultInputs = [
  { id: 'date', label: 'Date', type: 'date', required: true, enabled: true, fixed: true, color: '#8b5cf6' },
  { id: 'symbol', label: 'Symbol', type: 'text', required: true, enabled: true, fixed: true, color: '#22c55e' },
  { id: 'pnl', label: 'PnL ($)', type: 'number', required: true, enabled: true, fixed: true, color: '#22c55e' },
  { id: 'direction', label: 'Direction', type: 'select', options: [{value: 'long', textColor: '#22c55e', bgColor: 'rgba(34,197,94,0.15)'}, {value: 'short', textColor: '#ef4444', bgColor: 'rgba(239,68,68,0.15)'}], required: true, enabled: true, fixed: true, color: '#3b82f6' },
  { id: 'outcome', label: 'W/L', type: 'select', options: [{value: 'win', textColor: '#22c55e', bgColor: 'rgba(34,197,94,0.15)'}, {value: 'loss', textColor: '#ef4444', bgColor: 'rgba(239,68,68,0.15)'}, {value: 'be', textColor: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)'}], required: true, enabled: true, fixed: true, color: '#22c55e' },
  { id: 'rr', label: 'RR', type: 'number', required: false, enabled: true, fixed: true, color: '#f59e0b' },
  { id: 'riskPercent', label: '% Risk', type: 'number', required: false, enabled: true, fixed: true, color: '#ef4444' },
  { id: 'time', label: 'Time', type: 'time', required: false, enabled: true, fixed: true, color: '#a855f7' },
  { id: 'confidence', label: 'Confidence', type: 'select', options: [{value: 'High', textColor: '#22c55e', bgColor: 'rgba(34,197,94,0.15)'}, {value: 'Medium', textColor: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)'}, {value: 'Low', textColor: '#ef4444', bgColor: 'rgba(239,68,68,0.15)'}], required: false, enabled: true, fixed: true, color: '#f59e0b' },
  { id: 'rating', label: 'Rating', type: 'rating', required: false, enabled: true, fixed: true, color: '#fbbf24' },
  { id: 'timeframe', label: 'Timeframe', type: 'select', options: [{value: '1m', textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)'}, {value: '5m', textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)'}, {value: '15m', textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)'}, {value: '30m', textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)'}, {value: '1H', textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)'}, {value: '4H', textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)'}, {value: 'Daily', textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)'}], required: false, enabled: true, fixed: true, color: '#06b6d4' },
  { id: 'session', label: 'Session', type: 'select', options: [{value: 'London', textColor: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)'}, {value: 'New York', textColor: '#22c55e', bgColor: 'rgba(34,197,94,0.15)'}, {value: 'Asian', textColor: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)'}, {value: 'Overlap', textColor: '#a855f7', bgColor: 'rgba(168,85,247,0.15)'}], required: false, enabled: true, fixed: true, color: '#ec4899' },
  { id: 'image', label: 'Image', type: 'file', required: false, enabled: true, fixed: true, color: '#64748b' },
  { id: 'notes', label: 'Notes', type: 'textarea', required: false, enabled: true, fixed: true, color: '#64748b' },
  { id: 'mistake', label: 'Trade Mistake', type: 'textarea', required: false, enabled: true, fixed: true, color: '#ef4444' },
]

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [activeDashboard, setActiveDashboard] = useState(searchParams.get('dashboard') || 'accounts') // 'accounts' or 'backtesting'

  // Theme color based on dashboard type - green for accounts, blue for backtesting
  const themeColor = activeDashboard === 'backtesting' ? '#3b82f6' : '#22c55e'
  const themeColorRgb = activeDashboard === 'backtesting' ? '59,130,246' : '34,197,94'
  const themeColorDark = activeDashboard === 'backtesting' ? '#2563eb' : '#16a34a'
  // Positive color for PnL/wins/profits - same as theme (blue for backtesting, green for accounts)
  const positiveColor = activeDashboard === 'backtesting' ? '#3b82f6' : '#22c55e'
  const positiveColorRgb = activeDashboard === 'backtesting' ? '59,130,246' : '34,197,94'
  const [switchingDashboard, setSwitchingDashboard] = useState(false)
  const [trades, setTrades] = useState({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(null)
  const [showObjectiveLinesMap, setShowObjectiveLinesMap] = useState({}) // Track objective lines visibility per account
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')
  const [journalType, setJournalType] = useState('overall')
  // Form validation errors
  const [formErrors, setFormErrors] = useState({})
  const [profitTarget, setProfitTarget] = useState('')
  const [profitTargetEnabled, setProfitTargetEnabled] = useState(false)
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
  const [quickTradeOutcome, setQuickTradeOutcome] = useState('')
  const [quickTradePnl, setQuickTradePnl] = useState('')
  const [quickTradeRR, setQuickTradeRR] = useState('')
  const [quickTradeDate, setQuickTradeDate] = useState(new Date().toISOString().split('T')[0])
  const [quickTradeTime, setQuickTradeTime] = useState('')
  const [quickTradeDirection, setQuickTradeDirection] = useState('')
  const [quickTradeRating, setQuickTradeRating] = useState('')
  const [hoverRating, setHoverRating] = useState(0)
  const [quickTradeRiskPercent, setQuickTradeRiskPercent] = useState('')
  const [quickTradeConfidence, setQuickTradeConfidence] = useState('')
  const [quickTradeTimeframe, setQuickTradeTimeframe] = useState('')
  const [quickTradeSession, setQuickTradeSession] = useState('')
  const [quickTradeNotes, setQuickTradeNotes] = useState('')
  const [quickTradeMistake, setQuickTradeMistake] = useState('')
  const [quickTradeImages, setQuickTradeImages] = useState([]) // Array of image URLs/base64
  const [uploadingImage, setUploadingImage] = useState(false)
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
  const [listGraphHover, setListGraphHover] = useState(null) // { accountId, index, x, y, value, date }
  // Button tooltip state
  const [buttonTooltip, setButtonTooltip] = useState(null) // { text: string, x: number, y: number, showBelow?: boolean }
  const tooltipTimerRef = useRef(null)
  const showTooltipDelayed = (text, x, y) => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    tooltipTimerRef.current = setTimeout(() => {
      const showBelow = y < 50
      setButtonTooltip({ text, x, y, showBelow })
    }, 600)
  }
  const hideTooltip = () => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current)
    setButtonTooltip(null)
  }
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
  // Header menu dropdown state
  const [menuOpen, setMenuOpen] = useState(false)
  // Journal widget zoom modal state
  const [zoomedJournal, setZoomedJournal] = useState(null)
  const [journalHover, setJournalHover] = useState(null)
  // Track which journals show objective lines (default: hidden)
  const [showObjectiveLines, setShowObjectiveLines] = useState({})
  // Journal drag and drop reordering
  const [journalOrder, setJournalOrder] = useState([])
  const [draggedJournal, setDraggedJournal] = useState(null)
  const [dragOverJournal, setDragOverJournal] = useState(null)
  // Custom dropdown open states for Log Trade modal
  const [directionDropdownOpen, setDirectionDropdownOpen] = useState(false)
  const [outcomeDropdownOpen, setOutcomeDropdownOpen] = useState(false)
  const [confidenceDropdownOpen, setConfidenceDropdownOpen] = useState(false)
  const [timeframeDropdownOpen, setTimeframeDropdownOpen] = useState(false)
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false)
  const [customDropdownOpen, setCustomDropdownOpen] = useState({}) // Map of input.id -> boolean
  // Notes state (user-level)
  const [notes, setNotes] = useState({ daily: {}, weekly: {}, custom: [] })
  const [showExpandedNote, setShowExpandedNote] = useState(null)
  // Edit Inputs modal states
  const [editInputs, setEditInputs] = useState([]) // Local inputs state for editing
  const [editingOptions, setEditingOptions] = useState(null)
  const [optionsList, setOptionsList] = useState([])
  const [editingColor, setEditingColor] = useState(null)
  const [showRestoreDefaults, setShowRestoreDefaults] = useState(false)
  const [transferFromJournal, setTransferFromJournal] = useState('')

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => { loadData() }, [])

  // Auth state listener - detect session changes and handle sign-outs
  useEffect(() => {
    const supabase = getSupabase()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        window.location.href = '/login'
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load journal order from localStorage
  useEffect(() => {
    const savedOrder = localStorage.getItem('journalOrder')
    if (savedOrder) {
      try { setJournalOrder(JSON.parse(savedOrder)) } catch {}
    }
  }, [])

  // Update journal order when accounts change (add new accounts to end)
  useEffect(() => {
    if (accounts.length > 0) {
      setJournalOrder(prev => {
        const existingIds = new Set(prev)
        const newIds = accounts.map(a => a.id).filter(id => !existingIds.has(id))
        if (newIds.length > 0) {
          const updated = [...prev.filter(id => accounts.some(a => a.id === id)), ...newIds]
          localStorage.setItem('journalOrder', JSON.stringify(updated))
          return updated
        }
        // Remove deleted accounts from order
        const filtered = prev.filter(id => accounts.some(a => a.id === id))
        if (filtered.length !== prev.length) {
          localStorage.setItem('journalOrder', JSON.stringify(filtered))
          return filtered
        }
        return prev
      })
    }
  }, [accounts])

  // Handle journal drag and drop
  const handleJournalDragStart = (e, accountId) => {
    setDraggedJournal(accountId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', accountId)
  }
  const handleJournalDragOver = (e, accountId) => {
    e.preventDefault()
    if (draggedJournal && draggedJournal !== accountId) {
      setDragOverJournal(accountId)
    }
  }
  const handleJournalDragLeave = () => {
    setDragOverJournal(null)
  }
  const handleJournalDrop = (e, targetId) => {
    e.preventDefault()
    if (!draggedJournal || draggedJournal === targetId) {
      setDraggedJournal(null)
      setDragOverJournal(null)
      return
    }
    setJournalOrder(prev => {
      const newOrder = [...prev]
      const dragIdx = newOrder.indexOf(draggedJournal)
      const targetIdx = newOrder.indexOf(targetId)
      if (dragIdx === -1 || targetIdx === -1) return prev
      newOrder.splice(dragIdx, 1)
      newOrder.splice(targetIdx, 0, draggedJournal)
      localStorage.setItem('journalOrder', JSON.stringify(newOrder))
      return newOrder
    })
    setDraggedJournal(null)
    setDragOverJournal(null)
  }
  const handleJournalDragEnd = () => {
    setDraggedJournal(null)
    setDragOverJournal(null)
  }

  // Get sorted accounts based on journal order (uses filteredAccounts for current dashboard)
  const getSortedAccounts = () => {
    const accs = accounts.filter(acc => (acc.dashboard_type || 'accounts') === activeDashboard)
    if (journalOrder.length === 0) return accs
    return [...accs].sort((a, b) => {
      const aIdx = journalOrder.indexOf(a.id)
      const bIdx = journalOrder.indexOf(b.id)
      if (aIdx === -1 && bIdx === -1) return 0
      if (aIdx === -1) return 1
      if (bIdx === -1) return -1
      return aIdx - bIdx
    })
  }

  // Check if user has valid subscription
  // 'admin' = admin user (ssiagos@hotmail.com)
  async function loadData() {
    try {
      const supabase = getSupabase()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) { window.location.href = '/login'; return }
      const { data: profile, error: profileError } = await supabase.from('profiles').select('subscription_status, subscription_end').eq('id', user.id).single()
      if (profileError || !hasValidSubscription(profile)) { window.location.href = '/pricing'; return }
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
      // Load notes from profiles (user-level)
      const { data: profileData } = await supabase.from('profiles').select('notes_data').eq('id', user.id).single()
      if (profileData?.notes_data) { try { setNotes(JSON.parse(profileData.notes_data)) } catch {} }
      setLoading(false)
    } catch (err) {
      console.error('Failed to load data:', err)
      showToast('Session expired. Please sign in again.')
      window.location.href = '/login'
    }
  }

  // Safe dashboard switch - validates auth before switching
  async function handleDashboardSwitch(type) {
    if (switchingDashboard || type === activeDashboard) return
    setSwitchingDashboard(true)
    try {
      const supabase = getSupabase()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        showToast('Session expired. Please sign in again.')
        window.location.href = '/login'
        return
      }
      setActiveDashboard(type)
    } catch (err) {
      showToast('Session expired. Please sign in again.')
      window.location.href = '/login'
    } finally {
      setSwitchingDashboard(false)
    }
  }

  // Load more trades for a specific account
  async function loadMoreTrades(accountId) {
    setLoadingMore(true)
    const supabase = getSupabase()
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
    const supabase = getSupabase()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  async function handleManageSubscription() {
    const supabase = getSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { showToast('Please log in'); return }

    try {
      const res = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        showToast(data.error || 'Could not open subscription management')
      }
    } catch (err) {
      showToast('Error opening subscription portal')
    }
  }

  // Validation constants
  const MAX_NAME_LENGTH = 50
  const MAX_BALANCE = 9999999999.99 // DECIMAL(12,2) max
  const MAX_PERCENTAGE = 999.99 // DECIMAL(5,2) max

  function validateJournalForm() {
    const errors = {}
    if (!name.trim()) errors.name = 'Journal name is required'
    else if (name.trim().length > MAX_NAME_LENGTH) errors.name = `Max ${MAX_NAME_LENGTH} characters`
    if (!balance) errors.balance = 'Starting balance is required'
    else if (parseFloat(balance) < 0) errors.balance = 'Balance cannot be negative'
    else if (parseFloat(balance) > MAX_BALANCE) errors.balance = 'Max balance is $9,999,999,999.99'
    if (profitTarget && parseFloat(profitTarget) > MAX_PERCENTAGE) errors.profitTarget = 'Max 999.99%'
    if (consistencyPct && parseFloat(consistencyPct) > 100) errors.consistencyPct = 'Max 100%'
    if (dailyDdPct && parseFloat(dailyDdPct) > MAX_PERCENTAGE) errors.dailyDdPct = 'Max 999.99%'
    if (maxDdPct && parseFloat(maxDdPct) > MAX_PERCENTAGE) errors.maxDdPct = 'Max 999.99%'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function createJournal() {
    if (!validateJournalForm()) return
    setCreating(true)
    const supabase = getSupabase()
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
      max_dd_locks_at_pct: maxDdLocksAtPct ? parseFloat(maxDdLocksAtPct) : null,
      dashboard_type: activeDashboard,
      custom_inputs: JSON.stringify(defaultInputs)
    }).select().single()
    if (error) { showToast('Error: ' + error.message); setCreating(false); return }
    setAccounts(prev => [...prev, data])
    setTrades(prev => ({ ...prev, [data.id]: [] }))
    setName(''); setBalance(''); setProfitTarget(''); setMaxDrawdown(''); setConsistencyEnabled(false); setConsistencyPct('30'); setDailyDdEnabled(false); setDailyDdPct(''); setDailyDdType('static'); setDailyDdLocksAt('start_balance'); setDailyDdLocksAtPct(''); setDailyDdResetTime('00:00'); setDailyDdResetTimezone('Europe/London'); setMaxDdEnabled(false); setMaxDdPct(''); setMaxDdType('static'); setMaxDdTrailingStopsAt('never'); setMaxDdLocksAtPct(''); setFormErrors({}); setShowModal(false); setCreating(false)
  }

  function closeCreateModal() {
    setShowModal(false)
    setFormErrors({})
  }

  async function updateAccount(accountId) {
    if (!editName.trim()) { showToast('Journal name is required'); return }
    if (editName.trim().length > 50) { showToast('Journal name max 50 characters'); return }
    if (editProfitTarget && parseFloat(editProfitTarget) > 999.99) { showToast('Profit target max 999.99%'); return }
    if (editConsistencyPct && parseFloat(editConsistencyPct) > 100) { showToast('Consistency max 100%'); return }
    if (editDailyDdPct && parseFloat(editDailyDdPct) > 999.99) { showToast('Daily DD max 999.99%'); return }
    if (editMaxDdPct && parseFloat(editMaxDdPct) > 999.99) { showToast('Max DD max 999.99%'); return }
    const supabase = getSupabase()
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
    if (error) { showToast('Failed to update journal: ' + error.message); return }
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
    const supabase = getSupabase()
    const { error } = await supabase.from('accounts').delete().eq('id', accountId)
    if (error) { showToast('Failed to delete journal: ' + error.message); return }
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
    if (importJournalName.trim().length > 50) { setImportError('Journal name max 50 characters'); return }
    if (importStartingBalance && parseFloat(importStartingBalance) > 9999999999.99) { setImportError('Starting balance max $9,999,999,999.99'); return }
    if (importStartingBalance && parseFloat(importStartingBalance) < 0) { setImportError('Starting balance cannot be negative'); return }
    if (importData.length === 0) { setImportError('No data to import'); return }
    if (importData.length > 5000) { setImportError('Maximum 5000 trades per import. Please split your file.'); return }
    setImporting(true)
    setImportError('')
    try {
      const supabase = getSupabase()
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
        custom_inputs: customInputs.length > 0 ? JSON.stringify(customInputs) : null,
        dashboard_type: activeDashboard
      }).select().single()
      if (accountError) throw accountError
      // Process and insert trades
      const startingBal = parseFloat(importStartingBalance) || 0
      const tradesToInsert = []
      for (const row of importData) {
        const trade = { account_id: accountData.id }
        const extraData = {}
        let riskPercentValue = null
        for (const [colIdx, fieldId] of Object.entries(finalMapping)) {
          const value = row[parseInt(colIdx)]
          if (value === null || value === undefined || value === '') continue
          const strValue = String(value).trim()
          // Map to trade fields or extra_data
          if (['symbol', 'pnl', 'outcome', 'direction', 'rr', 'date', 'time', 'riskPercent'].includes(fieldId)) {
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
              // RR can be null if not provided - handle formats like "1:3", "1/3", "1: 3", "3", "-1"
              let rrValue = null
              const ratioMatch = strValue.match(/^\s*[\d.]+\s*[:\\/]\s*([\d.]+)\s*$/)
              if (ratioMatch) {
                // Format like "1:3" or "1/3" - extract the reward part
                rrValue = parseFloat(ratioMatch[1])
              } else {
                // Plain number format
                const { value: parsed } = parsePnlValue(strValue)
                rrValue = parsed
              }
              trade[fieldId] = rrValue !== 0 ? rrValue : null
            } else if (fieldId === 'riskPercent') {
              // Store risk percent for potential PnL calculation
              const { value: riskVal } = parsePnlValue(strValue)
              riskPercentValue = riskVal
              extraData[fieldId] = strValue
            } else if (fieldId === 'time') {
              // Convert Excel serial time (decimal) to HH:MM:SS
              if (!isNaN(value) && parseFloat(value) >= 0 && parseFloat(value) < 1) {
                const totalSeconds = Math.round(parseFloat(value) * 86400)
                const hours = Math.floor(totalSeconds / 3600)
                const minutes = Math.floor((totalSeconds % 3600) / 60)
                const seconds = totalSeconds % 60
                extraData[fieldId] = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
              } else if (!isNaN(value) && parseFloat(value) >= 1) {
                // DateTime serial - extract time part
                const timePart = parseFloat(value) % 1
                const totalSeconds = Math.round(timePart * 86400)
                const hours = Math.floor(totalSeconds / 3600)
                const minutes = Math.floor((totalSeconds % 3600) / 60)
                const seconds = totalSeconds % 60
                extraData[fieldId] = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
              } else {
                // Already a string time format
                extraData[fieldId] = strValue
              }
            } else if (fieldId === 'date') {
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
        // Auto-calculate PnL from RR and % Risk if PnL is missing
        if ((trade.pnl === undefined || trade.pnl === null) && trade.rr !== undefined && trade.rr !== null && startingBal > 0) {
          const riskPct = riskPercentValue || 1 // Default to 1% risk if not specified
          const riskAmount = (riskPct / 100) * startingBal
          trade.pnl = trade.rr * riskAmount
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
      setAccounts(prev => [...prev, accountData])
      setTrades(prev => ({ ...prev, [accountData.id]: insertedTrades.sort((a, b) => new Date(a.date) - new Date(b.date)) }))
      setTradeCounts(prev => ({ ...prev, [accountData.id]: insertedTrades.length }))
      setShowImportModal(false)
      setImporting(false)
      // Brief success indication (modal closes, user sees new journal)
    } catch (err) {
      setImportError('Import failed: ' + (err.message || 'Unknown error'))
      setImporting(false)
    }
  }

  // Upload image to Supabase Storage
  async function uploadQuickTradeImage(file) {
    if (!file || !user?.id || !quickTradeAccount) return null
    if (file.size > 5 * 1024 * 1024) { showToast('Image too large (max 5MB)'); return null }
    if (!file.type.startsWith('image/')) { showToast('Please upload an image file'); return null }
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', user.id)
      formData.append('accountId', quickTradeAccount)
      const response = await fetch('/api/upload-image', { method: 'POST', body: formData })
      if (!response.ok) throw new Error('Upload failed')
      const { url } = await response.json()
      setQuickTradeImages(prev => [...prev, url])
      return url
    } catch (err) {
      // Fallback to base64 for small files
      if (file.size > 1 * 1024 * 1024) { showToast('Upload failed. Try a smaller image.'); setUploadingImage(false); return null }
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => { setQuickTradeImages(prev => [...prev, reader.result]); resolve(reader.result) }
        reader.readAsDataURL(file)
      })
    } finally { setUploadingImage(false) }
  }

  function removeQuickTradeImage(index) {
    setQuickTradeImages(prev => prev.filter((_, i) => i !== index))
  }

  async function submitQuickTrade() {
    if (!quickTradeAccount) { showToast('Please select a journal'); return }
    if (!quickTradeSymbol?.trim()) { showToast('Please enter a symbol'); return }
    if (quickTradeSymbol.trim().length > 20) { showToast('Symbol max 20 characters'); return }
    if (!quickTradePnl || isNaN(parseFloat(quickTradePnl))) { showToast('Please enter a valid PnL number'); return }
    if (Math.abs(parseFloat(quickTradePnl)) > 9999999999.99) { showToast('PnL max ±$9,999,999,999.99'); return }
    // Parse RR - accepts "2.5" or "1:2" format
    const parseRR = (rr) => {
      if (!rr) return null
      if (rr.includes(':')) {
        const parts = rr.split(':')
        if (parts.length === 2 && !isNaN(parseFloat(parts[1]))) return parseFloat(parts[1])
        return null
      }
      return isNaN(parseFloat(rr)) ? null : parseFloat(rr)
    }
    const parsedRR = parseRR(quickTradeRR)
    if (quickTradeRR && parsedRR === null) { showToast('Invalid RR. Use number (2.5) or ratio (1:2)'); return }
    if (parsedRR && Math.abs(parsedRR) > 999.99) { showToast('RR max ±999.99'); return }
    setSubmittingTrade(true)
    const supabase = getSupabase()

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
      time: quickTradeTime || '',
      images: quickTradeImages.length > 0 ? quickTradeImages : undefined,
      mistake: quickTradeMistake || '',
      mistakeResolved: false,
    }

    const { data, error } = await supabase.from('trades').insert({
      account_id: quickTradeAccount,
      symbol: quickTradeSymbol.trim().toUpperCase(),
      outcome: quickTradeOutcome,
      pnl: parseFloat(quickTradePnl) || 0,
      rr: parsedRR,
      date: quickTradeDate,
      direction: quickTradeDirection,
      notes: quickTradeNotes || null,
      extra_data: JSON.stringify(extraData)
    }).select().single()
    if (error) { showToast('Error: ' + error.message); setSubmittingTrade(false); return }
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
    setQuickTradeTime('')
    setQuickTradeNotes('')
    setQuickTradeMistake('')
    setQuickTradeImages([])
    setQuickTradeExtraData({})
    setSubmittingTrade(false)
  }

  // Add custom input to selected journal
  async function saveCustomInput() {
    if (!newInputLabel.trim() || !newInputOptions.trim() || !quickTradeAccount) return
    setSavingInput(true)
    const supabase = getSupabase()
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
    if (error) { showToast('Error: ' + error.message); setSavingInput(false); return }
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

  // Get options with styles for a specific field from selected account
  function getFieldOptions(fieldId) {
    const selectedAccount = accounts.find(a => a.id === quickTradeAccount)
    if (!selectedAccount?.custom_inputs) return []
    try {
      const inputs = JSON.parse(selectedAccount.custom_inputs)
      const field = inputs.find(i => i.id === fieldId)
      return field?.options || []
    } catch { return [] }
  }

  // Get styles for a specific option value in a field
  function getFieldOptionStyles(fieldId, value) {
    const selectedAccount = accounts.find(a => a.id === quickTradeAccount)
    return getAccountOptionStyles(selectedAccount, fieldId, value)
  }

  // Remove custom input from journal
  async function removeCustomInput(inputId) {
    if (!quickTradeAccount) return
    const supabase = getSupabase()
    const selectedAccount = accounts.find(a => a.id === quickTradeAccount)
    let existingInputs = []
    try { existingInputs = JSON.parse(selectedAccount?.custom_inputs || '[]') } catch {}
    const updatedInputs = existingInputs.filter(i => i.id !== inputId)
    const { error } = await supabase.from('accounts').update({ custom_inputs: JSON.stringify(updatedInputs) }).eq('id', quickTradeAccount)
    if (error) { showToast('Error: ' + error.message); return }
    setAccounts(accounts.map(a => a.id === quickTradeAccount ? { ...a, custom_inputs: JSON.stringify(updatedInputs) } : a))
  }

  // Edit Inputs modal functions
  function loadEditInputs() {
    const selectedAccount = accounts.find(a => a.id === quickTradeAccount)
    if (selectedAccount?.custom_inputs) {
      try {
        const savedInputs = JSON.parse(selectedAccount.custom_inputs)
        // Merge with defaults to ensure all fields exist
        const mergedInputs = defaultInputs.map(def => {
          const saved = savedInputs.find(s => s.id === def.id)
          return saved ? { ...def, ...saved } : def
        })
        const customInputs = savedInputs.filter(s => !defaultInputs.find(d => d.id === s.id))
        setEditInputs([...mergedInputs, ...customInputs])
      } catch { setEditInputs([...defaultInputs]) }
    } else {
      setEditInputs([...defaultInputs])
    }
  }
  function updateEditInput(i, f, v) {
    const n = [...editInputs]
    n[i] = { ...n[i], [f]: v }
    if (f === 'type' && v === 'select' && !n[i].options) n[i].options = []
    setEditInputs(n)
  }
  function addNewEditInput() {
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']
    const randomColor = colors[Math.floor(Math.random() * colors.length)]
    setEditInputs([...editInputs, { id: `custom_${Date.now()}`, label: 'New Field', type: 'text', required: false, enabled: true, fixed: false, options: [], color: randomColor }])
  }
  function restoreEditInput(i) {
    const n = [...editInputs]; n[i] = { ...n[i], hidden: false }; setEditInputs(n)
  }
  async function saveEditInputs() {
    const supabase = getSupabase()
    const { error } = await supabase.from('accounts').update({ custom_inputs: JSON.stringify(editInputs) }).eq('id', quickTradeAccount)
    if (error) { showToast('Failed to save: ' + error.message); return }
    setAccounts(accounts.map(a => a.id === quickTradeAccount ? { ...a, custom_inputs: JSON.stringify(editInputs) } : a))
    setShowEditInputsModal(false)
  }
  function openEditOptionsEditor(i) {
    setEditingOptions(i)
    const opts = editInputs[i].options || []
    setOptionsList(opts.map(o => {
      if (typeof o === 'string') return { value: o, textColor: '#888', bgColor: null }
      if (o.textColor) return { ...o }
      const hex = (o.color || '#888888').replace('#', '')
      const r = parseInt(hex.substr(0, 2), 16) || 136
      const g = parseInt(hex.substr(2, 2), 16) || 136
      const b = parseInt(hex.substr(4, 2), 16) || 136
      return { value: o.value, textColor: o.color || '#888', bgColor: `rgba(${r},${g},${b},0.15)` }
    }))
  }
  function saveEditOptions() {
    if (editingOptions === null) return
    const validOpts = optionsList.filter(o => o.value.trim())
    updateEditInput(editingOptions, 'options', validOpts)
    setEditingOptions(null); setOptionsList([])
  }
  function updateOptionValue(idx, val) { const n = [...optionsList]; n[idx] = { ...n[idx], value: val }; setOptionsList(n) }
  function updateOptionTextColor(idx, col) { const n = [...optionsList]; n[idx] = { ...n[idx], textColor: col }; setOptionsList(n) }
  function updateOptionBgColor(idx, col) { const n = [...optionsList]; n[idx] = { ...n[idx], bgColor: col }; setOptionsList(n) }
  function openEditColorEditor(i) { setEditingColor(i) }
  async function transferColumnsFromJournal(sourceId) {
    if (!sourceId) return
    const sourceAccount = accounts.find(a => a.id === sourceId)
    const sourceInputs = sourceAccount?.custom_inputs ? JSON.parse(sourceAccount.custom_inputs) : defaultInputs
    setEditInputs([...sourceInputs])
    setTransferFromJournal('')
  }

  // Set default account when accounts load or dashboard changes
  useEffect(() => {
    const dashboardAccounts = accounts.filter(acc => (acc.dashboard_type || 'accounts') === activeDashboard)
    if (dashboardAccounts.length > 0) {
      // If current quickTradeAccount is not in this dashboard, switch to first one
      const currentInDashboard = dashboardAccounts.some(a => a.id === quickTradeAccount)
      if (!currentInDashboard) {
        setQuickTradeAccount(dashboardAccounts[0].id)
      }
    }
  }, [accounts, activeDashboard])

  // Filter accounts based on active dashboard (existing accounts without dashboard_type default to 'accounts')
  const filteredAccounts = accounts.filter(acc => (acc.dashboard_type || 'accounts') === activeDashboard)

  // Get all trades across all accounts
  function getAllTrades() {
    const all = []
    filteredAccounts.forEach(acc => {
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
    const totalStartingBalance = filteredAccounts.reduce((sum, acc) => sum + (parseFloat(acc.starting_balance) || 0), 0)
    const currentBalance = totalStartingBalance + totalPnl
    const avgWin = wins > 0 ? (grossProfit / wins) : 0
    const avgLoss = losses > 0 ? (grossLoss / losses) : 0
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

    // To get 1/16 of TOTAL graph height as padding on each side:
    // If data takes 14/16 of total, padding = dataRange / 14 on each side
    const paddingAmount = dataRange / 14

    let yMax, yMin
    if (!showObjectiveLines) {
      // Tight fit: data + 1/16 padding on each side
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

    // Generate labels anchored to starting balance (start is always a label)
    const yLabels = [start]
    // Add labels above start - extend beyond yMax to ensure padding
    for (let v = start + yStep; v < yMax + yStep; v += yStep) {
      yLabels.push(v)
    }
    // Add labels below start - extend beyond yMin to ensure padding
    for (let v = start - yStep; v > yMin - yStep; v -= yStep) {
      if (v >= 0 || hasNegative || showObjectiveLines) yLabels.push(v)
    }
    // Sort from highest to lowest
    yLabels.sort((a, b) => b - a)

    // Update yMax/yMin to match label bounds
    yMax = yLabels[0]
    yMin = yLabels[yLabels.length - 1]

    const yRange = yMax - yMin || yStep

    // Calculate zero line position (percentage from top) - for when actual balance goes negative
    const zeroY = hasNegative ? ((yMax - 0) / yRange) * 100 : null
    // Calculate starting balance line
    const startLineY = ((yMax - start) / yRange) * 100
    // Calculate prop firm lines - always show if they exist
    const ddFloorY = ddFloor ? ((yMax - ddFloor) / yRange) * 100 : null
    const profitTargetY = profitTarget ? ((yMax - profitTarget) / yRange) * 100 : null

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
              const isStart = v === start
              return (
                <Fragment key={i}>
                  <span style={{ position: 'absolute', right: '5px', top: `${topPct}%`, transform: 'translateY(-50%)', fontSize: '10px', color: '#999', lineHeight: 1, textAlign: 'right', fontWeight: 400 }}>{formatYLabel(v)}</span>
                  <div style={{ position: 'absolute', right: 0, top: `${topPct}%`, width: '4px', borderTop: `1px solid ${isStart ? '#888' : '#333'}` }} />
                </Fragment>
              )
            })}
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
                    <div style={{ width: '16px', height: '0', borderTop: '1px dashed #22c55e' }} />
                    <span style={{ fontSize: '9px', color: '#22c55e', fontWeight: 500 }}>Profit Target {account?.profit_target}%</span>
                  </div>
                )}
                {(maxDdStaticFloorY !== null || trailingMaxDdPath) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '16px', height: '0', borderTop: '1px dashed #ef4444' }} />
                    <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 500 }}>
                      Max Drawdown {account?.max_dd_enabled ? `(${account?.max_dd_type === 'trailing' ? 'trailing' : 'static'}) ${account?.max_dd_pct}%` : `${account?.max_drawdown}%`}
                    </span>
                  </div>
                )}
                {dailyDdPath && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '16px', height: '0', borderTop: '1px dashed #f97316' }} />
                    <span style={{ fontSize: '9px', color: '#f97316', fontWeight: 500 }}>Daily Drawdown ({account?.daily_dd_type === 'trailing' ? 'trailing' : 'static'}) {account?.daily_dd_pct}%</span>
                  </div>
                )}
              </div>
            )}
            {/* Horizontal grid lines - skip last one since borderBottom is X-axis */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {yLabels.map((v, i) => {
                if (i === yLabels.length - 1) return null
                const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                const isStart = v === start
                return (
                  <Fragment key={i}>
                    <div style={{ position: 'absolute', left: 0, right: isStart ? '40px' : 0, top: `${topPct}%`, borderTop: isStart ? '1px dashed #555' : '1px solid rgba(51,51,51,0.5)', zIndex: isStart ? 1 : 0 }} />
                    {isStart && <span style={{ position: 'absolute', right: '4px', top: `${topPct}%`, transform: 'translateY(-50%)', fontSize: '9px', color: '#666', fontWeight: 500 }}>Start</span>}
                  </Fragment>
                )
              })}
            </div>
            <svg ref={svgRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }} viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none" onMouseMove={handleMouseMove} onMouseLeave={() => setHoverPoint(null)}>
              <defs>
                <linearGradient id="areaGradGreen" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={positiveColor} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={positiveColor} stopOpacity="0" />
                </linearGradient>
                <linearGradient id="areaGradRed" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </linearGradient>
              </defs>
              {greenAreaPath && <path d={greenAreaPath} fill="url(#areaGradGreen)" />}
              {redAreaPath && <path d={redAreaPath} fill="url(#areaGradRed)" />}
              {greenPath && <path d={greenPath} fill="none" stroke={positiveColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
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
            {/* DD Floor line - red dashed (legacy) - only when showing objectives */}
            {showObjectiveLines && ddFloorY !== null && !maxDdEnabled && (
              <div
                style={{ position: 'absolute', left: 0, right: 0, top: `${ddFloorY}%`, height: '12px', transform: 'translateY(-50%)', cursor: 'pointer', zIndex: 2 }}
                onMouseEnter={() => setHoverLine({ type: 'maxDd', value: ddFloor, y: ddFloorY, label: 'Max Drawdown' })}
                onMouseLeave={() => setHoverLine(null)}
              >
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px dashed #ef4444' }} />
              </div>
            )}
            {/* Static Max DD floor line - red dashed horizontal - only when showing objectives */}
            {showObjectiveLines && maxDdStaticFloorY !== null && (
              <div
                style={{ position: 'absolute', left: 0, right: 0, top: `${maxDdStaticFloorY}%`, height: '12px', transform: 'translateY(-50%)', cursor: 'pointer', zIndex: 2 }}
                onMouseEnter={() => setHoverLine({ type: 'maxDd', value: maxDdStaticFloor, y: maxDdStaticFloorY, label: 'Max Drawdown' })}
                onMouseLeave={() => setHoverLine(null)}
              >
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px dashed #ef4444' }} />
              </div>
            )}
            {/* Profit target line - green dashed - only when showing objectives */}
            {showObjectiveLines && profitTargetY !== null && (
              <div
                style={{ position: 'absolute', left: 0, right: 0, top: `${profitTargetY}%`, height: '12px', transform: 'translateY(-50%)', cursor: 'pointer', zIndex: 2 }}
                onMouseEnter={() => setHoverLine({ type: 'target', value: profitTarget, y: profitTargetY, label: 'Target' })}
                onMouseLeave={() => setHoverLine(null)}
              >
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', borderTop: '1px dashed #22c55e' }} />
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
              <div style={{ position: 'absolute', left: `${hoverPoint.xPct}%`, top: `${hoverPoint.yPct}%`, transform: 'translate(-50%, -50%)', width: '12px', height: '12px', borderRadius: '50%', background: hoverPoint.balance >= start ? positiveColor : '#ef4444', border: '2px solid #fff', pointerEvents: 'none', zIndex: 10 }} />
            )}
            
            {/* Tooltip next to the dot */}
            {hoverPoint && (
              <div style={{ position: 'absolute', left: `${hoverPoint.xPct}%`, top: `${hoverPoint.yPct}%`, transform: `translate(${hoverPoint.xPct > 80 ? 'calc(-100% - 15px)' : '15px'}, ${hoverPoint.yPct < 20 ? '0%' : hoverPoint.yPct > 80 ? '-100%' : '-50%'})`, background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '8px 12px', fontSize: '11px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
                <div style={{ color: '#999' }}>{hoverPoint.date ? new Date(hoverPoint.date).toLocaleDateString() : 'Start'}</div>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>${hoverPoint.balance.toLocaleString()}</div>
                {hoverPoint.symbol && <div style={{ color: hoverPoint.pnl >= 0 ? positiveColor : '#ef4444' }}>{hoverPoint.symbol}: {hoverPoint.pnl >= 0 ? '+' : ''}${hoverPoint.pnl.toFixed(0)}</div>}
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
    return <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><img src="/logo.svg" alt="TradeSave+" style={{ height: '50px', width: 'auto', marginBottom: '16px' }} /><div style={{ color: '#999' }}>Loading...</div></div></div>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      {/* Header */}
      <header style={{ padding: '4px 40px', height: '68px', boxSizing: 'border-box', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1a1a22', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: '12px' }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', height: isMobile ? '32px' : '60px' }}>
          <img src="/logo.svg" alt="TradeSave+" style={{ height: '130%', width: 'auto' }} />
        </a>
        {!isMobile && <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => handleDashboardSwitch('accounts')} disabled={switchingDashboard} style={{ background: 'none', border: 'none', padding: 0, cursor: switchingDashboard ? 'wait' : 'pointer', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px', color: activeDashboard === 'accounts' ? '#fff' : '#666', opacity: switchingDashboard ? 0.6 : 1, transition: 'color 0.2s' }}>ACCOUNTS DASHBOARD</button>
          <span style={{ color: '#333', fontSize: '28px', fontWeight: 300 }}>|</span>
          <button onClick={() => handleDashboardSwitch('backtesting')} disabled={switchingDashboard} style={{ background: 'none', border: 'none', padding: 0, cursor: switchingDashboard ? 'wait' : 'pointer', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px', color: activeDashboard === 'backtesting' ? '#fff' : '#666', opacity: switchingDashboard ? 0.6 : 1, transition: 'color 0.2s' }}>BACKTESTING DASHBOARD</button>
        </div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* View Toggle - Grid/List */}
          <div style={{ display: 'flex', background: '#0a0a0f', borderRadius: '6px', overflow: 'hidden', border: '1px solid #1a1a22' }}>
            <button onClick={() => setViewMode('cards')} style={{ padding: '8px 12px', background: viewMode === 'cards' ? themeColor : 'transparent', border: 'none', color: viewMode === 'cards' ? '#fff' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s' }} onMouseEnter={e => { if (viewMode !== 'cards') e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; const rect = e.currentTarget.getBoundingClientRect(); showTooltipDelayed('Grid view', rect.left + rect.width / 2, rect.top) }} onMouseLeave={e => { if (viewMode !== 'cards') e.currentTarget.style.background = 'transparent'; hideTooltip() }}>
              <span>Grid</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
            </button>
            <button onClick={() => setViewMode('list')} style={{ padding: '8px 12px', background: viewMode === 'list' ? themeColor : 'transparent', border: 'none', color: viewMode === 'list' ? '#fff' : '#666', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, transition: 'all 0.2s' }} onMouseEnter={e => { if (viewMode !== 'list') e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; const rect = e.currentTarget.getBoundingClientRect(); showTooltipDelayed('List view', rect.left + rect.width / 2, rect.top) }} onMouseLeave={e => { if (viewMode !== 'list') e.currentTarget.style.background = 'transparent'; hideTooltip() }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
              <span>List</span>
            </button>
          </div>
          {/* Menu Dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ padding: '8px 16px', background: menuOpen ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }} onMouseEnter={e => { if (!menuOpen) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = '#3a3a45' }} onMouseLeave={e => { if (!menuOpen) e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#2a2a35' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              Menu
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: menuOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} />
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: '#14141a', border: '1px solid #2a2a35', borderRadius: '8px', padding: '6px', minWidth: '200px', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                  <button onClick={() => { setShowModal(true); setMenuOpen(false) }} style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                    Create New Journal
                  </button>
                  <button onClick={() => { setSidebarExpanded(true); setMenuOpen(false) }} style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={themeColor} strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    Log Trade
                  </button>
                  <div style={{ height: '1px', background: '#2a2a35', margin: '6px 0' }} />
                  <button onClick={() => { setShowImportModal(true); setImportStep(1); setImportFile(null); setImportData([]); setImportHeaders([]); setImportMapping({}); setImportJournalName(''); setImportStartingBalance(''); setImportError(''); setMenuOpen(false) }} style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9333ea" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    Import Journal
                  </button>
                  <button onClick={() => { showToast('Export feature coming soon!', 'info'); setMenuOpen(false) }} style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Export Journal
                  </button>
                  <div style={{ height: '1px', background: '#2a2a35', margin: '6px 0' }} />
                  <a href="/settings" onClick={() => setMenuOpen(false)} style={{ display: 'flex', width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: 500, cursor: 'pointer', textAlign: 'left', alignItems: 'center', gap: '10px', textDecoration: 'none', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                    Settings
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1800px', margin: '0 auto', padding: '12px', minHeight: 'calc(100vh - 80px)' }}>
        {/* Main Layout: LOG TRADE Sidebar (left) + Main Content (right 2/3) */}
        {!isMobile && filteredAccounts.length > 0 ? (
          <div style={{ display: 'flex', gap: '12px', minWidth: 0 }}>
            {/* LOG TRADE Widget - Fixed Left Sidebar */}
            <div onClick={() => setSidebarExpanded(true)} style={{ width: '280px', flexShrink: 0, background: 'linear-gradient(135deg, #0f0f14 0%, #0a0a0f 100%)', border: '1px solid #1a1a22', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.3)', alignSelf: 'flex-start', cursor: 'pointer' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #1a1a22' }}>
                    <span style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>Log Trade</span>
                    {getSelectedAccountCustomInputs().length > 2 && (
                      <button onClick={(e) => { e.stopPropagation(); setSidebarExpanded(true) }} style={{ padding: '6px 8px', background: `rgba(${themeColorRgb},0.1)`, border: `1px solid rgba(${themeColorRgb},0.3)`, borderRadius: '6px', color: themeColor, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }} title="Expand" onMouseEnter={e => { e.currentTarget.style.background = `rgba(${themeColorRgb},0.2)`; e.currentTarget.style.borderColor = `rgba(${themeColorRgb},0.5)` }} onMouseLeave={e => { e.currentTarget.style.background = `rgba(${themeColorRgb},0.1)`; e.currentTarget.style.borderColor = `rgba(${themeColorRgb},0.3)` }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Journal Select - Dropdown */}
                  <div onClick={e => e.stopPropagation()} style={{ marginBottom: '14px', position: 'relative' }}>
                    <button onClick={() => setJournalDropdownOpen(!journalDropdownOpen)} style={{ width: '100%', padding: '10px 14px', background: `rgba(${themeColorRgb},0.08)`, border: `1px solid rgba(${themeColorRgb},0.3)`, borderRadius: journalDropdownOpen ? '10px 10px 0 0' : '10px', color: themeColor, fontSize: '13px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = `rgba(${themeColorRgb},0.15)`; e.currentTarget.style.borderColor = `rgba(${themeColorRgb},0.5)` }} onMouseLeave={e => { e.currentTarget.style.background = `rgba(${themeColorRgb},0.08)`; e.currentTarget.style.borderColor = `rgba(${themeColorRgb},0.3)` }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0, flex: 1 }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: themeColor, boxShadow: `0 0 4px ${themeColor}`, flexShrink: 0, marginTop: '5px' }} />
                        <span style={{ wordBreak: 'break-word' }}>{accounts.find(a => a.id === quickTradeAccount)?.name || 'Select Journal'}</span>
                      </div>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: journalDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0, marginTop: '3px' }}><path d="M6 9l6 6 6-6"/></svg>
                    </button>
                    {journalDropdownOpen && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0d0d12', border: `1px solid rgba(${themeColorRgb},0.3)`, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '6px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                        {filteredAccounts.map(acc => {
                          const isSelected = quickTradeAccount === acc.id
                          const accTrades = trades[acc.id] || []
                          const totalPnl = accTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
                          return (
                            <button key={acc.id} onClick={() => { setQuickTradeAccount(acc.id); setJournalDropdownOpen(false) }} style={{ width: '100%', padding: '10px 12px', background: isSelected ? `rgba(${themeColorRgb},0.12)` : '#0a0a0f', border: `1px solid ${isSelected ? `rgba(${themeColorRgb},0.4)` : '#1a1a22'}`, borderRadius: '8px', color: isSelected ? themeColor : '#999', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0, flex: 1 }}>
                                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: isSelected ? themeColor : '#444', flexShrink: 0, marginTop: '4px' }} />
                                  <span style={{ wordBreak: 'break-word', lineHeight: '1.3' }}>{acc.name}</span>
                                </div>
                                <span style={{ fontSize: '11px', color: totalPnl >= 0 ? positiveColor : '#ef4444', flexShrink: 0, whiteSpace: 'nowrap' }}>{totalPnl >= 0 ? '+' : ''}${formatCurrency(totalPnl)}</span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Form content wrapper - stops propagation to prevent expand on input clicks */}
                  <div onClick={e => e.stopPropagation()}>
                  {/* Core Fields Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Symbol</label>
                      <input type="text" value={quickTradeSymbol} onChange={e => setQuickTradeSymbol(e.target.value)} placeholder="XAUUSD" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#2a2a35'} onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a22'} onFocus={e => e.currentTarget.style.borderColor = themeColor} onBlur={e => e.currentTarget.style.borderColor = '#1a1a22'} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>P&L ($)</label>
                      <input type="number" value={quickTradePnl} onChange={e => setQuickTradePnl(e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#2a2a35'} onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a22'} onFocus={e => e.currentTarget.style.borderColor = themeColor} onBlur={e => e.currentTarget.style.borderColor = '#1a1a22'} />
                    </div>
                  </div>

                  {/* Direction + Outcome Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                    {(() => {
                      const dirStyles = getFieldOptionStyles('direction', quickTradeDirection)
                      const dirOptions = getFieldOptions('direction')
                      const displayVal = dirOptions.find(o => getOptVal(o).toLowerCase() === quickTradeDirection?.toLowerCase())
                      return (
                        <div style={{ position: 'relative' }}>
                          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Direction</label>
                          <button type="button" onClick={() => { setDirectionDropdownOpen(!directionDropdownOpen); setOutcomeDropdownOpen(false); setConfidenceDropdownOpen(false); setTimeframeDropdownOpen(false); setSessionDropdownOpen(false); setCustomDropdownOpen({}) }} style={{ width: '100%', padding: '10px 12px', background: quickTradeDirection ? (dirStyles.bgColor || '#0a0a0f') : '#0a0a0f', border: directionDropdownOpen ? `1px solid ${themeColor}` : quickTradeDirection ? `1px solid ${dirStyles.borderColor || dirStyles.textColor + '80' || '#1a1a22'}` : '1px solid #1a1a22', borderRadius: directionDropdownOpen ? '8px 8px 0 0' : '8px', color: quickTradeDirection ? (dirStyles.textColor || '#fff') : '#888', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { if (!directionDropdownOpen && !quickTradeDirection) e.currentTarget.style.borderColor = '#2a2a35' }} onMouseLeave={e => { if (!directionDropdownOpen && !quickTradeDirection) e.currentTarget.style.borderColor = '#1a1a22' }}>
                            <span>{displayVal ? getOptVal(displayVal) : (quickTradeDirection || '-')}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: directionDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
                          </button>
                          {directionDropdownOpen && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0f', border: `1px solid ${themeColor}`, borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 100, overflow: 'hidden' }}>
                              <div onClick={() => { setQuickTradeDirection(''); setDirectionDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: '#888', fontSize: '14px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</div>
                              {dirOptions.map(opt => {
                                const optVal = getOptVal(opt)
                                const optColor = typeof opt === 'object' ? (opt.textColor || '#fff') : '#fff'
                                const optBg = typeof opt === 'object' ? (opt.bgColor || null) : null
                                return (
                                  <div key={optVal} onClick={() => { setQuickTradeDirection(optVal.toLowerCase()); setDirectionDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: optColor, fontSize: '14px', fontWeight: 600, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = optBg || 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{optVal}</div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                    {(() => {
                      const outStyles = getFieldOptionStyles('outcome', quickTradeOutcome)
                      const outOptions = getFieldOptions('outcome')
                      const displayVal = outOptions.find(o => getOptVal(o).toLowerCase() === quickTradeOutcome?.toLowerCase())
                      return (
                        <div style={{ position: 'relative' }}>
                          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Outcome</label>
                          <button type="button" onClick={() => { setOutcomeDropdownOpen(!outcomeDropdownOpen); setDirectionDropdownOpen(false); setConfidenceDropdownOpen(false); setTimeframeDropdownOpen(false); setSessionDropdownOpen(false); setCustomDropdownOpen({}) }} style={{ width: '100%', padding: '10px 12px', background: quickTradeOutcome ? (outStyles.bgColor || '#0a0a0f') : '#0a0a0f', border: outcomeDropdownOpen ? `1px solid ${themeColor}` : quickTradeOutcome ? `1px solid ${outStyles.borderColor || outStyles.textColor + '80' || '#1a1a22'}` : '1px solid #1a1a22', borderRadius: outcomeDropdownOpen ? '8px 8px 0 0' : '8px', color: quickTradeOutcome ? (outStyles.textColor || '#fff') : '#888', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { if (!outcomeDropdownOpen && !quickTradeOutcome) e.currentTarget.style.borderColor = '#2a2a35' }} onMouseLeave={e => { if (!outcomeDropdownOpen && !quickTradeOutcome) e.currentTarget.style.borderColor = '#1a1a22' }}>
                            <span>{displayVal ? getOptVal(displayVal) : (quickTradeOutcome || '-')}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: outcomeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
                          </button>
                          {outcomeDropdownOpen && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0f', border: `1px solid ${themeColor}`, borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 100, overflow: 'hidden' }}>
                              <div onClick={() => { setQuickTradeOutcome(''); setOutcomeDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: '#888', fontSize: '14px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</div>
                              {outOptions.map(opt => {
                                const optVal = getOptVal(opt)
                                const optColor = typeof opt === 'object' ? (opt.textColor || '#fff') : '#fff'
                                const optBg = typeof opt === 'object' ? (opt.bgColor || null) : null
                                return (
                                  <div key={optVal} onClick={() => { setQuickTradeOutcome(optVal.toLowerCase()); setOutcomeDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: optColor, fontSize: '14px', fontWeight: 600, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = optBg || 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{optVal}</div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>

                  {/* RR + % Risk */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>RR</label>
                      <input type="text" value={quickTradeRR} onChange={e => setQuickTradeRR(e.target.value)} placeholder="2.5" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#2a2a35'} onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a22'} onFocus={e => e.currentTarget.style.borderColor = themeColor} onBlur={e => e.currentTarget.style.borderColor = '#1a1a22'} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>% Risk</label>
                      <input type="number" value={quickTradeRiskPercent} onChange={e => setQuickTradeRiskPercent(e.target.value)} placeholder="1" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#2a2a35'} onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a22'} onFocus={e => e.currentTarget.style.borderColor = themeColor} onBlur={e => e.currentTarget.style.borderColor = '#1a1a22'} />
                    </div>
                  </div>

                  {/* Confidence + Timeframe */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                    {(() => {
                      const confStyles = getFieldOptionStyles('confidence', quickTradeConfidence)
                      const confOptions = getFieldOptions('confidence')
                      const displayVal = confOptions.find(o => getOptVal(o).toLowerCase() === quickTradeConfidence?.toLowerCase())
                      return (
                        <div style={{ position: 'relative' }}>
                          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Confidence</label>
                          <button type="button" onClick={() => { setConfidenceDropdownOpen(!confidenceDropdownOpen); setDirectionDropdownOpen(false); setOutcomeDropdownOpen(false); setTimeframeDropdownOpen(false); setSessionDropdownOpen(false); setCustomDropdownOpen({}) }} style={{ width: '100%', padding: '10px 12px', background: quickTradeConfidence ? (confStyles.bgColor || '#0a0a0f') : '#0a0a0f', border: confidenceDropdownOpen ? `1px solid ${themeColor}` : quickTradeConfidence ? `1px solid ${confStyles.borderColor || confStyles.textColor + '80' || '#1a1a22'}` : '1px solid #1a1a22', borderRadius: confidenceDropdownOpen ? '8px 8px 0 0' : '8px', color: quickTradeConfidence ? (confStyles.textColor || '#fff') : '#888', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { if (!confidenceDropdownOpen && !quickTradeConfidence) e.currentTarget.style.borderColor = '#2a2a35' }} onMouseLeave={e => { if (!confidenceDropdownOpen && !quickTradeConfidence) e.currentTarget.style.borderColor = '#1a1a22' }}>
                            <span>{displayVal ? getOptVal(displayVal) : (quickTradeConfidence || '-')}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: confidenceDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
                          </button>
                          {confidenceDropdownOpen && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0f', border: `1px solid ${themeColor}`, borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 100, overflow: 'hidden' }}>
                              <div onClick={() => { setQuickTradeConfidence(''); setConfidenceDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: '#888', fontSize: '14px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</div>
                              {confOptions.map(opt => {
                                const optVal = getOptVal(opt)
                                const optColor = typeof opt === 'object' ? (opt.textColor || '#fff') : '#fff'
                                const optBg = typeof opt === 'object' ? (opt.bgColor || null) : null
                                return (
                                  <div key={optVal} onClick={() => { setQuickTradeConfidence(optVal); setConfidenceDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: optColor, fontSize: '14px', fontWeight: 600, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = optBg || 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{optVal}</div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                    {(() => {
                      const tfStyles = getFieldOptionStyles('timeframe', quickTradeTimeframe)
                      const tfOptions = getFieldOptions('timeframe')
                      const displayVal = tfOptions.find(o => getOptVal(o) === quickTradeTimeframe)
                      return (
                        <div style={{ position: 'relative' }}>
                          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Timeframe</label>
                          <button type="button" onClick={() => { setTimeframeDropdownOpen(!timeframeDropdownOpen); setDirectionDropdownOpen(false); setOutcomeDropdownOpen(false); setConfidenceDropdownOpen(false); setSessionDropdownOpen(false); setCustomDropdownOpen({}) }} style={{ width: '100%', padding: '10px 12px', background: quickTradeTimeframe ? (tfStyles.bgColor || '#0a0a0f') : '#0a0a0f', border: timeframeDropdownOpen ? `1px solid ${themeColor}` : quickTradeTimeframe ? `1px solid ${tfStyles.borderColor || tfStyles.textColor + '80' || '#1a1a22'}` : '1px solid #1a1a22', borderRadius: timeframeDropdownOpen ? '8px 8px 0 0' : '8px', color: quickTradeTimeframe ? (tfStyles.textColor || '#fff') : '#888', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { if (!timeframeDropdownOpen && !quickTradeTimeframe) e.currentTarget.style.borderColor = '#2a2a35' }} onMouseLeave={e => { if (!timeframeDropdownOpen && !quickTradeTimeframe) e.currentTarget.style.borderColor = '#1a1a22' }}>
                            <span>{displayVal ? getOptVal(displayVal) : (quickTradeTimeframe || '-')}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: timeframeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
                          </button>
                          {timeframeDropdownOpen && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0f', border: `1px solid ${themeColor}`, borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 100, overflow: 'hidden' }}>
                              <div onClick={() => { setQuickTradeTimeframe(''); setTimeframeDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: '#888', fontSize: '14px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</div>
                              {tfOptions.map(opt => {
                                const optVal = getOptVal(opt)
                                const optColor = typeof opt === 'object' ? (opt.textColor || '#fff') : '#fff'
                                const optBg = typeof opt === 'object' ? (opt.bgColor || null) : null
                                return (
                                  <div key={optVal} onClick={() => { setQuickTradeTimeframe(optVal); setTimeframeDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: optColor, fontSize: '14px', fontWeight: 600, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = optBg || 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{optVal}</div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Session + Custom Inputs - flowing grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                    {(() => {
                      const sessStyles = getFieldOptionStyles('session', quickTradeSession)
                      const sessOptions = getFieldOptions('session')
                      const displayVal = sessOptions.find(o => getOptVal(o) === quickTradeSession)
                      return (
                        <div style={{ position: 'relative' }}>
                          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Session</label>
                          <button type="button" onClick={() => { setSessionDropdownOpen(!sessionDropdownOpen); setDirectionDropdownOpen(false); setOutcomeDropdownOpen(false); setConfidenceDropdownOpen(false); setTimeframeDropdownOpen(false); setCustomDropdownOpen({}) }} style={{ width: '100%', padding: '10px 12px', background: quickTradeSession ? (sessStyles.bgColor || '#0a0a0f') : '#0a0a0f', border: sessionDropdownOpen ? `1px solid ${themeColor}` : quickTradeSession ? `1px solid ${sessStyles.borderColor || sessStyles.textColor + '80' || '#1a1a22'}` : '1px solid #1a1a22', borderRadius: sessionDropdownOpen ? '8px 8px 0 0' : '8px', color: quickTradeSession ? (sessStyles.textColor || '#fff') : '#888', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { if (!sessionDropdownOpen && !quickTradeSession) e.currentTarget.style.borderColor = '#2a2a35' }} onMouseLeave={e => { if (!sessionDropdownOpen && !quickTradeSession) e.currentTarget.style.borderColor = '#1a1a22' }}>
                            <span>{displayVal ? getOptVal(displayVal) : (quickTradeSession || '-')}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: sessionDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
                          </button>
                          {sessionDropdownOpen && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0f', border: `1px solid ${themeColor}`, borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 100, overflow: 'hidden' }}>
                              <div onClick={() => { setQuickTradeSession(''); setSessionDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: '#888', fontSize: '14px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</div>
                              {sessOptions.map(opt => {
                                const optVal = getOptVal(opt)
                                const optColor = typeof opt === 'object' ? (opt.textColor || '#fff') : '#fff'
                                const optBg = typeof opt === 'object' ? (opt.bgColor || null) : null
                                return (
                                  <div key={optVal} onClick={() => { setQuickTradeSession(optVal); setSessionDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: optColor, fontSize: '14px', fontWeight: 600, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = optBg || 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{optVal}</div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })()}
                    {getSelectedAccountCustomInputs().filter(input => !['confidence', 'timeframe', 'session'].includes(input.id)).map(input => {
                      const isOpen = customDropdownOpen[input.id] || false
                      const currentVal = quickTradeExtraData[input.id] || ''
                      const currentOpt = (input.options || []).find(o => getOptVal(o) === currentVal)
                      const currentColor = currentOpt && typeof currentOpt === 'object' ? (currentOpt.textColor || '#fff') : '#fff'
                      return (
                        <div key={input.id} style={{ position: 'relative' }}>
                          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{input.label || input.id}</label>
                          <button type="button" onClick={() => { setCustomDropdownOpen(prev => ({ ...Object.fromEntries(Object.keys(prev).map(k => [k, false])), [input.id]: !isOpen })); setDirectionDropdownOpen(false); setOutcomeDropdownOpen(false); setConfidenceDropdownOpen(false); setTimeframeDropdownOpen(false); setSessionDropdownOpen(false) }} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: isOpen ? `1px solid ${themeColor}` : '1px solid #1a1a22', borderRadius: isOpen ? '8px 8px 0 0' : '8px', color: currentVal ? currentColor : '#888', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { if (!isOpen && !currentVal) e.currentTarget.style.borderColor = '#2a2a35' }} onMouseLeave={e => { if (!isOpen && !currentVal) e.currentTarget.style.borderColor = '#1a1a22' }}>
                            <span>{currentVal || '-'}</span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
                          </button>
                          {isOpen && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0f', border: `1px solid ${themeColor}`, borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 100, overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }}>
                              <div onClick={() => { setQuickTradeExtraData(prev => ({ ...prev, [input.id]: '' })); setCustomDropdownOpen({}) }} style={{ padding: '10px 12px', cursor: 'pointer', color: '#888', fontSize: '14px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</div>
                              {(input.options || []).map(opt => {
                                const optVal = getOptVal(opt)
                                const optColor = typeof opt === 'object' ? (opt.textColor || '#fff') : '#fff'
                                const optBg = typeof opt === 'object' ? (opt.bgColor || null) : null
                                return (
                                  <div key={optVal} onClick={() => { setQuickTradeExtraData(prev => ({ ...prev, [input.id]: optVal })); setCustomDropdownOpen({}) }} style={{ padding: '10px 12px', cursor: 'pointer', color: optColor, fontSize: '14px', fontWeight: 600, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = optBg || 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{optVal}</div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Date */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Date</label>
                    <input type="date" value={quickTradeDate} onChange={e => setQuickTradeDate(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#2a2a35'} onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a22'} onFocus={e => e.currentTarget.style.borderColor = themeColor} onBlur={e => e.currentTarget.style.borderColor = '#1a1a22'} />
                  </div>

                  {/* Rating */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Rating</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'inline-flex', gap: '2px', padding: '8px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px' }} onMouseLeave={() => setHoverRating(0)}>
                        {[1, 2, 3, 4, 5].map(star => {
                          const displayRating = hoverRating || parseFloat(quickTradeRating) || 0
                          const isFullStar = displayRating >= star
                          const isHalfStar = displayRating >= star - 0.5 && displayRating < star
                          return (
                            <div key={star} style={{ position: 'relative', width: '20px', height: '20px', cursor: 'pointer' }}
                              onMouseMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const x = e.clientX - rect.left; setHoverRating(x < rect.width / 2 ? star - 0.5 : star) }}
                              onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const x = e.clientX - rect.left; const newRating = x < rect.width / 2 ? star - 0.5 : star; setQuickTradeRating(parseFloat(quickTradeRating) === newRating ? '' : String(newRating)) }}>
                              <span style={{ position: 'absolute', color: '#2a2a35', fontSize: '20px', lineHeight: 1 }}>★</span>
                              {isHalfStar && <span style={{ position: 'absolute', color: themeColor, fontSize: '20px', lineHeight: 1, width: '48%', overflow: 'hidden' }}>★</span>}
                              {isFullStar && <span style={{ position: 'absolute', color: themeColor, fontSize: '20px', lineHeight: 1 }}>★</span>}
                            </div>
                          )
                        })}
                      </div>
                      <span style={{ background: '#1a1a22', padding: '6px 10px', borderRadius: '6px', fontSize: '13px', color: '#fff', whiteSpace: 'nowrap', minWidth: '40px', textAlign: 'center' }}>
                        {hoverRating || parseFloat(quickTradeRating) || 0} / 5
                      </span>
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Notes</label>
                    <input type="text" value={quickTradeNotes} onChange={e => setQuickTradeNotes(e.target.value)} placeholder="Quick notes..." style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#2a2a35'} onMouseLeave={e => e.currentTarget.style.borderColor = '#1a1a22'} onFocus={e => e.currentTarget.style.borderColor = themeColor} onBlur={e => e.currentTarget.style.borderColor = '#1a1a22'} />
                  </div>

                  {/* Image Upload */}
                  <div style={{ marginBottom: '14px' }}>
                    <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Images</label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {quickTradeImages.map((img, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #1a1a22' }}>
                          <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button onClick={() => removeQuickTradeImage(idx)} style={{ position: 'absolute', top: '2px', right: '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
                        </div>
                      ))}
                      <label style={{ width: '48px', height: '48px', borderRadius: '6px', border: '1px dashed #333', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploadingImage ? 'wait' : 'pointer', opacity: uploadingImage ? 0.5 : 1 }}>
                        <input type="file" accept="image/*" multiple onChange={async (e) => { for (const file of e.target.files) { await uploadQuickTradeImage(file) } e.target.value = '' }} style={{ display: 'none' }} disabled={uploadingImage} />
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                      </label>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={submitQuickTrade} disabled={submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate} style={{ flex: 1, padding: '12px', background: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate) ? '#1a1a22' : `linear-gradient(135deg, ${themeColor} 0%, ${themeColorDark} 100%)`, border: 'none', borderRadius: '10px', color: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate) ? '#555' : '#fff', fontWeight: 700, fontSize: '13px', cursor: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate) ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: (submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate) ? 'none' : `0 4px 20px rgba(${themeColorRgb},0.4)` }}>
                      {submittingTrade ? 'Adding...' : 'Log Trade'}
                    </button>
                    <button onClick={() => setShowEditInputsModal(true)} style={{ padding: '12px 14px', background: '#0a0a0f', border: '1px solid #2a2a35', borderRadius: '10px', color: '#666', fontWeight: 500, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    </button>
                  </div>
                  </div>{/* Close form wrapper */}
                </div>

              {/* Right Content Area (Overall Stats + Journal Cards) */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Overall Stats */}
                {(() => {
                  const stats = getCumulativeStats()
                  const allTrades = getAllTrades()
                  let cumPnl = 0
                  // Sort by date and time
                  const getTradeTime = (t) => {
                    try { const extra = JSON.parse(t.extra_data || '{}'); return extra.time || '00:00' } catch { return '00:00' }
                  }
                  const sortedTrades = allTrades.slice().sort((a, b) => {
                    const dateA = new Date(a.date + 'T' + getTradeTime(a))
                    const dateB = new Date(b.date + 'T' + getTradeTime(b))
                    return dateA - dateB
                  })
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
                  const expectancy = allTrades.length > 0 ? (cumPnl / allTrades.length) : 0
                  const avgWin = winningTrades.length > 0 ? (winningTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0) / winningTrades.length) : 0
                  const avgLoss = losingTrades.length > 0 ? (losingTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0) / losingTrades.length) : 0
                  const longTrades = allTrades.filter(t => t.direction === 'long' || t.direction === 'Long')
                  const shortTrades = allTrades.filter(t => t.direction === 'short' || t.direction === 'Short')
                  const longWins = longTrades.filter(t => t.outcome === 'win').length
                  const shortWins = shortTrades.filter(t => t.outcome === 'win').length
                  const longWR = longTrades.length > 0 ? Math.round((longWins / longTrades.length) * 100) : 0
                  const shortWR = shortTrades.length > 0 ? Math.round((shortWins / shortTrades.length) * 100) : 0
                  const profitableDays = Object.values(dailyPnls).filter(v => v > 0).length
                  const dayWR = uniqueDays > 0 ? Math.round((profitableDays / uniqueDays) * 100) : 0
                  const consistency = uniqueDays > 0 ? Math.round((profitableDays / uniqueDays) * 100) : 0
                  // Win/Loss streaks (BE breaks streak)
                  let winStreak = 0, lossStreak = 0, currentWin = 0, currentLoss = 0
                  sortedTrades.forEach(t => {
                    if (t.outcome === 'win') { currentWin++; currentLoss = 0; if (currentWin > winStreak) winStreak = currentWin }
                    else if (t.outcome === 'loss') { currentLoss++; currentWin = 0; if (currentLoss > lossStreak) lossStreak = currentLoss }
                    else { currentWin = 0; currentLoss = 0 } // BE or other breaks both streaks
                  })

                  const totalBalance = stats.totalStartingBalance + cumPnl
                  const isProfitable = cumPnl >= 0

                  // Get most recent note (from daily, weekly, or custom)
                  const getRecentNote = () => {
                    try {
                      const allNotes = []
                      // Daily notes
                      const dailyNotes = notes && typeof notes.daily === 'object' && notes.daily !== null ? notes.daily : {}
                      Object.entries(dailyNotes).forEach(([date, text]) => {
                        if (date && text) allNotes.push({ type: 'daily', date, text, sortDate: new Date(date) })
                      })
                      // Weekly notes
                      const weeklyNotes = notes && typeof notes.weekly === 'object' && notes.weekly !== null ? notes.weekly : {}
                      Object.entries(weeklyNotes).forEach(([date, text]) => {
                        if (date && text) allNotes.push({ type: 'weekly', date, text, sortDate: new Date(date) })
                      })
                      // Custom notes
                      const customNotes = notes && Array.isArray(notes.custom) ? notes.custom : []
                      customNotes.forEach((note, idx) => {
                        if (note && note.text) allNotes.push({ type: 'custom', date: note.date || new Date().toISOString(), text: note.text, title: note.title || 'Note', sortDate: new Date(note.date || Date.now()), idx })
                      })
                      // Sort by date descending and return most recent
                      allNotes.sort((a, b) => b.sortDate - a.sortDate)
                      return allNotes[0] || null
                    } catch (e) {
                      return null
                    }
                  }
                  const recentNote = getRecentNote()

                  return (
                    <div style={{ background: 'linear-gradient(135deg, #0f0f14 0%, #0a0a0f 100%)', border: '1px solid #1a1a22', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 24px rgba(0,0,0,0.3)' }}>
                      {/* Header - Clean layout like journal widgets */}
                      <div style={{ padding: '16px 16px 12px', position: 'relative' }}>
                        <div>
                          <div style={{ fontSize: '13px', color: '#666', marginBottom: '2px' }}>Overall Stats</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                            <span style={{ fontSize: '24px', fontWeight: 700, color: isProfitable ? positiveColor : '#ef4444' }}>${formatCurrency(totalBalance)}</span>
                            <span style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap' }}><span style={{ fontWeight: 600, color: '#888' }}>${formatCurrency(stats.totalStartingBalance)}</span> INITIAL BALANCE</span>
                          </div>
                        </div>
                        {/* Recent Note - positioned at top right */}
                        {/* RECENT NOTE label outside the box */}
                        <div style={{ position: 'absolute', top: '12px', left: '50%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', transform: 'translateX(calc(-100% - 8px))', padding: '8px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" style={{ flexShrink: 0 }}>
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                            </svg>
                            <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: 600, flexShrink: 0 }}>RECENT NOTE:</span>
                          </div>
                          {recentNote && (
                            <span style={{ fontSize: '10px', color: '#555', marginLeft: '18px' }}>
                              {recentNote.type === 'custom' ? recentNote.title : new Date(recentNote.date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {/* Note content box */}
                        <div
                          onClick={(e) => { e.stopPropagation(); if (recentNote) setShowExpandedNote(recentNote) }}
                          style={{
                            position: 'absolute',
                            top: '12px',
                            left: '50%',
                            right: '12px',
                            background: 'transparent',
                            border: '1px solid #1a1a22',
                            borderRadius: '8px',
                            padding: '8px 12px 12px 12px',
                            cursor: recentNote ? 'pointer' : 'default',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => { if (recentNote) { e.currentTarget.style.borderColor = '#2a2a35'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)' } }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a22'; e.currentTarget.style.background = 'transparent' }}
                        >
                          <div style={{ fontSize: '12px', color: recentNote ? '#888' : '#444', fontWeight: 600, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {recentNote ? recentNote.text : 'No notes yet'}
                          </div>
                        </div>
                      </div>

                      {/* Main content: Graph (1.5 journal card width) + Right panel (stats, buttons) */}
                      <div style={{ display: 'flex', flex: 1, padding: '0 12px 0 0', gap: '12px' }}>
                        {/* Chart - 50% width (1.5 journal cards), full height */}
                        <div style={{ width: '50%', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                          {(() => {
                            const startBal = stats.totalStartingBalance || 0
                            let runningBal = startBal
                            const balancePoints = [{ value: startBal, date: null, symbol: null, pnl: 0 }]
                            sortedTrades.forEach(t => {
                              runningBal += parseFloat(t.pnl) || 0
                              balancePoints.push({ value: runningBal, date: t.date, symbol: t.symbol, pnl: parseFloat(t.pnl) || 0 })
                            })

                            if (balancePoints.length < 2) {
                              return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '12px' }}>No data yet</div>
                            }

                            const svgW = 100, svgH = 100
                            const allValues = balancePoints.map(p => p.value)
                            const dataMin = Math.min(...allValues, startBal)
                            const dataMax = Math.max(...allValues, startBal)
                            const dataRange = dataMax - dataMin || 1000
                            const paddingAmt = dataRange / 14  // 1/16 padding

                            let yMin = dataMin - paddingAmt
                            let yMax = dataMax + paddingAmt
                            if (yMin < 0 && dataMin >= 0) yMin = 0

                            const displayRange = yMax - yMin || 1000
                            const rawStep = displayRange / 5
                            const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
                            const normalized = rawStep / magnitude
                            let niceStep
                            if (normalized <= 1) niceStep = magnitude
                            else if (normalized <= 2) niceStep = 2 * magnitude
                            else if (normalized <= 2.5) niceStep = 2.5 * magnitude
                            else if (normalized <= 5) niceStep = 5 * magnitude
                            else niceStep = 10 * magnitude

                            // Generate labels anchored to starting balance (start is always a label)
                            const yLabels = [startBal]
                            // Add labels above start - extend beyond yMax to ensure padding
                            for (let v = startBal + niceStep; v < yMax + niceStep; v += niceStep) {
                              yLabels.push(v)
                            }
                            // Add labels below start - extend beyond yMin to ensure padding
                            for (let v = startBal - niceStep; v > yMin - niceStep; v -= niceStep) {
                              if (v >= 0 || dataMin < 0) yLabels.push(v)
                            }
                            // Sort from highest to lowest
                            yLabels.sort((a, b) => b - a)

                            // Update yMax/yMin to match label bounds
                            yMax = yLabels[0]
                            yMin = yLabels[yLabels.length - 1]
                            const yRange = yMax - yMin || niceStep

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
                              const numLabels = Math.min(5, sortedTrades.length + 1)
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
                              balance: p.value, date: p.date, symbol: p.symbol, pnl: p.pnl
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
                                if (above1) { greenSegs.push({ x1: p1.x, y1: p1.y, x2: ix, y2: startSvgY }); redSegs.push({ x1: ix, y1: startSvgY, x2: p2.x, y2: p2.y }) }
                                else { redSegs.push({ x1: p1.x, y1: p1.y, x2: ix, y2: startSvgY }); greenSegs.push({ x1: ix, y1: startSvgY, x2: p2.x, y2: p2.y }) }
                              }
                            }

                            const mkPath = segs => segs.map(s => `M${s.x1},${s.y1}L${s.x2},${s.y2}`).join('')
                            const mkArea = segs => segs.map(s => `M${s.x1},${s.y1}L${s.x2},${s.y2}L${s.x2},${startSvgY}L${s.x1},${startSvgY}Z`).join('')

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                                <div style={{ display: 'flex', flex: 1, minHeight: '250px' }}>
                                  <div style={{ width: '42px', flexShrink: 0, position: 'relative', borderRight: '1px solid #2a2a35', borderBottom: '1px solid transparent', overflow: 'visible' }}>
                                    {yLabels.map((v, i) => {
                                      const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                                      const isStart = v === startBal
                                      return (
                                        <Fragment key={i}>
                                          <span style={{ position: 'absolute', right: '6px', top: `${topPct}%`, transform: 'translateY(-50%)', fontSize: '8px', color: '#888', lineHeight: 1, whiteSpace: 'nowrap', fontWeight: 400 }}>{formatY(v)}</span>
                                          <div style={{ position: 'absolute', right: 0, top: `${topPct}%`, width: '4px', borderTop: `1px solid ${isStart ? '#666' : '#2a2a35'}` }} />
                                        </Fragment>
                                      )
                                    })}
                                  </div>
                                  <div style={{ flex: 1, position: 'relative', borderBottom: '1px solid #2a2a35', overflow: 'visible' }}>
                                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                                      {yLabels.map((v, i) => {
                                        const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                                        if (i === yLabels.length - 1) return null
                                        const isStart = v === startBal
                                        return (
                                          <Fragment key={i}>
                                            <div style={{ position: 'absolute', left: 0, right: isStart ? '40px' : 0, top: `${topPct}%`, borderTop: isStart ? '1px dashed #555' : '1px solid rgba(51,51,51,0.5)', zIndex: isStart ? 1 : 0 }} />
                                            {isStart && <span style={{ position: 'absolute', right: '4px', top: `${topPct}%`, transform: 'translateY(-50%)', fontSize: '8px', color: '#666', fontWeight: 500 }}>Start</span>}
                                          </Fragment>
                                        )
                                      })}
                                    </div>
                                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 2 }} viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none"
                                      onMouseMove={e => { const rect = e.currentTarget.getBoundingClientRect(); const mouseX = ((e.clientX - rect.left) / rect.width) * svgW; let closest = chartPts[0], minDist = Math.abs(mouseX - chartPts[0].x); chartPts.forEach(p => { const d = Math.abs(mouseX - p.x); if (d < minDist) { minDist = d; closest = p } }); setDashHover({ ...closest, xPct: (closest.x / svgW) * 100, yPct: (closest.y / svgH) * 100 }) }}
                                      onMouseLeave={() => setDashHover(null)}>
                                      <defs>
                                        <linearGradient id="dashGr" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={positiveColor} stopOpacity="0.3" /><stop offset="100%" stopColor={positiveColor} stopOpacity="0" /></linearGradient>
                                        <linearGradient id="dashRd" x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" /><stop offset="100%" stopColor="#ef4444" stopOpacity="0" /></linearGradient>
                                      </defs>
                                      <path d={mkArea(greenSegs)} fill="url(#dashGr)" />
                                      <path d={mkArea(redSegs)} fill="url(#dashRd)" />
                                      <path d={mkPath(greenSegs)} fill="none" stroke={positiveColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                      <path d={mkPath(redSegs)} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                    </svg>
                                    {dashHover && <div style={{ position: 'absolute', left: `${dashHover.xPct}%`, top: `${dashHover.yPct}%`, transform: 'translate(-50%, -50%)', width: '10px', height: '10px', borderRadius: '50%', background: dashHover.balance >= startBal ? positiveColor : '#ef4444', border: '2px solid #fff', pointerEvents: 'none', zIndex: 10 }} />}
                                    {dashHover && (
                                      <div style={{ position: 'absolute', left: `${dashHover.xPct}%`, top: `${dashHover.yPct}%`, transform: `translate(${dashHover.xPct > 70 ? 'calc(-100% - 12px)' : '12px'}, ${dashHover.yPct < 25 ? '0%' : dashHover.yPct > 75 ? '-100%' : '-50%'})`, background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '8px 12px', fontSize: '11px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
                                        <div style={{ color: '#888', fontSize: '10px' }}>{dashHover.date ? new Date(dashHover.date).toLocaleDateString() : 'Start'}</div>
                                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>${dashHover.balance?.toLocaleString()}</div>
                                        {dashHover.symbol && <div style={{ color: dashHover.pnl >= 0 ? positiveColor : '#ef4444', marginTop: '2px' }}>{dashHover.symbol}: {dashHover.pnl >= 0 ? '+' : ''}${dashHover.pnl?.toFixed(0)}</div>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', paddingBottom: '16px' }}>
                                  <div style={{ width: '42px', flexShrink: 0 }} />
                                  <div style={{ flex: 1, height: '14px', position: 'relative' }}>
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

                        {/* Right Panel: Stats (2 cols top-to-bottom) + Buttons bottom right */}
                        <div style={{ flex: 1, display: 'flex', gap: '12px', paddingBottom: '30px' }}>
                          {/* Stats - 2 columns, flows top to bottom, full height with 2 grey lines at top */}
                          <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                            {/* Two grey lines side by side at top (matching column gap) */}
                            <div style={{ display: 'flex', gap: '24px', paddingBottom: '6px' }}>
                              <div style={{ flex: 1, borderBottom: '1px solid #1a1a22' }} />
                              <div style={{ flex: 1, borderBottom: '1px solid #1a1a22' }} />
                            </div>
                            {/* Stats grid - 6 rows */}
                            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(6, 1fr)', gridAutoFlow: 'column', gap: '0 24px', alignContent: 'stretch' }}>
                            {[
                              { label: 'Trades', value: stats.totalTrades, color: '#fff' },
                              { label: 'Winrate', value: `${stats.winrate}%`, color: stats.winrate >= 50 ? positiveColor : '#ef4444' },
                              { label: 'Wins', value: stats.wins, color: positiveColor },
                              { label: 'Avg Win', value: `+$${formatCurrency(avgWin)}`, color: positiveColor },
                              { label: 'Win Streak', value: winStreak, color: positiveColor },
                              { label: 'Day WR', value: `${dayWR}%`, color: dayWR >= 50 ? positiveColor : '#ef4444' },
                              { label: 'Profit Factor', value: stats.profitFactor, color: stats.profitFactor === '-' ? '#666' : stats.profitFactor === '∞' ? positiveColor : parseFloat(stats.profitFactor) >= 1 ? positiveColor : '#ef4444' },
                              { label: 'Consistency', value: `${consistency}%`, color: consistency >= 50 ? positiveColor : '#ef4444' },
                              { label: 'Losses', value: stats.losses, color: '#ef4444' },
                              { label: 'Avg Loss', value: `$${formatCurrency(avgLoss)}`, color: avgLoss >= 0 ? positiveColor : '#ef4444' },
                              { label: 'Loss Streak', value: lossStreak, color: '#ef4444' },
                              { label: 'Expectancy', value: `${expectancy >= 0 ? '+' : ''}$${formatCurrency(expectancy)}`, color: expectancy >= 0 ? positiveColor : '#ef4444' },
                            ].map((s, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                                <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>{s.label}</span>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: s.color }}>{s.value}</span>
                              </div>
                            ))}
                            </div>
                          </div>

                          {/* Right side: buttons fill height */}
                          <div onClick={e => e.stopPropagation()} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            {/* Buttons - stacked vertically, each spans 2 stat rows */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                              <a href={`/account/${accounts[0]?.id}?cumulative=true`} style={{ flex: 1, background: themeColor, border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: `0 4px 12px rgba(${themeColorRgb},0.3)` }} onMouseEnter={e => { e.currentTarget.style.background = themeColorDark; e.currentTarget.style.boxShadow = `0 4px 16px rgba(${themeColorRgb},0.4)` }} onMouseLeave={e => { e.currentTarget.style.background = themeColor; e.currentTarget.style.boxShadow = `0 4px 12px rgba(${themeColorRgb},0.3)` }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                                See Overall Journal
                              </a>
                              <a href={`/account/${accounts[0]?.id}?cumulative=true&tab=statistics`} style={{ flex: 1, background: '#0a0a0f', border: `2px solid rgba(${themeColorRgb},0.3)`, borderRadius: '10px', color: themeColor, fontWeight: 600, fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = `rgba(${themeColorRgb},0.08)`; e.currentTarget.style.border = `2px solid rgba(${themeColorRgb},0.5)` }} onMouseLeave={e => { e.currentTarget.style.background = '#0a0a0f'; e.currentTarget.style.border = `2px solid rgba(${themeColorRgb},0.3)` }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                                See Overall Stats
                              </a>
                              <a href={`/account/${accounts[0]?.id}?cumulative=true&tab=notes`} style={{ flex: 1, background: '#0a0a0f', border: `2px solid rgba(${themeColorRgb},0.3)`, borderRadius: '10px', color: themeColor, fontWeight: 600, fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = `rgba(${themeColorRgb},0.08)`; e.currentTarget.style.border = `2px solid rgba(${themeColorRgb},0.5)` }} onMouseLeave={e => { e.currentTarget.style.background = '#0a0a0f'; e.currentTarget.style.border = `2px solid rgba(${themeColorRgb},0.3)` }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                                See Notes
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Journal Cards Grid */}
                {viewMode === 'cards' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {getSortedAccounts().map(account => {
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
                      <div
                        key={account.id}
                        draggable
                        onDragStart={(e) => handleJournalDragStart(e, account.id)}
                        onDragOver={(e) => handleJournalDragOver(e, account.id)}
                        onDragLeave={handleJournalDragLeave}
                        onDrop={(e) => handleJournalDrop(e, account.id)}
                        onDragEnd={handleJournalDragEnd}
                        style={{
                          background: 'linear-gradient(135deg, #0f0f14 0%, #0a0a0f 100%)',
                          border: dragOverJournal === account.id ? '2px dashed #9333ea' : draggedJournal === account.id ? '2px solid #9333ea' : '1px solid #1a1a22',
                          borderRadius: '16px',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
                          transition: 'border 0.2s, opacity 0.2s, transform 0.2s',
                          cursor: draggedJournal ? 'grabbing' : 'grab',
                          opacity: draggedJournal === account.id ? 0.5 : 1,
                          transform: dragOverJournal === account.id ? 'scale(1.02)' : 'scale(1)'
                        }}
                      >
                        {/* Header - Clean layout */}
                        <div style={{ padding: '16px 16px 12px', position: 'relative' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: '13px', color: '#666', marginBottom: '2px', wordBreak: 'break-word', lineHeight: 1.3 }}>{account.name}</div>
                              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                <span style={{ fontSize: '24px', fontWeight: 700, color: isProfitable ? positiveColor : '#ef4444' }}>${formatCurrency(currentBalance)}</span>
                                <span style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap' }}><span style={{ fontWeight: 600, color: '#888' }}>${formatCurrency(startingBalance)}</span> INITIAL BALANCE</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {/* Show objective lines toggle - only if account has objectives */}
                              {(profitTarget || maxDdFloor) && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setShowObjectiveLines(prev => ({ ...prev, [account.id]: !prev[account.id] })) }}
                                  style={{ padding: '4px 8px', background: showObjectiveLines[account.id] ? 'rgba(147,51,234,0.15)' : 'transparent', border: showObjectiveLines[account.id] ? '1px solid rgba(147,51,234,0.4)' : '1px solid transparent', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', color: showObjectiveLines[account.id] ? '#9333ea' : '#666', transition: 'all 0.2s' }}
                                  title={showObjectiveLines[account.id] ? 'Hide objective lines' : 'Show objective lines'}
                                  onMouseEnter={e => { e.currentTarget.style.color = '#9333ea'; e.currentTarget.style.borderColor = 'rgba(147,51,234,0.4)' }}
                                  onMouseLeave={e => { if (!showObjectiveLines[account.id]) { e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = 'transparent' } }}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                                  <span style={{ whiteSpace: 'nowrap' }}>Show Objectives</span>
                                </button>
                              )}
                              {/* Edit button */}
                              <button onClick={(e) => { e.stopPropagation(); setEditName(account.name); setEditProfitTarget(account.profit_target || ''); setEditMaxDrawdown(account.max_drawdown || ''); setEditConsistencyEnabled(account.consistency_enabled || false); setEditConsistencyPct(account.consistency_pct || '30'); setEditDailyDdEnabled(account.daily_dd_enabled || false); setEditDailyDdPct(account.daily_dd_pct || ''); setEditDailyDdType(account.daily_dd_type || 'static'); setEditDailyDdLocksAt(account.daily_dd_locks_at || 'start_balance'); setEditDailyDdLocksAtPct(account.daily_dd_locks_at_pct || ''); setEditDailyDdResetTime(account.daily_dd_reset_time || '00:00'); setEditDailyDdResetTimezone(account.daily_dd_reset_timezone || 'Europe/London'); setEditMaxDdEnabled(account.max_dd_enabled || false); setEditMaxDdPct(account.max_dd_pct || ''); setEditMaxDdType(account.max_dd_type || 'static'); setEditMaxDdTrailingStopsAt(account.max_dd_trailing_stops_at || 'never'); setEditMaxDdLocksAtPct(account.max_dd_locks_at_pct || ''); setShowEditModal(account.id) }} style={{ padding: '5px', background: 'transparent', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.6, transition: 'opacity 0.2s' }} title="Edit journal" onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Mini Graph - Same quality as Overall Stats graph */}
                        <div style={{ padding: '0 12px 12px 12px' }}>
                          {(() => {
                            if (balancePoints.length < 2) {
                              return <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '12px' }}>No trades yet</div>
                            }

                            const svgW = 100, svgH = 100
                            const allValues = balancePoints.map(p => p.value)
                            const dataMin = Math.min(...allValues, startingBalance)
                            const dataMax = Math.max(...allValues, startingBalance)
                            // Only include objective lines in range if toggled on
                            const showObjLines = showObjectiveLines[account.id]
                            const rangeMin = showObjLines && maxDdFloor ? Math.min(dataMin, maxDdFloor) : dataMin
                            const rangeMax = showObjLines && profitTarget ? Math.max(dataMax, profitTarget) : dataMax
                            const dataRange = rangeMax - rangeMin || 1000
                            const paddingAmt = dataRange / 14  // 1/16 padding

                            let yMin = rangeMin - paddingAmt
                            let yMax = rangeMax + paddingAmt
                            if (yMin < 0 && dataMin >= 0) yMin = 0

                            // Nice step calculation - target 5 labels (divide by 4)
                            const displayRange = yMax - yMin || 1000
                            const rawStep = displayRange / 4  // 5 labels
                            const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
                            const normalized = rawStep / magnitude
                            let niceStep
                            if (normalized <= 1) niceStep = magnitude
                            else if (normalized <= 2) niceStep = 2 * magnitude
                            else if (normalized <= 2.5) niceStep = 2.5 * magnitude
                            else if (normalized <= 5) niceStep = 5 * magnitude
                            else niceStep = 10 * magnitude

                            // Generate labels anchored to starting balance (start is always a label)
                            const yLabels = [startingBalance]
                            // Add labels above start - extend beyond yMax to ensure padding
                            for (let v = startingBalance + niceStep; v < yMax + niceStep; v += niceStep) {
                              yLabels.push(v)
                            }
                            // Add labels below start - extend beyond yMin to ensure padding
                            for (let v = startingBalance - niceStep; v > yMin - niceStep; v -= niceStep) {
                              if (v >= 0 || dataMin < 0) yLabels.push(v)
                            }
                            // Sort from highest to lowest
                            yLabels.sort((a, b) => b - a)

                            // Update yMax/yMin to match label bounds
                            yMax = yLabels[0]
                            yMin = yLabels[yLabels.length - 1]
                            const yRange = yMax - yMin || niceStep

                            const formatY = (v) => {
                              if (Math.abs(v) >= 1000000) return `$${(v/1000000).toFixed(1)}M`
                              if (Math.abs(v) >= 1000) return `$${(v/1000).toFixed(niceStep < 1000 ? 1 : 0)}k`
                              return `$${v}`
                            }

                            // X-axis labels
                            const xLabels = []
                            if (sortedTrades.length > 0) {
                              const firstDate = new Date(sortedTrades[0].date)
                              const lastDate = new Date(sortedTrades[sortedTrades.length - 1].date)
                              const totalDays = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)))
                              const numLabels = Math.min(4, sortedTrades.length + 1)
                              for (let i = 0; i < numLabels; i++) {
                                const pct = numLabels > 1 ? 5 + (i / (numLabels - 1)) * 90 : 50
                                const dateOffset = numLabels > 1 ? Math.round((i / (numLabels - 1)) * totalDays) : 0
                                const labelDate = new Date(firstDate.getTime() + dateOffset * 24 * 60 * 60 * 1000)
                                xLabels.push({ label: `${String(labelDate.getDate()).padStart(2, '0')}/${String(labelDate.getMonth() + 1).padStart(2, '0')}`, pct })
                              }
                            }

                            // Add date/symbol/pnl to balance points for hover
                            const chartPts = balancePoints.map((p, i) => {
                              const trade = i > 0 ? sortedTrades[i - 1] : null
                              return {
                                x: (i / (balancePoints.length - 1)) * svgW,
                                y: svgH - ((p.value - yMin) / yRange) * svgH,
                                balance: p.value,
                                date: trade?.date || null,
                                symbol: trade?.symbol || null,
                                pnl: trade ? (parseFloat(trade.pnl) || 0) : 0
                              }
                            })

                            const startLineY = ((yMax - startingBalance) / yRange) * 100
                            const startSvgY = svgH - ((startingBalance - yMin) / yRange) * svgH
                            const profitTargetLineY = profitTarget ? ((yMax - profitTarget) / yRange) * 100 : null
                            const maxDdFloorLineY = maxDdFloor ? ((yMax - maxDdFloor) / yRange) * 100 : null

                            // Build split paths
                            const greenSegs = [], redSegs = []
                            for (let i = 0; i < chartPts.length - 1; i++) {
                              const p1 = chartPts[i], p2 = chartPts[i + 1]
                              const above1 = p1.balance >= startingBalance, above2 = p2.balance >= startingBalance
                              if (above1 === above2) {
                                (above1 ? greenSegs : redSegs).push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
                              } else {
                                const t = (startingBalance - p1.balance) / (p2.balance - p1.balance)
                                const ix = p1.x + t * (p2.x - p1.x)
                                if (above1) { greenSegs.push({ x1: p1.x, y1: p1.y, x2: ix, y2: startSvgY }); redSegs.push({ x1: ix, y1: startSvgY, x2: p2.x, y2: p2.y }) }
                                else { redSegs.push({ x1: p1.x, y1: p1.y, x2: ix, y2: startSvgY }); greenSegs.push({ x1: ix, y1: startSvgY, x2: p2.x, y2: p2.y }) }
                              }
                            }

                            const mkPath = segs => segs.map(s => `M${s.x1},${s.y1}L${s.x2},${s.y2}`).join('')
                            const mkArea = segs => segs.map(s => `M${s.x1},${s.y1}L${s.x2},${s.y2}L${s.x2},${startSvgY}L${s.x1},${startSvgY}Z`).join('')

                            const isHovered = journalHover?.accountId === account.id

                            return (
                              <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '-12px' }}>
                                <div style={{ display: 'flex', height: '160px' }}>
                                  {/* Y-Axis with tick marks */}
                                  <div style={{ width: '42px', flexShrink: 0, position: 'relative', borderRight: '1px solid #2a2a35', borderBottom: '1px solid transparent', overflow: 'visible' }}>
                                    {yLabels.map((v, i) => {
                                      const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                                      const isStart = v === startingBalance
                                      return (
                                        <Fragment key={i}>
                                          <span style={{ position: 'absolute', right: '6px', top: `${topPct}%`, transform: 'translateY(-50%)', fontSize: '8px', color: '#888', lineHeight: 1, whiteSpace: 'nowrap', fontWeight: 400 }}>{formatY(v)}</span>
                                          <div style={{ position: 'absolute', right: 0, top: `${topPct}%`, width: '4px', borderTop: `1px solid ${isStart ? '#666' : '#2a2a35'}` }} />
                                        </Fragment>
                                      )
                                    })}
                                  </div>
                                  {/* Graph Area with hover */}
                                  <div style={{ flex: 1, position: 'relative', borderBottom: '1px solid #2a2a35', overflow: 'visible' }}>
                                    {/* Horizontal Grid Lines */}
                                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                                      {yLabels.map((v, i) => {
                                        const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                                        if (i === yLabels.length - 1) return null
                                        const isStart = v === startingBalance
                                        return (
                                          <Fragment key={i}>
                                            <div style={{ position: 'absolute', left: 0, right: isStart ? '40px' : 0, top: `${topPct}%`, borderTop: isStart ? '1px dashed #555' : '1px solid rgba(51,51,51,0.5)', zIndex: isStart ? 1 : 0 }} />
                                            {isStart && <span style={{ position: 'absolute', right: '4px', top: `${topPct}%`, transform: 'translateY(-50%)', fontSize: '8px', color: '#666', fontWeight: 500 }}>Start</span>}
                                          </Fragment>
                                        )
                                      })}
                                    </div>
                                    {/* Profit target line - only when objectives toggled on */}
                                    {showObjLines && profitTargetLineY !== null && profitTargetLineY >= 0 && profitTargetLineY <= 100 && <div style={{ position: 'absolute', left: 0, right: 0, top: `${profitTargetLineY}%`, borderTop: '1px dashed #22c55e', zIndex: 1 }} />}
                                    {/* Max DD line - only when objectives toggled on */}
                                    {showObjLines && maxDdFloorLineY !== null && maxDdFloorLineY >= 0 && maxDdFloorLineY <= 100 && <div style={{ position: 'absolute', left: 0, right: 0, top: `${maxDdFloorLineY}%`, borderTop: '1px dashed #ef4444', zIndex: 1 }} />}
                                    {/* SVG Graph */}
                                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 2 }} viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none"
                                      onMouseMove={e => { const rect = e.currentTarget.getBoundingClientRect(); const mouseX = ((e.clientX - rect.left) / rect.width) * svgW; let closest = chartPts[0], minDist = Math.abs(mouseX - chartPts[0].x); chartPts.forEach(p => { const d = Math.abs(mouseX - p.x); if (d < minDist) { minDist = d; closest = p } }); setJournalHover({ ...closest, accountId: account.id, xPct: (closest.x / svgW) * 100, yPct: (closest.y / svgH) * 100 }) }}
                                      onMouseLeave={() => setJournalHover(null)}>
                                      <defs>
                                        <linearGradient id={`eqGreenMini${account.id}`} x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={positiveColor} stopOpacity="0.3" /><stop offset="100%" stopColor={positiveColor} stopOpacity="0" /></linearGradient>
                                        <linearGradient id={`eqRedMini${account.id}`} x1="0%" y1="100%" x2="0%" y2="0%"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" /><stop offset="100%" stopColor="#ef4444" stopOpacity="0" /></linearGradient>
                                      </defs>
                                      <path d={mkArea(greenSegs)} fill={`url(#eqGreenMini${account.id})`} />
                                      <path d={mkArea(redSegs)} fill={`url(#eqRedMini${account.id})`} />
                                      <path d={mkPath(greenSegs)} fill="none" stroke={positiveColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                      <path d={mkPath(redSegs)} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                    </svg>
                                    {/* Hover dot indicator */}
                                    {isHovered && <div style={{ position: 'absolute', left: `${journalHover.xPct}%`, top: `${journalHover.yPct}%`, transform: 'translate(-50%, -50%)', width: '8px', height: '8px', borderRadius: '50%', background: journalHover.balance >= startingBalance ? positiveColor : '#ef4444', border: '2px solid #fff', pointerEvents: 'none', zIndex: 10 }} />}
                                    {/* Hover tooltip */}
                                    {isHovered && (
                                      <div style={{ position: 'absolute', left: `${journalHover.xPct}%`, top: `${journalHover.yPct}%`, transform: `translate(${journalHover.xPct > 70 ? 'calc(-100% - 10px)' : '10px'}, ${journalHover.yPct < 25 ? '0%' : journalHover.yPct > 75 ? '-100%' : '-50%'})`, background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
                                        <div style={{ color: '#888', fontSize: '9px' }}>{journalHover.date ? new Date(journalHover.date).toLocaleDateString() : 'Start'}</div>
                                        <div style={{ fontWeight: 700, fontSize: '12px', color: '#fff' }}>${journalHover.balance?.toLocaleString()}</div>
                                        {journalHover.symbol && <div style={{ color: journalHover.pnl >= 0 ? positiveColor : '#ef4444', marginTop: '2px' }}>{journalHover.symbol}: {journalHover.pnl >= 0 ? '+' : ''}${journalHover.pnl?.toFixed(0)}</div>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* X-Axis labels */}
                                <div style={{ display: 'flex' }}>
                                  <div style={{ width: '42px', flexShrink: 0 }} />
                                  <div style={{ flex: 1, height: '18px', position: 'relative' }}>
                                    {xLabels.map((l, i) => (
                                      <div key={i} style={{ position: 'absolute', left: `${l.pct}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ width: '1px', height: '3px', background: '#2a2a35' }} />
                                        <span style={{ fontSize: '7px', color: '#888', marginTop: '1px', whiteSpace: 'nowrap' }}>{l.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )
                          })()}
                        </div>

                        {/* Stats - 2 columns like stats area format */}
                        <div style={{ padding: '0 12px 12px' }}>
                          {(() => {
                            // Calculate additional stats
                            const uniquePairs = new Set(accTrades.map(t => t.symbol)).size
                            // Current streak calculation
                            let currentStreak = 0, streakType = null
                            for (let i = sortedTrades.length - 1; i >= 0; i--) {
                              const outcome = sortedTrades[i].outcome
                              if (streakType === null) {
                                streakType = outcome
                                currentStreak = 1
                              } else if (outcome === streakType) {
                                currentStreak++
                              } else {
                                break
                              }
                            }
                            const streakDisplay = currentStreak > 0 ? `${currentStreak}${streakType === 'win' ? 'W' : 'L'}` : '-'
                            const streakColor = streakType === 'win' ? '#22c55e' : streakType === 'loss' ? '#ef4444' : '#666'

                            // Check if funded account (has profit_target or daily_dd_enabled or max_dd_enabled)
                            const isFundedAccount = account.profit_target || account.daily_dd_enabled || account.max_dd_enabled

                            // Calculate % from passing and % from daily DD for funded accounts
                            let pctFromPassing = '-', pctFromPassingColor = '#666'
                            let pctFromDailyDD = '-', pctFromDailyDDColor = '#666'
                            if (isFundedAccount) {
                              const profitTargetPctVal = parseFloat(account.profit_target)
                              if (!isNaN(profitTargetPctVal) && profitTargetPctVal > 0) {
                                const targetAmount = startingBalance * (profitTargetPctVal / 100)
                                const currentProfit = currentBalance - startingBalance
                                const pctToTarget = ((targetAmount - currentProfit) / startingBalance) * 100
                                pctFromPassing = pctToTarget <= 0 ? 'PASSED' : `${pctToTarget.toFixed(1)}%`
                                pctFromPassingColor = pctToTarget <= 0 ? '#22c55e' : '#f59e0b'
                              }
                              const dailyDdPctVal = parseFloat(account.daily_dd_pct)
                              if (!isNaN(dailyDdPctVal) && dailyDdPctVal > 0) {
                                // Calculate how much of daily DD is used
                                const today = new Date().toISOString().split('T')[0]
                                const todaysTrades = accTrades.filter(t => t.date === today)
                                const todaysPnl = todaysTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
                                const dailyDdAmount = startingBalance * (dailyDdPctVal / 100)
                                const usedDdPct = todaysPnl < 0 ? ((Math.abs(todaysPnl) / dailyDdAmount) * 100) : 0
                                pctFromDailyDD = `${usedDdPct.toFixed(0)}%`
                                pctFromDailyDDColor = usedDdPct >= 80 ? '#ef4444' : usedDdPct >= 50 ? '#f59e0b' : '#22c55e'
                              }
                            }

                            // 6 key stats
                            const stats = [
                              { label: 'PnL', value: `${totalPnl >= 0 ? '+' : ''}$${formatCurrency(totalPnl)}`, color: totalPnl >= 0 ? positiveColor : '#ef4444' },
                              { label: 'Trades', value: accTrades.length, color: '#fff' },
                              { label: 'Winrate', value: `${winrate}%`, color: winrate >= 50 ? positiveColor : '#ef4444' },
                              { label: 'W/L', value: `${wins}/${losses}`, color: '#fff' },
                              { label: 'Profit Factor', value: profitFactor, color: profitFactor === '-' ? '#666' : profitFactor === '∞' ? positiveColor : parseFloat(profitFactor) >= 1 ? positiveColor : '#ef4444' },
                              { label: 'Consistency', value: `${consistency}%`, color: consistency >= 50 ? '#3b82f6' : '#666' },
                            ]

                            return (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                                {stats.map((stat, i) => (
                                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                    <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>{stat.label}</span>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: stat.color }}>{stat.value}</span>
                                  </div>
                                ))}
                              </div>
                            )
                          })()}
                        </div>

                        {/* Buttons - Compact */}
                        <div onClick={e => e.stopPropagation()} style={{ padding: '12px 16px 16px', display: 'flex', gap: '8px' }}>
                          <a href={`/account/${account.id}`} style={{ flex: 1, padding: '10px', background: themeColor, border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '14px', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s', boxShadow: `0 4px 12px rgba(${themeColorRgb},0.3)` }} onMouseEnter={e => { e.currentTarget.style.background = themeColorDark; e.currentTarget.style.boxShadow = `0 4px 16px rgba(${themeColorRgb},0.4)` }} onMouseLeave={e => { e.currentTarget.style.background = themeColor; e.currentTarget.style.boxShadow = `0 4px 12px rgba(${themeColorRgb},0.3)` }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                            Enter Journal
                          </a>
                          <a href={`/account/${account.id}?tab=statistics`} style={{ padding: '10px 14px', background: '#0a0a0f', border: `2px solid rgba(${themeColorRgb},0.3)`, borderRadius: '10px', color: themeColor, fontWeight: 600, fontSize: '14px', textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = `rgba(${themeColorRgb},0.08)`; e.currentTarget.style.border = `2px solid rgba(${themeColorRgb},0.5)` }} onMouseLeave={e => { e.currentTarget.style.background = '#0a0a0f'; e.currentTarget.style.border = `2px solid rgba(${themeColorRgb},0.3)` }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                            Stats
                          </a>
                        </div>
                      </div>
                    )
                  })}

                  {/* Add New Journal Card */}
                  <div
                    onClick={() => setShowModal(true)}
                    style={{
                      background: 'linear-gradient(135deg, #0f0f14 0%, #0a0a0f 100%)',
                      border: `2px dashed ${themeColor}`,
                      borderRadius: '16px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      minHeight: '400px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#4ade80'; e.currentTarget.style.background = 'rgba(34, 197, 94, 0.05)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = themeColor; e.currentTarget.style.background = 'linear-gradient(135deg, #0f0f14 0%, #0a0a0f 100%)' }}
                  >
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: `rgba(${themeColorRgb}, 0.15)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '16px'
                    }}>
                      <span style={{ fontSize: '40px', color: themeColor, fontWeight: 300 }}>+</span>
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: themeColor }}>Add Journal</span>
                    <span style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Create a new trading account</span>
                  </div>
                </div>
                )}

                {/* Journal List View */}
                {viewMode === 'list' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {filteredAccounts.map(account => {
                    const accTrades = trades[account.id] || []
                    const wins = accTrades.filter(t => t.outcome === 'win').length
                    const losses = accTrades.filter(t => t.outcome === 'loss').length
                    const totalPnl = accTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
                    const winrate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0
                    const currentBalance = (parseFloat(account.starting_balance) || 0) + totalPnl
                    const isProfitable = totalPnl >= 0
                    const startingBalance = parseFloat(account.starting_balance) || 0

                    // Additional stats
                    const winTrades = accTrades.filter(t => t.outcome === 'win')
                    const lossTrades = accTrades.filter(t => t.outcome === 'loss')
                    const grossProfit = winTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
                    const grossLoss = Math.abs(lossTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0))
                    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '-'
                    const avgWin = wins > 0 ? (grossProfit / wins).toFixed(0) : 0
                    const avgLoss = losses > 0 ? (grossLoss / losses).toFixed(0) : 0

                    // Mini graph data
                    const sortedTrades = accTrades.slice().sort((a, b) => new Date(a.date) - new Date(b.date))
                    let cumBal = startingBalance
                    const balancePoints = [startingBalance]
                    sortedTrades.forEach(t => {
                      cumBal += parseFloat(t.pnl) || 0
                      balancePoints.push(cumBal)
                    })

                    return (
                      <div
                        key={account.id}
                        style={{
                          background: 'linear-gradient(135deg, #0f0f14 0%, #0a0a0f 100%)',
                          border: '1px solid #1a1a22',
                          borderRadius: '12px',
                          padding: '16px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s'
                        }}
                      >
                        {/* Left: Name & Balance */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1 }}>
                          <div style={{ minWidth: '180px' }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '2px', wordBreak: 'break-word', lineHeight: 1.3 }}>{account.name}</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                              <span style={{ fontSize: '20px', fontWeight: 700, color: isProfitable ? positiveColor : '#ef4444' }}>${formatCurrency(currentBalance)}</span>
                              <span style={{ fontSize: '10px', color: '#666', whiteSpace: 'nowrap' }}><span style={{ fontWeight: 600, color: '#888' }}>${formatCurrency(startingBalance)}</span> INITIAL BALANCE</span>
                            </div>
                          </div>

                          {/* Stats Row - Inline format */}
                          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: '#666' }}>PnL</span>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: totalPnl >= 0 ? positiveColor : '#ef4444' }}>{totalPnl >= 0 ? '+' : ''}${formatCurrency(totalPnl)}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: '#666' }}>Trades</span>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{accTrades.length}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: '#666' }}>Winrate</span>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: winrate >= 50 ? positiveColor : '#ef4444' }}>{winrate}%</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: '#666' }}>W/L</span>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{wins}/{losses}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: '#666' }}>PF</span>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: profitFactor === '-' ? '#666' : profitFactor === '∞' ? positiveColor : parseFloat(profitFactor) >= 1 ? positiveColor : '#ef4444' }}>{profitFactor}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: '#666' }}>Avg W</span>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e' }}>${avgWin}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: '#666' }}>Avg L</span>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444' }}>-${avgLoss}</span>
                            </div>
                          </div>
                        </div>

                        {/* Mini Graph + Buttons */}
                        <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          {/* Mini Sparkline Graph with axis and tooltip */}
                          {balancePoints.length > 1 && (() => {
                            const minVal = Math.min(...balancePoints)
                            const maxVal = Math.max(...balancePoints)
                            const range = maxVal - minVal || 1
                            const graphWidth = 120
                            const graphHeight = 44
                            const paddingLeft = 0
                            const paddingBottom = 12
                            const chartHeight = graphHeight - paddingBottom
                            const lastVal = balancePoints[balancePoints.length - 1]
                            const lineColor = lastVal >= startingBalance ? positiveColor : '#ef4444'
                            // Get first and last dates for axis
                            const firstDate = sortedTrades.length > 0 ? new Date(sortedTrades[0].date) : null
                            const lastDate = sortedTrades.length > 0 ? new Date(sortedTrades[sortedTrades.length - 1].date) : null
                            const formatAxisDate = (d) => d ? `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}` : ''

                            return (
                              <div style={{ position: 'relative', width: graphWidth, height: graphHeight }}>
                                <svg
                                  width={graphWidth}
                                  height={graphHeight}
                                  onMouseMove={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    const x = e.clientX - rect.left
                                    const idx = Math.round((x / graphWidth) * (balancePoints.length - 1))
                                    if (idx >= 0 && idx < balancePoints.length) {
                                      const tradeDate = idx === 0 ? 'Start' : sortedTrades[idx - 1]?.date || ''
                                      setListGraphHover({
                                        accountId: account.id,
                                        index: idx,
                                        x: e.clientX,
                                        y: e.clientY,
                                        value: balancePoints[idx],
                                        date: tradeDate
                                      })
                                    }
                                  }}
                                  onMouseLeave={() => setListGraphHover(null)}
                                  style={{ cursor: 'crosshair' }}
                                >
                                  {/* Grid line at starting balance */}
                                  <line
                                    x1={paddingLeft}
                                    y1={chartHeight - ((startingBalance - minVal) / range) * (chartHeight - 4) - 2}
                                    x2={graphWidth}
                                    y2={chartHeight - ((startingBalance - minVal) / range) * (chartHeight - 4) - 2}
                                    stroke="#333"
                                    strokeWidth="1"
                                    strokeDasharray="2,2"
                                  />
                                  {/* Line chart */}
                                  <polyline
                                    points={balancePoints.map((v, i) => {
                                      const x = paddingLeft + (i / (balancePoints.length - 1)) * (graphWidth - paddingLeft)
                                      const y = chartHeight - ((v - minVal) / range) * (chartHeight - 4) - 2
                                      return `${x},${y}`
                                    }).join(' ')}
                                    fill="none"
                                    stroke={lineColor}
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  {/* Hover point */}
                                  {listGraphHover && listGraphHover.accountId === account.id && (
                                    <circle
                                      cx={paddingLeft + (listGraphHover.index / (balancePoints.length - 1)) * (graphWidth - paddingLeft)}
                                      cy={chartHeight - ((balancePoints[listGraphHover.index] - minVal) / range) * (chartHeight - 4) - 2}
                                      r="3"
                                      fill={lineColor}
                                      stroke="#fff"
                                      strokeWidth="1"
                                    />
                                  )}
                                </svg>
                                {/* X-axis labels */}
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#666' }}>
                                  <span>{formatAxisDate(firstDate)}</span>
                                  <span>{formatAxisDate(lastDate)}</span>
                                </div>
                              </div>
                            )
                          })()}

                          {/* Buttons */}
                          <a href={`/account/${account.id}`} style={{ padding: '8px 14px', background: themeColor, border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', boxShadow: `0 4px 12px rgba(${themeColorRgb},0.3)` }} onMouseEnter={e => { e.currentTarget.style.background = themeColorDark; e.currentTarget.style.boxShadow = `0 4px 16px rgba(${themeColorRgb},0.4)` }} onMouseLeave={e => { e.currentTarget.style.background = themeColor; e.currentTarget.style.boxShadow = `0 4px 12px rgba(${themeColorRgb},0.3)` }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                            Enter
                          </a>
                          <a href={`/account/${account.id}?tab=statistics`} style={{ padding: '8px 14px', background: '#0a0a0f', border: `2px solid rgba(${themeColorRgb},0.3)`, borderRadius: '8px', color: themeColor, fontWeight: 600, fontSize: '12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = `rgba(${themeColorRgb},0.08)`; e.currentTarget.style.border = `2px solid rgba(${themeColorRgb},0.5)` }} onMouseLeave={e => { e.currentTarget.style.background = '#0a0a0f'; e.currentTarget.style.border = `2px solid rgba(${themeColorRgb},0.3)` }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                            Stats
                          </a>
                          <button onClick={(e) => { e.stopPropagation(); setEditName(account.name); setEditProfitTarget(account.profit_target || ''); setEditMaxDrawdown(account.max_drawdown || ''); setEditConsistencyEnabled(account.consistency_enabled || false); setEditConsistencyPct(account.consistency_pct || '30'); setEditDailyDdEnabled(account.daily_dd_enabled || false); setEditDailyDdPct(account.daily_dd_pct || ''); setEditDailyDdType(account.daily_dd_type || 'static'); setEditDailyDdLocksAt(account.daily_dd_locks_at || 'start_balance'); setEditDailyDdLocksAtPct(account.daily_dd_locks_at_pct || ''); setEditDailyDdResetTime(account.daily_dd_reset_time || '00:00'); setEditDailyDdResetTimezone(account.daily_dd_reset_timezone || 'Europe/London'); setEditMaxDdEnabled(account.max_dd_enabled || false); setEditMaxDdPct(account.max_dd_pct || ''); setEditMaxDdType(account.max_dd_type || 'static'); setEditMaxDdTrailingStopsAt(account.max_dd_trailing_stops_at || 'never'); setEditMaxDdLocksAtPct(account.max_dd_locks_at_pct || ''); setShowEditModal(account.id) }} style={{ padding: '8px', background: '#0a0a0f', border: `2px solid rgba(${themeColorRgb},0.3)`, borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = `rgba(${themeColorRgb},0.08)`; e.currentTarget.style.border = `2px solid rgba(${themeColorRgb},0.5)` }} onMouseLeave={e => { e.currentTarget.style.background = '#0a0a0f'; e.currentTarget.style.border = `2px solid rgba(${themeColorRgb},0.3)` }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={themeColor} strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {/* Add New Journal - List Item */}
                  <div
                    onClick={() => setShowModal(true)}
                    style={{
                      background: 'linear-gradient(135deg, #0f0f14 0%, #0a0a0f 100%)',
                      border: `2px dashed ${themeColor}`,
                      borderRadius: '12px',
                      padding: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#4ade80'; e.currentTarget.style.background = 'rgba(34, 197, 94, 0.05)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = themeColor; e.currentTarget.style.background = 'linear-gradient(135deg, #0f0f14 0%, #0a0a0f 100%)' }}
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'rgba(34, 197, 94, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: '20px', color: '#22c55e', fontWeight: 300 }}>+</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#22c55e' }}>Add New Journal</span>
                  </div>
                </div>
                )}

                {/* List Graph Tooltip */}
                {listGraphHover && (
                  <div style={{
                    position: 'fixed',
                    left: listGraphHover.x + 10,
                    top: listGraphHover.y - 50,
                    background: '#1a1a22',
                    border: '1px solid #2a2a35',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    zIndex: 1000,
                    pointerEvents: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                  }}>
                    <div style={{ fontSize: '10px', color: '#888', marginBottom: '2px' }}>
                      {listGraphHover.date === 'Start' ? 'Starting Balance' : listGraphHover.date}
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: listGraphHover.value >= 0 ? positiveColor : '#ef4444' }}>
                      ${formatCurrency(listGraphHover.value)}
                    </div>
                  </div>
                )}
              </div>
            </div>
        ) : (
          /* Mobile View OR No Accounts - Show Welcome Screen */
          <div style={{ textAlign: 'center', padding: isMobile ? '40px 20px' : '80px 40px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '10px' }}>
            <h2 style={{ fontSize: isMobile ? '20px' : '24px', marginBottom: '12px' }}>
              {activeDashboard === 'backtesting' ? 'Backtesting Dashboard' : 'Welcome to TRADESAVE+'}
            </h2>
            <p style={{ color: '#999', marginBottom: '28px', fontSize: isMobile ? '14px' : '16px' }}>
              {activeDashboard === 'backtesting' ? 'Start collecting your backtesting data now' : 'Create your first trading journal to get started'}
            </p>
            <button onClick={() => setShowModal(true)} style={{ padding: isMobile ? '12px 20px' : '14px 28px', background: themeColor, border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: isMobile ? '14px' : '16px', cursor: 'pointer' }}>
              {activeDashboard === 'backtesting' ? '+ Create Backtest Journal' : '+ Create Your First Journal'}
            </button>
          </div>
        )}

        {/* Modals */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={closeCreateModal}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '10px', padding: '28px', width: '420px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Create New Journal</h2>

              {/* Journal Type Selector */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '10px', textTransform: 'uppercase' }}>Journal Type</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button type="button" onClick={() => setJournalType('overall')} style={{ padding: '14px 12px', background: journalType === 'overall' ? 'rgba(34,197,94,0.15)' : '#0a0a0f', border: journalType === 'overall' ? '2px solid #22c55e' : '1px solid #1a1a22', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: journalType === 'overall' ? '#22c55e' : '#fff', marginBottom: '4px' }}>Overall Journal</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>General tracking and backtesting</div>
                  </button>
                  <button type="button" onClick={() => setJournalType('propfirm')} style={{ padding: '14px 12px', background: journalType === 'propfirm' ? 'rgba(34,197,94,0.15)' : '#0a0a0f', border: journalType === 'propfirm' ? '2px solid #22c55e' : '1px solid #1a1a22', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: journalType === 'propfirm' ? '#22c55e' : '#fff', marginBottom: '4px' }}>Prop Firm Journal</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>With objectives & rules</div>
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '6px', textTransform: 'uppercase' }}>Journal Name</label>
                <input type="text" value={name} onChange={e => { setName(e.target.value); setFormErrors(prev => ({ ...prev, name: null })) }} placeholder={journalType === 'propfirm' ? 'e.g. FTMO 10k Challenge' : 'e.g. Personal Trading'} maxLength={50} autoFocus style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: formErrors.name ? '1px solid #ef4444' : '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                {formErrors.name && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>{formErrors.name}</div>}
              </div>
              <div style={{ marginBottom: journalType === 'propfirm' ? '14px' : '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#999', marginBottom: '6px', textTransform: 'uppercase' }}>Starting Balance ($)</label>
                <input type="number" value={balance} onChange={e => { setBalance(e.target.value); setFormErrors(prev => ({ ...prev, balance: null })) }} placeholder="e.g. 10000" style={{ width: '100%', padding: '12px 14px', background: '#0a0a0f', border: formErrors.balance ? '1px solid #ef4444' : '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                {formErrors.balance && <div style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>{formErrors.balance}</div>}
              </div>

              {/* Prop Firm Rules - Only show for propfirm type */}
              {journalType === 'propfirm' && (
                <>
                  {/* Profit Target & Consistency */}
                  <div style={{ background: '#0a0a0f', border: `1px solid ${themeColor}`, borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: profitTargetEnabled ? '12px' : '0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: themeColor }} />
                        <span style={{ fontSize: '11px', color: themeColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Objectives</span>
                      </div>
                      <input type="checkbox" checked={profitTargetEnabled} onChange={e => setProfitTargetEnabled(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: themeColor, cursor: 'pointer' }} />
                    </div>
                    {profitTargetEnabled && (
                      <>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Profit Target (%)</label>
                          <input type="number" step="0.1" min="0" max="500" value={profitTarget} onChange={e => setProfitTarget(e.target.value)} placeholder="e.g. 10" style={{ width: '100%', padding: '10px 12px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#0d0d12', borderRadius: '6px', border: '1px solid #1a1a22' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={consistencyEnabled} onChange={e => setConsistencyEnabled(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: themeColor, cursor: 'pointer' }} />
                            <span style={{ fontSize: '12px', color: '#999' }}>Consistency Rule</span>
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input type="number" min="1" max="100" value={consistencyPct} onChange={e => setConsistencyPct(e.target.value)} disabled={!consistencyEnabled} style={{ width: '50px', padding: '6px 8px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '4px', color: consistencyEnabled ? '#fff' : '#555', fontSize: '12px', textAlign: 'center', opacity: consistencyEnabled ? 1 : 0.5 }} />
                            <span style={{ fontSize: '10px', color: '#666' }}>% max/day</span>
                          </div>
                        </div>
                      </>
                    )}
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
                            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Percentage (%)</label>
                            <input type="number" step="0.1" min="0" max="99" value={dailyDdPct} onChange={e => setDailyDdPct(e.target.value)} placeholder="e.g. 5" style={{ width: '100%', padding: '10px 12px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Type</label>
                            <select value={dailyDdType} onChange={e => setDailyDdType(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer' }}>
                              <option value="static">Static</option>
                              <option value="trailing">Trailing</option>
                            </select>
                          </div>
                        </div>
                        {dailyDdType === 'trailing' && (
                          <div style={{ marginBottom: '10px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Locks At</label>
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
                            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Resets At</label>
                            <input type="time" value={dailyDdResetTime} onChange={e => setDailyDdResetTime(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Timezone</label>
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
                            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Percentage (%)</label>
                            <input type="number" step="0.1" min="0" max="99" value={maxDdPct} onChange={e => setMaxDdPct(e.target.value)} placeholder="e.g. 10" style={{ width: '100%', padding: '10px 12px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Type</label>
                            <select value={maxDdType} onChange={e => setMaxDdType(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer' }}>
                              <option value="static">Static</option>
                              <option value="trailing">Trailing</option>
                            </select>
                          </div>
                        </div>
                        {maxDdType === 'trailing' && (
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Locks At</label>
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

              <div style={{ display: 'flex', gap: '12px' }}><button onClick={createJournal} disabled={creating || !name.trim() || !balance} style={{ flex: 1, padding: '12px', background: themeColor, border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: (creating || !name.trim() || !balance) ? 0.5 : 1 }}>{creating ? 'Creating...' : 'Create'}</button><button onClick={() => { setShowModal(false); setName(''); setBalance(''); setJournalType('overall'); setProfitTarget(''); setMaxDrawdown(''); setConsistencyEnabled(false); setDailyDdEnabled(false); setMaxDdEnabled(false) }} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '6px', color: '#999', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancel</button></div>
            </div>
          </div>
        )}

        {showEditModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }} onClick={() => setShowEditModal(null)}>
            <div style={{ background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '12px', padding: '24px', width: '420px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', color: '#fff' }}>Edit Journal</h2>

              {/* Journal Name */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Journal Name</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus style={{ width: '100%', padding: '14px 16px', background: '#141418', border: '1px solid #2a2a35', borderRadius: '8px', color: '#fff', fontSize: '15px', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.2s' }} onFocus={e => e.target.style.borderColor = themeColor} onBlur={e => e.target.style.borderColor = '#2a2a35'} />
              </div>

              {/* Prop Firm Section */}
              <div style={{ background: '#141418', border: `1px solid ${themeColor}`, borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: themeColor }} />
                  <span style={{ fontSize: '12px', color: themeColor, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prop Firm Rules</span>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Profit Target (%)</label>
                  <input type="number" step="0.1" min="0" max="500" value={editProfitTarget} onChange={e => setEditProfitTarget(e.target.value)} placeholder="e.g. 10" style={{ width: '100%', padding: '12px 14px', background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#0d0d12', borderRadius: '6px', border: '1px solid #2a2a35' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={editConsistencyEnabled} onChange={e => setEditConsistencyEnabled(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: themeColor, cursor: 'pointer' }} />
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
                        <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Percentage (%)</label>
                        <input type="number" step="0.1" min="0" max="99" value={editDailyDdPct} onChange={e => setEditDailyDdPct(e.target.value)} placeholder="e.g. 5" style={{ width: '100%', padding: '12px 14px', background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Type</label>
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
                        <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Locks At</label>
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
                        <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Resets At</label>
                        <input type="time" value={editDailyDdResetTime} onChange={e => setEditDailyDdResetTime(e.target.value)} style={{ width: '100%', padding: '12px 14px', background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Timezone</label>
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
                        <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Percentage (%)</label>
                        <input type="number" step="0.1" min="0" max="99" value={editMaxDdPct} onChange={e => setEditMaxDdPct(e.target.value)} placeholder="e.g. 10" style={{ width: '100%', padding: '12px 14px', background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Type</label>
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
                        <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Locks At</label>
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
                <button onClick={() => updateAccount(showEditModal)} disabled={!editName.trim()} style={{ flex: 1, padding: '14px', background: themeColor, border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: !editName.trim() ? 0.5 : 1, transition: 'opacity 0.2s' }}>Save Changes</button>
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
                <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Type "delete" to confirm</label>
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
                <button onClick={saveCustomInput} disabled={savingInput || !newInputLabel.trim() || !newInputOptions.trim()} style={{ flex: 1, padding: '12px', background: themeColor, border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', opacity: (savingInput || !newInputLabel.trim() || !newInputOptions.trim()) ? 0.5 : 1 }}>{savingInput ? 'Saving...' : 'Add Input'}</button>
                <button onClick={() => { setShowAddInputModal(false); setNewInputLabel(''); setNewInputOptions('') }} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '6px', color: '#888', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Inputs Modal */}
        {showEditInputsModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => setShowEditInputsModal(false)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', width: '560px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a1a22', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>Edit Inputs</h2>
                  <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>Customize fields and styling for trade entries</p>
                </div>
                <button onClick={() => setShowEditInputsModal(false)} style={{ width: '32px', height: '32px', background: '#141418', border: '1px solid #2a2a35', borderRadius: '6px', color: '#888', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>

              {/* Scrollable Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 100px 80px 28px', gap: '10px', padding: '8px 12px', marginBottom: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>On</span>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Name</span>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Type</span>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Options</span>
                  <span></span>
                </div>

                {/* Field rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  {editInputs.map((input, i) => !input.hidden && (
                    <div key={input.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 100px 80px 28px', gap: '10px', padding: '10px 12px', background: input.enabled ? '#141418' : '#0d0d12', borderRadius: '8px', border: '1px solid #1a1a22', alignItems: 'center', opacity: input.enabled ? 1 : 0.6 }}>
                      <input type="checkbox" checked={input.enabled} onChange={e => updateEditInput(i, 'enabled', e.target.checked)} style={{ width: '16px', height: '16px', accentColor: themeColor, cursor: 'pointer' }} />
                      <input type="text" value={input.label} onChange={e => updateEditInput(i, 'label', e.target.value)} style={{ padding: '6px 8px', background: '#0a0a0e', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '12px', width: '100%' }} placeholder="Field name" />
                      <select value={input.type} onChange={e => updateEditInput(i, 'type', e.target.value)} style={{ padding: '6px 8px', background: '#0a0a0e', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '11px', cursor: 'pointer' }}>
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="value">Value ($)</option>
                        <option value="select">Dropdown</option>
                        <option value="textarea">Notes</option>
                        <option value="rating">Rating</option>
                        <option value="date">Date</option>
                        <option value="time">Time</option>
                        <option value="file">Image</option>
                      </select>
                      {input.type === 'select' ? (
                        <button onClick={() => openEditOptionsEditor(i)} style={{ padding: '6px 10px', background: '#0a0a0e', border: '1px solid #2a2a35', borderRadius: '6px', color: '#22c55e', fontSize: '11px', cursor: 'pointer' }}>Options</button>
                      ) : (
                        <button onClick={() => openEditColorEditor(i)} style={{ padding: '6px 10px', background: '#0a0a0e', border: '1px solid #2a2a35', borderRadius: '6px', color: '#22c55e', fontSize: '11px', cursor: 'pointer' }}>Options</button>
                      )}
                      <button onClick={() => { const n = [...editInputs]; n[i] = { ...n[i], hidden: true }; setEditInputs(n) }} style={{ width: '28px', height: '28px', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    </div>
                  ))}
                </div>

                {/* Add field button */}
                <button onClick={addNewEditInput} style={{ width: '100%', padding: '12px', background: '#141418', border: '1px dashed #2a2a35', borderRadius: '8px', color: '#888', fontSize: '13px', cursor: 'pointer', marginBottom: '20px' }}>+ Add New Column</button>

                {/* Hidden Fields */}
                {editInputs.filter(inp => inp.hidden).length > 0 && (
                  <div style={{ marginBottom: '20px', padding: '14px', background: '#0a0a0e', borderRadius: '8px', border: '1px solid #1a1a22' }}>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Hidden Columns (click to restore)</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {editInputs.map((inp, idx) => inp.hidden && (
                        <button key={inp.id} onClick={() => restoreEditInput(idx)} style={{ padding: '8px 14px', background: '#141418', border: '1px solid #2a2a35', borderRadius: '6px', color: '#888', fontSize: '12px', cursor: 'pointer' }}>
                          {inp.label} <span style={{ color: '#22c55e', marginLeft: '4px' }}>Restore</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transfer Section */}
                {accounts.filter(a => a.id !== quickTradeAccount).length > 0 && (
                  <div style={{ padding: '14px', background: '#0a0a0e', borderRadius: '8px', border: '1px solid #1a1a22' }}>
                    <div style={{ fontSize: '11px', color: '#666', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Copy Settings From Another Journal</div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <select value={transferFromJournal} onChange={e => setTransferFromJournal(e.target.value)} style={{ flex: 1, padding: '10px 12px', background: '#141418', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>
                        <option value="">Select journal...</option>
                        {accounts.filter(a => a.id !== quickTradeAccount).map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                      <button onClick={() => transferColumnsFromJournal(transferFromJournal)} disabled={!transferFromJournal} style={{ padding: '10px 20px', background: transferFromJournal ? '#3b82f6' : '#1a1a22', border: 'none', borderRadius: '6px', color: transferFromJournal ? '#fff' : '#555', fontWeight: 600, fontSize: '13px', cursor: transferFromJournal ? 'pointer' : 'not-allowed' }}>Copy</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div style={{ padding: '16px 28px 24px', borderTop: '1px solid #1a1a22', background: '#0d0d12', borderRadius: '0 0 12px 12px', display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowRestoreDefaults(true)} style={{ padding: '12px 16px', background: 'transparent', border: '1px solid #f59e0b', borderRadius: '8px', color: '#f59e0b', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Restore Defaults</button>
                <button onClick={() => setShowEditInputsModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveEditInputs} style={{ flex: 1, padding: '12px', background: themeColor, border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Restore Defaults Confirmation */}
        {showRestoreDefaults && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 203 }} onClick={() => setShowRestoreDefaults(false)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '24px', width: '400px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Restore Defaults?</h2>
              <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>This will reset all default field names and settings to their original values. Custom fields will not be affected.</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => { const customFields = editInputs.filter(inp => !inp.fixed); setEditInputs([...defaultInputs, ...customFields]); setShowRestoreDefaults(false) }} style={{ flex: 1, padding: '12px', background: '#f59e0b', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Yes, Restore</button>
                <button onClick={() => setShowRestoreDefaults(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Options Editor Modal */}
        {editingOptions !== null && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 202 }} onClick={() => { setEditingOptions(null); setOptionsList([]) }}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '24px', width: '720px', maxWidth: '95vw', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px', color: '#fff' }}>Edit Options</h2>
              <p style={{ fontSize: '12px', color: '#555', marginBottom: '16px' }}>Customize colors and styling for each option</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
                {optionsList.map((opt, idx) => (
                  <div key={idx} style={{ padding: '16px', background: '#0a0a0e', borderRadius: '10px', border: '1px solid #1a1a22' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '14px', flexWrap: 'wrap' }}>
                      {/* Text color */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ position: 'relative', width: '36px', height: '36px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: opt.textColor || '#fff', border: '2px solid #2a2a35', cursor: 'pointer' }} />
                          <input type="color" value={opt.textColor || '#ffffff'} onChange={e => updateOptionTextColor(idx, e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: '#888' }}>Text</span>
                      </div>
                      {/* Background */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <select value={opt.bgColor ? 'custom' : 'none'} onChange={e => { if (e.target.value === 'none') updateOptionBgColor(idx, null); else updateOptionBgColor(idx, 'rgba(136,136,136,0.15)') }} style={{ padding: '8px 12px', background: '#141418', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>
                          <option value="none">No Background</option>
                          <option value="custom">Custom Background</option>
                        </select>
                        {opt.bgColor && (
                          <div style={{ position: 'relative', width: '36px', height: '36px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: opt.bgColor, border: '2px solid #2a2a35', cursor: 'pointer' }} />
                            <input type="color" value={opt.bgColor?.startsWith('rgba') ? '#888888' : (opt.bgColor || '#888888')} onChange={e => { const hex = e.target.value.replace('#', ''); const r = parseInt(hex.substr(0,2), 16); const g = parseInt(hex.substr(2,2), 16); const b = parseInt(hex.substr(4,2), 16); updateOptionBgColor(idx, `rgba(${r},${g},${b},0.15)`) }} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input type="text" value={opt.value} onChange={e => updateOptionValue(idx, e.target.value)} placeholder="Option value" style={{ flex: 1, padding: '10px 12px', background: '#141418', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '13px' }} />
                      <div style={{ padding: '8px 16px', background: opt.bgColor || 'transparent', border: opt.bgColor ? 'none' : '1px solid #2a2a35', borderRadius: '6px', color: opt.textColor || '#fff', fontSize: '13px', fontWeight: 600, minWidth: '80px', textAlign: 'center' }}>{opt.value || 'Preview'}</div>
                      <button onClick={() => setOptionsList(optionsList.filter((_, i) => i !== idx))} style={{ padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#ef4444', fontSize: '12px', cursor: 'pointer' }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={() => setOptionsList([...optionsList, { value: '', textColor: '#888', bgColor: null }])} style={{ width: '100%', padding: '12px', background: '#141418', border: '1px dashed #2a2a35', borderRadius: '8px', color: '#888', fontSize: '13px', cursor: 'pointer', marginBottom: '16px' }}>+ Add Option</button>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => { setEditingOptions(null); setOptionsList([]) }} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveEditOptions} style={{ flex: 1, padding: '12px', background: themeColor, border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Save Options</button>
              </div>
            </div>
          </div>
        )}

        {/* Color Editor Modal */}
        {editingColor !== null && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 202 }} onClick={() => setEditingColor(null)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '24px', width: '320px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>Field Options</h2>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '8px' }}>Text Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: editInputs[editingColor]?.textColor || '#fff', border: '2px solid #2a2a35', cursor: 'pointer' }} />
                    <input type="color" value={editInputs[editingColor]?.textColor || '#ffffff'} onChange={e => updateEditInput(editingColor, 'textColor', e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                  </div>
                  <span style={{ color: editInputs[editingColor]?.textColor || '#fff', fontSize: '14px', fontWeight: 600 }}>Sample Text</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setEditingColor(null)} style={{ flex: 1, padding: '12px', background: themeColor, border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Done</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Input Confirmation Modal */}
        {deleteInputConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 201 }} onClick={() => setDeleteInputConfirm(null)}>
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
                <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>Journal</label>
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
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0, flex: 1 }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: themeColor, boxShadow: `0 0 8px ${themeColor}`, flexShrink: 0, marginTop: '3px' }} />
                    <span style={{ wordBreak: 'break-word' }}>{accounts.find(a => a.id === quickTradeAccount)?.name || 'Select Journal'}</span>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: journalDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0, marginTop: '3px' }}>
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
                    {filteredAccounts.map(acc => {
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
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0, flex: 1 }}>
                              <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: isSelected ? '#22c55e' : '#444',
                                boxShadow: isSelected ? '0 0 6px #22c55e' : 'none',
                                flexShrink: 0,
                                marginTop: '4px'
                              }} />
                              <span style={{ wordBreak: 'break-word', lineHeight: '1.3' }}>{acc.name}</span>
                            </div>
                            <span style={{ fontSize: '13px', color: totalPnl >= 0 ? positiveColor : '#ef4444', flexShrink: 0, whiteSpace: 'nowrap' }}>
                              {totalPnl >= 0 ? '+' : ''}${formatCurrency(totalPnl)}
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
                  <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Symbol</label>
                  <input type="text" value={quickTradeSymbol} onChange={e => setQuickTradeSymbol(e.target.value)} placeholder="XAUUSD" style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>P&L ($)</label>
                  <input type="number" value={quickTradePnl} onChange={e => setQuickTradePnl(e.target.value)} placeholder="0" style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Direction + Outcome Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {(() => {
                  const dirStyles = getFieldOptionStyles('direction', quickTradeDirection)
                  const dirOptions = getFieldOptions('direction')
                  const displayVal = dirOptions.find(o => getOptVal(o).toLowerCase() === quickTradeDirection?.toLowerCase())
                  return (
                    <div style={{ position: 'relative' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Direction</label>
                      <button type="button" onClick={() => { setDirectionDropdownOpen(!directionDropdownOpen); setOutcomeDropdownOpen(false); setConfidenceDropdownOpen(false); setTimeframeDropdownOpen(false); setSessionDropdownOpen(false) }} style={{ width: '100%', padding: '14px', background: quickTradeDirection ? (dirStyles.bgColor || '#0a0a0f') : '#0a0a0f', border: directionDropdownOpen ? `1px solid ${themeColor}` : quickTradeDirection ? `1px solid ${dirStyles.borderColor || dirStyles.textColor + '80' || '#1a1a22'}` : '1px solid #1a1a22', borderRadius: directionDropdownOpen ? '8px 8px 0 0' : '8px', color: quickTradeDirection ? (dirStyles.textColor || '#fff') : '#888', fontSize: '15px', boxSizing: 'border-box', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{displayVal ? getOptVal(displayVal) : (quickTradeDirection || '-')}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: directionDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
                      </button>
                      {directionDropdownOpen && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0f', border: `1px solid ${themeColor}`, borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 100, overflow: 'hidden' }}>
                          <div onClick={() => { setQuickTradeDirection(''); setDirectionDropdownOpen(false) }} style={{ padding: '14px', cursor: 'pointer', color: '#888', fontSize: '15px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</div>
                          {dirOptions.map(opt => {
                            const optVal = getOptVal(opt)
                            const optColor = typeof opt === 'object' ? (opt.textColor || '#fff') : '#fff'
                            const optBg = typeof opt === 'object' ? (opt.bgColor || null) : null
                            return (
                              <div key={optVal} onClick={() => { setQuickTradeDirection(optVal.toLowerCase()); setDirectionDropdownOpen(false) }} style={{ padding: '14px', cursor: 'pointer', color: optColor, fontSize: '15px', fontWeight: 600, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = optBg || 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{optVal}</div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })()}
                {(() => {
                  const outStyles = getFieldOptionStyles('outcome', quickTradeOutcome)
                  const outOptions = getFieldOptions('outcome')
                  const displayVal = outOptions.find(o => getOptVal(o).toLowerCase() === quickTradeOutcome?.toLowerCase())
                  return (
                    <div style={{ position: 'relative' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Outcome</label>
                      <button type="button" onClick={() => { setOutcomeDropdownOpen(!outcomeDropdownOpen); setDirectionDropdownOpen(false); setConfidenceDropdownOpen(false); setTimeframeDropdownOpen(false); setSessionDropdownOpen(false) }} style={{ width: '100%', padding: '14px', background: quickTradeOutcome ? (outStyles.bgColor || '#0a0a0f') : '#0a0a0f', border: outcomeDropdownOpen ? `1px solid ${themeColor}` : quickTradeOutcome ? `1px solid ${outStyles.borderColor || outStyles.textColor + '80' || '#1a1a22'}` : '1px solid #1a1a22', borderRadius: outcomeDropdownOpen ? '8px 8px 0 0' : '8px', color: quickTradeOutcome ? (outStyles.textColor || '#fff') : '#888', fontSize: '15px', boxSizing: 'border-box', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{displayVal ? getOptVal(displayVal) : (quickTradeOutcome || '-')}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: outcomeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
                      </button>
                      {outcomeDropdownOpen && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0f', border: `1px solid ${themeColor}`, borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 100, overflow: 'hidden' }}>
                          <div onClick={() => { setQuickTradeOutcome(''); setOutcomeDropdownOpen(false) }} style={{ padding: '14px', cursor: 'pointer', color: '#888', fontSize: '15px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</div>
                          {outOptions.map(opt => {
                            const optVal = getOptVal(opt)
                            const optColor = typeof opt === 'object' ? (opt.textColor || '#fff') : '#fff'
                            const optBg = typeof opt === 'object' ? (opt.bgColor || null) : null
                            return (
                              <div key={optVal} onClick={() => { setQuickTradeOutcome(optVal.toLowerCase()); setOutcomeDropdownOpen(false) }} style={{ padding: '14px', cursor: 'pointer', color: optColor, fontSize: '15px', fontWeight: 600, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = optBg || 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{optVal}</div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* RR & Risk Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>RR</label>
                  <input type="text" value={quickTradeRR} onChange={e => setQuickTradeRR(e.target.value)} placeholder="2.5" style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>% Risk</label>
                  <input type="number" value={quickTradeRiskPercent} onChange={e => setQuickTradeRiskPercent(e.target.value)} placeholder="1" style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Date */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Date</label>
                <input type="date" value={quickTradeDate} onChange={e => setQuickTradeDate(e.target.value)} max={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '15px', boxSizing: 'border-box' }} />
              </div>

              {/* Optional Fields - Collapsible Style */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {(() => {
                  const confStyles = getFieldOptionStyles('confidence', quickTradeConfidence)
                  const confOptions = getFieldOptions('confidence')
                  const displayVal = confOptions.find(o => getOptVal(o).toLowerCase() === quickTradeConfidence?.toLowerCase())
                  return (
                    <div style={{ position: 'relative' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Confidence</label>
                      <button type="button" onClick={() => { setConfidenceDropdownOpen(!confidenceDropdownOpen); setDirectionDropdownOpen(false); setOutcomeDropdownOpen(false); setTimeframeDropdownOpen(false); setSessionDropdownOpen(false) }} style={{ width: '100%', padding: '14px', background: quickTradeConfidence ? (confStyles.bgColor || '#0a0a0f') : '#0a0a0f', border: confidenceDropdownOpen ? `1px solid ${themeColor}` : quickTradeConfidence ? `1px solid ${confStyles.borderColor || confStyles.textColor + '80' || '#1a1a22'}` : '1px solid #1a1a22', borderRadius: confidenceDropdownOpen ? '8px 8px 0 0' : '8px', color: quickTradeConfidence ? (confStyles.textColor || '#fff') : '#888', fontSize: '15px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{displayVal ? getOptVal(displayVal) : (quickTradeConfidence || '-')}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: confidenceDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
                      </button>
                      {confidenceDropdownOpen && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0f', border: `1px solid ${themeColor}`, borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 100, overflow: 'hidden' }}>
                          <div onClick={() => { setQuickTradeConfidence(''); setConfidenceDropdownOpen(false) }} style={{ padding: '14px', cursor: 'pointer', color: '#888', fontSize: '15px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</div>
                          {confOptions.map(opt => {
                            const optVal = getOptVal(opt)
                            const optColor = typeof opt === 'object' ? (opt.textColor || '#fff') : '#fff'
                            const optBg = typeof opt === 'object' ? (opt.bgColor || null) : null
                            return (
                              <div key={optVal} onClick={() => { setQuickTradeConfidence(optVal); setConfidenceDropdownOpen(false) }} style={{ padding: '14px', cursor: 'pointer', color: optColor, fontSize: '15px', fontWeight: 600, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = optBg || 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{optVal}</div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })()}
                {(() => {
                  const tfStyles = getFieldOptionStyles('timeframe', quickTradeTimeframe)
                  const tfOptions = getFieldOptions('timeframe')
                  const displayVal = tfOptions.find(o => getOptVal(o) === quickTradeTimeframe)
                  return (
                    <div style={{ position: 'relative' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Timeframe</label>
                      <button type="button" onClick={() => { setTimeframeDropdownOpen(!timeframeDropdownOpen); setDirectionDropdownOpen(false); setOutcomeDropdownOpen(false); setConfidenceDropdownOpen(false); setSessionDropdownOpen(false) }} style={{ width: '100%', padding: '14px', background: quickTradeTimeframe ? (tfStyles.bgColor || '#0a0a0f') : '#0a0a0f', border: timeframeDropdownOpen ? `1px solid ${themeColor}` : quickTradeTimeframe ? `1px solid ${tfStyles.borderColor || tfStyles.textColor + '80' || '#1a1a22'}` : '1px solid #1a1a22', borderRadius: timeframeDropdownOpen ? '8px 8px 0 0' : '8px', color: quickTradeTimeframe ? (tfStyles.textColor || '#fff') : '#888', fontSize: '15px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{displayVal ? getOptVal(displayVal) : (quickTradeTimeframe || '-')}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: timeframeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
                      </button>
                      {timeframeDropdownOpen && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0f', border: `1px solid ${themeColor}`, borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 100, overflow: 'hidden' }}>
                          <div onClick={() => { setQuickTradeTimeframe(''); setTimeframeDropdownOpen(false) }} style={{ padding: '14px', cursor: 'pointer', color: '#888', fontSize: '15px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</div>
                          {tfOptions.map(opt => {
                            const optVal = getOptVal(opt)
                            const optColor = typeof opt === 'object' ? (opt.textColor || '#fff') : '#fff'
                            const optBg = typeof opt === 'object' ? (opt.bgColor || null) : null
                            return (
                              <div key={optVal} onClick={() => { setQuickTradeTimeframe(optVal); setTimeframeDropdownOpen(false) }} style={{ padding: '14px', cursor: 'pointer', color: optColor, fontSize: '15px', fontWeight: 600, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = optBg || 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{optVal}</div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })()}
                {(() => {
                  const sessStyles = getFieldOptionStyles('session', quickTradeSession)
                  const sessOptions = getFieldOptions('session')
                  const displayVal = sessOptions.find(o => getOptVal(o) === quickTradeSession)
                  return (
                    <div style={{ position: 'relative' }}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Session</label>
                      <button type="button" onClick={() => { setSessionDropdownOpen(!sessionDropdownOpen); setDirectionDropdownOpen(false); setOutcomeDropdownOpen(false); setConfidenceDropdownOpen(false); setTimeframeDropdownOpen(false) }} style={{ width: '100%', padding: '14px', background: quickTradeSession ? (sessStyles.bgColor || '#0a0a0f') : '#0a0a0f', border: sessionDropdownOpen ? `1px solid ${themeColor}` : quickTradeSession ? `1px solid ${sessStyles.borderColor || sessStyles.textColor + '80' || '#1a1a22'}` : '1px solid #1a1a22', borderRadius: sessionDropdownOpen ? '8px 8px 0 0' : '8px', color: quickTradeSession ? (sessStyles.textColor || '#fff') : '#888', fontSize: '15px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{displayVal ? getOptVal(displayVal) : (quickTradeSession || '-')}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: sessionDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
                      </button>
                      {sessionDropdownOpen && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0f', border: `1px solid ${themeColor}`, borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 100, overflow: 'hidden' }}>
                          <div onClick={() => { setQuickTradeSession(''); setSessionDropdownOpen(false) }} style={{ padding: '14px', cursor: 'pointer', color: '#888', fontSize: '15px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</div>
                          {sessOptions.map(opt => {
                            const optVal = getOptVal(opt)
                            const optColor = typeof opt === 'object' ? (opt.textColor || '#fff') : '#fff'
                            const optBg = typeof opt === 'object' ? (opt.bgColor || null) : null
                            return (
                              <div key={optVal} onClick={() => { setQuickTradeSession(optVal); setSessionDropdownOpen(false) }} style={{ padding: '14px', cursor: 'pointer', color: optColor, fontSize: '15px', fontWeight: 600, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = optBg || 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{optVal}</div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })()}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Rating</label>
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
                <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Notes</label>
                <textarea value={quickTradeNotes} onChange={e => setQuickTradeNotes(e.target.value)} placeholder="Trade notes..." rows={3} style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '15px', resize: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Trade Mistake */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#ef4444', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Trade Mistake</label>
                <textarea value={quickTradeMistake} onChange={e => setQuickTradeMistake(e.target.value)} placeholder="What mistake did you make? (optional)" rows={2} style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#fff', fontSize: '15px', resize: 'none', boxSizing: 'border-box' }} />
              </div>

              {/* Custom Inputs */}
              {getSelectedAccountCustomInputs().length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  {getSelectedAccountCustomInputs().map(input => (
                    <div key={input.id}>
                      <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{input.label || input.id}</label>
                      <select value={quickTradeExtraData[input.id] || ''} onChange={e => setQuickTradeExtraData(prev => ({ ...prev, [input.id]: e.target.value }))} style={{ width: '100%', padding: '14px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '15px', cursor: 'pointer' }}>
                        <option value="">-</option>
                        {(input.options || []).map(opt => <option key={getOptVal(opt)} value={getOptVal(opt)}>{getOptVal(opt)}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {/* Image Upload */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Images</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {quickTradeImages.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #1a1a22' }}>
                      <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button onClick={() => removeQuickTradeImage(idx)} style={{ position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
                    </div>
                  ))}
                  <label style={{ width: '60px', height: '60px', borderRadius: '8px', border: '1px dashed #333', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploadingImage ? 'wait' : 'pointer', opacity: uploadingImage ? 0.5 : 1 }}>
                    <input type="file" accept="image/*" multiple onChange={async (e) => { for (const file of e.target.files) { await uploadQuickTradeImage(file) } e.target.value = '' }} style={{ display: 'none' }} disabled={uploadingImage} />
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                  </label>
                </div>
              </div>
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
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '16px', padding: '0', width: '95%', maxWidth: '900px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
              {/* Header with Journal Select */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #1a1a22', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{ fontSize: '18px', color: '#fff', fontWeight: 600 }}>Log Trade</span>
                  {/* Journal Select in header */}
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={() => setJournalDropdownOpen(!journalDropdownOpen)}
                      style={{
                        padding: '8px 14px',
                        background: 'rgba(34,197,94,0.1)',
                        border: '1px solid rgba(34,197,94,0.4)',
                        borderRadius: journalDropdownOpen ? '8px 8px 0 0' : '8px',
                        color: '#22c55e',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        maxWidth: '300px'
                      }}
                    >
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: themeColor, boxShadow: `0 0 6px ${themeColor}`, flexShrink: 0, marginTop: '5px' }} />
                      <span style={{ wordBreak: 'break-word', flex: 1 }}>{accounts.find(a => a.id === quickTradeAccount)?.name || 'Select Journal'}</span>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: journalDropdownOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0, marginTop: '4px' }}>
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>
                    {journalDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        minWidth: '220px',
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
                        {filteredAccounts.map(acc => {
                          const isSelected = quickTradeAccount === acc.id
                          const accTrades = trades[acc.id] || []
                          const totalPnl = accTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
                          return (
                            <button
                              key={acc.id}
                              onClick={() => { setQuickTradeAccount(acc.id); setJournalDropdownOpen(false) }}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                background: isSelected ? 'rgba(34,197,94,0.15)' : '#0a0a0f',
                                border: `1px solid ${isSelected ? 'rgba(34,197,94,0.5)' : '#1a1a22'}`,
                                borderRadius: '6px',
                                color: isSelected ? '#22c55e' : '#999',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0, flex: 1 }}>
                                  <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: isSelected ? '#22c55e' : '#444', flexShrink: 0, marginTop: '4px' }} />
                                  <span style={{ wordBreak: 'break-word', lineHeight: '1.3' }}>{acc.name}</span>
                                </div>
                                <span style={{ fontSize: '11px', color: totalPnl >= 0 ? positiveColor : '#ef4444', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                  {totalPnl >= 0 ? '+' : ''}${formatCurrency(totalPnl)}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button onClick={() => { loadEditInputs(); setShowEditInputsModal(true) }} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    Edit Inputs
                  </button>
                  <button onClick={() => setSidebarExpanded(false)} style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '24px', cursor: 'pointer', padding: '4px', lineHeight: 1 }}>×</button>
                </div>
              </div>

              {/* Content */}
              <div style={{ padding: '20px 24px', overflow: 'auto', flex: 1 }}>
                {/* Main content: Left inputs + Right side */}
                <div style={{ display: 'flex', gap: '24px' }}>
                  {/* Left: 2-column grid of inputs */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                      {/* Symbol */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Symbol</label>
                        <input type="text" value={quickTradeSymbol} onChange={e => setQuickTradeSymbol(e.target.value)} placeholder="XAUUSD" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                      </div>
                      {/* P&L */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>P&L ($)</label>
                        <input type="number" value={quickTradePnl} onChange={e => setQuickTradePnl(e.target.value)} placeholder="0" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                      </div>
                      {/* Direction */}
                      {(() => {
                        const dirStyles = getFieldOptionStyles('direction', quickTradeDirection)
                        const dirOptions = getFieldOptions('direction')
                        const displayVal = dirOptions.find(o => getOptVal(o).toLowerCase() === quickTradeDirection?.toLowerCase())
                        return (
                          <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Direction</label>
                            <button type="button" onClick={() => { setDirectionDropdownOpen(!directionDropdownOpen); setOutcomeDropdownOpen(false); setConfidenceDropdownOpen(false); setTimeframeDropdownOpen(false); setSessionDropdownOpen(false); setCustomDropdownOpen({}) }} style={{ width: '100%', padding: '10px 12px', background: quickTradeDirection ? (dirStyles.bgColor || '#0a0a0f') : '#0a0a0f', border: directionDropdownOpen ? '1px solid #22c55e' : quickTradeDirection ? `1px solid ${dirStyles.borderColor || (dirStyles.textColor ? dirStyles.textColor + '80' : '#1a1a22')}` : '1px solid #1a1a22', borderRadius: directionDropdownOpen ? '8px 8px 0 0' : '8px', color: quickTradeDirection ? (dirStyles.textColor || '#fff') : '#888', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{displayVal ? getOptVal(displayVal) : (quickTradeDirection || '-')}</span>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: directionDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
                            </button>
                            {directionDropdownOpen && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0f', border: `1px solid ${themeColor}`, borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 100, overflow: 'hidden' }}>
                                <div onClick={() => { setQuickTradeDirection(''); setDirectionDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: '#888', fontSize: '14px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</div>
                                {dirOptions.map(opt => {
                                  const optVal = getOptVal(opt)
                                  const optColor = typeof opt === 'object' ? (opt.textColor || '#fff') : '#fff'
                                  const optBg = typeof opt === 'object' ? (opt.bgColor || null) : null
                                  return (
                                    <div key={optVal} onClick={() => { setQuickTradeDirection(optVal.toLowerCase()); setDirectionDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: optColor, fontSize: '14px', fontWeight: 600, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = optBg || 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{optVal}</div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                      {/* Outcome */}
                      {(() => {
                        const outStyles = getFieldOptionStyles('outcome', quickTradeOutcome)
                        const outOptions = getFieldOptions('outcome')
                        const displayVal = outOptions.find(o => getOptVal(o).toLowerCase() === quickTradeOutcome?.toLowerCase())
                        return (
                          <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Outcome</label>
                            <button type="button" onClick={() => { setOutcomeDropdownOpen(!outcomeDropdownOpen); setDirectionDropdownOpen(false); setConfidenceDropdownOpen(false); setTimeframeDropdownOpen(false); setSessionDropdownOpen(false); setCustomDropdownOpen({}) }} style={{ width: '100%', padding: '10px 12px', background: quickTradeOutcome ? (outStyles.bgColor || '#0a0a0f') : '#0a0a0f', border: outcomeDropdownOpen ? '1px solid #22c55e' : quickTradeOutcome ? `1px solid ${outStyles.borderColor || (outStyles.textColor ? outStyles.textColor + '80' : '#1a1a22')}` : '1px solid #1a1a22', borderRadius: outcomeDropdownOpen ? '8px 8px 0 0' : '8px', color: quickTradeOutcome ? (outStyles.textColor || '#fff') : '#888', fontSize: '14px', boxSizing: 'border-box', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{displayVal ? getOptVal(displayVal) : (quickTradeOutcome || '-')}</span>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: outcomeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
                            </button>
                            {outcomeDropdownOpen && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0f', border: `1px solid ${themeColor}`, borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 100, overflow: 'hidden' }}>
                                <div onClick={() => { setQuickTradeOutcome(''); setOutcomeDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: '#888', fontSize: '14px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</div>
                                {outOptions.map(opt => {
                                  const optVal = getOptVal(opt)
                                  const optColor = typeof opt === 'object' ? (opt.textColor || '#fff') : '#fff'
                                  const optBg = typeof opt === 'object' ? (opt.bgColor || null) : null
                                  return (
                                    <div key={optVal} onClick={() => { setQuickTradeOutcome(optVal.toLowerCase()); setOutcomeDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: optColor, fontSize: '14px', fontWeight: 600, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = optBg || 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{optVal}</div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                      {/* RR */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>RR</label>
                        <input type="text" value={quickTradeRR} onChange={e => setQuickTradeRR(e.target.value)} placeholder="2.5" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                      </div>
                      {/* % Risk */}
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>% Risk</label>
                        <input type="number" value={quickTradeRiskPercent} onChange={e => setQuickTradeRiskPercent(e.target.value)} placeholder="1" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                      </div>
                      {/* Confidence */}
                      {(() => {
                        const confStyles = getFieldOptionStyles('confidence', quickTradeConfidence)
                        const confOptions = getFieldOptions('confidence')
                        const displayVal = confOptions.find(o => getOptVal(o).toLowerCase() === quickTradeConfidence?.toLowerCase())
                        return (
                          <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Confidence</label>
                            <button type="button" onClick={() => { setConfidenceDropdownOpen(!confidenceDropdownOpen); setDirectionDropdownOpen(false); setOutcomeDropdownOpen(false); setTimeframeDropdownOpen(false); setSessionDropdownOpen(false); setCustomDropdownOpen({}) }} style={{ width: '100%', padding: '10px 12px', background: quickTradeConfidence ? (confStyles.bgColor || '#0a0a0f') : '#0a0a0f', border: confidenceDropdownOpen ? '1px solid #22c55e' : quickTradeConfidence ? `1px solid ${confStyles.borderColor || (confStyles.textColor ? confStyles.textColor + '80' : '#1a1a22')}` : '1px solid #1a1a22', borderRadius: confidenceDropdownOpen ? '8px 8px 0 0' : '8px', color: quickTradeConfidence ? (confStyles.textColor || '#fff') : '#888', fontSize: '14px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{displayVal ? getOptVal(displayVal) : (quickTradeConfidence || '-')}</span>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: confidenceDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
                            </button>
                            {confidenceDropdownOpen && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0f', border: `1px solid ${themeColor}`, borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 100, overflow: 'hidden' }}>
                                <div onClick={() => { setQuickTradeConfidence(''); setConfidenceDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: '#888', fontSize: '14px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</div>
                                {confOptions.map(opt => {
                                  const optVal = getOptVal(opt)
                                  const optColor = typeof opt === 'object' ? (opt.textColor || '#fff') : '#fff'
                                  const optBg = typeof opt === 'object' ? (opt.bgColor || null) : null
                                  return (
                                    <div key={optVal} onClick={() => { setQuickTradeConfidence(optVal); setConfidenceDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: optColor, fontSize: '14px', fontWeight: 600, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = optBg || 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{optVal}</div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                      {/* Timeframe */}
                      {(() => {
                        const tfStyles = getFieldOptionStyles('timeframe', quickTradeTimeframe)
                        const tfOptions = getFieldOptions('timeframe')
                        const displayVal = tfOptions.find(o => getOptVal(o).toLowerCase() === quickTradeTimeframe?.toLowerCase())
                        return (
                          <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Timeframe</label>
                            <button type="button" onClick={() => { setTimeframeDropdownOpen(!timeframeDropdownOpen); setDirectionDropdownOpen(false); setOutcomeDropdownOpen(false); setConfidenceDropdownOpen(false); setSessionDropdownOpen(false); setCustomDropdownOpen({}) }} style={{ width: '100%', padding: '10px 12px', background: quickTradeTimeframe ? (tfStyles.bgColor || '#0a0a0f') : '#0a0a0f', border: timeframeDropdownOpen ? '1px solid #22c55e' : quickTradeTimeframe ? `1px solid ${tfStyles.borderColor || (tfStyles.textColor ? tfStyles.textColor + '80' : '#1a1a22')}` : '1px solid #1a1a22', borderRadius: timeframeDropdownOpen ? '8px 8px 0 0' : '8px', color: quickTradeTimeframe ? (tfStyles.textColor || '#fff') : '#888', fontSize: '14px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{displayVal ? getOptVal(displayVal) : (quickTradeTimeframe || '-')}</span>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: timeframeDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
                            </button>
                            {timeframeDropdownOpen && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0f', border: `1px solid ${themeColor}`, borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 100, overflow: 'hidden' }}>
                                <div onClick={() => { setQuickTradeTimeframe(''); setTimeframeDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: '#888', fontSize: '14px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</div>
                                {tfOptions.map(opt => {
                                  const optVal = getOptVal(opt)
                                  const optColor = typeof opt === 'object' ? (opt.textColor || '#fff') : '#fff'
                                  const optBg = typeof opt === 'object' ? (opt.bgColor || null) : null
                                  return (
                                    <div key={optVal} onClick={() => { setQuickTradeTimeframe(optVal); setTimeframeDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: optColor, fontSize: '14px', fontWeight: 600, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = optBg || 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{optVal}</div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                      {/* Session */}
                      {(() => {
                        const sessStyles = getFieldOptionStyles('session', quickTradeSession)
                        const sessOptions = getFieldOptions('session')
                        const displayVal = sessOptions.find(o => getOptVal(o).toLowerCase() === quickTradeSession?.toLowerCase())
                        return (
                          <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Session</label>
                            <button type="button" onClick={() => { setSessionDropdownOpen(!sessionDropdownOpen); setDirectionDropdownOpen(false); setOutcomeDropdownOpen(false); setConfidenceDropdownOpen(false); setTimeframeDropdownOpen(false); setCustomDropdownOpen({}) }} style={{ width: '100%', padding: '10px 12px', background: quickTradeSession ? (sessStyles.bgColor || '#0a0a0f') : '#0a0a0f', border: sessionDropdownOpen ? '1px solid #22c55e' : quickTradeSession ? `1px solid ${sessStyles.borderColor || (sessStyles.textColor ? sessStyles.textColor + '80' : '#1a1a22')}` : '1px solid #1a1a22', borderRadius: sessionDropdownOpen ? '8px 8px 0 0' : '8px', color: quickTradeSession ? (sessStyles.textColor || '#fff') : '#888', fontSize: '14px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{displayVal ? getOptVal(displayVal) : (quickTradeSession || '-')}</span>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: sessionDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
                            </button>
                            {sessionDropdownOpen && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0f', border: `1px solid ${themeColor}`, borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 100, overflow: 'hidden' }}>
                                <div onClick={() => { setQuickTradeSession(''); setSessionDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: '#888', fontSize: '14px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</div>
                                {sessOptions.map(opt => {
                                  const optVal = getOptVal(opt)
                                  const optColor = typeof opt === 'object' ? (opt.textColor || '#fff') : '#fff'
                                  const optBg = typeof opt === 'object' ? (opt.bgColor || null) : null
                                  return (
                                    <div key={optVal} onClick={() => { setQuickTradeSession(optVal); setSessionDropdownOpen(false) }} style={{ padding: '10px 12px', cursor: 'pointer', color: optColor, fontSize: '14px', fontWeight: 600, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = optBg || 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{optVal}</div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                      {/* Custom Inputs - fill remaining grid cells */}
                      {getSelectedAccountCustomInputs().map(input => {
                        const isOpen = customDropdownOpen[input.id] || false
                        const currentVal = quickTradeExtraData[input.id] || ''
                        const currentOpt = (input.options || []).find(o => getOptVal(o) === currentVal)
                        const currentColor = currentOpt && typeof currentOpt === 'object' ? (currentOpt.textColor || '#fff') : '#fff'
                        return (
                          <div key={input.id} style={{ position: 'relative' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>{input.label || input.id}</label>
                            <button type="button" onClick={() => { setCustomDropdownOpen(prev => ({ ...Object.fromEntries(Object.keys(prev).map(k => [k, false])), [input.id]: !isOpen })); setDirectionDropdownOpen(false); setOutcomeDropdownOpen(false); setConfidenceDropdownOpen(false); setTimeframeDropdownOpen(false); setSessionDropdownOpen(false) }} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: isOpen ? `1px solid ${themeColor}` : '1px solid #1a1a22', borderRadius: isOpen ? '8px 8px 0 0' : '8px', color: currentVal ? currentColor : '#888', fontSize: '14px', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{currentVal || '-'}</span>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
                            </button>
                            {isOpen && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0f', border: `1px solid ${themeColor}`, borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 100, overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }}>
                                <div onClick={() => { setQuickTradeExtraData(prev => ({ ...prev, [input.id]: '' })); setCustomDropdownOpen({}) }} style={{ padding: '10px 12px', cursor: 'pointer', color: '#888', fontSize: '14px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</div>
                                {(input.options || []).map(opt => {
                                  const optVal = getOptVal(opt)
                                  const optColor = typeof opt === 'object' ? (opt.textColor || '#fff') : '#fff'
                                  const optBg = typeof opt === 'object' ? (opt.bgColor || null) : null
                                  return (
                                    <div key={optVal} onClick={() => { setQuickTradeExtraData(prev => ({ ...prev, [input.id]: optVal })); setCustomDropdownOpen({}) }} style={{ padding: '10px 12px', cursor: 'pointer', color: optColor, fontSize: '14px', fontWeight: 600, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = optBg || 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{optVal}</div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Right: Images, Date, Rating, Notes */}
                  <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Image Upload - at top */}
                    <div>
                      <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px', fontWeight: 600 }}>Images</div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {quickTradeImages.map((img, idx) => (
                          <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #1a1a22' }}>
                            <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button onClick={() => removeQuickTradeImage(idx)} style={{ position: 'absolute', top: '2px', right: '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
                          </div>
                        ))}
                        <label style={{ width: '60px', height: '60px', borderRadius: '8px', border: '1px dashed #333', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploadingImage ? 'wait' : 'pointer', opacity: uploadingImage ? 0.5 : 1 }}>
                          <input type="file" accept="image/*" multiple onChange={async (e) => { for (const file of e.target.files) { await uploadQuickTradeImage(file) } e.target.value = '' }} style={{ display: 'none' }} disabled={uploadingImage} />
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                        </label>
                      </div>
                    </div>

                    {/* Date & Time */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Date</label>
                        <input type="date" value={quickTradeDate} onChange={e => setQuickTradeDate(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Time</label>
                        <input type="time" value={quickTradeTime || ''} onChange={e => setQuickTradeTime(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', boxSizing: 'border-box' }} />
                      </div>
                    </div>

                    {/* Rating */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Rating</label>
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

                    {/* Notes */}
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Notes</label>
                      <textarea value={quickTradeNotes} onChange={e => setQuickTradeNotes(e.target.value)} placeholder="Trade notes..." rows={3} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', resize: 'none', boxSizing: 'border-box' }} />
                    </div>

                    {/* Trade Mistake */}
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', color: '#ef4444', marginBottom: '6px', fontWeight: 600 }}>Trade Mistake</label>
                      <textarea value={quickTradeMistake} onChange={e => setQuickTradeMistake(e.target.value)} placeholder="What went wrong? (optional)" rows={2} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#fff', fontSize: '14px', resize: 'none', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with action button */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid #1a1a22', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { submitQuickTrade(); setSidebarExpanded(false); }}
                  disabled={submittingTrade || !quickTradeSymbol.trim() || !quickTradePnl || !quickTradeDate}
                  style={{
                    padding: '12px 32px',
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
                  <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: 600, marginBottom: '12px' }}>Map Your Columns</div>
                  <p style={{ color: '#888', fontSize: '12px', marginBottom: '12px' }}>Auto-detected fields are highlighted. Unmapped columns will be created as custom inputs.</p>

                  {/* Warning if symbol not mapped */}
                  {!Object.values(importMapping).includes('symbol') && (
                    <div style={{ marginBottom: '16px', padding: '10px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" style={{ flexShrink: 0, marginTop: '1px' }}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                      <div style={{ fontSize: '12px', color: '#f59e0b' }}>
                        <strong>Missing required column:</strong> Symbol/Pair
                        <div style={{ color: '#b45309', fontSize: '11px', marginTop: '4px' }}>Please map this column or your data may not display correctly.</div>
                      </div>
                    </div>
                  )}
                  {/* Info if PnL will be calculated */}
                  {!Object.values(importMapping).includes('pnl') && Object.values(importMapping).includes('symbol') && (
                    <div style={{ marginBottom: '16px', padding: '10px 12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>
                      <span style={{ fontSize: '11px', color: '#22c55e' }}>
                        {Object.values(importMapping).includes('rr')
                          ? 'PnL will be auto-calculated from RR × % Risk (defaults to 1% if not mapped)'
                          : 'No PnL column mapped. PnL will be set to $0 and can be edited later.'}
                      </span>
                    </div>
                  )}

                  {/* Warning if no date column */}
                  {!Object.values(importMapping).includes('date') && Object.values(importMapping).includes('symbol') && Object.values(importMapping).includes('pnl') && (
                    <div style={{ marginBottom: '16px', padding: '10px 12px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                      <span style={{ fontSize: '11px', color: '#3b82f6' }}>No date column mapped. All trades will use today's date.</span>
                    </div>
                  )}

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
                  <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>Preview ({importData.length} trades, first 5 shown)</div>
                  <div style={{ overflow: 'auto', marginBottom: '20px', border: '1px solid #1a1a22', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
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

                  {/* Journal Setup */}
                  <div style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: 600, marginBottom: '12px' }}>Journal Setup</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Journal Name *</label>
                      <input type="text" value={importJournalName} onChange={e => setImportJournalName(e.target.value)} placeholder="My Journal" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#888', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Starting Balance ($)</label>
                      <input type="number" value={importStartingBalance} onChange={e => setImportStartingBalance(e.target.value)} placeholder="10000" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                    </div>
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

        {/* Zoomed Journal Graph Modal */}
        {zoomedJournal && (() => {
          const account = accounts.find(a => a.id === zoomedJournal)
          if (!account) return null
          const accTrades = trades[account.id] || []
          const startingBalance = parseFloat(account.starting_balance) || 0
          let cumBalance = startingBalance
          const sortedTrades = accTrades.slice().sort((a, b) => new Date(a.date) - new Date(b.date))
          const balancePoints = [{ value: startingBalance, date: null, symbol: null, pnl: 0 }]
          sortedTrades.forEach(t => {
            cumBalance += parseFloat(t.pnl) || 0
            balancePoints.push({ value: cumBalance, date: t.date, symbol: t.symbol, pnl: parseFloat(t.pnl) || 0 })
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

          const dataRange = maxBal - minBal || 1000
          const paddingAmount = dataRange / 14  // 1/16 padding
          const yMax = maxBal + paddingAmount
          const yMin = minBal - paddingAmount
          const yRange = yMax - yMin || 1

          // Nice step for Y-axis
          const niceStepFn = (range, targetSteps = 5) => {
            const rough = range / targetSteps
            const mag = Math.pow(10, Math.floor(Math.log10(rough)))
            const residual = rough / mag
            let nice
            if (residual <= 1) nice = 1
            else if (residual <= 2) nice = 2
            else if (residual <= 5) nice = 5
            else nice = 10
            return nice * mag
          }
          const step = niceStepFn(yRange)

          // Generate labels anchored to starting balance (start is always a label)
          const yLabels = [startingBalance]
          // Add labels above start - extend beyond yMax to ensure padding
          for (let v = startingBalance + step; v < yMax + step; v += step) {
            yLabels.push(v)
          }
          // Add labels below start - extend beyond yMin to ensure padding
          for (let v = startingBalance - step; v > yMin - step; v -= step) {
            if (v >= 0 || minBal < 0) yLabels.push(v)
          }
          // Sort from highest to lowest
          yLabels.sort((a, b) => b - a)

          // Calculate starting balance Y position (will now always be at a label position)
          const startLineYPct = yLabels.length > 1 ? (yLabels.indexOf(startingBalance) / (yLabels.length - 1)) * 100 : 0
          const profitTargetYPct = profitTarget ? ((yMax - profitTarget) / yRange) * 100 : null
          const maxDdFloorYPct = maxDdFloor ? ((yMax - maxDdFloor) / yRange) * 100 : null

          // Normalized SVG coordinates
          const svgW = 100, svgH = 100
          const startY = svgH - ((startingBalance - yMin) / yRange) * svgH

          const chartPts = balancePoints.map((p, i) => ({
            x: (i / (balancePoints.length - 1 || 1)) * svgW,
            y: svgH - ((p.value - yMin) / yRange) * svgH,
            balance: p.value,
            date: p.date,
            symbol: p.symbol,
            pnl: p.pnl
          }))

          // Build split paths
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

          // X-axis labels (dates)
          const xLabels = []
          if (balancePoints.length > 1) {
            const step = Math.max(1, Math.floor(balancePoints.length / 5))
            for (let i = 0; i < balancePoints.length; i += step) {
              if (balancePoints[i].date) {
                const d = new Date(balancePoints[i].date)
                xLabels.push({ pos: (i / (balancePoints.length - 1)) * 100, label: `${d.getDate()}/${d.getMonth() + 1}` })
              }
            }
          }

          return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setZoomedJournal(null)}>
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '800px' }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', margin: 0, wordBreak: 'break-word', lineHeight: 1.3 }}>{account.name}</h2>
                    <span style={{ fontSize: '13px', color: '#666' }}>Equity Curve</span>
                  </div>
                  <button onClick={() => setZoomedJournal(null)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: '8px' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                {/* Graph */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '350px' }}>
                  {/* Chart row - Y-axis and chart area aligned */}
                  <div style={{ flex: 1, display: 'flex' }}>
                    {/* Y-Axis Labels */}
                    <div style={{ width: '60px', flexShrink: 0, position: 'relative', paddingRight: '8px', borderBottom: '1px solid transparent' }}>
                      {yLabels.map((v, i) => {
                        const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                        const isStart = v === startingBalance
                        return (
                          <Fragment key={i}>
                            <span style={{ position: 'absolute', right: '12px', top: `${topPct}%`, transform: 'translateY(-50%)', fontSize: '10px', color: '#666', lineHeight: 1, fontWeight: 400, textAlign: 'right' }}>
                              {Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${Math.round(v)}`}
                            </span>
                            <div style={{ position: 'absolute', right: '8px', top: `${topPct}%`, width: '4px', borderTop: `1px solid ${isStart ? '#666' : '#444'}` }} />
                          </Fragment>
                        )
                      })}
                    </div>
                    {/* Chart area */}
                    <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #2a2a35', borderBottom: '1px solid #2a2a35' }}
                      onMouseMove={(e) => {
                        if (chartPts.length < 2) return
                        const rect = e.currentTarget.getBoundingClientRect()
                        const x = e.clientX - rect.left
                        const pct = x / rect.width
                        const idx = Math.round(pct * (chartPts.length - 1))
                        if (idx >= 0 && idx < chartPts.length) {
                          setJournalHover({ ...chartPts[idx], mouseX: e.clientX, mouseY: e.clientY })
                        }
                      }}
                      onMouseLeave={() => setJournalHover(null)}
                    >
                      {/* Horizontal Grid Lines */}
                      {yLabels.map((v, i) => {
                        const isStart = v === startingBalance
                        return <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${(i / (yLabels.length - 1)) * 100}%`, borderTop: isStart ? '1px dashed #555' : '1px solid #1a1a22', zIndex: isStart ? 1 : 0 }} />
                      })}
                      {/* Profit target line */}
                      {profitTargetYPct !== null && profitTargetYPct >= 0 && profitTargetYPct <= 100 && (
                        <div style={{ position: 'absolute', left: 0, right: 0, top: `${profitTargetYPct}%`, borderTop: '1px dashed #22c55e', zIndex: 1 }} />
                      )}
                      {/* Max DD line */}
                      {maxDdFloorYPct !== null && maxDdFloorYPct >= 0 && maxDdFloorYPct <= 100 && (
                        <div style={{ position: 'absolute', left: 0, right: 0, top: `${maxDdFloorYPct}%`, borderTop: '1px dashed #ef4444', zIndex: 1 }} />
                      )}
                      {/* SVG Graph */}
                      <svg width="100%" height="100%" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none" style={{ position: 'relative', zIndex: 2 }}>
                        <defs>
                          <linearGradient id="zoomGreenGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor={positiveColor} stopOpacity="0.3" /><stop offset="100%" stopColor={positiveColor} stopOpacity="0" /></linearGradient>
                          <linearGradient id="zoomRedGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" /><stop offset="100%" stopColor="#ef4444" stopOpacity="0" /></linearGradient>
                        </defs>
                        {greenAreaPath && <path d={greenAreaPath} fill="url(#zoomGreenGrad)" />}
                        {redAreaPath && <path d={redAreaPath} fill="url(#zoomRedGrad)" />}
                        {greenPath && <path d={greenPath} fill="none" stroke={positiveColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                        {redPath && <path d={redPath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                      </svg>
                      {/* Hover tooltip */}
                      {journalHover && (
                        <div style={{ position: 'fixed', left: journalHover.mouseX + 12, top: journalHover.mouseY - 60, background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '8px', padding: '10px 14px', zIndex: 1000, pointerEvents: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                          <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>{journalHover.date || 'Start'}</div>
                          {journalHover.symbol && <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>{journalHover.symbol}</div>}
                          <div style={{ fontSize: '16px', fontWeight: 700, color: journalHover.balance >= startingBalance ? positiveColor : '#ef4444' }}>
                            ${formatCurrency(journalHover.balance)}
                          </div>
                          {journalHover.pnl !== 0 && (
                            <div style={{ fontSize: '12px', color: journalHover.pnl >= 0 ? positiveColor : '#ef4444', marginTop: '2px' }}>
                              {journalHover.pnl >= 0 ? '+' : ''}${formatCurrency(journalHover.pnl)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* X-Axis row */}
                  <div style={{ display: 'flex' }}>
                    <div style={{ width: '60px', flexShrink: 0 }} />
                    <div style={{ flex: 1, height: '24px', position: 'relative' }}>
                      {xLabels.map((l, i) => (
                        <div key={i} style={{ position: 'absolute', left: `${l.pos}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <div style={{ width: '1px', height: '4px', background: '#444' }} />
                          <span style={{ fontSize: '9px', color: '#666', marginTop: '2px' }}>{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '16px', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '12px', height: '2px', background: '#555', borderStyle: 'dashed' }} />
                    <span style={{ fontSize: '10px', color: '#666' }}>Starting Balance</span>
                  </div>
                  {profitTarget && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '12px', height: '2px', background: '#22c55e' }} />
                      <span style={{ fontSize: '10px', color: '#666' }}>Profit Target</span>
                    </div>
                  )}
                  {maxDdFloor && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '12px', height: '2px', background: '#ef4444' }} />
                      <span style={{ fontSize: '10px', color: '#666' }}>Max Drawdown</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        {/* Mobile Floating Action Button */}
        {isMobile && filteredAccounts.length > 0 && !showMobileTradeModal && (
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

        {/* Expanded Note Modal */}
        {showExpandedNote && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
            onClick={() => setShowExpandedNote(null)}
          >
            <div
              style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '24px', width: '500px', maxWidth: '90vw', maxHeight: '80vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                      {showExpandedNote.type === 'custom' ? showExpandedNote.title : showExpandedNote.type === 'daily' ? 'Daily Note' : 'Weekly Note'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#666' }}>
                      {new Date(showExpandedNote.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowExpandedNote(null)}
                  style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: '4px' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', fontSize: '14px', color: '#ccc', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {showExpandedNote.text}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Button Tooltip */}
      {buttonTooltip && (
        <div style={{
          position: 'fixed',
          left: buttonTooltip.x,
          top: buttonTooltip.showBelow ? buttonTooltip.y + 44 : buttonTooltip.y - 8,
          transform: buttonTooltip.showBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
          background: '#1a1a22',
          border: '1px solid #2a2a35',
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '11px',
          color: '#fff',
          whiteSpace: 'nowrap',
          zIndex: 9999,
          pointerEvents: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
        }}>
          {buttonTooltip.text}
          <div style={{
            position: 'absolute',
            [buttonTooltip.showBelow ? 'top' : 'bottom']: '-4px',
            left: '50%',
            transform: `translateX(-50%) rotate(${buttonTooltip.showBelow ? '-135deg' : '45deg'})`,
            width: '8px',
            height: '8px',
            background: '#1a1a22',
            borderRight: '1px solid #2a2a35',
            borderBottom: '1px solid #2a2a35'
          }} />
        </div>
      )}
      <ToastContainer />
    </div>
  )
}
