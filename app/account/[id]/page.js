'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const defaultInputs = [
  { id: 'symbol', label: 'Symbol', type: 'text', required: true, enabled: true, fixed: true, color: '#22c55e' },
  { id: 'pnl', label: 'PnL ($)', type: 'number', required: true, enabled: true, fixed: true, color: '#22c55e' },
  { id: 'direction', label: 'Direction', type: 'select', options: [{value: 'long', textColor: '#22c55e', bgColor: 'rgba(34,197,94,0.15)'}, {value: 'short', textColor: '#ef4444', bgColor: 'rgba(239,68,68,0.15)'}], required: true, enabled: true, fixed: true, color: '#3b82f6' },
  { id: 'outcome', label: 'W/L', type: 'select', options: [{value: 'win', textColor: '#22c55e', bgColor: 'rgba(34,197,94,0.15)'}, {value: 'loss', textColor: '#ef4444', bgColor: 'rgba(239,68,68,0.15)'}, {value: 'be', textColor: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)'}], required: true, enabled: true, fixed: true, color: '#22c55e' },
  { id: 'rr', label: 'RR', type: 'number', required: false, enabled: true, fixed: true, color: '#f59e0b' },
  { id: 'riskPercent', label: '% Risk', type: 'number', required: false, enabled: true, fixed: true, color: '#ef4444' },
  { id: 'date', label: 'Date', type: 'date', required: true, enabled: true, fixed: true, color: '#8b5cf6' },
  { id: 'time', label: 'Time', type: 'time', required: false, enabled: true, fixed: true, color: '#a855f7' },
  { id: 'confidence', label: 'Confidence', type: 'select', options: [{value: 'High', textColor: '#22c55e', bgColor: 'rgba(34,197,94,0.15)'}, {value: 'Medium', textColor: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)'}, {value: 'Low', textColor: '#ef4444', bgColor: 'rgba(239,68,68,0.15)'}], required: false, enabled: true, fixed: true, color: '#f59e0b' },
  { id: 'rating', label: 'Rating', type: 'rating', required: false, enabled: true, fixed: true, color: '#fbbf24' },
  { id: 'timeframe', label: 'Timeframe', type: 'select', options: [{value: '1m', textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)'}, {value: '5m', textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)'}, {value: '15m', textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)'}, {value: '30m', textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)'}, {value: '1H', textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)'}, {value: '4H', textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)'}, {value: 'Daily', textColor: '#06b6d4', bgColor: 'rgba(6,182,212,0.15)'}], required: false, enabled: true, fixed: true, color: '#06b6d4' },
  { id: 'session', label: 'Session', type: 'select', options: [{value: 'London', textColor: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)'}, {value: 'New York', textColor: '#22c55e', bgColor: 'rgba(34,197,94,0.15)'}, {value: 'Asian', textColor: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)'}, {value: 'Overlap', textColor: '#a855f7', bgColor: 'rgba(168,85,247,0.15)'}], required: false, enabled: true, fixed: true, color: '#ec4899' },
  { id: 'image', label: 'Image', type: 'file', required: false, enabled: true, fixed: true, color: '#64748b' },
  { id: 'notes', label: 'Notes', type: 'textarea', required: false, enabled: true, fixed: true, color: '#64748b' },
]

// Helper functions for handling options - supports legacy {value, color} and new {value, textColor, bgColor}
function getOptVal(o) { return typeof o === 'object' ? o.value : o }
function getOptTextColor(o, fallback = '#fff') {
  if (typeof o !== 'object') return fallback
  return o.textColor || o.color || fallback
}
function getOptBgColor(o) {
  if (typeof o !== 'object') return null
  return o.bgColor || null
}
function getOptBorderColor(o) {
  if (typeof o !== 'object') return null
  return o.borderColor || null
}
function findOptStyles(opts, val) {
  if (!opts || !val) return { textColor: '#fff', bgColor: null, borderColor: null }
  const o = opts.find(x => getOptVal(x).toLowerCase() === val.toLowerCase())
  if (!o) return { textColor: '#fff', bgColor: null, borderColor: null }
  return { textColor: getOptTextColor(o), bgColor: getOptBgColor(o), borderColor: getOptBorderColor(o) }
}

// Format large numbers nicely (e.g., 1.2M, 500k)
function formatPnl(value) {
  const absVal = Math.abs(value)
  if (absVal >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`
  if (absVal >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (absVal >= 100000) return `${(value / 1000).toFixed(0)}k`
  if (absVal >= 10000) return `${(value / 1000).toFixed(1)}k`
  return value.toFixed(0)
}

export default function AccountPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const accountId = params.id
  
  const [user, setUser] = useState(null)
  const [account, setAccount] = useState(null)
  const [allAccounts, setAllAccounts] = useState([])
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
  const [optionsList, setOptionsList] = useState([])  // [{value, textColor, bgColor}]
  const [editingColor, setEditingColor] = useState(null)  // For simple color picker
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
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
  const [showObjectiveLines, setShowObjectiveLines] = useState(false)
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
  const [deleteInputConfirm, setDeleteInputConfirm] = useState(null)
  const [deleteSelectedConfirm, setDeleteSelectedConfirm] = useState(false)
  const [showRestoreDefaults, setShowRestoreDefaults] = useState(false)
  const [showCumulativeStats, setShowCumulativeStats] = useState(searchParams.get('cumulative') === 'true')
  const [viewMode, setViewMode] = useState(searchParams.get('cumulative') === 'true' ? 'all' : 'this') // 'this', 'all', 'selected'
  const [selectedJournalIds, setSelectedJournalIds] = useState(new Set())
  const [showJournalDropdown, setShowJournalDropdown] = useState(false)
  const [allAccountsTrades, setAllAccountsTrades] = useState({})
  const [selectMode, setSelectMode] = useState(false)
  const [selectedTrades, setSelectedTrades] = useState(new Set())
  const [slideshowMode, setSlideshowMode] = useState(false)
  const [slideshowIndex, setSlideshowIndex] = useState(0)
  const [viewingSelectedStats, setViewingSelectedStats] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', outcome: '', direction: '', symbol: '', session: '', timeframe: '', confidence: '', rr: '', rating: '', custom: {} })
  const [draftFilters, setDraftFilters] = useState({ dateFrom: '', dateTo: '', outcome: '', direction: '', symbol: '', session: '', timeframe: '', confidence: '', rr: '', rating: '', quickSelect: '', custom: {} })
  const [hoverRatings, setHoverRatings] = useState({}) // Track hover per input ID
  const [editingTrade, setEditingTrade] = useState(null)
  // Custom dropdown open states for Log Trade modal
  const [directionDropdownOpen, setDirectionDropdownOpen] = useState(false)
  const [outcomeDropdownOpen, setOutcomeDropdownOpen] = useState(false)
  const [customDropdownOpen, setCustomDropdownOpen] = useState({}) // Map of input.id -> boolean
  const [viewingTrade, setViewingTrade] = useState(null)
  const [tradeImageIndex, setTradeImageIndex] = useState(0)
  const [transferFromJournal, setTransferFromJournal] = useState('')
  const [draggedColumn, setDraggedColumn] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)

  const tradesScrollRef = useRef(null)
  const fixedScrollRef = useRef(null)
  const [tradesScrollWidth, setTradesScrollWidth] = useState(0)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close journal dropdown when clicking outside
  useEffect(() => {
    if (!showJournalDropdown) return
    const handleClickOutside = (e) => {
      if (!e.target.closest('[data-journal-dropdown]')) setShowJournalDropdown(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showJournalDropdown])

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
      else if (inp.type === 'select' && inp.options?.length) initial[inp.id] = getOptVal(inp.options[0]).toLowerCase()
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
    const { data: allAccountsData } = await supabase.from('accounts').select('*').eq('user_id', user.id).order('created_at', { ascending: true })
    setAllAccounts(allAccountsData || [])
    // Load trades from all accounts for cumulative stats
    if (allAccountsData?.length) {
      const tradesMap = {}
      for (const acc of allAccountsData) {
        const { data: accTrades } = await supabase.from('trades').select('*').eq('account_id', acc.id).order('date', { ascending: true })
        tradesMap[acc.id] = accTrades || []
      }
      setAllAccountsTrades(tradesMap)
    }
    if (accountData.custom_inputs) {
      try {
        const parsed = JSON.parse(accountData.custom_inputs)
        // Convert legacy inputs and merge with defaultInputs to ensure options with colors
        const convertedInputs = parsed.map(inp => {
          const defaultInput = defaultInputs.find(d => d.id === inp.id)
          // For select types, ensure options with textColor/bgColor exist
          if (inp.type === 'select') {
            if (inp.options && inp.options.length > 0) {
              const convertedOptions = inp.options.map((opt) => {
                if (typeof opt === 'string') {
                  // Legacy string option - find from defaults or use gray
                  const defaultOpt = defaultInput?.options?.find(o => getOptVal(o).toLowerCase() === opt.toLowerCase())
                  if (defaultOpt) return defaultOpt
                  return { value: opt, textColor: '#888', bgColor: null }
                }
                // Object option - check if it has new format or legacy format
                if (opt.textColor) return opt // Already new format
                // Legacy {value, color} format - convert to new format
                if (opt.color) {
                  const defaultOpt = defaultInput?.options?.find(o => getOptVal(o).toLowerCase() === opt.value.toLowerCase())
                  if (defaultOpt) return defaultOpt
                  // Generate bgColor from color (hex to rgba)
                  const hex = opt.color.replace('#', '')
                  const r = parseInt(hex.substr(0, 2), 16)
                  const g = parseInt(hex.substr(2, 2), 16)
                  const b = parseInt(hex.substr(4, 2), 16)
                  return { value: opt.value, textColor: opt.color, bgColor: `rgba(${r},${g},${b},0.15)` }
                }
                return opt
              })
              return { ...inp, options: convertedOptions }
            } else if (defaultInput?.options) {
              // No options saved, use default options with colors
              return { ...inp, options: defaultInput.options }
            }
          }
          return inp
        })

        // ALWAYS ensure all default inputs are present - merge saved with defaults
        const mergedInputs = defaultInputs.map(def => {
          const saved = convertedInputs.find(c => c.id === def.id)
          return saved ? { ...def, ...saved, fixed: true } : def
        })
        // Add any custom (non-default) inputs
        const customInputs = convertedInputs.filter(i => !defaultInputs.find(d => d.id === i.id))
        setInputs([...mergedInputs, ...customInputs])
        if (customInputs.length > 0) setHasNewInputs(true)
      } catch {
        // On parse error, use defaults
        setInputs(defaultInputs)
      }
    }
    // Load notes from profiles (user-level, not account-level)
    const { data: profileData } = await supabase.from('profiles').select('notes_data').eq('id', user.id).single()
    if (profileData?.notes_data) { try { setNotes(JSON.parse(profileData.notes_data)) } catch {} }
    const { data: tradesData } = await supabase.from('trades').select('*').eq('account_id', accountId).order('date', { ascending: false })
    setTrades(tradesData || [])
    setLoading(false)
  }

  async function addTrade() {
    if (!tradeForm.symbol?.trim()) { alert('Please enter a symbol'); return }
    if (!tradeForm.pnl || isNaN(parseFloat(tradeForm.pnl))) { alert('Please enter a valid PnL number'); return }
    if (tradeForm.rr && isNaN(parseFloat(tradeForm.rr))) { alert('Please enter a valid RR number'); return }
    setSaving(true)
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

    // Collect all custom field data (including image)
    // Use input ID as key for consistent access across pages
    const extraData = {}
    inputs.forEach(inp => {
      if (!['symbol', 'outcome', 'pnl', 'rr', 'date', 'notes', 'direction'].includes(inp.id)) {
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
      time: tradeForm.time || null,
      notes: tradeForm.notes || '',
      extra_data: JSON.stringify(extraData)
    }).select().single()
    
    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    setTrades([data, ...trades])
    const initial = {}
    inputs.forEach(inp => {
      if (inp.type === 'date') initial[inp.id] = new Date().toISOString().split('T')[0]
      else if (inp.type === 'select' && inp.options?.length) initial[inp.id] = getOptVal(inp.options[0]).toLowerCase()
      else if (inp.type === 'rating') initial[inp.id] = '3'
      else initial[inp.id] = ''
    })
    setTradeForm(initial)
    setShowAddTrade(false)
    setSaving(false)
  }

  async function deleteTrade(tradeId) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { error } = await supabase.from('trades').delete().eq('id', tradeId)
    if (error) { alert('Failed to delete trade: ' + error.message); return }
    setTrades(trades.filter(t => t.id !== tradeId))
  }

  function startEditTrade(trade) {
    const extra = getExtraData(trade)
    // Convert label-keyed extra_data back to ID-keyed for form
    const convertedExtra = {}
    Object.entries(extra).forEach(([key, value]) => {
      // Try to find input by label first (new format), then by id (old format)
      const inputByLabel = inputs.find(i => i.label === key)
      const inputById = inputs.find(i => i.id === key)
      const targetId = inputByLabel?.id || inputById?.id || key
      convertedExtra[targetId] = value
    })
    const form = {
      symbol: trade.symbol || '',
      pnl: trade.pnl?.toString() || '',
      direction: trade.direction || 'long',
      outcome: trade.outcome || 'win',
      rr: trade.rr?.toString() || '',
      date: trade.date || new Date().toISOString().split('T')[0],
      time: trade.time || '',
      notes: trade.notes || '',
      ...convertedExtra
    }
    setTradeForm(form)
    setEditingTrade(trade)
    setShowAddTrade(true)
  }

  async function updateTrade() {
    if (!editingTrade) return
    if (!tradeForm.symbol?.trim()) { alert('Please enter a symbol'); return }
    if (!tradeForm.pnl || isNaN(parseFloat(tradeForm.pnl))) { alert('Please enter a valid PnL number'); return }
    setSaving(true)
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

    // Use input ID as key for consistent access across pages
    const extraData = {}
    inputs.forEach(inp => {
      if (!['symbol', 'outcome', 'pnl', 'rr', 'date', 'notes', 'direction'].includes(inp.id)) {
        extraData[inp.id] = tradeForm[inp.id] || ''
      }
    })

    const { data, error } = await supabase.from('trades').update({
      symbol: tradeForm.symbol?.toUpperCase(),
      direction: tradeForm.direction || 'long',
      outcome: tradeForm.outcome || 'win',
      pnl: parseFloat(tradeForm.pnl) || 0,
      rr: parseFloat(tradeForm.rr) || 0,
      date: tradeForm.date || new Date().toISOString().split('T')[0],
      time: tradeForm.time || null,
      notes: tradeForm.notes || '',
      extra_data: JSON.stringify(extraData)
    }).eq('id', editingTrade.id).select().single()

    if (error) { alert('Error: ' + error.message); setSaving(false); return }
    setTrades(trades.map(t => t.id === editingTrade.id ? data : t))
    setEditingTrade(null)
    setShowAddTrade(false)
    setSaving(false)
  }

  async function transferColumnsFromJournal(sourceAccountId) {
    if (!sourceAccountId) return
    const sourceAccount = allAccounts.find(a => a.id === sourceAccountId)
    if (!sourceAccount) return
    try {
      const sourceInputs = sourceAccount.custom_inputs ? JSON.parse(sourceAccount.custom_inputs) : defaultInputs
      // Deep copy to ensure all nested properties (colors, options) are preserved
      const copiedInputs = JSON.parse(JSON.stringify(sourceInputs))
      setInputs(copiedInputs)
      setTransferFromJournal('')
      // Auto-save to database so colors and all settings are immediately applied
      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      await supabase.from('accounts').update({ custom_inputs: JSON.stringify(copiedInputs) }).eq('id', accountId)
    } catch (e) {
      console.error('Error parsing source inputs:', e)
    }
  }

  async function saveInputs() {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { error } = await supabase.from('accounts').update({ custom_inputs: JSON.stringify(inputs) }).eq('id', accountId)
    if (error) { alert('Failed to save columns: ' + error.message); return }
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
    // Save notes to profiles (user-level)
    const { error } = await supabase.from('profiles').update({ notes_data: JSON.stringify(newNotes) }).eq('id', user.id)
    if (error) { alert('Failed to save note: ' + error.message); return }
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
    // Save notes to profiles (user-level)
    const { error } = await supabase.from('profiles').update({ notes_data: JSON.stringify(newNotes) }).eq('id', user.id)
    if (error) { alert('Failed to delete note: ' + error.message); return }
    setNotes(newNotes)
  }

  function getWeekStart(dateStr) {
    const d = new Date(dateStr)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    return new Date(d.setDate(diff)).toISOString().split('T')[0]
  }

  function addNewInput() {
    const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']
    const randomColor = colors[Math.floor(Math.random() * colors.length)]
    const newInput = { id: `custom_${Date.now()}`, label: 'New Field', type: 'text', required: false, enabled: true, fixed: false, options: [], color: randomColor }
    setInputs([...inputs, newInput])
  }
  function updateInput(i, f, v) {
    const n = [...inputs]
    n[i] = { ...n[i], [f]: v }
    // If changing to select type and no options exist, initialize empty array
    if (f === 'type' && v === 'select' && !n[i].options) {
      n[i].options = []
    }
    setInputs(n)
  }
  function hideInput(i) {
    // Soft delete - mark as hidden instead of removing (preserves data)
    const n = [...inputs]
    n[i] = { ...n[i], hidden: true }
    setInputs(n)
  }
  function restoreInput(i) {
    const n = [...inputs]
    n[i] = { ...n[i], hidden: false }
    setInputs(n)
  }
  function inputHasData(inputId) {
    // Check if any trades have data for this input
    return trades.some(t => {
      const extra = getExtraData(t)
      const val = extra[inputId]
      return val !== undefined && val !== null && val !== ''
    })
  }
  async function permanentlyDeleteInput(i) {
    const input = inputs[i]
    if (!input) return
    // Remove data from all trades
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    for (const trade of trades) {
      const extra = getExtraData(trade)
      if (extra[input.id] !== undefined) {
        delete extra[input.id]
        await supabase.from('trades').update({ extra_data: JSON.stringify(extra) }).eq('id', trade.id)
      }
    }
    // Remove input from inputs array (for custom inputs) or just hide (for fixed inputs)
    if (input.fixed) {
      const n = [...inputs]
      n[i] = { ...n[i], hidden: true }
      setInputs(n)
    } else {
      setInputs(inputs.filter((_, idx) => idx !== i))
    }
    // Reload trades to reflect changes
    const { data } = await supabase.from('trades').select('*').eq('account_id', account.id).order('date', { ascending: true })
    if (data) setTrades(data)
  }
  function openOptionsEditor(i) {
    setEditingOptions(i)
    const opts = inputs[i].options || []
    // Convert to [{value, textColor, bgColor}] format, handle legacy formats
    setOptionsList(opts.map(o => {
      if (typeof o === 'string') return { value: o, textColor: '#888', bgColor: null }
      if (o.textColor) return { ...o } // Already new format
      // Legacy {value, color} - convert
      const hex = (o.color || '#888888').replace('#', '')
      const r = parseInt(hex.substr(0, 2), 16) || 136
      const g = parseInt(hex.substr(2, 2), 16) || 136
      const b = parseInt(hex.substr(4, 2), 16) || 136
      return { value: o.value, textColor: o.color || '#888', bgColor: `rgba(${r},${g},${b},0.15)` }
    }))
  }
  function saveOptions() {
    if (editingOptions === null) return
    const validOpts = optionsList.filter(o => o.value.trim())
    updateInput(editingOptions, 'options', validOpts)
    setEditingOptions(null)
    setOptionsList([])
  }
  function updateOptionValue(idx, val) { const n = [...optionsList]; n[idx] = { ...n[idx], value: val }; setOptionsList(n) }
  function updateOptionTextColor(idx, col) { const n = [...optionsList]; n[idx] = { ...n[idx], textColor: col }; setOptionsList(n) }
  function updateOptionBgColor(idx, col) { const n = [...optionsList]; n[idx] = { ...n[idx], bgColor: col }; setOptionsList(n) }
  function updateOptionBorderColor(idx, col) { const n = [...optionsList]; n[idx] = { ...n[idx], borderColor: col }; setOptionsList(n) }

  // Simple color editor for non-dropdown types
  function openColorEditor(i) {
    setEditingColor(i)
  }
  function saveColorSettings(color) {
    if (editingColor === null) return
    updateInput(editingColor, 'textColor', color)
    setEditingColor(null)
  }

  // Column reordering functions
  function handleColumnDragStart(columnId) {
    setDraggedColumn(columnId)
  }
  function handleColumnDragOver(e, columnId) {
    e.preventDefault()
    if (columnId !== draggedColumn) setDragOverColumn(columnId)
  }
  function handleColumnDrop(targetColumnId) {
    if (!draggedColumn || draggedColumn === targetColumnId) {
      setDraggedColumn(null)
      setDragOverColumn(null)
      return
    }
    // Find indices in the inputs array
    const dragIdx = inputs.findIndex(i => i.id === draggedColumn)
    const dropIdx = inputs.findIndex(i => i.id === targetColumnId)
    if (dragIdx === -1 || dropIdx === -1) {
      setDraggedColumn(null)
      setDragOverColumn(null)
      return
    }
    // Reorder inputs
    const newInputs = [...inputs]
    const [removed] = newInputs.splice(dragIdx, 1)
    newInputs.splice(dropIdx, 0, removed)
    setInputs(newInputs)
    // Auto-save the new order
    saveInputsOrder(newInputs)
    setDraggedColumn(null)
    setDragOverColumn(null)
  }
  async function saveInputsOrder(newInputs) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { error } = await supabase.from('accounts').update({ custom_inputs: JSON.stringify(newInputs) }).eq('id', accountId)
    if (error) console.error('Failed to save column order:', error.message)
  }
  function toggleOptionBg(idx) {
    const n = [...optionsList]
    if (n[idx].bgColor) {
      n[idx] = { ...n[idx], bgColor: null }
    } else {
      // Generate bg from text color
      const hex = (n[idx].textColor || '#fff').replace('#', '')
      const r = parseInt(hex.substr(0, 2), 16) || 255
      const g = parseInt(hex.substr(2, 2), 16) || 255
      const b = parseInt(hex.substr(4, 2), 16) || 255
      n[idx] = { ...n[idx], bgColor: `rgba(${r},${g},${b},0.15)` }
    }
    setOptionsList(n)
  }
  function addOption() { setOptionsList([...optionsList, { value: '', textColor: '#fff', bgColor: null }]) }
  function removeOption(idx) { setOptionsList(optionsList.filter((_, i) => i !== idx)) }

  // Upload image to Supabase Storage (with base64 fallback)
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB max
  const MAX_BASE64_SIZE = 1 * 1024 * 1024 // 1MB max for base64 fallback

  async function uploadImage(file, inputId) {
    if (!file || !user?.id || !accountId) {
      console.log('Upload skipped - missing:', { file: !!file, userId: user?.id, accountId })
      return null
    }

    // Validate file size
    if (file.size > MAX_IMAGE_SIZE) {
      alert(`Image too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB.`)
      return null
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG, PNG, GIF, etc.)')
      return null
    }

    setUploadingImage(true)
    console.log('Starting upload...', { fileName: file.name, size: file.size, type: file.type })
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', user.id)
      formData.append('accountId', accountId)

      console.log('Calling /api/upload-image...')
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      })

      console.log('Response status:', response.status)
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        console.error('Upload failed:', errData)
        throw new Error(errData.error || 'Storage upload failed')
      }

      const { url } = await response.json()
      console.log('Upload success! URL:', url)
      setTradeForm(prev => ({ ...prev, [inputId]: url }))
      return url
    } catch (err) {
      // Fallback to base64 only for small files (to prevent database bloat)
      if (file.size > MAX_BASE64_SIZE) {
        alert('Upload failed and image is too large for fallback storage. Please try a smaller image (under 1MB) or check your connection.')
        setUploadingImage(false)
        return null
      }
      console.warn('Storage upload failed, using base64 fallback:', err.message)
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          setTradeForm(prev => ({ ...prev, [inputId]: reader.result }))
          resolve(reader.result)
        }
        reader.readAsDataURL(file)
      })
    } finally {
      setUploadingImage(false)
    }
  }

  function getExtraData(t) {
    // First get extra_data (from JSONB)
    let rawExtra = {}
    if (t.extra_data) {
      if (typeof t.extra_data === 'object') rawExtra = t.extra_data
      else try { rawExtra = JSON.parse(t.extra_data) } catch {}
    }
    // Normalize keys: convert label-keyed data to ID-keyed data for consistent access
    const extra = {}
    Object.entries(rawExtra).forEach(([key, value]) => {
      // Try to find input by label first (new format), then by id (old format)
      const inputByLabel = inputs.find(i => i.label === key)
      const inputById = inputs.find(i => i.id === key)
      const targetId = inputByLabel?.id || inputById?.id || key
      extra[targetId] = value
    })
    // Fallback to direct columns if not in extra_data
    if (!extra.confidence && t.confidence) extra.confidence = t.confidence
    if (!extra.rating && t.rating) extra.rating = String(t.rating)
    if (!extra.timeframe && t.timeframe) extra.timeframe = t.timeframe
    if (!extra.session && t.session) extra.session = t.session
    if (!extra.riskPercent && t.risk) extra.riskPercent = String(t.risk)
    return extra
  }
  function getDaysAgo(d) { const diff = Math.floor((new Date() - new Date(d)) / 86400000); return diff === 0 ? 'Today' : diff === 1 ? '1d ago' : `${diff}d ago` }

  // Get custom select inputs for dropdown options (excludes hidden)
  function getCustomSelectInputs() {
    return inputs.filter(i => i.type === 'select' && i.enabled && !i.hidden && !['outcome'].includes(i.id))
  }
  // Get custom number inputs for stats (excludes hidden)
  function getCustomNumberInputs() {
    return inputs.filter(i => i.type === 'number' && i.enabled && !i.hidden && !['pnl', 'rr', 'riskPercent'].includes(i.id))
  }
  // Get custom rating inputs for stats (excludes hidden)
  function getCustomRatingInputs() {
    return inputs.filter(i => i.type === 'rating' && i.enabled && !i.hidden)
  }
  // Get visible inputs (not hidden)
  function getVisibleInputs() {
    return inputs.filter(i => !i.hidden)
  }
  // Get hidden inputs
  function getHiddenInputs() {
    return inputs.filter(i => i.hidden)
  }

  // Get trades with images
  function getTradesWithImages() {
    return trades.filter(t => { const e = getExtraData(t); const img = e.image || e.Image; return img && img.length > 0 })
  }
  // Toggle trade selection
  function toggleTradeSelection(id) {
    const s = new Set(selectedTrades)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelectedTrades(s)
  }
  // Select/deselect all
  function toggleSelectAll() {
    setSelectedTrades(selectedTrades.size === trades.length ? new Set() : new Set(trades.map(t => t.id)))
  }
  // Exit select mode
  function exitSelectMode() { setSelectMode(false); setSelectedTrades(new Set()); setViewingSelectedStats(false) }
  // Delete selected
  async function deleteSelectedTrades() {
    if (selectedTrades.size === 0) return
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    for (const id of selectedTrades) await supabase.from('trades').delete().eq('id', id)
    setTrades(trades.filter(t => !selectedTrades.has(t.id)))
    exitSelectMode()
  }
  // Get slideshow images - uses filtered trades based on journal selection
  function getSlideshowImages() {
    // Use baseTradesToFilter to respect journal selection (All Journals / Selected / This Journal)
    const baseTarget = (() => {
      if (viewMode === 'all' && allAccounts.length > 1) {
        return Object.values(allAccountsTrades).flat()
      } else if (viewMode === 'selected' && selectedJournalIds.size > 0) {
        return Object.entries(allAccountsTrades)
          .filter(([accId]) => selectedJournalIds.has(accId))
          .flatMap(([, t]) => t)
      }
      return trades
    })()
    const target = selectedTrades.size > 0 ? baseTarget.filter(t => selectedTrades.has(t.id)) : baseTarget
    return target.map(t => { const e = getExtraData(t); return { trade: t, image: e.image || e.Image } }).filter(x => x.image)
  }

  // Calculate cumulative stats across all or selected accounts
  function getCumulativeStats() {
    const allTrades = []
    const accountsToUse = viewMode === 'selected' && selectedJournalIds.size > 0
      ? allAccounts.filter(acc => selectedJournalIds.has(acc.id))
      : allAccounts
    accountsToUse.forEach(acc => {
      const accTrades = allAccountsTrades[acc.id] || []
      accTrades.forEach(t => allTrades.push({ ...t, accountName: acc.name, startingBalance: acc.starting_balance }))
    })
    const totalTrades = allTrades.length
    const cWins = allTrades.filter(t => t.outcome === 'win').length
    const cLosses = allTrades.filter(t => t.outcome === 'loss').length
    const cTotalPnl = allTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
    const cWinrate = (cWins + cLosses) > 0 ? Math.round((cWins / (cWins + cLosses)) * 100) : 0
    const cAvgRR = totalTrades > 0 ? (allTrades.reduce((sum, t) => sum + (parseFloat(t.rr) || 0), 0) / totalTrades).toFixed(1) : '0'
    const cGrossProfit = allTrades.filter(t => parseFloat(t.pnl) > 0).reduce((sum, t) => sum + parseFloat(t.pnl), 0)
    const cGrossLoss = Math.abs(allTrades.filter(t => parseFloat(t.pnl) < 0).reduce((sum, t) => sum + parseFloat(t.pnl), 0))
    const cProfitFactor = cGrossLoss > 0 ? (cGrossProfit / cGrossLoss).toFixed(2) : cGrossProfit > 0 ? '∞' : '0'
    const totalStartingBalance = accountsToUse.reduce((sum, acc) => sum + (parseFloat(acc.starting_balance) || 0), 0)
    const cCurrentBalance = totalStartingBalance + cTotalPnl
    const cAvgWin = cWins > 0 ? Math.round(cGrossProfit / cWins) : 0
    const cAvgLoss = cLosses > 0 ? Math.round(cGrossLoss / cLosses) : 0
    // Build cumulative PnL points for chart
    const sortedTrades = allTrades.slice().sort((a, b) => new Date(a.date) - new Date(b.date))
    let cumPnl = 0
    const pnlPoints = sortedTrades.map(t => { cumPnl += parseFloat(t.pnl) || 0; return cumPnl })
    return { totalTrades, wins: cWins, losses: cLosses, totalPnl: cTotalPnl, winrate: cWinrate, avgRR: cAvgRR, profitFactor: cProfitFactor, totalStartingBalance, currentBalance: cCurrentBalance, avgWin: cAvgWin, avgLoss: cAvgLoss, grossProfit: cGrossProfit, grossLoss: cGrossLoss, pnlPoints, allTrades: sortedTrades }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', fontWeight: 700, marginBottom: '16px' }}><span style={{ color: '#22c55e' }}>TRADE</span><span style={{ color: '#fff' }}>SAVE</span><span style={{ color: '#22c55e' }}>+</span></div>
        <div style={{ color: '#999' }}>Loading...</div>
      </div>
    </div>
  )

  // Get base trades based on view mode
  const baseTradesToFilter = (() => {
    if (viewMode === 'all' && allAccounts.length > 1) {
      return Object.values(allAccountsTrades).flat().sort((a, b) => new Date(b.date) - new Date(a.date))
    } else if (viewMode === 'selected' && selectedJournalIds.size > 0) {
      return Object.entries(allAccountsTrades)
        .filter(([accId]) => selectedJournalIds.has(accId))
        .flatMap(([, t]) => t)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    }
    return trades
  })()

  // Apply filters to trades for display
  const filteredTrades = baseTradesToFilter.filter(t => {
    if (filters.dateFrom && t.date < filters.dateFrom) return false
    if (filters.dateTo && t.date > filters.dateTo) return false
    if (filters.outcome) {
      const fo = filters.outcome.toLowerCase(), to = (t.outcome || '').toLowerCase()
      if (fo === 'breakeven') { if (to !== 'be' && to !== 'breakeven') return false }
      else if (to !== fo) return false
    }
    if (filters.direction && (t.direction || '').toLowerCase() !== filters.direction.toLowerCase()) return false
    if (filters.symbol && !(t.symbol || '').toLowerCase().includes(filters.symbol.toLowerCase())) return false
    if (filters.session && (t.session || '').toLowerCase() !== filters.session.toLowerCase()) return false
    if (filters.timeframe && (t.timeframe || '') !== filters.timeframe) return false
    if (filters.confidence && (t.confidence || '').toLowerCase() !== filters.confidence.toLowerCase()) return false
    if (filters.rr && parseFloat(t.rr || 0) < parseFloat(filters.rr)) return false
    if (filters.rating && parseInt(t.rating || 0) < parseInt(filters.rating)) return false
    // Custom input filters
    if (filters.custom && Object.keys(filters.custom).length > 0) {
      const extra = getExtraData(t)
      for (const [inputId, filterValue] of Object.entries(filters.custom)) {
        if (!filterValue) continue
        const tradeValue = t[inputId] || extra[inputId] || ''
        if (typeof tradeValue === 'string' && typeof filterValue === 'string') {
          if (!tradeValue.toLowerCase().includes(filterValue.toLowerCase())) return false
        } else if (tradeValue !== filterValue) {
          return false
        }
      }
    }
    return true
  })
  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.outcome || filters.direction || filters.symbol || filters.session || filters.timeframe || filters.confidence || filters.rr || filters.rating || (filters.custom && Object.values(filters.custom).some(v => v))

  const wins = trades.filter(t => t.outcome === 'win').length
  const losses = trades.filter(t => t.outcome === 'loss').length
  const totalPnl = trades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0)
  const winrate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0
  const grossProfit = trades.filter(t => parseFloat(t.pnl) > 0).reduce((s, t) => s + parseFloat(t.pnl), 0)
  const grossLoss = Math.abs(trades.filter(t => parseFloat(t.pnl) < 0).reduce((s, t) => s + parseFloat(t.pnl), 0))
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '-'
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

  // Merge inputs from all accounts when viewing all journals
  const mergedInputsForAllJournals = (() => {
    if (!showCumulativeStats || allAccounts.length <= 1) return inputs

    // Start with current account inputs
    const merged = [...inputs]
    const existingIds = new Set(inputs.map(i => i.id))

    // Add custom inputs from other accounts
    allAccounts.forEach(acc => {
      if (acc.id === accountId || !acc.custom_inputs) return
      try {
        const accInputs = JSON.parse(acc.custom_inputs)
        accInputs.forEach(inp => {
          // Only add if it's a custom input (not default) and doesn't already exist
          if (!existingIds.has(inp.id) && !defaultInputs.find(d => d.id === inp.id)) {
            merged.push({ ...inp, enabled: true, hidden: false })
            existingIds.add(inp.id)
          }
        })
      } catch {}
    })
    return merged
  })()

  const enabledInputs = mergedInputsForAllJournals.filter(i => i.enabled && !i.hidden)
  const fixedInputs = enabledInputs.filter(i => ['symbol', 'outcome', 'pnl', 'riskPercent', 'rr', 'date'].includes(i.id))
  const customInputs = enabledInputs // All enabled inputs for dynamic form rendering

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
  const biggestWin = trades.filter(t => t.outcome === 'win').length > 0 ? Math.max(...trades.filter(t => t.outcome === 'win').map(t => parseFloat(t.pnl) || 0)) : 0
  const biggestLoss = trades.filter(t => t.outcome === 'loss').length > 0 ? Math.min(...trades.filter(t => t.outcome === 'loss').map(t => parseFloat(t.pnl) || 0)) : 0
  const expectancy = trades.length > 0 ? ((winrate / 100) * avgWin - ((100 - winrate) / 100) * avgLoss).toFixed(0) : '-'
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

  // Extended winrate statistics
  const longTrades = trades.filter(t => t.direction === 'long')
  const shortTrades = trades.filter(t => t.direction === 'short')
  const longWins = longTrades.filter(t => t.outcome === 'win').length
  const shortWins = shortTrades.filter(t => t.outcome === 'win').length
  const longWinrate = longTrades.length > 0 ? Math.round((longWins / longTrades.length) * 100) : 0
  const shortWinrate = shortTrades.length > 0 ? Math.round((shortWins / shortTrades.length) * 100) : 0
  const longPnl = longTrades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0)
  const shortPnl = shortTrades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0)

  // Winrate by pair
  const winrateByPair = (() => {
    const byPair = {}
    trades.forEach(t => {
      if (!byPair[t.symbol]) byPair[t.symbol] = { wins: 0, total: 0, pnl: 0 }
      byPair[t.symbol].total++
      byPair[t.symbol].pnl += parseFloat(t.pnl) || 0
      if (t.outcome === 'win') byPair[t.symbol].wins++
    })
    return Object.entries(byPair).map(([pair, data]) => ({
      pair,
      winrate: Math.round((data.wins / data.total) * 100),
      trades: data.total,
      pnl: data.pnl
    })).sort((a, b) => b.winrate - a.winrate)
  })()
  const bestPairWinrate = winrateByPair[0] || { pair: '-', winrate: 0 }
  const worstPairWinrate = winrateByPair[winrateByPair.length - 1] || { pair: '-', winrate: 0 }
  const bestPairPnl = [...winrateByPair].sort((a, b) => b.pnl - a.pnl)[0] || { pair: '-', pnl: 0 }
  const worstPairPnl = [...winrateByPair].sort((a, b) => a.pnl - b.pnl)[0] || { pair: '-', pnl: 0 }

  // Daily PnL data for net daily chart
  const dailyPnL = (() => {
    const byDay = {}
    trades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + (parseFloat(t.pnl) || 0) })
    return Object.entries(byDay).sort((a, b) => new Date(a[0]) - new Date(b[0])).map(([date, pnl]) => ({ date, pnl }))
  })()

  // Daily winrate (% of green days)
  const greenDays = dailyPnL.filter(d => d.pnl > 0).length
  const redDays = dailyPnL.filter(d => d.pnl < 0).length
  const dayWinrate = (greenDays + redDays) > 0 ? Math.round((greenDays / (greenDays + redDays)) * 100) : 0

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

  // Weekly growth %
  const weeklyGrowth = (() => {
    if (trades.length === 0) return '0'
    const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
    const firstDate = new Date(sorted[0].date)
    const lastDate = new Date(sorted[sorted.length - 1].date)
    const daysDiff = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)))
    const weeksDiff = Math.max(1, Math.ceil(daysDiff / 7))
    const totalGrowth = ((currentBalance / startingBalance) - 1) * 100
    return (totalGrowth / weeksDiff).toFixed(1)
  })()

  // Yearly growth %
  const yearlyGrowth = (() => {
    if (trades.length === 0) return '0'
    const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
    const firstDate = new Date(sorted[0].date)
    const lastDate = new Date(sorted[sorted.length - 1].date)
    const daysDiff = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)))
    const yearsDiff = Math.max(1, daysDiff / 365)
    const totalGrowth = ((currentBalance / startingBalance) - 1) * 100
    return (totalGrowth / yearsDiff).toFixed(1)
  })()

  // Distance from passing (for prop firm accounts with profit_target)
  const distanceFromTarget = (() => {
    if (!account?.profit_target) return null
    const targetAmount = startingBalance * (1 + account.profit_target / 100)
    const remaining = targetAmount - currentBalance
    const pctRemaining = ((targetAmount - currentBalance) / startingBalance) * 100
    return { remaining: Math.max(0, remaining), pct: Math.max(0, pctRemaining).toFixed(1), passed: currentBalance >= targetAmount }
  })()

  // Drawdown from peak
  const currentDrawdown = (() => {
    if (trades.length === 0) return { amount: 0, pct: '0' }
    const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
    let runningBalance = startingBalance
    let peak = startingBalance
    sorted.forEach(t => {
      runningBalance += parseFloat(t.pnl) || 0
      if (runningBalance > peak) peak = runningBalance
    })
    const dd = peak - currentBalance
    const ddPct = peak > 0 ? ((dd / peak) * 100).toFixed(1) : '0'
    return { amount: dd, pct: ddPct, peak }
  })()

  // Prop firm drawdown calculation
  const propFirmDrawdown = (() => {
    if (!account?.max_drawdown) return null
    const maxDDPct = parseFloat(account.max_drawdown) || 0
    const ddType = account.drawdown_type || 'static'
    const trailingMode = account.trailing_mode || 'eod'

    if (trades.length === 0) {
      const floor = startingBalance * (1 - maxDDPct / 100)
      return { floor, remaining: currentBalance - floor, usedPct: 0, breached: false, breachDate: null, breachBalance: null, floorHistory: [{ date: null, floor, balance: startingBalance }] }
    }

    const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
    let floor = startingBalance * (1 - maxDDPct / 100)
    let breached = false
    let breachDate = null
    let breachBalance = null
    const floorHistory = [{ date: null, floor, balance: startingBalance }]

    if (ddType === 'static') {
      // Static: floor never changes from initial calculation
      let runningBal = startingBalance
      sorted.forEach(t => {
        runningBal += parseFloat(t.pnl) || 0
        if (!breached && runningBal < floor) { breached = true; breachDate = t.date; breachBalance = runningBal }
        floorHistory.push({ date: t.date, floor, balance: runningBal })
      })
    } else {
      // Trailing drawdown
      if (trailingMode === 'eod') {
        // EOD: floor only updates at end of day
        const byDay = {}
        let runningBal = startingBalance
        sorted.forEach(t => {
          runningBal += parseFloat(t.pnl) || 0
          byDay[t.date] = runningBal
        })
        let peakEOD = startingBalance
        Object.entries(byDay).sort((a, b) => new Date(a[0]) - new Date(b[0])).forEach(([date, balance]) => {
          if (balance > peakEOD) { peakEOD = balance; floor = peakEOD * (1 - maxDDPct / 100) }
          if (!breached && balance < floor) { breached = true; breachDate = date; breachBalance = balance }
          floorHistory.push({ date, floor, balance })
        })
      } else {
        // Real-time: floor updates after each trade
        let runningBal = startingBalance
        let peak = startingBalance
        sorted.forEach(t => {
          runningBal += parseFloat(t.pnl) || 0
          if (runningBal > peak) { peak = runningBal; floor = peak * (1 - maxDDPct / 100) }
          if (!breached && runningBal < floor) { breached = true; breachDate = t.date; breachBalance = runningBal }
          floorHistory.push({ date: t.date, floor, balance: runningBal })
        })
      }
    }

    const maxAllowedDD = startingBalance * (maxDDPct / 100)
    const currentDDFromFloor = Math.max(0, floor - currentBalance)
    const usedPct = breached ? 100 : maxAllowedDD > 0 ? Math.min(100, (currentDDFromFloor / maxAllowedDD) * 100) : 0

    return { floor, remaining: currentBalance - floor, usedPct, breached, breachDate, breachBalance, floorHistory, ddType, trailingMode }
  })()

  // New Daily Drawdown calculation (orange)
  const dailyDdStats = (() => {
    if (!account?.daily_dd_enabled) return null
    const pct = parseFloat(account.daily_dd_pct)
    if (isNaN(pct) || pct <= 0) return null

    // Get reset time settings
    const dailyDdResetTime = account?.daily_dd_reset_time || '00:00'
    const resetParts = dailyDdResetTime.split(':')
    const resetHour = parseInt(resetParts[0]) || 0
    const resetMin = parseInt(resetParts[1]) || 0

    // Helper to get trading day for a given datetime based on reset time
    const getTradingDay = (date, time) => {
      if (!date) return null
      const tradeDateTime = new Date(`${date}T${time || '12:00'}`)
      if (isNaN(tradeDateTime.getTime())) return new Date(date).toDateString()
      const tradeHour = tradeDateTime.getHours()
      const tradeMinute = tradeDateTime.getMinutes()
      if (tradeHour < resetHour || (tradeHour === resetHour && tradeMinute < resetMin)) {
        const prevDay = new Date(tradeDateTime)
        prevDay.setDate(prevDay.getDate() - 1)
        return prevDay.toDateString()
      }
      return tradeDateTime.toDateString()
    }

    // Determine current trading day based on reset time
    const now = new Date()
    const currentTradingDay = getTradingDay(now.toISOString().split('T')[0], `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)

    // Get today's starting balance (previous trading day close or starting balance)
    const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
    let todayStart = startingBalance
    let runningBal = startingBalance
    let prevDayClose = startingBalance

    sorted.forEach(t => {
      const tradingDay = getTradingDay(t.date, t.time)
      if (tradingDay !== currentTradingDay) {
        runningBal += parseFloat(t.pnl) || 0
        prevDayClose = runningBal
      }
    })
    todayStart = prevDayClose

    const floor = todayStart * (1 - pct / 100)
    const remaining = currentBalance - floor
    const breached = currentBalance < floor
    const maxAllowed = todayStart * (pct / 100)
    const usedPct = breached ? 100 : maxAllowed > 0 ? Math.min(100, ((todayStart - currentBalance) / maxAllowed) * 100) : 0

    return { floor, remaining, breached, todayStart, pct, usedPct: Math.max(0, usedPct) }
  })()

  // New Max Drawdown calculation (red)
  const maxDdStats = (() => {
    if (!account?.max_dd_enabled) return null
    const pct = parseFloat(account.max_dd_pct)
    if (isNaN(pct) || pct <= 0) return null

    const ddType = account.max_dd_type || 'static'
    const stopsAt = account.max_dd_trailing_stops_at || 'never'
    const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))

    let floor = startingBalance * (1 - pct / 100)
    let breached = false
    let breachDate = null

    if (ddType === 'static') {
      // Static: floor never changes
      let runningBal = startingBalance
      sorted.forEach(t => {
        runningBal += parseFloat(t.pnl) || 0
        if (!breached && runningBal < floor) { breached = true; breachDate = t.date }
      })
    } else {
      // Trailing: floor moves up with peak
      let peak = startingBalance
      let runningBal = startingBalance
      sorted.forEach(t => {
        runningBal += parseFloat(t.pnl) || 0
        if (runningBal > peak) {
          peak = runningBal
          const newFloor = peak * (1 - pct / 100)
          if (stopsAt === 'initial' && newFloor >= startingBalance) {
            floor = startingBalance
          } else if (stopsAt === 'buffer') {
            const buffer = startingBalance * 1.05
            floor = newFloor >= buffer ? buffer : newFloor
          } else {
            floor = newFloor
          }
        }
        if (!breached && runningBal < floor) { breached = true; breachDate = t.date }
      })
    }

    const remaining = currentBalance - floor
    const maxAllowed = startingBalance * (pct / 100)
    const usedPct = breached ? 100 : maxAllowed > 0 ? Math.min(100, ((floor + maxAllowed - currentBalance) / maxAllowed) * 100) : 0

    return { floor, remaining, breached, breachDate, pct, ddType, stopsAt, usedPct: Math.max(0, usedPct) }
  })()

  // Consistency rule check
  const consistencyCheck = (() => {
    if (!account?.consistency_enabled) return null
    const pct = parseFloat(account.consistency_pct) || 30
    const profitTotal = Math.max(0, totalPnl)
    if (profitTotal === 0) return { passed: true, maxAllowed: 0, violations: [], pct }

    const maxAllowedPerDay = profitTotal * (pct / 100)
    const dailyPnL = {}
    trades.forEach(t => { dailyPnL[t.date] = (dailyPnL[t.date] || 0) + (parseFloat(t.pnl) || 0) })

    const violations = Object.entries(dailyPnL)
      .filter(([_, pnl]) => pnl > maxAllowedPerDay)
      .map(([date, pnl]) => ({ date, pnl, limit: maxAllowedPerDay }))

    return { passed: violations.length === 0, maxAllowed: maxAllowedPerDay, violations, pct }
  })()

  // Challenge status
  const challengeStatus = (() => {
    if (!account?.profit_target && !account?.max_drawdown) return null
    const ddBreached = propFirmDrawdown?.breached
    const consistencyFailed = consistencyCheck && !consistencyCheck.passed
    const targetReached = distanceFromTarget?.passed

    if (ddBreached) return { status: 'FAILED', reason: 'Drawdown breached', color: '#ef4444' }
    if (consistencyFailed) return { status: 'FAILED', reason: 'Consistency rule violated', color: '#ef4444' }
    if (targetReached) return { status: 'PASSED', reason: 'Profit target reached', color: '#22c55e' }
    return { status: 'IN PROGRESS', reason: 'Challenge ongoing', color: '#f59e0b' }
  })()

  // Additional stats calculations
  const peakBalance = currentDrawdown.peak || startingBalance
  const uniqueSymbols = [...new Set(trades.map(t => t.symbol))].length
  const tradesThisWeek = trades.filter(t => {
    const d = new Date(t.date)
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return d >= weekAgo
  }).length

  // Recovery factor (net profit / max drawdown)
  const recoveryFactor = currentDrawdown.amount > 0 ? (totalPnl / currentDrawdown.amount).toFixed(2) : totalPnl > 0 ? '∞' : '-'

  // Win amount % (what % of total volume is wins)
  const totalVolume = grossProfit + grossLoss
  const winAmountPct = totalVolume > 0 ? Math.round((grossProfit / totalVolume) * 100) : 0

  // Avg trades per week
  const avgTradesPerWeek = (() => {
    if (trades.length === 0) return '0'
    const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
    const firstDate = new Date(sorted[0].date)
    const lastDate = new Date(sorted[sorted.length - 1].date)
    const daysDiff = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)))
    const weeksDiff = Math.max(1, daysDiff / 7)
    return (trades.length / weeksDiff).toFixed(1)
  })()

  // Highest and lowest RR trades
  const tradesWithRR = trades.filter(t => t.rr && !isNaN(parseFloat(t.rr)))
  const highestRR = tradesWithRR.length > 0 ? Math.max(...tradesWithRR.map(t => parseFloat(t.rr))).toFixed(1) : '-'
  const lowestRR = tradesWithRR.length > 0 ? Math.min(...tradesWithRR.map(t => parseFloat(t.rr))).toFixed(1) : '-'

  // Best direction
  const bestDirection = longPnl >= shortPnl ? 'Long' : 'Short'
  const longPF = (() => {
    const lWins = longTrades.filter(t => t.outcome === 'win').reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0)
    const lLosses = Math.abs(longTrades.filter(t => t.outcome === 'loss').reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0))
    return lLosses > 0 ? (lWins / lLosses).toFixed(2) : lWins > 0 ? '∞' : '-'
  })()
  const shortPF = (() => {
    const sWins = shortTrades.filter(t => t.outcome === 'win').reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0)
    const sLosses = Math.abs(shortTrades.filter(t => t.outcome === 'loss').reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0))
    return sLosses > 0 ? (sWins / sLosses).toFixed(2) : sWins > 0 ? '∞' : '-'
  })()

  // Average win/loss streak
  const avgWinStreak = (() => {
    let streaks = [], current = 0
    trades.forEach(t => {
      if (t.outcome === 'win') { current++; }
      else if (current > 0) { streaks.push(current); current = 0 }
    })
    if (current > 0) streaks.push(current)
    return streaks.length > 0 ? (streaks.reduce((a, b) => a + b, 0) / streaks.length).toFixed(1) : '0'
  })()

  // BE days (days with 0 P&L)
  const beDays = dailyPnL.filter(d => d.pnl === 0).length

  // Active days % (trading days / calendar days)
  const activeDaysPct = (() => {
    if (trades.length === 0) return 0
    const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
    const firstDate = new Date(sorted[0].date)
    const lastDate = new Date(sorted[sorted.length - 1].date)
    const calendarDays = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)))
    const tradingDays = new Set(trades.map(t => t.date)).size
    return Math.round((tradingDays / calendarDays) * 100)
  })()

  // Peak to current
  const peakToCurrent = peakBalance > 0 ? ((currentBalance / peakBalance - 1) * 100).toFixed(1) : '0'

  // Images uploaded count
  const tradesWithImages = trades.filter(t => {
    const extra = getExtraData(t)
    const img = extra.image || extra.Image
    return img && img.length > 0
  }).length

  const tabTitles = { trades: 'JOURNAL AREA', statistics: 'STATISTICS AREA', notes: 'NOTES AREA' }
  const tabDescriptions = {
    trades: 'Log and manage all your trades. Track entries, exits, PnL, and custom metrics. Review your trading history and analyze individual trade performance.',
    statistics: 'Comprehensive statistics dashboard with equity curves, winrate breakdowns, profit factors, and performance analysis by pair, session, direction, and more.',
    notes: 'Document your trading journey with daily reflections, weekly reviews, and custom notes. Track your mindset, lessons learned, and market observations.'
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
        <div style={{ color: '#999', marginBottom: '4px' }}>{data.date}</div>
        <div style={{ fontWeight: 700, fontSize: '16px', color: '#fff' }}>${data.value?.toLocaleString()}</div>
        {data.extra && <div style={{ color: data.extra.color || '#22c55e', marginTop: '4px' }}>{data.extra.text}</div>}
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', background: '#0a0a0f', overflow: activeTab === 'trades' ? 'hidden' : 'auto' }} onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}>
      {/* Global scrollbar styles */}
      <style>{`
        select option { background: #141418; color: #fff; }
        select option:hover { background: #22c55e; }
        select option:checked { background: #1a1a22; }
      `}</style>
      {/* Global Tooltip */}
      <Tooltip data={tooltip} />

      {/* FIXED HEADER - same structure as dashboard */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '4px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0f', borderBottom: '1px solid #1a1a22' }}>
        <a href="/" style={{ fontSize: isMobile ? '28px' : '42px', fontWeight: 700, textDecoration: 'none', letterSpacing: '-0.5px' }}><span style={{ color: '#22c55e' }}>TRADE</span><span style={{ color: '#fff' }}>SAVE</span><span style={{ color: '#22c55e' }}>+</span></a>
        {!isMobile && (
          <>
            <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
              <span style={{ fontSize: '32px', fontWeight: 700, color: '#fff' }}>{tabTitles[activeTab]}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <a href="/dashboard" style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '14px', fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>← Dashboard</a>
              <a href="/settings" style={{ padding: '10px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', textDecoration: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Settings">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </a>
            </div>
          </>
        )}
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '16px', cursor: 'pointer' }}>☰</button>
            <a href="/dashboard" style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '12px', textDecoration: 'none', cursor: 'pointer' }}>← Dashboard</a>
            <a href="/settings" style={{ padding: '8px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', textDecoration: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Settings">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </a>
          </div>
        )}
      </header>

      {/* Mobile Menu Overlay */}
      {isMobile && showMobileMenu && (
        <div style={{ position: 'fixed', top: '53px', left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', zIndex: 100, padding: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
          <button onClick={() => { setTradeForm({ date: new Date().toISOString().split('T')[0] }); setEditingTrade(null); setShowAddTrade(true) }} style={{ width: '100%', marginTop: '12px', padding: '16px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '16px', cursor: 'pointer' }}>+ LOG NEW TRADE</button>
        </div>
      )}

      {/* FIXED SUBHEADER - starts at sidebar edge */}
      {!isMobile && (
        <div style={{ position: 'fixed', top: '60px', left: '180px', right: 0, zIndex: 46, padding: '18px 12px 13px 12px', background: '#0a0a0f', borderBottom: '1px solid #1a1a22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '28px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{account?.name}</span>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {activeTab === 'trades' && trades.length > 0 && !selectMode && (
                <button onClick={() => setSelectMode(true)} style={{ height: '36px', margin: 0, padding: '0 20px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>Select</button>
              )}
              {activeTab === 'trades' && selectMode && (
                <>
                  <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600, lineHeight: 1, margin: 0 }}>{selectedTrades.size} selected</span>
                  <button onClick={() => { const allSelected = filteredTrades.every(t => selectedTrades.has(t.id)); if (allSelected) { const newSet = new Set(selectedTrades); filteredTrades.forEach(t => newSet.delete(t.id)); setSelectedTrades(newSet) } else { const newSet = new Set(selectedTrades); filteredTrades.forEach(t => newSet.add(t.id)); setSelectedTrades(newSet) } }} style={{ height: '28px', margin: 0, padding: '0 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '8px', color: '#22c55e', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>{filteredTrades.every(t => selectedTrades.has(t.id)) && filteredTrades.length > 0 ? 'Deselect All' : 'Select All'}</button>
                  {selectedTrades.size > 0 && <button onClick={() => { setViewingSelectedStats(true); setActiveTab('statistics') }} style={{ height: '28px', margin: 0, padding: '0 16px', background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e', borderRadius: '8px', color: '#22c55e', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>View Stats</button>}
                  {selectedTrades.size > 0 && <button onClick={() => setDeleteSelectedConfirm(true)} style={{ height: '28px', margin: 0, padding: '0 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>Delete</button>}
                  <button onClick={exitSelectMode} style={{ height: '28px', margin: 0, padding: '0 16px', background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '8px', color: '#666', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>Cancel</button>
                </>
              )}
              {!selectMode && (
                <button onClick={() => { setDraftFilters({...filters, quickSelect: ''}); setShowFilters(true) }} style={{ height: '36px', margin: 0, padding: '0 20px', background: hasActiveFilters ? 'rgba(34,197,94,0.15)' : 'transparent', border: hasActiveFilters ? '1px solid #22c55e' : '1px solid #2a2a35', borderRadius: '6px', color: hasActiveFilters ? '#22c55e' : '#fff', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', lineHeight: 1 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                  Filters{hasActiveFilters && ` (${Object.values(filters).filter(Boolean).length})`}
                </button>
              )}
              {activeTab === 'trades' && !selectMode && (
                <>
                  <button onClick={() => setShowEditInputs(true)} style={{ height: '36px', margin: 0, padding: '0 20px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>Edit Columns</button>
                  <button onClick={() => { setTradeForm({ date: new Date().toISOString().split('T')[0] }); setEditingTrade(null); setShowAddTrade(true) }} style={{ height: '36px', margin: 0, padding: '0 20px', background: 'transparent', border: '2px dashed #22c55e', borderRadius: '6px', color: '#22c55e', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', lineHeight: 1 }} onMouseEnter={e => { e.currentTarget.style.borderColor = '#4ade80'; e.currentTarget.style.background = 'rgba(34, 197, 94, 0.05)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.background = 'transparent' }}>+ LOG TRADE</button>
                </>
              )}
          </div>
        </div>
      )}

      {/* Mobile Subheader */}
      {isMobile && (
        <div style={{ position: 'fixed', top: '53px', left: 0, right: 0, zIndex: 40, padding: '10px 16px', background: '#0a0a0f', borderBottom: '1px solid #1a1a22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>{account?.name}</span>
          <button onClick={() => { setTradeForm({ date: new Date().toISOString().split('T')[0] }); setEditingTrade(null); setShowAddTrade(true) }} style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer', boxShadow: '0 0 15px rgba(147,51,234,0.5)' }}>+ ADD</button>
        </div>
      )}

      {/* FIXED SIDEBAR - desktop only, starts under header */}
      {!isMobile && (
        <div style={{ position: 'fixed', top: '60px', left: 0, bottom: 0, width: '180px', padding: '12px', background: '#0a0a0f', zIndex: 45, display: 'flex', flexDirection: 'column', borderRight: '1px solid #1a1a22' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
          {['trades', 'statistics', 'notes'].map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); if (tab === 'statistics') setHasNewInputs(false) }}
              style={{
                width: '100%', padding: '12px',
                background: activeTab === tab ? 'transparent' : 'transparent',
                border: activeTab === tab ? '1px solid #22c55e' : '1px solid #2a2a35',
                borderRadius: '8px', color: activeTab === tab ? '#22c55e' : '#888',
                fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', cursor: 'pointer', textAlign: 'center'
              }}
            >
              {tab}
            </button>
          ))}

          {/* Stats View Selector - hide on notes tab since notes are user-level */}
          {activeTab !== 'notes' && (
          <div style={{ marginBottom: '8px', padding: '10px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px' }}>
            <div style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px', fontWeight: 600 }}>Viewing {activeTab === 'trades' ? 'Trades' : 'Stats'} For</div>

              {/* Show "Selected Trades" indicator when viewing selected */}
              {viewingSelectedStats && (
                <div style={{
                  padding: '10px 12px',
                  marginBottom: '6px',
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.5)',
                  borderRadius: '6px',
                  boxShadow: '0 0 12px rgba(34,197,94,0.2), inset 0 0 20px rgba(34,197,94,0.05)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#22c55e' }}>Selected Trades</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#888', marginTop: '4px', marginLeft: '16px' }}>{selectedTrades.size} trades selected</div>
                  <button
                    onClick={() => setViewingSelectedStats(false)}
                    style={{ marginTop: '8px', width: '100%', padding: '6px', background: 'transparent', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '4px', color: '#22c55e', fontSize: '10px', cursor: 'pointer' }}
                  >
                    View All Stats
                  </button>
                </div>
              )}

              {/* Journal toggles - show when not viewing selected */}
              {!viewingSelectedStats && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <button
                    onClick={() => { setViewMode('this'); setShowCumulativeStats(false); setShowJournalDropdown(false) }}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: viewMode === 'this' ? '#22c55e' : 'transparent',
                      border: viewMode === 'this' ? 'none' : '1px solid #1a1a22',
                      borderRadius: '6px',
                      color: viewMode === 'this' ? '#fff' : '#666',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: viewMode === 'this' ? '0 0 12px rgba(34,197,94,0.5), 0 0 24px rgba(34,197,94,0.3)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: viewMode === 'this' ? '#fff' : '#444' }} />
                      This Journal
                    </div>
                  </button>
                  {allAccounts.length > 1 && (
                    <>
                      <button
                        onClick={() => { setViewMode('all'); setShowCumulativeStats(true); setShowJournalDropdown(false) }}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          background: viewMode === 'all' ? '#3b82f6' : 'transparent',
                          border: viewMode === 'all' ? 'none' : '1px solid #1a1a22',
                          borderRadius: '6px',
                          color: viewMode === 'all' ? '#fff' : '#666',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textAlign: 'left',
                          boxShadow: viewMode === 'all' ? '0 0 12px rgba(59,130,246,0.5), 0 0 24px rgba(59,130,246,0.3)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: viewMode === 'all' ? '#fff' : '#444' }} />
                          All Journals
                        </div>
                      </button>
                      <div style={{ position: 'relative' }} data-journal-dropdown>
                        <button
                          onClick={() => setShowJournalDropdown(!showJournalDropdown)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            background: viewMode === 'selected' ? '#ef4444' : 'transparent',
                            border: viewMode === 'selected' ? 'none' : '1px solid #1a1a22',
                            borderRadius: '6px',
                            color: viewMode === 'selected' ? '#fff' : '#666',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textAlign: 'left',
                            boxShadow: viewMode === 'selected' ? '0 0 12px rgba(239,68,68,0.5), 0 0 24px rgba(239,68,68,0.3)' : 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: viewMode === 'selected' ? '#fff' : '#444' }} />
                              Selected{selectedJournalIds.size > 0 ? ` (${selectedJournalIds.size})` : ''}
                            </div>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={viewMode === 'selected' ? '#fff' : '#666'} strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                          </div>
                        </button>
                        {showJournalDropdown && (
                          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px', zIndex: 100, maxHeight: '200px', overflowY: 'auto' }}>
                            {allAccounts.map(acc => (
                              <label key={acc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #1a1a22' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedJournalIds.has(acc.id)}
                                  onChange={() => {
                                    const newSet = new Set(selectedJournalIds)
                                    if (newSet.has(acc.id)) newSet.delete(acc.id)
                                    else newSet.add(acc.id)
                                    setSelectedJournalIds(newSet)
                                    if (newSet.size > 0) { setViewMode('selected'); setShowCumulativeStats(true) }
                                    else { setViewMode('this'); setShowCumulativeStats(false) }
                                  }}
                                  style={{ accentColor: '#ef4444' }}
                                />
                                <span style={{ fontSize: '11px', color: acc.id === accountId ? '#22c55e' : '#fff' }}>{acc.name}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              </div>
          )}

        </div>

        {/* Slideshow Button */}
        {getTradesWithImages().length > 0 && (
          <button onClick={() => { setSlideshowIndex(0); setSlideshowMode(true) }} style={{ width: '100%', padding: '10px', marginTop: '12px', marginBottom: '12px', background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '6px', color: '#888', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Slideshow ({getSlideshowImages().length})
          </button>
        )}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Journal Select */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, marginBottom: '8px' }}>Journal Select</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: allAccounts.length > 2 ? '120px' : 'none', overflowY: allAccounts.length > 2 ? 'auto' : 'visible' }}>
            {allAccounts.map((acc) => {
              const isSelected = acc.id === accountId
              const accTrades = allAccountsTrades[acc.id] || []
              const totalPnl = accTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
              const currentBalance = (parseFloat(acc.starting_balance) || 0) + totalPnl
              return (
                <a
                  key={acc.id}
                  href={`/account/${acc.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: isSelected ? 'rgba(34,197,94,0.1)' : '#0a0a0f',
                    border: `1px solid ${isSelected ? 'rgba(34,197,94,0.5)' : '#1a1a22'}`,
                    borderRadius: '8px',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 0 12px rgba(34,197,94,0.2), inset 0 0 20px rgba(34,197,94,0.05)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: isSelected ? '#22c55e' : '#444',
                      boxShadow: isSelected ? '0 0 6px #22c55e' : 'none',
                      flexShrink: 0
                    }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: isSelected ? '#22c55e' : '#888' }}>{acc.name}</span>
                  </div>
                  <span style={{ fontSize: '11px', color: isSelected ? '#22c55e' : '#666' }}>${Math.round(currentBalance).toLocaleString()}</span>
                </a>
              )
            })}
          </div>
        </div>
        <div style={{ padding: '12px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px' }}>
          <div style={{ fontSize: '11px', color: '#888', lineHeight: '1.4' }}>{tabDescriptions[activeTab]}</div>
        </div>
      </div>
      )}

      {/* MAIN CONTENT */}
      <div style={{ marginLeft: isMobile ? 0 : '180px', marginTop: isMobile ? '100px' : '131px', padding: isMobile ? '12px' : '0' }}>

        {/* TRADES TAB */}
        {activeTab === 'trades' && (
          <div style={{ position: 'relative', height: 'calc(100vh - 131px)' }}>
            {/* Green glow from bottom */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(to top, rgba(34,197,94,0.03) 0%, rgba(34,197,94,0.01) 50%, transparent 100%)', pointerEvents: 'none', zIndex: 1 }} />
            {filteredTrades.length === 0 && trades.length > 0 ? (
              <div style={{ padding: isMobile ? '40px 20px' : '60px', textAlign: 'center' }}>
                <div style={{ color: '#999', fontSize: '15px', marginBottom: '12px' }}>No trades match your filters.</div>
                <button onClick={() => setFilters({ dateFrom: '', dateTo: '', outcome: '', direction: '', symbol: '', session: '', timeframe: '', confidence: '', rr: '', rating: '', custom: {} })} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #22c55e', borderRadius: '8px', color: '#22c55e', fontSize: '13px', cursor: 'pointer' }}>Clear Filters</button>
              </div>
            ) : (
              <>
              <div
                ref={tradesScrollRef}
                style={{
                  position: 'absolute',
                  top: 8,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  overflowX: 'auto',
                  overflowY: 'auto',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#2a2a35 #0a0a0f'
                }}>
                <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#0a0a0f', boxShadow: '0 1px 0 #1a1a22' }}>
                    <tr>
                      {selectMode && <th style={{ padding: '3px 6px 11px 6px', width: '32px', minWidth: '32px', borderBottom: '1px solid #1a1a22', background: '#0a0a0f' }}><input type="checkbox" checked={filteredTrades.length > 0 && filteredTrades.every(t => selectedTrades.has(t.id))} onChange={() => { const allSelected = filteredTrades.every(t => selectedTrades.has(t.id)); if (allSelected) { const newSet = new Set(selectedTrades); filteredTrades.forEach(t => newSet.delete(t.id)); setSelectedTrades(newSet) } else { const newSet = new Set(selectedTrades); filteredTrades.forEach(t => newSet.add(t.id)); setSelectedTrades(newSet) } }} style={{ width: '14px', height: '14px', accentColor: '#22c55e', cursor: 'pointer' }} /></th>}
                      {enabledInputs.map((inp, i) => (
                        <th
                          key={inp.id}
                          draggable
                          onDragStart={() => handleColumnDragStart(inp.id)}
                          onDragOver={(e) => handleColumnDragOver(e, inp.id)}
                          onDrop={() => handleColumnDrop(inp.id)}
                          onDragEnd={() => { setDraggedColumn(null); setDragOverColumn(null) }}
                          style={{
                            padding: isMobile ? '3px 8px 11px 8px' : '3px 12px 11px 12px',
                            textAlign: 'center',
                            color: dragOverColumn === inp.id ? '#22c55e' : '#999',
                            fontSize: isMobile ? '11px' : '12px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            borderBottom: '1px solid #1a1a22',
                            background: dragOverColumn === inp.id ? 'rgba(34,197,94,0.1)' : '#0a0a0f',
                            minWidth: '100px',
                            maxWidth: '150px',
                            cursor: 'grab',
                            userSelect: 'none',
                            opacity: draggedColumn === inp.id ? 0.5 : 1,
                            transition: 'background 0.15s, color 0.15s',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <span title={inp.label}>{inp.label}</span>
                        </th>
                      ))}
                      <th style={{ padding: '3px 12px 11px 12px', textAlign: 'center', color: '#999', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid #1a1a22', background: '#0a0a0f', minWidth: '70px' }}>Placed</th>
                      <th style={{ padding: '3px 12px 11px 12px', textAlign: 'center', color: '#999', fontSize: '12px', fontWeight: 600, borderBottom: '1px solid #1a1a22', background: '#0a0a0f', minWidth: '70px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.map((trade) => {
                      const extra = getExtraData(trade)
                      const pnlValue = parseFloat(trade.pnl) || 0
                      const noteContent = trade.notes || extra.notes || ''
                      return (
                        <tr key={trade.id} onClick={() => { if (selectMode) { toggleTradeSelection(trade.id) } else { setTradeImageIndex(0); setViewingTrade(trade) }}} style={{ borderBottom: '1px solid #141418', background: selectMode && selectedTrades.has(trade.id) ? 'rgba(34,197,94,0.06)' : 'transparent', cursor: 'pointer', transition: 'all 0.15s ease' }} onMouseEnter={e => { if (!selectMode || !selectedTrades.has(trade.id)) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.transform = 'translateX(2px)' }}} onMouseLeave={e => { e.currentTarget.style.background = selectMode && selectedTrades.has(trade.id) ? 'rgba(34,197,94,0.06)' : 'transparent'; e.currentTarget.style.transform = 'translateX(0)' }}>
                          {selectMode && <td style={{ padding: '14px 6px', width: '32px', minWidth: '32px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedTrades.has(trade.id)} onChange={() => toggleTradeSelection(trade.id)} style={{ width: '14px', height: '14px', accentColor: '#22c55e', cursor: 'pointer' }} /></td>}
                          {enabledInputs.map(inp => (
                            <td key={inp.id} style={{ padding: '14px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#fff', verticalAlign: 'middle', minWidth: '100px' }}>
                              {inp.id === 'symbol' ? (
                                <span style={{ fontWeight: 600, fontSize: '16px', color: '#fff', maxWidth: '120px', display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={trade.symbol}>{trade.symbol}</span>
                              ) : inp.id === 'outcome' ? (
                                (() => {
                                  const styles = findOptStyles(inp.options, trade.outcome)
                                  return (
                                    <span style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600, background: styles.bgColor || 'transparent', color: styles.textColor, border: styles.borderColor ? `1px solid ${styles.borderColor}` : 'none' }}>
                                      {trade.outcome?.toUpperCase()}
                                    </span>
                                  )
                                })()
                              ) : inp.id === 'pnl' ? (
                                <span style={{ fontWeight: 600, fontSize: '16px', color: pnlValue >= 0 ? '#22c55e' : '#ef4444' }}>{pnlValue >= 0 ? '+' : ''}${formatPnl(pnlValue)}</span>
                              ) : inp.id === 'riskPercent' ? (
                                <span style={{ fontWeight: 600, color: '#fff' }}>{extra.riskPercent || '1'}%</span>
                              ) : inp.id === 'rr' ? (
                                <span style={{ fontWeight: 600, color: '#fff' }}>{trade.rr || '-'}</span>
                              ) : inp.id === 'date' ? (
                                <span style={{ fontWeight: 600, color: '#fff' }}>{new Date(trade.date).toLocaleDateString()}</span>
                              ) : inp.id === 'time' ? (
                                <span style={{ fontWeight: 600, color: '#fff' }}>{extra.time || '-'}</span>
                              ) : inp.type === 'rating' ? (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1px' }}>
                                  {[1,2,3,4,5].map(star => {
                                    const rating = parseFloat(extra[inp.id] || 0)
                                    const isFullStar = rating >= star
                                    const isHalfStar = rating >= star - 0.5 && rating < star
                                    return (
                                      <div key={star} style={{ position: 'relative', width: '14px', height: '14px' }}>
                                        <span style={{ position: 'absolute', color: '#2a2a35', fontSize: '14px', lineHeight: 1 }}>★</span>
                                        {isHalfStar && <span style={{ position: 'absolute', color: '#22c55e', fontSize: '14px', lineHeight: 1, clipPath: 'inset(0 50% 0 0)' }}>★</span>}
                                        {isFullStar && <span style={{ position: 'absolute', color: '#22c55e', fontSize: '14px', lineHeight: 1 }}>★</span>}
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : inp.id === 'image' && (extra[inp.id] || extra[inp.label]) ? (
                                <button onClick={(e) => { e.stopPropagation(); setShowExpandedImage(extra[inp.id] || extra[inp.label]) }} style={{ width: '50px', height: '50px', background: '#1a1a22', borderRadius: '6px', border: '1px solid #2a2a35', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', overflow: 'hidden', padding: 0 }}>
                                  <img src={extra[inp.id] || extra[inp.label]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'auto' }} onError={e => { e.target.style.display = 'none' }} />
                                </button>
                              ) : inp.id === 'image' ? (
                                <span style={{ color: '#444' }}>-</span>
                              ) : inp.id === 'notes' ? (
                                noteContent ? (
                                  <div onClick={(e) => { e.stopPropagation(); setShowExpandedNote(noteContent) }} style={{ cursor: 'pointer', color: '#fff', fontSize: '14px', fontWeight: 600, maxWidth: '160px', margin: '0 auto', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textAlign: 'left' }}>{noteContent}</div>
                                ) : <span style={{ color: '#444' }}>-</span>
                              ) : inp.type === 'number' ? (
                                <span style={{ fontWeight: 600, color: '#fff' }}>{extra[inp.id] || '-'}</span>
                              ) : inp.type === 'select' ? (
                                (() => {
                                  const val = inp.id === 'direction' ? trade.direction : extra[inp.id]
                                  const styles = findOptStyles(inp.options, val)
                                  return val ? (
                                    <span style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '14px', fontWeight: 600, background: styles.bgColor || 'transparent', color: styles.textColor, border: styles.borderColor ? `1px solid ${styles.borderColor}` : 'none' }}>
                                      {inp.id === 'direction' ? trade.direction?.toUpperCase() : val}
                                    </span>
                                  ) : <span style={{ color: '#444' }}>-</span>
                                })()
                              ) : (
                                <span style={{ fontWeight: 600, color: '#fff' }}>
                                  {extra[inp.id] || '-'}
                                </span>
                              )}
                            </td>
                          ))}
                          <td style={{ padding: '14px 12px', textAlign: 'center', minWidth: '70px', color: '#666', fontSize: '13px', fontWeight: 500 }}>
                            {getDaysAgo(trade.date)}
                          </td>
                          <td style={{ padding: '14px 12px', textAlign: 'center', minWidth: '70px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                              <button onClick={(e) => { e.stopPropagation(); startEditTrade(trade) }} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px', padding: '4px' }} title="Edit trade">✎</button>
                              <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(trade.id) }} style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', fontSize: '18px', padding: '4px' }} title="Delete trade">×</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        )}

        {/* Delete Trade Confirmation Modal */}
        {deleteConfirmId && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setDeleteConfirmId(null)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '340px' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#ef4444' }}>Delete Trade?</h3>
              <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setDeleteConfirmId(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '8px', color: '#888', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Cancel</button>
                <button
                  onClick={() => { deleteTrade(deleteConfirmId); setDeleteConfirmId(null) }}
                  style={{ flex: 1, padding: '12px', background: '#ef4444', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Selected Trades Confirmation Modal */}
        {deleteSelectedConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setDeleteSelectedConfirm(false)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '340px' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#ef4444' }}>Delete {selectedTrades.size} Trade{selectedTrades.size > 1 ? 's' : ''}?</h3>
              <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setDeleteSelectedConfirm(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '8px', color: '#888', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Cancel</button>
                <button
                  onClick={() => { deleteSelectedTrades(); setDeleteSelectedConfirm(false) }}
                  style={{ flex: 1, padding: '12px', background: '#ef4444', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Trade Overview Modal */}
        {viewingTrade && (() => {
          const trade = viewingTrade
          const extra = getExtraData(trade)
          const pnlValue = parseFloat(trade.pnl) || 0
          const noteContent = trade.notes || extra.notes || ''
          // Support both single image and array of images
          const tradeImages = extra.images && extra.images.length > 0 ? extra.images : (extra.image || extra.Image ? [extra.image || extra.Image] : [])
          const outcomeInput = inputs.find(i => i.id === 'outcome')
          const outcomeStyles = findOptStyles(outcomeInput?.options, trade.outcome)
          const directionInput = inputs.find(i => i.id === 'direction')
          const directionStyles = findOptStyles(directionInput?.options, trade.direction)

          // Build all fields array for 3-column grid
          const allFields = []
          allFields.push({ label: 'P&L', value: <span style={{ color: pnlValue >= 0 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{pnlValue >= 0 ? '+' : ''}${formatPnl(pnlValue)}</span> })
          allFields.push({ label: 'Outcome', value: <span style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, background: outcomeStyles.bgColor || 'transparent', color: outcomeStyles.textColor, border: outcomeStyles.borderColor ? `1px solid ${outcomeStyles.borderColor}` : 'none' }}>{trade.outcome?.toUpperCase() || '-'}</span> })
          allFields.push({ label: 'Date', value: new Date(trade.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) })
          if (extra.time) allFields.push({ label: 'Time', value: extra.time })
          if (trade.rr) allFields.push({ label: 'Risk:Reward', value: `${trade.rr}R` })
          if (extra.riskPercent) allFields.push({ label: 'Risk %', value: `${extra.riskPercent}%` })
          if (extra.session) allFields.push({ label: 'Session', value: extra.session })
          if (extra.timeframe) allFields.push({ label: 'Timeframe', value: extra.timeframe })
          if (extra.confidence) allFields.push({ label: 'Confidence', value: extra.confidence })
          if (extra.rating) allFields.push({ label: 'Rating', value: (
            <div style={{ display: 'flex', gap: '2px' }}>
              {[1,2,3,4,5].map(star => {
                const rating = parseFloat(extra.rating || 0)
                const isFullStar = rating >= star
                const isHalfStar = rating >= star - 0.5 && rating < star
                return (
                  <div key={star} style={{ position: 'relative', width: '16px', height: '16px' }}>
                    <span style={{ position: 'absolute', color: '#2a2a35', fontSize: '16px', lineHeight: 1 }}>★</span>
                    {isHalfStar && <span style={{ position: 'absolute', color: '#22c55e', fontSize: '16px', lineHeight: 1, clipPath: 'inset(0 50% 0 0)' }}>★</span>}
                    {isFullStar && <span style={{ position: 'absolute', color: '#22c55e', fontSize: '16px', lineHeight: 1 }}>★</span>}
                  </div>
                )
              })}
            </div>
          )})
          // Add custom fields
          enabledInputs.filter(inp => !['symbol', 'outcome', 'pnl', 'rr', 'riskPercent', 'date', 'time', 'direction', 'session', 'timeframe', 'confidence', 'rating', 'image', 'notes'].includes(inp.id) && extra[inp.id]).forEach(inp => {
            allFields.push({ label: inp.label, value: extra[inp.id] })
          })

          return (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setViewingTrade(null)}>
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '16px', padding: '0', width: '95%', maxWidth: '1000px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1a22', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>{trade.symbol}</span>
                    {trade.direction && (
                      <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, background: directionStyles.bgColor || 'transparent', color: directionStyles.textColor, border: directionStyles.borderColor ? `1px solid ${directionStyles.borderColor}` : 'none' }}>
                        {trade.direction.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => { setViewingTrade(null); startEditTrade(trade) }} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit
                    </button>
                    <button onClick={() => setViewingTrade(null)} style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '24px', cursor: 'pointer', padding: '4px', lineHeight: 1 }}>×</button>
                  </div>
                </div>

                {/* Content - Main area with fields on left, images on right */}
                <div style={{ padding: '20px', overflow: 'auto', flex: 1 }}>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    {/* Left: 3-column grid of all fields */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                        {allFields.map((field, idx) => (
                          <div key={idx} style={{ background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', padding: '12px' }}>
                            <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>{field.label}</div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{field.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Right: Fixed image area */}
                    {tradeImages.length > 0 && (
                      <div style={{ width: '320px', flexShrink: 0 }}>
                        <div style={{ background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '10px', padding: '12px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Screenshot{tradeImages.length > 1 ? 's' : ''}</div>
                            {tradeImages.length > 1 && (
                              <div style={{ fontSize: '10px', color: '#888' }}>{tradeImageIndex + 1} / {tradeImages.length}</div>
                            )}
                          </div>
                          <div style={{ position: 'relative', flex: 1, minHeight: '200px' }}>
                            <img src={tradeImages[tradeImageIndex]} alt="" style={{ width: '100%', height: '100%', borderRadius: '8px', cursor: 'pointer', objectFit: 'contain', background: '#0d0d12' }} onClick={() => setShowExpandedImage(tradeImages[tradeImageIndex])} />
                            {tradeImages.length > 1 && (
                              <>
                                <button onClick={(e) => { e.stopPropagation(); setTradeImageIndex(prev => prev > 0 ? prev - 1 : tradeImages.length - 1) }} style={{ position: 'absolute', left: '4px', top: '50%', transform: 'translateY(-50%)', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
                                <button onClick={(e) => { e.stopPropagation(); setTradeImageIndex(prev => prev < tradeImages.length - 1 ? prev + 1 : 0) }} style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
                              </>
                            )}
                          </div>
                          {tradeImages.length > 1 && (
                            <div style={{ display: 'flex', gap: '6px', marginTop: '10px', justifyContent: 'center' }}>
                              {tradeImages.map((img, idx) => (
                                <button key={idx} onClick={() => setTradeImageIndex(idx)} style={{ width: '8px', height: '8px', borderRadius: '50%', background: idx === tradeImageIndex ? '#22c55e' : '#333', border: 'none', cursor: 'pointer', padding: 0 }} />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes below - full width */}
                  {noteContent && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px', fontWeight: 600 }}>Notes</div>
                      <div style={{ background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', padding: '12px', color: '#ccc', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{noteContent}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        {/* STATISTICS TAB */}
        {activeTab === 'statistics' && (() => {
          // Filter by selected trades if viewing selected
          const baseTrades = viewingSelectedStats && selectedTrades.size > 0 ? trades.filter(t => selectedTrades.has(t.id)) : trades
          const bWins = baseTrades.filter(t => t.outcome === 'win').length
          const bLosses = baseTrades.filter(t => t.outcome === 'loss').length
          const bPnl = baseTrades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0)
          const bWinrate = (bWins + bLosses) > 0 ? Math.round((bWins / (bWins + bLosses)) * 100) : 0
          const bGrossProfit = baseTrades.filter(t => parseFloat(t.pnl) > 0).reduce((s, t) => s + parseFloat(t.pnl), 0)
          const bGrossLoss = Math.abs(baseTrades.filter(t => parseFloat(t.pnl) < 0).reduce((s, t) => s + parseFloat(t.pnl), 0))
          const bPF = bGrossLoss > 0 ? (bGrossProfit / bGrossLoss).toFixed(2) : bGrossProfit > 0 ? '∞' : '-'
          const bAvgWin = bWins > 0 ? Math.round(bGrossProfit / bWins) : 0
          const bAvgLoss = bLosses > 0 ? Math.round(bGrossLoss / bLosses) : 0
          const bAvgRR = baseTrades.length > 0 ? (baseTrades.reduce((s, t) => s + (parseFloat(t.rr) || 0), 0) / baseTrades.length).toFixed(1) : '0'

          // Get stats based on toggle - either this journal, all journals, or selected journals (disabled when viewing selected trades)
          const cumStats = (viewMode === 'all' || viewMode === 'selected') && allAccounts.length > 1 && !viewingSelectedStats ? getCumulativeStats() : null
          const displayTotalPnl = cumStats ? cumStats.totalPnl : bPnl
          const displayTrades = cumStats ? cumStats.allTrades : baseTrades
          const displayWinrate = cumStats ? cumStats.winrate : bWinrate
          const displayProfitFactor = cumStats ? cumStats.profitFactor : bPF
          const displayAvgRR = cumStats ? cumStats.avgRR : bAvgRR
          const displayExpectancy = cumStats ? Math.round(cumStats.totalPnl / (cumStats.totalTrades || 1)) : (baseTrades.length > 0 ? Math.round(bPnl / baseTrades.length) : 0)
          const displayAvgWin = cumStats ? cumStats.avgWin : bAvgWin
          const displayAvgLoss = cumStats ? cumStats.avgLoss : bAvgLoss
          const displayWins = cumStats ? cumStats.wins : bWins
          const displayLosses = cumStats ? cumStats.losses : bLosses
          const displayStartingBalance = cumStats ? cumStats.totalStartingBalance : startingBalance
          const displayCurrentBalance = cumStats ? cumStats.currentBalance : startingBalance + bPnl
          const displayGrossProfit = cumStats ? cumStats.grossProfit : bGrossProfit
          const displayGrossLoss = cumStats ? cumStats.grossLoss : bGrossLoss

          // Recalculate derived stats based on displayTrades
          const displayLongTrades = displayTrades.filter(t => t.direction === 'long')
          const displayShortTrades = displayTrades.filter(t => t.direction === 'short')
          const displayLongWins = displayLongTrades.filter(t => t.outcome === 'win').length
          const displayShortWins = displayShortTrades.filter(t => t.outcome === 'win').length
          const displayLongWinrate = displayLongTrades.length > 0 ? Math.round((displayLongWins / displayLongTrades.length) * 100) : 0
          const displayShortWinrate = displayShortTrades.length > 0 ? Math.round((displayShortWins / displayShortTrades.length) * 100) : 0
          const displayLongPct = Math.round((displayLongTrades.length / (displayTrades.length || 1)) * 100)

          // Streaks for displayTrades
          const displayStreaks = (() => {
            const sorted = [...displayTrades].sort((a, b) => new Date(a.date) - new Date(b.date))
            let cs = 0, mw = 0, ml = 0, ts = 0, lo = null
            sorted.forEach(t => { if (t.outcome === 'win') { ts = lo === 'win' ? ts + 1 : 1; mw = Math.max(mw, ts); lo = 'win' } else if (t.outcome === 'loss') { ts = lo === 'loss' ? ts + 1 : 1; ml = Math.max(ml, ts); lo = 'loss' } })
            let i = sorted.length - 1
            if (i >= 0) { const last = sorted[i].outcome; while (i >= 0 && sorted[i].outcome === last) { cs++; i-- }; if (last === 'loss') cs = -cs }
            return { cs, mw, ml }
          })()

          // Daily PnL for displayTrades
          const displayDailyPnL = (() => {
            const byDay = {}
            displayTrades.forEach(t => { byDay[t.date] = (byDay[t.date] || 0) + (parseFloat(t.pnl) || 0) })
            return Object.entries(byDay).sort((a, b) => new Date(a[0]) - new Date(b[0])).map(([date, pnl]) => ({ date, pnl }))
          })()

          // Day winrate for displayTrades
          const displayGreenDays = displayDailyPnL.filter(d => d.pnl > 0).length
          const displayRedDays = displayDailyPnL.filter(d => d.pnl < 0).length
          const displayDayWinrate = (displayGreenDays + displayRedDays) > 0 ? Math.round((displayGreenDays / (displayGreenDays + displayRedDays)) * 100) : 0

          // Consistency score for displayTrades
          const displayConsistencyScore = displayDailyPnL.length > 0 ? Math.round((displayGreenDays / displayDailyPnL.length) * 100) : 0

          // Average rating for displayTrades
          const displayAvgRating = displayTrades.length > 0 ? (displayTrades.reduce((s, t) => s + (parseInt(getExtraData(t).rating) || 0), 0) / displayTrades.length).toFixed(1) : '0'

          return (
          <div style={{ padding: isMobile ? '0' : '8px 12px 0 12px' }}>
            {/* Stats View Indicator Banner */}
            {viewingSelectedStats && selectedTrades.size > 0 ? (
              <div style={{ marginBottom: '12px', padding: '12px 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 0 12px rgba(34,197,94,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e' }}>VIEWING {selectedTrades.size} SELECTED TRADES</span>
                </div>
                <button onClick={() => setViewingSelectedStats(false)} style={{ padding: '6px 12px', background: '#1a1a22', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>View Journal Stats</button>
              </div>
            ) : hasActiveFilters && !viewingSelectedStats ? (
              <div style={{ marginBottom: '12px', padding: '12px 16px', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.5)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 0 12px rgba(251,191,36,0.15)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 8px #fbbf24' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#fbbf24' }}>VIEWING FILTERED TRADES ({filteredTrades.length} of {trades.length})</span>
                </div>
                <button onClick={() => setFilters({ dateFrom: '', dateTo: '', outcome: '', direction: '', symbol: '', session: '', timeframe: '', confidence: '', rr: '', rating: '', custom: {} })} style={{ padding: '6px 12px', background: '#1a1a22', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>Clear Filters</button>
              </div>
            ) : null}
            {/* ROW 1: Stats + Graphs - proportionally aligned */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', marginBottom: '12px', alignItems: 'stretch' }}>
              {/* Stats Widget - Clean List - determines height */}
              <div style={{ width: isMobile ? '100%' : '200px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
                {/* Key Metrics List */}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Total PnL</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: displayTotalPnl >= 0 ? '#22c55e' : '#ef4444' }}>{displayTotalPnl >= 0 ? '+' : ''}${Math.abs(displayTotalPnl).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Total Trades</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{displayTrades.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Winrate</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: displayWinrate >= 50 ? '#22c55e' : '#ef4444' }}>{displayWinrate}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Profit Factor</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: displayProfitFactor === '-' ? '#666' : displayProfitFactor === '∞' ? '#22c55e' : parseFloat(displayProfitFactor) >= 1 ? '#22c55e' : '#ef4444' }}>{displayProfitFactor}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Avg RR</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{displayAvgRR}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Expectancy</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: displayExpectancy >= 0 ? '#22c55e' : '#ef4444' }}>${displayExpectancy}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Avg Win</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e' }}>+${displayAvgWin}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Avg Loss</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>-${displayAvgLoss}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Long WR</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: displayLongWinrate >= 50 ? '#22c55e' : '#ef4444' }}>{displayLongWinrate}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Short WR</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: displayShortWinrate >= 50 ? '#22c55e' : '#ef4444' }}>{displayShortWinrate}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Day WR</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: displayDayWinrate >= 50 ? '#22c55e' : '#ef4444' }}>{displayDayWinrate}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Consistency</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: displayConsistencyScore >= 50 ? '#22c55e' : '#ef4444' }}>{displayConsistencyScore}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Win Streak</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e' }}>{displayStreaks.mw}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Loss Streak</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>{displayStreaks.ml}</span>
                </div>
              </div>

              {/* Graphs - side by side, stretch to match stats height */}
              <div style={{ flex: 1, display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
                {/* Equity Curve with groupBy dropdown */}
                <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {(() => {
                    // Calculate visible lines first so we can compute dynamic Start/Current
                    const sorted = displayTrades.length >= 2 ? [...displayTrades].sort((a, b) => new Date(a.date) - new Date(b.date)) : []
                    const lineColors = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#06b6d4']

                    let lines = []
                    let chartStart = displayStartingBalance
                    let chartCurrent = displayCurrentBalance
                    
                    if (sorted.length >= 2) {
                      if (equityCurveGroupBy === 'total') {
                        let cum = displayStartingBalance
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
                      chartStart = 0
                      chartCurrent = visibleLines.reduce((sum, line) => {
                        const lastPt = line.points[line.points.length - 1]
                        return sum + (lastPt?.balance || 0)
                      }, 0)
                    }

                    return (
                      <>
                        {/* Header row with title, stats, controls and enlarge button */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>EQUITY CURVE</span>
                            <span style={{ fontSize: '11px', color: '#666', fontWeight: 600 }}>BALANCE:</span>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: chartCurrent >= chartStart ? '#22c55e' : '#ef4444' }}>${Math.round(chartCurrent).toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select value={equityCurveGroupBy} onChange={e => { setEquityCurveGroupBy(e.target.value); setSelectedCurveLines({}) }} style={{ padding: '4px 8px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '11px', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }}>
                              <option value="total">Total PnL</option>
                              <option value="symbol">By Pair</option>
                              {inputs.filter(inp => inp.type === 'select' && inp.enabled).map(inp => (
                                <option key={inp.id} value={inp.id}>By {inp.label}</option>
                              ))}
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
                                      <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#999', cursor: 'pointer', padding: '4px 6px', borderRadius: '4px', background: selectedCurveLines[line.name] !== false ? 'rgba(34, 197, 94, 0.1)' : 'transparent' }}>
                                        <input type="checkbox" checked={selectedCurveLines[line.name] !== false} onChange={e => setSelectedCurveLines(prev => ({ ...prev, [line.name]: e.target.checked }))} style={{ width: '12px', height: '12px', accentColor: line.color }} />
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: line.color }} />
                                        <span style={{ color: selectedCurveLines[line.name] !== false ? '#fff' : '#888' }}>{line.name}</span>
                                      </label>
                                    ))}
                                    <div style={{ borderTop: '1px solid #2a2a35', marginTop: '6px', paddingTop: '6px', display: 'flex', gap: '6px' }}>
                                      <button onClick={() => setSelectedCurveLines(lines.reduce((acc, l) => ({ ...acc, [l.name]: true }), {}))} style={{ flex: 1, padding: '3px 6px', background: '#22c55e', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '10px', cursor: 'pointer' }}>All</button>
                                      <button onClick={() => setSelectedCurveLines(lines.reduce((acc, l) => ({ ...acc, [l.name]: false }), {}))} style={{ flex: 1, padding: '3px 6px', background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '4px', color: '#999', fontSize: '10px', cursor: 'pointer' }}>None</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            <button onClick={() => setShowObjectiveLines(!showObjectiveLines)} style={{ padding: '4px 8px', background: showObjectiveLines ? 'rgba(147,51,234,0.15)' : '#141418', border: showObjectiveLines ? '1px solid rgba(147,51,234,0.4)' : '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: showObjectiveLines ? '#9333ea' : '#fff', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                              Show Objectives
                            </button>
                            <button onClick={() => setEnlargedChart(enlargedChart === 'equity' ? null : 'equity')} style={{ background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '4px', padding: '4px 8px', color: '#999', fontSize: '10px', cursor: 'pointer' }}>⛶</button>
                          </div>
                        </div>
                        {/* Graph area - full width now */}
                        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '40px' }}>
                          {sorted.length < 2 ? (
                            <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Need 2+ trades</div>
                          ) : (() => {
                            const allBalances = visibleLines.flatMap(l => l.points.map(p => p.balance))
                            let maxBal = allBalances.length > 0 ? Math.max(...allBalances) : startingBalance
                            let minBal = allBalances.length > 0 ? Math.min(...allBalances) : startingBalance

                            // Include profit target and drawdown floor in range - calculate directly from account settings
                            const ddParsedRange = parseFloat(account?.max_drawdown)
                            const ptParsedRange = parseFloat(account?.profit_target)
                            const ddFloorVal = !isNaN(ddParsedRange) && ddParsedRange > 0 && !account?.max_dd_enabled ? displayStartingBalance * (1 - ddParsedRange / 100) : null
                            const profitTargetVal = !isNaN(ptParsedRange) && ptParsedRange > 0 ? displayStartingBalance * (1 + ptParsedRange / 100) : null
                            // Calculate new DD floor values for range
                            const dailyDdPctRange = parseFloat(account?.daily_dd_pct)
                            const dailyDdFloorVal = account?.daily_dd_enabled && !isNaN(dailyDdPctRange) && dailyDdPctRange > 0 ? displayStartingBalance * (1 - dailyDdPctRange / 100) : null
                            const maxDdPctRange = parseFloat(account?.max_dd_pct)
                            const maxDdFloorVal = account?.max_dd_enabled && !isNaN(maxDdPctRange) && maxDdPctRange > 0 ? displayStartingBalance * (1 - maxDdPctRange / 100) : null
                            // Only include objective lines in range when showObjectiveLines is true
                            if (equityCurveGroupBy === 'total' && showObjectiveLines) {
                              if (ddFloorVal) minBal = Math.min(minBal, ddFloorVal)
                              if (profitTargetVal) maxBal = Math.max(maxBal, profitTargetVal)
                              if (dailyDdFloorVal) minBal = Math.min(minBal, dailyDdFloorVal)
                              if (maxDdFloorVal) minBal = Math.min(minBal, maxDdFloorVal)
                            }

                            const range = maxBal - minBal || 1000

                            // Calculate tight Y-axis range
                            const actualMin = equityCurveGroupBy === 'total' ? Math.min(minBal, displayStartingBalance) : minBal
                            const actualMax = equityCurveGroupBy === 'total' ? Math.max(maxBal, displayStartingBalance) : maxBal
                            const dataRange = actualMax - actualMin || 1000

                            // To get 1/16 of TOTAL graph height as padding on each side:
                            // If data takes 14/16 of total, padding = dataRange / 14 on each side
                            const paddingAmount = dataRange / 14
                            const lowestFloor = Math.min(ddFloorVal || Infinity, dailyDdFloorVal || Infinity, maxDdFloorVal || Infinity)

                            let yMax, yMin
                            if (!showObjectiveLines) {
                              // Tight fit: data + 1/16 padding on each side
                              yMax = actualMax + paddingAmount
                              yMin = actualMin - paddingAmount
                              if (yMin < 0 && actualMin >= 0) yMin = 0
                            } else {
                              // Expanded fit for objective lines
                              yMax = actualMax + paddingAmount
                              yMin = actualMin - paddingAmount
                              if (profitTargetVal) yMax = Math.max(yMax, profitTargetVal + paddingAmount)
                              if (lowestFloor !== Infinity) yMin = Math.min(yMin, lowestFloor - paddingAmount)
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
                            // For multi-line mode, use tighter rounding to preserve 1/8 padding
                            if (equityCurveGroupBy !== 'total') {
                              const halfStep = yStep / 2
                              yMax = Math.ceil(yMax / halfStep) * halfStep
                              yMin = Math.floor(yMin / halfStep) * halfStep
                            } else {
                              yMax = Math.ceil(yMax / yStep) * yStep
                              yMin = Math.floor(yMin / yStep) * yStep
                            }
                            if (yMin < 0 && actualMin >= 0 && !showObjectiveLines) yMin = 0

                            const yRange = yMax - yMin || yStep

                            // Format y-axis label with appropriate precision based on step size
                            const formatYLabel = (v) => {
                              if (Math.abs(v) >= 1000000) return `$${(v/1000000).toFixed(1)}M`
                              if (Math.abs(v) >= 1000) {
                                const needsDecimal = yStep < 1000
                                return needsDecimal ? `$${(v/1000).toFixed(1)}k` : `$${(v/1000).toFixed(0)}k`
                              }
                              return `$${v}`
                            }

                            // Generate y-axis labels - anchor depends on mode
                            // For total mode: anchor to starting balance
                            // For grouped modes: anchor to 0 (since lines show cumulative PnL from 0)
                            const labelAnchor = equityCurveGroupBy === 'total' ? displayStartingBalance : 0
                            const yLabels = [labelAnchor]
                            // Add labels above anchor - extend beyond yMax to ensure padding
                            for (let v = labelAnchor + yStep; v < yMax + yStep; v += yStep) {
                              yLabels.push(v)
                            }
                            // Add labels below anchor - extend beyond yMin to ensure padding
                            for (let v = labelAnchor - yStep; v > yMin - yStep; v -= yStep) {
                              if (v >= 0 || minBal < 0 || showObjectiveLines || equityCurveGroupBy !== 'total') yLabels.push(v)
                            }
                            // Sort from highest to lowest
                            yLabels.sort((a, b) => b - a)

                            // Update yMax/yMin to match label bounds
                            yMax = yLabels[0]
                            yMin = yLabels[yLabels.length - 1]
                            const yRangeFinal = yMax - yMin || yStep

                            const hasNegative = minBal < 0
                            const belowStart = equityCurveGroupBy === 'total' && minBal < displayStartingBalance
                            const zeroY = hasNegative ? ((yMax - 0) / yRangeFinal) * 100 : null
                            // Starting balance line - will now always be at a label position
                            const startLineY = equityCurveGroupBy === 'total' && !hasNegative ? (yLabels.indexOf(displayStartingBalance) / (yLabels.length - 1)) * 100 : null
                            // Drawdown floor line - calculate directly from account settings (legacy) - clamp to valid range
                            const maxDDParsed = parseFloat(account?.max_drawdown)
                            const maxDDClamped = !isNaN(maxDDParsed) ? Math.min(99, Math.max(0, maxDDParsed)) : 0
                            const ddFloor = maxDDClamped > 0 && !account?.max_dd_enabled ? displayStartingBalance * (1 - maxDDClamped / 100) : null
                            const ddFloorY = equityCurveGroupBy === 'total' && ddFloor ? ((yMax - ddFloor) / yRangeFinal) * 100 : null
                            // Profit target line - calculate directly from account settings - clamp to valid range
                            const profitTargetParsed = parseFloat(account?.profit_target)
                            const ptClamped = !isNaN(profitTargetParsed) ? Math.min(500, Math.max(0, profitTargetParsed)) : 0
                            const profitTarget = ptClamped > 0 ? displayStartingBalance * (1 + ptClamped / 100) : null
                            const profitTargetY = equityCurveGroupBy === 'total' && profitTarget ? ((yMax - profitTarget) / yRangeFinal) * 100 : null

                            // New Daily Drawdown calculation (orange line - resets each day at configured time) - clamp to valid range
                            const dailyDdEnabled = account?.daily_dd_enabled
                            const dailyDdPctRaw = parseFloat(account?.daily_dd_pct)
                            const dailyDdPct = !isNaN(dailyDdPctRaw) ? Math.min(99, Math.max(0, dailyDdPctRaw)) : 0
                            const dailyDdType = account?.daily_dd_type || 'static'
                            const dailyDdLocksAt = account?.daily_dd_locks_at || 'start_balance'
                            const dailyDdLocksAtPctValue = parseFloat(account?.daily_dd_locks_at_pct) || 0
                            const dailyDdResetTime = account?.daily_dd_reset_time || '00:00'

                            // Helper to get trading day for a trade based on reset time
                            const getTradingDay = (tradeDate, tradeTime) => {
                              if (!tradeDate) return null
                              const resetParts = (dailyDdResetTime || '00:00').split(':')
                              const resetHour = parseInt(resetParts[0]) || 0
                              const resetMin = parseInt(resetParts[1]) || 0
                              const tradeDateTime = new Date(`${tradeDate}T${tradeTime || '12:00'}`)
                              if (isNaN(tradeDateTime.getTime())) {
                                return new Date(tradeDate).toDateString()
                              }
                              const tradeHour = tradeDateTime.getHours()
                              const tradeMinute = tradeDateTime.getMinutes()
                              if (tradeHour < resetHour || (tradeHour === resetHour && tradeMinute < resetMin)) {
                                const prevDay = new Date(tradeDateTime)
                                prevDay.setDate(prevDay.getDate() - 1)
                                return prevDay.toDateString()
                              }
                              return tradeDateTime.toDateString()
                            }

                            let dailyDdFloorPoints = []
                            if (equityCurveGroupBy === 'total' && dailyDdEnabled && dailyDdPct > 0) {
                              let currentDayStart = displayStartingBalance
                              let currentTradingDay = null
                              let isLocked = false
                              let lockedFloor = null
                              // Calculate lock threshold based on dailyDdLocksAt setting
                              const getLockThreshold = () => {
                                if (dailyDdLocksAt === 'start_balance') return displayStartingBalance
                                if (dailyDdLocksAt === 'custom' && dailyDdLocksAtPctValue > 0) return displayStartingBalance * (1 + dailyDdLocksAtPctValue / 100)
                                return displayStartingBalance
                              }
                              const lockThreshold = getLockThreshold()

                              const totalPoints = [{ balance: displayStartingBalance, date: null, time: null }]
                              sorted.forEach(t => totalPoints.push({ balance: totalPoints[totalPoints.length - 1].balance + (parseFloat(t.pnl) || 0), date: t.date, time: t.time }))
                              totalPoints.forEach((p, i) => {
                                if (i === 0) {
                                  dailyDdFloorPoints.push({ idx: i, floor: displayStartingBalance * (1 - dailyDdPct / 100), isNewDay: true })
                                } else {
                                  const tradingDay = getTradingDay(p.date, p.time)
                                  const isNewDay = tradingDay && tradingDay !== currentTradingDay
                                  if (isNewDay) {
                                    const prevBalance = totalPoints[i - 1].balance
                                    currentDayStart = currentTradingDay ? prevBalance : displayStartingBalance
                                    currentTradingDay = tradingDay
                                  }
                                  let floor = currentDayStart * (1 - dailyDdPct / 100)

                                  // For trailing type, check if should lock
                                  if (dailyDdType === 'trailing' && !isLocked) {
                                    if (floor >= lockThreshold) {
                                      isLocked = true
                                      lockedFloor = lockThreshold
                                      floor = lockedFloor
                                    }
                                  } else if (dailyDdType === 'trailing' && isLocked) {
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
                            if (equityCurveGroupBy === 'total' && maxDdEnabled && maxDdPct > 0) {
                              if (maxDdType === 'static') {
                                maxDdStaticFloor = displayStartingBalance * (1 - maxDdPct / 100)
                              } else {
                                let peak = displayStartingBalance
                                let trailingFloor = displayStartingBalance * (1 - maxDdPct / 100)
                                let isLocked = false
                                let lockedFloor = null
                                // Calculate lock threshold based on maxDdStopsAt setting
                                const getLockThreshold = () => {
                                  if (maxDdStopsAt === 'initial') return displayStartingBalance
                                  if (maxDdStopsAt === 'custom' && maxDdLocksAtPctValue > 0) return displayStartingBalance * (1 + maxDdLocksAtPctValue / 100)
                                  return null // 'never' - no threshold
                                }
                                const lockThreshold = getLockThreshold()

                                const totalPoints = [{ balance: displayStartingBalance }]
                                sorted.forEach(t => totalPoints.push({ balance: totalPoints[totalPoints.length - 1].balance + (parseFloat(t.pnl) || 0) }))
                                totalPoints.forEach((p, i) => {
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
                                    trailingFloor = lockedFloor
                                  }
                                  maxDdFloorPoints.push({ idx: i, floor: trailingFloor })
                                })
                              }
                            }

                            // Static max DD floor Y position
                            const maxDdStaticFloorY = equityCurveGroupBy === 'total' && maxDdStaticFloor ? ((yMax - maxDdStaticFloor) / yRangeFinal) * 100 : null

                            const svgW = 100, svgH = 100

                            // Calculate starting balance Y position in SVG coordinates
                            const startY = svgH - ((displayStartingBalance - yMin) / yRangeFinal) * svgH

                            const lineData = visibleLines.map(line => {
                              const chartPoints = line.points.map((p, i) => ({
                                x: line.points.length > 1 ? (i / (line.points.length - 1)) * svgW : svgW / 2,
                                y: svgH - ((p.balance - yMin) / yRangeFinal) * svgH,
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
                                  const above1 = p1.balance >= displayStartingBalance, above2 = p2.balance >= displayStartingBalance

                                  if (above1 === above2) {
                                    // Both points same side - add to appropriate array
                                    const arr = above1 ? greenSegments : redSegments
                                    arr.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
                                  } else {
                                    // Crossing - find intersection point
                                    const t = (displayStartingBalance - p1.balance) / (p2.balance - p1.balance)
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
                            const areaBottom = hasNegative ? svgH - ((0 - yMin) / yRangeFinal) * svgH : svgH
                            const areaD = equityCurveGroupBy === 'total' && mainLine ? mainLine.pathD + ` L ${mainLine.chartPoints[mainLine.chartPoints.length - 1].x} ${areaBottom} L ${mainLine.chartPoints[0].x} ${areaBottom} Z` : null
                            
                            // Generate X-axis labels based on date range
                            const xLabels = []
                            if (sorted.length > 0) {
                              const firstDate = new Date(sorted[0].date)
                              const lastDate = new Date(sorted[sorted.length - 1].date)
                              const totalDays = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)))

                              // Determine number of labels based on date range (supports up to 100 years)
                              let numLabels
                              if (totalDays <= 12) {
                                numLabels = totalDays + 1
                              } else if (totalDays <= 84) {
                                numLabels = Math.min(12, Math.ceil(totalDays / 7) + 1)
                              } else if (totalDays <= 180) {
                                numLabels = Math.min(12, Math.ceil(totalDays / 14) + 1)
                              } else if (totalDays <= 365) {
                                numLabels = Math.min(12, Math.ceil(totalDays / 30) + 1)
                              } else if (totalDays <= 730) {
                                numLabels = Math.min(12, Math.ceil(totalDays / 60) + 1)
                              } else if (totalDays <= 1825) {
                                numLabels = Math.min(12, Math.ceil(totalDays / 90) + 1)
                              } else if (totalDays <= 3650) {
                                numLabels = Math.min(12, Math.ceil(totalDays / 180) + 1)
                              } else if (totalDays <= 9125) {
                                numLabels = Math.min(12, Math.ceil(totalDays / 365) + 1)
                              } else if (totalDays <= 18250) {
                                numLabels = Math.min(12, Math.ceil(totalDays / 730) + 1)
                              } else {
                                numLabels = Math.min(12, Math.ceil(totalDays / 1825) + 1)
                              }

                              const actualLabels = Math.min(numLabels, 12)
                              for (let i = 0; i < actualLabels; i++) {
                                const pct = actualLabels > 1 ? 5 + (i / (actualLabels - 1)) * 90 : 50
                                const dateOffset = actualLabels > 1 ? Math.round((i / (actualLabels - 1)) * totalDays) : 0
                                const labelDate = new Date(firstDate.getTime() + dateOffset * 24 * 60 * 60 * 1000)
                                xLabels.push({ label: `${String(labelDate.getDate()).padStart(2, '0')}/${String(labelDate.getMonth() + 1).padStart(2, '0')}`, pct })
                              }
                            }

                            // Build SVG path for daily DD floor line (orange, stepped)
                            // Clip at profit target - daily DD floor shouldn't go above profit target
                            // Uses stepped pattern: horizontal line then vertical jump for each day change (_|_|_)
                            let dailyDdPath = ''
                            if (dailyDdFloorPoints.length > 0) {
                              const ddChartPoints = dailyDdFloorPoints.map((p, i) => {
                                const totalLen = dailyDdFloorPoints.length
                                const x = totalLen > 1 ? (p.idx / (totalLen - 1)) * svgW : svgW / 2
                                const y = svgH - ((p.floor - yMin) / yRangeFinal) * svgH
                                // Track if floor is at or above profit target (should skip drawing)
                                const aboveProfitTarget = profitTarget && p.floor >= profitTarget
                                return { x, y, isNewDay: p.isNewDay, floor: p.floor, aboveProfitTarget }
                              })
                              // Build stepped path: skip segments where floor >= profit target to avoid overlap
                              let pathParts = []
                              let inPath = false // Are we currently drawing?
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
                            }

                            // Build SVG path for trailing max DD floor line (red, follows curve)
                            let trailingMaxDdPath = ''
                            if (maxDdFloorPoints.length > 0) {
                              const maxDdChartPoints = maxDdFloorPoints.map(p => {
                                const totalLen = maxDdFloorPoints.length
                                const x = totalLen > 1 ? (p.idx / (totalLen - 1)) * svgW : svgW / 2
                                const y = svgH - ((p.floor - yMin) / yRangeFinal) * svgH
                                return { x, y }
                              })
                              trailingMaxDdPath = maxDdChartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                            }

                            return (
                              <>
                                {/* Chart row - Y-axis and chart area aligned */}
                                <div style={{ flex: 1, display: 'flex' }}>
                                  {/* Y-axis labels - same height as chart */}
                                  <div style={{ width: '28px', flexShrink: 0, position: 'relative', borderRight: '1px solid #2a2a35', borderBottom: '1px solid transparent', overflow: 'visible' }}>
                                    {yLabels.map((v, i) => {
                                      const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                                      const isStart = v === displayStartingBalance
                                      return (
                                        <Fragment key={i}>
                                          <span style={{ position: 'absolute', right: '5px', top: `${topPct}%`, transform: 'translateY(-50%)', fontSize: '8px', color: '#999', lineHeight: 1, textAlign: 'right', fontWeight: 400 }}>{formatYLabel(v)}</span>
                                          <div style={{ position: 'absolute', right: 0, top: `${topPct}%`, width: '4px', borderTop: `1px solid ${isStart ? '#888' : '#2a2a35'}` }} />
                                        </Fragment>
                                      )
                                    })}
                                    {/* Red DD floor value on Y-axis */}
                                    {showObjectiveLines && ddFloorY !== null && (
                                      <Fragment>
                                        <span style={{ position: 'absolute', right: '5px', top: `${ddFloorY}%`, transform: 'translateY(-50%)', fontSize: '8px', color: propFirmDrawdown?.breached ? '#ef4444' : '#f59e0b', lineHeight: 1, textAlign: 'right', fontWeight: 600 }}>{formatYLabel(ddFloor)}</span>
                                        <div style={{ position: 'absolute', right: 0, top: `${ddFloorY}%`, width: '4px', borderTop: `1px solid ${propFirmDrawdown?.breached ? '#ef4444' : '#f59e0b'}` }} />
                                      </Fragment>
                                    )}
                                    {/* Profit target value on Y-axis */}
                                    {showObjectiveLines && profitTargetY !== null && (
                                      <Fragment>
                                        <span style={{ position: 'absolute', right: '5px', top: `${profitTargetY}%`, transform: 'translateY(-50%)', fontSize: '8px', color: distanceFromTarget?.passed ? '#22c55e' : '#3b82f6', lineHeight: 1, textAlign: 'right', fontWeight: 600 }}>{formatYLabel(profitTarget)}</span>
                                        <div style={{ position: 'absolute', right: 0, top: `${profitTargetY}%`, width: '4px', borderTop: `1px solid ${distanceFromTarget?.passed ? '#22c55e' : '#3b82f6'}` }} />
                                      </Fragment>
                                    )}
                                    {/* Static Max DD floor value on Y-axis */}
                                    {showObjectiveLines && maxDdStaticFloorY !== null && (
                                      <Fragment>
                                        <span style={{ position: 'absolute', right: '5px', top: `${maxDdStaticFloorY}%`, transform: 'translateY(-50%)', fontSize: '8px', color: '#ef4444', lineHeight: 1, textAlign: 'right', fontWeight: 600 }}>{formatYLabel(maxDdStaticFloor)}</span>
                                        <div style={{ position: 'absolute', right: 0, top: `${maxDdStaticFloorY}%`, width: '4px', borderTop: '1px solid #ef4444' }} />
                                      </Fragment>
                                    )}
                                  </div>
                                  {/* Chart area */}
                                  <div style={{ flex: 1, position: 'relative', overflow: 'visible', borderBottom: '1px solid #2a2a35' }}>
                                    {/* Horizontal grid lines - bottom line is x-axis border */}
                                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                                      {yLabels.map((v, i) => {
                                        const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                                        const isLast = i === yLabels.length - 1
                                        if (isLast) return null
                                        const isStart = v === displayStartingBalance
                                        return (
                                          <Fragment key={i}>
                                            <div style={{ position: 'absolute', left: 0, right: isStart ? '40px' : 0, top: `${topPct}%`, borderTop: isStart ? '1px dashed #666' : '1px solid rgba(51,51,51,0.5)', zIndex: isStart ? 1 : 0 }} />
                                            {isStart && <span style={{ position: 'absolute', right: '4px', top: `${topPct}%`, transform: 'translateY(-50%)', fontSize: '8px', color: '#666', fontWeight: 500 }}>Start</span>}
                                          </Fragment>
                                        )
                                      })}
                                    </div>
                                    {/* Zero line if negative */}
                                    {zeroY !== null && (
                                      <div style={{ position: 'absolute', left: 0, right: 0, top: `${zeroY}%`, borderTop: '1px solid rgba(51,51,51,0.5)', zIndex: 1 }} />
                                    )}
                                    {/* Legend - shows when objective lines are visible */}
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
                                    {/* Drawdown floor line - dashed orange/red */}
                                    {showObjectiveLines && ddFloorY !== null && (
                                      <div style={{ position: 'absolute', left: 0, right: 0, top: `${ddFloorY}%`, borderTop: `1px dashed ${propFirmDrawdown?.breached ? '#ef4444' : '#f59e0b'}`, zIndex: 1 }} />
                                    )}
                                    {/* Profit target line - dashed blue/green */}
                                    {showObjectiveLines && profitTargetY !== null && (
                                      <div style={{ position: 'absolute', left: 0, right: 0, top: `${profitTargetY}%`, borderTop: `1px dashed ${distanceFromTarget?.passed ? '#22c55e' : '#3b82f6'}`, zIndex: 1 }} />
                                    )}
                                    {/* Static Max DD floor line - red dashed horizontal */}
                                    {showObjectiveLines && maxDdStaticFloorY !== null && (
                                      <div style={{ position: 'absolute', left: 0, right: 0, top: `${maxDdStaticFloorY}%`, borderTop: '1px dashed #ef4444', zIndex: 1 }} />
                                    )}
                                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 2 }} viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none"
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
                                          {/* Daily DD floor line - orange, follows balance curve */}
                                          {showObjectiveLines && dailyDdPath && <path d={dailyDdPath} fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="5,5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                                          {/* Trailing Max DD floor line - red, follows peak curve */}
                                          {showObjectiveLines && trailingMaxDdPath && <path d={trailingMaxDdPath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                                        </>
                                      ) : (() => {
                                        // Sort lines by final Y position (end of line) - top lines first
                                        const sortedLines = [...lineData].map((line, origIdx) => {
                                          const lastY = line.chartPoints[line.chartPoints.length - 1]?.y || 0
                                          return { ...line, origIdx, lastY }
                                        }).sort((a, b) => a.lastY - b.lastY) // Top lines first (lowest Y)

                                        // Helper to interpolate Y value at a given X for a line
                                        const interpolateY = (pts, x) => {
                                          if (pts.length === 0) return svgH
                                          if (x <= pts[0].x) return pts[0].y
                                          if (x >= pts[pts.length - 1].x) return pts[pts.length - 1].y
                                          for (let i = 0; i < pts.length - 1; i++) {
                                            if (x >= pts[i].x && x <= pts[i + 1].x) {
                                              const t = (x - pts[i].x) / (pts[i + 1].x - pts[i].x)
                                              return pts[i].y + t * (pts[i + 1].y - pts[i].y)
                                            }
                                          }
                                          return pts[pts.length - 1].y
                                        }

                                        return (
                                          <>
                                            <defs>
                                              {/* Create clipPath for each line - clips glow to region between this line and next line below */}
                                              {sortedLines.map((line, sortIdx) => {
                                                const pts = line.chartPoints
                                                const nextLine = sortedLines[sortIdx + 1]
                                                // Generate X sample points across the full width
                                                const xMin = pts.length > 0 ? Math.min(...pts.map(p => p.x)) : 0
                                                const xMax = pts.length > 0 ? Math.max(...pts.map(p => p.x)) : 100
                                                const numSamples = 50
                                                const xSamples = []
                                                for (let i = 0; i <= numSamples; i++) {
                                                  xSamples.push(xMin + (xMax - xMin) * (i / numSamples))
                                                }

                                                // Top edge: this line's Y values
                                                const topEdge = xSamples.map(x => ({ x, y: interpolateY(pts, x) }))
                                                // Bottom edge: next line's Y values or SVG bottom
                                                const bottomEdge = nextLine
                                                  ? xSamples.map(x => ({ x, y: interpolateY(nextLine.chartPoints, x) }))
                                                  : xSamples.map(x => ({ x, y: svgH }))

                                                const clipPath = topEdge.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') +
                                                  bottomEdge.slice().reverse().map(p => ` L ${p.x} ${p.y}`).join('') + ' Z'

                                                return <clipPath key={`clip${line.origIdx}`} id={`clip${line.origIdx}`}><path d={clipPath} /></clipPath>
                                              })}
                                              {/* Gradient for each line */}
                                              {sortedLines.map((line) => (
                                                <linearGradient key={`grad${line.origIdx}`} id={`grad${line.origIdx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                                  <stop offset="0%" stopColor={line.color} stopOpacity="0.4" />
                                                  <stop offset="100%" stopColor={line.color} stopOpacity="0" />
                                                </linearGradient>
                                              ))}
                                            </defs>
                                            {/* Draw gradient areas with clipPaths - bottom to top order */}
                                            {[...sortedLines].reverse().map((line) => {
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
                                    {/* Line labels at end of each line - with collision detection */}
{/* Line labels moved to right-side column to avoid overlap */}
                                    {hoverPoint && <div style={{ position: 'absolute', left: `${hoverPoint.xPct}%`, top: `${hoverPoint.yPct}%`, transform: 'translate(-50%, -50%)', width: '10px', height: '10px', borderRadius: '50%', background: equityCurveGroupBy === 'total' ? (hoverPoint.balance >= displayStartingBalance ? '#22c55e' : '#ef4444') : (hoverPoint.lineColor || '#22c55e'), border: '2px solid #fff', pointerEvents: 'none', zIndex: 10 }} />}
                                    {hoverPoint && (
                                      <div style={{ position: 'absolute', left: `${hoverPoint.xPct}%`, top: `${hoverPoint.yPct}%`, transform: `translate(${hoverPoint.xPct > 80 ? 'calc(-100% - 15px)' : '15px'}, ${hoverPoint.yPct < 20 ? '0%' : hoverPoint.yPct > 80 ? '-100%' : '-50%'})`, background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '8px 12px', fontSize: '11px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
                                        {hoverPoint.lineName && equityCurveGroupBy !== 'total' && <div style={{ color: hoverPoint.lineColor, fontWeight: 600, marginBottom: '2px' }}>{hoverPoint.lineName}</div>}
                                        <div style={{ color: '#999' }}>{hoverPoint.date ? new Date(hoverPoint.date).toLocaleDateString() : 'Start'}</div>
                                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>${hoverPoint.balance?.toLocaleString()}</div>
                                        {hoverPoint.symbol && <div style={{ color: hoverPoint.pnl >= 0 ? '#22c55e' : '#ef4444' }}>{hoverPoint.symbol}: {hoverPoint.pnl >= 0 ? '+' : ''}${hoverPoint.pnl?.toFixed(0)}</div>}
                                      </div>
                                    )}
                                  </div>
                                  {/* Right-side labels for multi-line mode - outside graph area */}
                                  {equityCurveGroupBy !== 'total' && lineData.length > 0 && (
                                    <div style={{ width: '60px', flexShrink: 0, position: 'relative', overflow: 'visible', marginLeft: '4px' }}>
                                      {(() => {
                                        // Get final Y positions for each line and sort
                                        const labelData = lineData.map((line, idx) => {
                                          const pts = line.chartPoints
                                          if (pts.length === 0) return null
                                          const endY = pts[pts.length - 1].y
                                          const yPct = (endY / svgH) * 100
                                          return { line, idx, yPct, originalYPct: yPct }
                                        }).filter(Boolean)

                                        // Sort by Y position
                                        labelData.sort((a, b) => a.yPct - b.yPct)

                                        // Distribute labels with minimum spacing (12% of chart height)
                                        const minSpacing = 10
                                        for (let i = 1; i < labelData.length; i++) {
                                          const prev = labelData[i - 1]
                                          const curr = labelData[i]
                                          if (curr.yPct - prev.yPct < minSpacing) {
                                            curr.yPct = prev.yPct + minSpacing
                                          }
                                        }

                                        // Clamp to bounds
                                        labelData.forEach(d => {
                                          d.yPct = Math.max(2, Math.min(95, d.yPct))
                                        })

                                        return labelData.map(({ line, idx, yPct }) => (
                                          <div key={idx} style={{
                                            position: 'absolute',
                                            left: '4px',
                                            top: `${yPct}%`,
                                            transform: 'translateY(-50%)',
                                            fontSize: '9px',
                                            fontWeight: 600,
                                            color: line.color,
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: '56px',
                                            lineHeight: 1.2
                                          }}>
                                            {line.name}
                                          </div>
                                        ))
                                      })()}
                                    </div>
                                  )}
                                </div>
                                {/* X-axis row - spacer + labels */}
                                <div style={{ display: 'flex' }}>
                                  <div style={{ width: '28px', flexShrink: 0 }} />
                                  <div style={{ flex: 1, height: '24px', position: 'relative' }}>
                                    {xLabels.map((l, i) => (
                                      <div key={i} style={{ position: 'absolute', left: `${l.pct}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ width: '1px', height: '4px', background: '#2a2a35' }} />
                                        <span style={{ fontSize: '9px', color: '#999', marginTop: '4px', whiteSpace: 'nowrap' }}>{l.label}</span>
                                      </div>
                                    ))}
                                  </div>
                                  {equityCurveGroupBy !== 'total' && lineData.length > 0 && <div style={{ width: '60px', flexShrink: 0, marginLeft: '4px' }} />}
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
                <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column' }}>
                  {(() => {
                    const groupedData = {}
                    const customSelects = getCustomSelectInputs()
                    displayTrades.forEach(t => {
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
                    
                    if (entries.length === 0) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No data</div>
                    
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
                    // More labels for better readability
                    const labelCount = 6
                    const yLabels = []
                    for (let i = 0; i <= labelCount - 1; i++) {
                      const val = Math.round((1 - i / (labelCount - 1)) * niceMax)
                      yLabels.push(barGraphMetric === 'winrate' ? val + '%' : (barGraphMetric === 'pnl' || barGraphMetric === 'avgpnl' ? '$' + val : val))
                    }
                    
                    return (
                      <>
                        {/* Header row with title, controls and enlarge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>PERFORMANCE BY {graphGroupBy === 'symbol' ? 'PAIR' : graphGroupBy.toUpperCase()}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <select value={barGraphMetric} onChange={e => setBarGraphMetric(e.target.value)} style={{ padding: '4px 8px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '11px', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }}>
                              <option value="winrate">Winrate</option>
                              <option value="pnl">PnL</option>
                              <option value="avgpnl">Avg PnL</option>
                              <option value="count">Count</option>
                            </select>
                            <select value={graphGroupBy} onChange={e => setGraphGroupBy(e.target.value)} style={{ padding: '4px 8px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '11px', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }}>
                              <option value="symbol">Pairs</option>
                              {inputs.filter(inp => inp.type === 'select' && inp.enabled).map(inp => (
                                <option key={inp.id} value={inp.id}>{inp.label}</option>
                              ))}
                            </select>
                            <button onClick={() => setEnlargedChart(enlargedChart === 'bar' ? null : 'bar')} style={{ background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '4px', padding: '4px 8px', color: '#999', fontSize: '10px', cursor: 'pointer' }}>⛶</button>
                          </div>
                        </div>
                        {/* Graph - restructured so Y-axis aligns only with chart area */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '40px' }}>
                          {/* Chart row - Y-axis and chart area aligned */}
                          <div style={{ flex: 1, display: 'flex' }}>
                            {/* Y-axis labels - same height as chart */}
                            <div style={{ width: '28px', flexShrink: 0, position: 'relative', borderBottom: '1px solid transparent' }}>
                              {yLabels.map((v, i) => {
                                const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                                return (
                                  <Fragment key={i}>
                                    <span style={{ position: 'absolute', right: '5px', top: `${topPct}%`, transform: 'translateY(-50%)', fontSize: '8px', color: '#999', lineHeight: 1, textAlign: 'right' }}>{v}</span>
                                    <div style={{ position: 'absolute', right: 0, top: `${topPct}%`, width: '4px', borderTop: '1px solid #2a2a35' }} />
                                  </Fragment>
                                )
                              })}
                            </div>
                            {/* Chart area */}
                            <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #2a2a35', borderBottom: '1px solid #2a2a35' }}>
                              {/* Horizontal grid lines - bottom line is x-axis */}
                              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                                {yLabels.map((_, i) => {
                                  const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                                  const isLast = i === yLabels.length - 1
                                  if (isLast) return null
                                  return <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${topPct}%`, borderTop: '1px solid rgba(51,51,51,0.5)' }} />
                                })}
                              </div>
                              {/* Bars */}
                              <div style={{ position: 'absolute', inset: '0', display: 'flex', alignItems: 'flex-end', gap: '6px', padding: '0 4px' }}>
                                {entries.map((item, i) => {
                                  const hPct = item.val === 0 ? 1 : Math.max((Math.abs(item.val) / niceMax) * 100, 5)
                                  const isGreen = barGraphMetric === 'winrate' || barGraphMetric === 'count' ? true : item.val >= 0
                                  const isHovered = barHover === i
                                  return (
                                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}
                                      onMouseEnter={() => setBarHover(i)}
                                      onMouseLeave={() => setBarHover(null)}
                                    >
                                      <div style={{ width: '100%', maxWidth: '50px', height: `${hPct}%`, background: `linear-gradient(to bottom, ${isGreen ? `rgba(34, 197, 94, ${0.15 + (hPct / 100) * 0.2})` : `rgba(239, 68, 68, ${0.15 + (hPct / 100) * 0.2})`} 0%, transparent 100%)`, border: `1px solid ${isGreen ? '#22c55e' : '#ef4444'}`, borderBottom: 'none', borderRadius: '3px 3px 0 0', position: 'relative', cursor: 'pointer' }}>
                                        {/* Price label at top of bar */}
                                        <div style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', color: isGreen ? '#22c55e' : '#ef4444', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.disp}</div>
                                        {isHovered && (
                                          <>
                                            <div style={{ position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', width: '10px', height: '10px', borderRadius: '50%', background: isGreen ? '#22c55e' : '#ef4444', border: '2px solid #fff', zIndex: 5 }} />
                                            <div style={{ position: 'absolute', bottom: '0px', left: 'calc(50% + 10px)', background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
                                              <div style={{ fontWeight: 700, color: '#fff', fontSize: '12px', marginBottom: '2px' }}>{item.name}</div>
                                              <div style={{ fontWeight: 600, color: isGreen ? '#22c55e' : '#ef4444' }}>{barGraphMetric === 'winrate' ? 'Winrate: ' : barGraphMetric === 'pnl' ? 'PnL: ' : barGraphMetric === 'avgpnl' ? 'Avg PnL: ' : 'Count: '}{item.disp}</div>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                          {/* X-axis row - spacer + labels with ticks */}
                          <div style={{ display: 'flex' }}>
                            <div style={{ width: '28px', flexShrink: 0 }} />
                            <div style={{ flex: 1, display: 'flex', gap: '6px', padding: '0 4px' }}>
                              {entries.map((item, i) => (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                  <div style={{ width: '1px', height: '4px', background: '#2a2a35' }} />
                                  <div style={{ marginTop: '4px', textAlign: 'center', fontSize: '10px', color: '#999', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{item.name}</div>
                                </div>
                              ))}
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
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>DIRECTION</span>
                <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 700 }}>{displayLongPct}% Long</span>
                <div style={{ flex: 1, height: '12px', borderRadius: '6px', overflow: 'hidden', display: 'flex', background: '#1a1a22' }}>
                  <div style={{ width: `${displayLongPct}%`, background: '#22c55e' }} />
                  <div style={{ width: `${100 - displayLongPct}%`, background: '#ef4444' }} />
                </div>
                <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: 700 }}>{100 - displayLongPct}% Short</span>
              </div>
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>SENTIMENT</span>
                <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 700 }}>{displayWinrate}% Bullish</span>
                <div style={{ flex: 1, height: '12px', borderRadius: '6px', overflow: 'hidden', display: 'flex', background: '#1a1a22' }}>
                  <div style={{ width: `${displayWinrate}%`, background: '#22c55e' }} />
                  <div style={{ width: `${100 - displayWinrate}%`, background: '#ef4444' }} />
                </div>
                <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: 700 }}>{100 - displayWinrate}% Bearish</span>
              </div>
            </div>

            {/* ROW 3: Net Daily PnL + Right Column (Average Rating + PnL by Day + Streaks) */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', position: 'relative', zIndex: 2 }}>
              {/* Net Daily PnL - bars fill full width */}
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>NET DAILY PNL</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#999', cursor: 'pointer', background: includeDaysNotTraded ? '#22c55e' : '#1a1a22', padding: '4px 10px', borderRadius: '4px', border: '1px solid #2a2a35' }}>
                    <span style={{ color: includeDaysNotTraded ? '#fff' : '#888' }}>{includeDaysNotTraded ? '✓' : ''}</span>
                    <input type="checkbox" checked={includeDaysNotTraded} onChange={e => setIncludeDaysNotTraded(e.target.checked)} style={{ display: 'none' }} />
                    <span style={{ color: includeDaysNotTraded ? '#fff' : '#888' }}>Include non-trading days</span>
                  </label>
                </div>
                <div style={{ height: '200px', display: 'flex', flexDirection: 'column' }}>
                  {displayDailyPnL.length === 0 ? <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No data</div> : (() => {
                    let displayData = displayDailyPnL
                    if (includeDaysNotTraded && displayDailyPnL.length > 1) {
                      const sorted = [...displayDailyPnL].sort((a, b) => new Date(a.date) - new Date(b.date))
                      const startDate = new Date(sorted[0].date)
                      const endDate = new Date(sorted[sorted.length - 1].date)
                      const pnlByDate = {}
                      displayDailyPnL.forEach(d => { pnlByDate[d.date] = d.pnl })
                      displayData = []
                      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                        const dateStr = d.toISOString().split('T')[0]
                        displayData.push({ date: dateStr, pnl: pnlByDate[dateStr] || 0 })
                      }
                    }

                    const maxAbs = Math.max(...displayData.map(x => Math.abs(x.pnl)), 1)

                    // Calculate step size to get ~6 labels (no lower padding - starts from 0)
                    const targetLabels = 6
                    const rawStep = maxAbs / (targetLabels - 1)
                    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)))
                    const normalized = rawStep / magnitude
                    let niceStep
                    if (normalized <= 1) niceStep = magnitude
                    else if (normalized <= 2) niceStep = 2 * magnitude
                    else if (normalized <= 2.5) niceStep = 2.5 * magnitude
                    else if (normalized <= 5) niceStep = 5 * magnitude
                    else niceStep = 10 * magnitude

                    const yStep = niceStep
                    const yMax = Math.ceil(maxAbs / yStep) * yStep
                    const yLabels = []
                    for (let v = yMax; v >= 0; v -= yStep) yLabels.push(Math.round(v))

                    // Format bar chart y-label with appropriate precision
                    const formatBarYLabel = (v) => {
                      if (v === 0) return '$0'
                      if (Math.abs(v) >= 1000) {
                        const needsDecimal = yStep < 1000
                        return needsDecimal ? `$${(v/1000).toFixed(1)}k` : `$${(v/1000).toFixed(0)}k`
                      }
                      return `$${v}`
                    }

                    const sortedData = [...displayData].sort((a, b) => new Date(a.date) - new Date(b.date))

                    // Generate X-axis labels - centered under each bar
                    const xLabels = []
                    if (sortedData.length > 0) {
                      const barCount = sortedData.length
                      // Show all labels if 8 or fewer bars, otherwise show every other label
                      const showEveryN = barCount <= 8 ? 1 : barCount <= 16 ? 2 : barCount <= 32 ? 4 : Math.ceil(barCount / 8)

                      for (let i = 0; i < barCount; i++) {
                        if (i % showEveryN === 0 || i === barCount - 1) {
                          const d = new Date(sortedData[i].date)
                          // Center label under bar: (index + 0.5) / totalBars * 100
                          const centerPct = ((i + 0.5) / barCount) * 100
                          xLabels.push({ label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, pct: centerPct })
                        }
                      }
                    }

                    return (
                      <>
                        {/* Chart row - Y-axis and chart area aligned */}
                        <div style={{ flex: 1, display: 'flex' }}>
                          {/* Y-axis labels - same height as chart */}
                          <div style={{ width: '28px', flexShrink: 0, position: 'relative', borderBottom: '1px solid transparent' }}>
                            {yLabels.map((v, i) => {
                              const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                              return (
                                <Fragment key={i}>
                                  <span style={{ position: 'absolute', right: '5px', top: `${topPct}%`, transform: 'translateY(-50%)', fontSize: '8px', color: '#999', lineHeight: 1, textAlign: 'right' }}>{formatBarYLabel(v)}</span>
                                  <div style={{ position: 'absolute', right: 0, top: `${topPct}%`, width: '4px', borderTop: '1px solid #2a2a35' }} />
                                </Fragment>
                              )
                            })}
                          </div>
                          {/* Chart area */}
                          <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #2a2a35', borderBottom: '1px solid #2a2a35' }}>
                            {/* Horizontal grid lines - bottom line is x-axis */}
                            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                              {yLabels.map((_, i) => {
                                const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                                const isLast = i === yLabels.length - 1
                                if (isLast) return null
                                return <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${topPct}%`, borderTop: '1px solid rgba(51,51,51,0.5)' }} />
                              })}
                            </div>
                            {/* Bars */}
                            <div style={{ position: 'absolute', inset: '0', display: 'flex', alignItems: 'flex-end', gap: '1px', padding: '0 2px' }}>
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
                                    <div style={{ width: '100%', height: hasData ? `${Math.max(hPct, 2)}%` : '2px', background: hasData ? (isPositive ? '#22c55e' : '#ef4444') : '#2a2a35', borderRadius: '6px 6px 0 0', position: 'relative' }}>
                                      {isHovered && (() => {
                                        const dayTrades = displayTrades.filter(t => t.date === d.date)
                                        return (
                                          <>
                                            <div style={{ position: 'absolute', bottom: hasData ? '4px' : '-2px', left: '50%', transform: 'translateX(-50%)', width: '10px', height: '10px', borderRadius: '50%', background: isPositive ? '#22c55e' : '#ef4444', border: '2px solid #fff', zIndex: 5 }} />
                                            <div style={{ position: 'absolute', bottom: '0px', left: 'calc(50% + 10px)', background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none', minWidth: '120px' }}>
                                              <div style={{ color: '#999', marginBottom: '4px' }}>{new Date(d.date).toLocaleDateString()}</div>
                                              {dayTrades.length > 0 ? dayTrades.map((t, ti) => {
                                                const pnl = parseFloat(t.pnl) || 0
                                                return (
                                                  <div key={ti} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: pnl >= 0 ? '#22c55e' : '#ef4444', fontWeight: 500 }}>
                                                    <span style={{ color: '#888' }}>{t.symbol}</span>
                                                    <span>{pnl >= 0 ? '+' : ''}{pnl < 0 ? '-' : ''}${Math.abs(pnl).toFixed(2)}</span>
                                                  </div>
                                                )
                                              }) : <div style={{ color: '#666' }}>No trades</div>}
                                              <div style={{ borderTop: '1px solid #2a2a35', marginTop: '4px', paddingTop: '4px', fontWeight: 700, color: hasData ? (isPositive ? '#22c55e' : '#ef4444') : '#666' }}>Total: {hasData ? ((isPositive ? '+' : '-') + '$' + Math.abs(d.pnl).toFixed(2)) : '$0'}</div>
                                            </div>
                                          </>
                                        )
                                      })()}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                        {/* X-axis row - spacer + labels */}
                        <div style={{ display: 'flex' }}>
                          <div style={{ width: '28px', flexShrink: 0 }} />
                          <div style={{ flex: 1, height: '24px', position: 'relative' }}>
                            {xLabels.map((l, i) => (
                              <div key={i} style={{ position: 'absolute', left: `${l.pct}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: '1px', height: '4px', background: '#2a2a35' }} />
                                <span style={{ fontSize: '9px', color: '#999', marginTop: '4px', whiteSpace: 'nowrap' }}>{l.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* Trade Analysis - moved from ROW 4 */}
              <div style={{ width: '420px', position: 'relative', zIndex: 0 }}>
                <div style={{ position: 'absolute', inset: '-20px', background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.15) 0%, rgba(34,197,94,0.05) 40%, transparent 70%)', borderRadius: '30px', pointerEvents: 'none', filter: 'blur(8px)' }} />
                <div style={{ position: 'relative', height: '100%', background: 'linear-gradient(145deg, #0d0d12 0%, #0a0a0e 100%)', border: '2px solid #22c55e', borderRadius: '10px', padding: '14px', boxShadow: '0 0 20px rgba(34,197,94,0.25), inset 0 1px 0 rgba(34,197,94,0.2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Trade Analysis</div>
                    <div style={{ fontSize: '9px', color: '#999' }}>{displayTrades.length} trades</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                    <select value={analysisGroupBy} onChange={e => setAnalysisGroupBy(e.target.value)} style={{ flex: 1, padding: '4px 8px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '11px', cursor: 'pointer', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }}>
                      <option value="direction">Direction</option>
                      <option value="symbol">Pair</option>
                      <option value="confidence">Confidence</option>
                      <option value="session">Session</option>
                      <option value="timeframe">Timeframe</option>
                      <option value="rating">Rating</option>
                      <option value="outcome">Outcome</option>
                      {getCustomSelectInputs().filter(i => !['direction', 'session', 'confidence', 'timeframe', 'outcome', 'symbol', 'rating'].includes(i.id)).map(inp => (
                        <option key={inp.id} value={inp.id}>{inp.label}</option>
                      ))}
                    </select>
                    <select value={analysisMetric} onChange={e => setAnalysisMetric(e.target.value)} style={{ flex: 1, padding: '4px 8px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '11px', cursor: 'pointer', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }}>
                      <option value="avgpnl">Avg PnL</option>
                      <option value="winrate">Winrate</option>
                      <option value="pnl">Total PnL</option>
                      <option value="count">Trade Count</option>
                      <option value="avgrr">Avg RR</option>
                      <option value="profitfactor">Profit Factor</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {(() => {
                      const groups = {}
                      displayTrades.forEach(t => {
                        let key
                        if (analysisGroupBy === 'direction') key = t.direction?.toUpperCase()
                        else if (analysisGroupBy === 'symbol') key = t.symbol
                        else if (analysisGroupBy === 'outcome') key = t.outcome?.toUpperCase()
                        else if (analysisGroupBy === 'rating') {
                          const rating = parseFloat(getExtraData(t).rating) || 0
                          if (rating === 0) return
                          key = rating % 1 === 0 ? `${rating}★` : `${rating}★`
                        }
                        else key = getExtraData(t)[analysisGroupBy]
                        if (!key) return
                        if (!groups[key]) groups[key] = { w: 0, l: 0, pnl: 0, count: 0, rr: 0, winPnl: 0, lossPnl: 0 }
                        groups[key].count++
                        const pnl = parseFloat(t.pnl) || 0
                        groups[key].pnl += pnl
                        groups[key].rr += parseFloat(t.rr) || 0
                        if (t.outcome === 'win') { groups[key].w++; groups[key].winPnl += pnl }
                        else if (t.outcome === 'loss') { groups[key].l++; groups[key].lossPnl += pnl }
                      })
                      let entries = Object.entries(groups)
                      if (analysisGroupBy === 'rating') {
                        entries = entries.sort((a, b) => parseFloat(b[0]) - parseFloat(a[0])).slice(0, 5)
                      } else {
                        entries = entries.slice(0, 4)
                      }
                      if (entries.length === 0) return <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>No data</div>
                      const maxCount = Math.max(...entries.map(e => e[1].count))
                      return entries.map(([name, data]) => {
                        let val, disp
                        const avgWin = data.w > 0 ? data.winPnl / data.w : 0
                        const avgLoss = data.l > 0 ? Math.abs(data.lossPnl / data.l) : 0
                        if (analysisMetric === 'avgpnl') { val = data.count > 0 ? data.pnl / data.count : 0; disp = (val >= 0 ? '+' : '') + '$' + Math.round(val) }
                        else if (analysisMetric === 'winrate') { val = (data.w + data.l) > 0 ? (data.w / (data.w + data.l)) * 100 : 0; disp = Math.round(val) + '%' }
                        else if (analysisMetric === 'pnl') { val = data.pnl; disp = (val >= 0 ? '+' : '') + '$' + Math.round(val) }
                        else if (analysisMetric === 'count') { val = data.count; disp = data.count + '' }
                        else if (analysisMetric === 'avgrr') { val = data.count > 0 ? data.rr / data.count : 0; disp = val.toFixed(1) + 'R' }
                        else if (analysisMetric === 'profitfactor') { val = avgLoss > 0 && data.l > 0 ? (avgWin * data.w) / (avgLoss * data.l) : data.w > 0 ? 999 : 0; disp = val >= 999 ? '∞' : val.toFixed(2) }
                        else { val = data.count; disp = data.count.toString() }
                        const isPositive = data.pnl >= 0
                        const wr = (data.w + data.l) > 0 ? Math.round((data.w / (data.w + data.l)) * 100) : 0
                        const barWidth = (data.count / maxCount) * 100
                        return (
                          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', background: '#0a0a0f', borderRadius: '5px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${barWidth}%`, background: isPositive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', borderRadius: '5px' }} />
                            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                                <span style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>{name}</span>
                                <span style={{ fontSize: '9px', color: '#999' }}>{data.count} • {wr}% WR</span>
                              </div>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: isPositive ? '#22c55e' : '#ef4444' }}>{disp}</span>
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* COMBINED STATS: Left 3x3 grid + Right visual widgets */}
            {(() => {
              const tradesThisWeek = displayTrades.filter(t => { const d = new Date(t.date), now = new Date(), weekAgo = new Date(now.setDate(now.getDate() - 7)); return d >= weekAgo }).length
              const localTradingDays = Object.keys(displayDailyPnL.reduce((acc, d) => { acc[d.date] = 1; return acc }, {})).length
              const tradesThisMonth = displayTrades.filter(t => { const d = new Date(t.date), now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() }).length
              const tradingWeeks = Math.max(1, Math.ceil(localTradingDays / 5))
              const dayCount = [0, 0, 0, 0, 0, 0, 0]; displayTrades.forEach(t => { dayCount[new Date(t.date).getDay()]++ })
              const dayNamesArr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
              const mostCommonDay = dayNamesArr[dayCount.indexOf(Math.max(...dayCount))]
              const greenDays = displayDailyPnL.filter(d => d.pnl > 0).length
              const redDays = displayDailyPnL.filter(d => d.pnl < 0).length
              let bestGreenStreak = 0, currGreen = 0
              ;[...displayDailyPnL].sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(d => { if (d.pnl > 0) { currGreen++; bestGreenStreak = Math.max(bestGreenStreak, currGreen) } else { currGreen = 0 } })
              const localBiggestWin = Math.max(...displayTrades.filter(t => t.outcome === 'win').map(t => parseFloat(t.pnl) || 0), 0)
              const localBiggestLoss = Math.min(...displayTrades.filter(t => t.outcome === 'loss').map(t => parseFloat(t.pnl) || 0), 0)
              const localLongTrades = displayTrades.filter(t => t.direction === 'long')
              const localShortTrades = displayTrades.filter(t => t.direction === 'short')
              const longWins = localLongTrades.filter(t => t.outcome === 'win').length
              const shortWins = localShortTrades.filter(t => t.outcome === 'win').length
              const longWr = localLongTrades.length > 0 ? Math.round((longWins / localLongTrades.length) * 100) : 0
              const shortWr = localShortTrades.length > 0 ? Math.round((shortWins / localShortTrades.length) * 100) : 0
              const longPnl = localLongTrades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0)
              const shortPnl = localShortTrades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0)
              const growth = ((displayCurrentBalance / displayStartingBalance - 1) * 100).toFixed(1)
              const firstTradeDate = displayTrades.length > 0 ? new Date(Math.min(...displayTrades.map(t => new Date(t.date)))) : null
              const accountAgeDays = firstTradeDate ? Math.floor((new Date() - firstTradeDate) / (1000 * 60 * 60 * 24)) : 0
              const accountAge = accountAgeDays > 30 ? Math.floor(accountAgeDays / 30) + 'mo' : accountAgeDays + 'd'
              const tradesWithNotes = displayTrades.filter(t => { const e = getExtraData(t); const noteContent = t.notes || e.notes || ''; return noteContent.trim().length > 0 }).length
              const tradesWithImages = displayTrades.filter(t => { const extra = getExtraData(t); const img = extra.image || extra.Image; return img && img.length > 0 }).length

              // Notes counts
              const dailyNotesCount = Object.keys(notes.daily || {}).length
              const weeklyNotesCount = Object.keys(notes.weekly || {}).length
              const customNotesCount = (notes.custom || []).length

              const StatBox = ({ label, value, color }) => <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}><span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>{label}</span><span style={{ fontSize: '14px', fontWeight: 700, color }}>{value}</span></div>
              return (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'flex-start' }}>
              {/* LEFT: 3x3 Grid */}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px', alignContent: 'start' }}>
              {/* Account */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', borderBottom: '1px solid #1a1a22', paddingBottom: '5px', fontWeight: 600 }}>Account</div>
                <StatBox label="Current Balance" value={'$' + Math.round(displayCurrentBalance).toLocaleString()} color={displayCurrentBalance >= displayStartingBalance ? '#22c55e' : '#ef4444'} />
                <StatBox label="Peak Balance" value={'$' + Math.round(peakBalance).toLocaleString()} color="#22c55e" />
                <StatBox label="Total Profit/Loss" value={(displayTotalPnl >= 0 ? '+' : '-') + '$' + Math.abs(Math.round(displayTotalPnl)).toLocaleString()} color={displayTotalPnl >= 0 ? '#22c55e' : '#ef4444'} />
                <StatBox label="Total Growth" value={growth + '%'} color={parseFloat(growth) >= 0 ? '#22c55e' : '#ef4444'} />
                <StatBox label="Weekly Growth" value={weeklyGrowth + '%'} color={parseFloat(weeklyGrowth) >= 0 ? '#22c55e' : '#ef4444'} />
                <StatBox label="Monthly Growth" value={monthlyGrowth + '%'} color={parseFloat(monthlyGrowth) >= 0 ? '#22c55e' : '#ef4444'} />
                <StatBox label="Current Drawdown" value={currentDrawdown.pct + '%'} color={parseFloat(currentDrawdown.pct) > 5 ? '#ef4444' : parseFloat(currentDrawdown.pct) > 0 ? '#f59e0b' : '#22c55e'} />
                <StatBox label="From Peak" value={peakToCurrent + '%'} color={parseFloat(peakToCurrent) >= 0 ? '#22c55e' : '#ef4444'} />
              </div>
              {/* Performance */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', borderBottom: '1px solid #1a1a22', paddingBottom: '5px', fontWeight: 600 }}>Performance</div>
                <StatBox label="Win Rate" value={displayWinrate + '%'} color={displayWinrate >= 50 ? '#22c55e' : '#ef4444'} />
                <StatBox label="Day Win Rate" value={displayDayWinrate + '%'} color={displayDayWinrate >= 50 ? '#22c55e' : '#ef4444'} />
                <StatBox label="Winning Trades" value={displayWins} color="#22c55e" />
                <StatBox label="Losing Trades" value={displayLosses} color="#ef4444" />
                <StatBox label="Breakeven Trades" value={displayTrades.filter(t => t.outcome === 'be' || t.outcome === 'breakeven').length} color="#f59e0b" />
                <StatBox label="Profit Factor" value={displayProfitFactor} color={displayProfitFactor === '-' ? '#666' : displayProfitFactor === '∞' ? '#22c55e' : parseFloat(displayProfitFactor) >= 1.5 ? '#22c55e' : parseFloat(displayProfitFactor) >= 1 ? '#fff' : '#ef4444'} />
                <StatBox label="Recovery Factor" value={recoveryFactor} color={recoveryFactor === '-' ? '#666' : recoveryFactor === '∞' ? '#22c55e' : parseFloat(recoveryFactor) >= 2 ? '#22c55e' : '#fff'} />
                <StatBox label="Trade Expectancy" value={'$' + displayExpectancy} color={parseFloat(displayExpectancy) >= 0 ? '#22c55e' : '#ef4444'} />
              </div>
              {/* Trades */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', borderBottom: '1px solid #1a1a22', paddingBottom: '5px', fontWeight: 600 }}>Trades</div>
                <StatBox label="Total Trades" value={displayTrades.length} color="#fff" />
                <StatBox label="Trades This Week" value={tradesThisWeek} color="#fff" />
                <StatBox label="Trades This Month" value={tradesThisMonth} color="#fff" />
                <StatBox label="Total Trading Days" value={localTradingDays} color="#fff" />
                <StatBox label="Average Per Day" value={localTradingDays > 0 ? (displayTrades.length / localTradingDays).toFixed(1) : '0'} color="#fff" />
                <StatBox label="Average Per Week" value={avgTradesPerWeek} color="#fff" />
                <StatBox label="Unique Pairs" value={uniqueSymbols} color="#fff" />
                <StatBox label="Most Active Day" value={mostCommonDay} color="#fff" />
              </div>
              {/* Risk & Reward */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', borderBottom: '1px solid #1a1a22', paddingBottom: '5px', fontWeight: 600 }}>Risk & Reward</div>
                <StatBox label="Average R-Multiple" value={displayAvgRR + 'R'} color={parseFloat(displayAvgRR) >= 1.5 ? '#22c55e' : '#fff'} />
                <StatBox label="Highest R-Multiple" value={highestRR + 'R'} color="#22c55e" />
                <StatBox label="Lowest R-Multiple" value={lowestRR + 'R'} color="#ef4444" />
                <StatBox label="Most Used R-Multiple" value={mostUsedRR} color="#fff" />
                <StatBox label="Best Performing R" value={mostProfitableRR} color="#22c55e" />
                <StatBox label="Win/Loss Ratio" value={(displayAvgWin / Math.max(displayAvgLoss, 1)).toFixed(2) + 'x'} color={displayAvgWin >= displayAvgLoss ? '#22c55e' : '#ef4444'} />
                <StatBox label="Expected Value" value={'$' + displayExpectancy} color={parseFloat(displayExpectancy) >= 0 ? '#22c55e' : '#ef4444'} />
                <StatBox label="Max Drawdown $" value={'$' + Math.round(currentDrawdown.amount).toLocaleString()} color={parseFloat(currentDrawdown.amount) > 0 ? '#ef4444' : '#22c55e'} />
              </div>
              {/* Win/Loss */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', borderBottom: '1px solid #1a1a22', paddingBottom: '5px', fontWeight: 600 }}>Win/Loss</div>
                <StatBox label="Average Winning Trade" value={'+$' + displayAvgWin} color="#22c55e" />
                <StatBox label="Average Losing Trade" value={'-$' + displayAvgLoss} color="#ef4444" />
                <StatBox label="Average Trade P&L" value={(displayTotalPnl / Math.max(displayTrades.length, 1) >= 0 ? '+' : '-') + '$' + Math.abs(Math.round(displayTotalPnl / Math.max(displayTrades.length, 1))).toLocaleString()} color={displayTotalPnl >= 0 ? '#22c55e' : '#ef4444'} />
                <StatBox label="Largest Profit" value={'+$' + Math.round(localBiggestWin).toLocaleString()} color="#22c55e" />
                <StatBox label="Largest Loss" value={'-$' + Math.abs(Math.round(localBiggestLoss)).toLocaleString()} color="#ef4444" />
                <StatBox label="Gross Profit" value={'+$' + Math.round(grossProfit).toLocaleString()} color="#22c55e" />
                <StatBox label="Gross Loss" value={'-$' + Math.round(grossLoss).toLocaleString()} color="#ef4444" />
                <StatBox label="Largest Win Streak $" value={'+$' + Math.round(displayStreaks.mw > 0 ? displayTrades.filter(t => t.outcome === 'win').slice(0, displayStreaks.mw).reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0) : 0).toLocaleString()} color="#22c55e" />
              </div>
              {/* Direction */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', borderBottom: '1px solid #1a1a22', paddingBottom: '5px', fontWeight: 600 }}>Direction</div>
                <StatBox label="Best Direction" value={bestDirection} color={bestDirection === 'Long' ? '#22c55e' : '#ef4444'} />
                <StatBox label="Long Trades" value={displayTrades.filter(t => t.direction === 'long').length} color="#22c55e" />
                <StatBox label="Short Trades" value={displayTrades.filter(t => t.direction === 'short').length} color="#ef4444" />
                <StatBox label="Long Win Rate" value={longWr + '%'} color={longWr >= 50 ? '#22c55e' : '#ef4444'} />
                <StatBox label="Long Profit/Loss" value={(longPnl >= 0 ? '+' : '') + '$' + Math.round(longPnl).toLocaleString()} color={longPnl >= 0 ? '#22c55e' : '#ef4444'} />
                <StatBox label="Long Profit Factor" value={longPF} color={longPF === '∞' ? '#22c55e' : parseFloat(longPF) >= 1.5 ? '#22c55e' : '#fff'} />
                <StatBox label="Short Win Rate" value={shortWr + '%'} color={shortWr >= 50 ? '#22c55e' : '#ef4444'} />
                <StatBox label="Short Profit Factor" value={shortPF} color={shortPF === '∞' ? '#22c55e' : parseFloat(shortPF) >= 1.5 ? '#22c55e' : '#fff'} />
              </div>
              {/* Streaks */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', borderBottom: '1px solid #1a1a22', paddingBottom: '5px', fontWeight: 600 }}>Streaks</div>
                <StatBox label="Current Trade Streak" value={(displayStreaks.cs >= 0 ? '+' : '') + displayStreaks.cs} color={displayStreaks.cs >= 0 ? '#22c55e' : '#ef4444'} />
                <StatBox label="Max Consecutive Wins" value={'+' + displayStreaks.mw} color="#22c55e" />
                <StatBox label="Max Consecutive Losses" value={'-' + displayStreaks.ml} color="#ef4444" />
                <StatBox label="Average Win Streak" value={avgWinStreak} color="#22c55e" />
                <StatBox label="Winning Days" value={greenDays} color="#22c55e" />
                <StatBox label="Losing Days" value={redDays} color="#ef4444" />
                <StatBox label="Breakeven Days" value={beDays} color="#f59e0b" />
                <StatBox label="Best Day Streak" value={'+' + bestGreenStreak} color="#22c55e" />
              </div>
              {/* Overview */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', borderBottom: '1px solid #1a1a22', paddingBottom: '5px', fontWeight: 600 }}>Overview</div>
                <StatBox label="Consistency Score" value={displayDayWinrate + '%'} color={displayDayWinrate >= 60 ? '#22c55e' : displayDayWinrate >= 50 ? '#fff' : '#ef4444'} />
                <StatBox label="Average Daily P&L" value={localTradingDays > 0 ? (displayTotalPnl / localTradingDays >= 0 ? '+' : '-') + '$' + Math.abs(Math.round(displayTotalPnl / localTradingDays)).toLocaleString() : '-'} color={displayTotalPnl >= 0 ? '#22c55e' : '#ef4444'} />
                <StatBox label="Best Profitable Day" value={bestDay ? `+$${Math.round(bestDay.pnl).toLocaleString()}` : '-'} color="#22c55e" />
                <StatBox label="Worst Losing Day" value={worstDay ? `$${Math.round(worstDay.pnl).toLocaleString()}` : '-'} color="#ef4444" />
                <StatBox label="Most Traded Pair" value={mostTradedPair} color="#fff" />
                <StatBox label="Average Trend" value={avgTrend} color="#fff" />
                <StatBox label="Best Session" value={(() => { const s = {}; displayTrades.forEach(t => { if (t.session) { if (!s[t.session]) s[t.session] = 0; s[t.session] += parseFloat(t.pnl) || 0 } }); const best = Object.entries(s).sort((a, b) => b[1] - a[1])[0]; return best ? best[0] : '-' })()} color="#fff" />
                <StatBox label="Account Age" value={accountAge} color="#fff" />
              </div>
              {/* Notes & Images */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '10px 12px' }}>
                <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', borderBottom: '1px solid #1a1a22', paddingBottom: '5px', fontWeight: 600 }}>Notes & Images</div>
                <StatBox label="Trades With Notes" value={tradesWithNotes} color="#fff" />
                <StatBox label="Notes Completion Rate" value={displayTrades.length > 0 ? Math.round((tradesWithNotes / displayTrades.length) * 100) + '%' : '0%'} color={tradesWithNotes / Math.max(displayTrades.length, 1) >= 0.5 ? '#22c55e' : '#fff'} />
                <StatBox label="Trades With Images" value={tradesWithImages} color="#fff" />
                <StatBox label="Image Completion Rate" value={displayTrades.length > 0 ? Math.round((tradesWithImages / displayTrades.length) * 100) + '%' : '0%'} color={tradesWithImages / Math.max(displayTrades.length, 1) >= 0.3 ? '#22c55e' : '#fff'} />
                <StatBox label="Daily Notes" value={dailyNotesCount} color="#fff" />
                <StatBox label="Weekly Notes" value={weeklyNotesCount} color="#fff" />
                <StatBox label="Custom Notes" value={customNotesCount} color="#fff" />
                <StatBox label="Total Notes" value={dailyNotesCount + weeklyNotesCount + customNotesCount} color="#fff" />
              </div>
              {/* Prop Firm Challenge Progress */}
              {viewMode === 'this' && challengeStatus && (
                <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px', gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ background: challengeStatus.color, padding: '3px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, color: '#fff', textTransform: 'uppercase' }}>{challengeStatus.status}</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Prop Firm Challenge</span>
                    <span style={{ fontSize: '11px', color: '#666', marginLeft: 'auto' }}>{challengeStatus.reason}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                    {/* Profit Target Progress */}
                    {account?.profit_target && (
                      <div>
                        <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>Profit Target ({account.profit_target}%)</div>
                        <div style={{ background: '#1a1a22', borderRadius: '4px', height: '10px', overflow: 'hidden', marginBottom: '6px' }}>
                          <div style={{ width: `${Math.min(100, distanceFromTarget?.passed ? 100 : ((totalPnl / (startingBalance * account.profit_target / 100)) * 100) || 0)}%`, height: '100%', background: distanceFromTarget?.passed ? '#22c55e' : '#3b82f6', transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                          <span style={{ color: '#aaa' }}>${Math.round(totalPnl).toLocaleString()} / ${Math.round(startingBalance * account.profit_target / 100).toLocaleString()}</span>
                          <span style={{ color: distanceFromTarget?.passed ? '#22c55e' : '#3b82f6', fontWeight: 600 }}>{distanceFromTarget?.passed ? 'PASSED' : `${distanceFromTarget?.pct || '0'}% to go`}</span>
                        </div>
                      </div>
                    )}
                    {/* Legacy Drawdown Status (only show if new max DD not enabled) */}
                    {propFirmDrawdown && !account?.max_dd_enabled && (
                      <div>
                        <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>{propFirmDrawdown.ddType === 'trailing' ? 'Trailing' : 'Max'} Drawdown ({account.max_drawdown}%){propFirmDrawdown.ddType === 'trailing' && <span style={{ marginLeft: '4px', fontSize: '9px', color: '#666' }}>({propFirmDrawdown.trailingMode === 'eod' ? 'EOD' : 'Real-time'})</span>}</div>
                        <div style={{ background: '#1a1a22', borderRadius: '4px', height: '10px', overflow: 'hidden', marginBottom: '6px' }}>
                          <div style={{ width: `${propFirmDrawdown.usedPct}%`, height: '100%', background: propFirmDrawdown.breached ? '#ef4444' : propFirmDrawdown.usedPct > 80 ? '#ef4444' : propFirmDrawdown.usedPct > 50 ? '#f59e0b' : '#22c55e', transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                          <span style={{ color: '#aaa' }}>Floor: ${Math.round(propFirmDrawdown.floor).toLocaleString()}</span>
                          <span style={{ color: propFirmDrawdown.breached ? '#ef4444' : propFirmDrawdown.remaining < 0 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{propFirmDrawdown.breached ? 'BREACHED' : `$${Math.round(propFirmDrawdown.remaining).toLocaleString()} remaining`}</span>
                        </div>
                      </div>
                    )}
                    {/* Daily Drawdown Status (orange) */}
                    {dailyDdStats && (
                      <div>
                        <div style={{ fontSize: '10px', color: '#f97316', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>Daily Drawdown ({dailyDdStats.pct}%)</div>
                        <div style={{ background: '#1a1a22', borderRadius: '4px', height: '10px', overflow: 'hidden', marginBottom: '6px' }}>
                          <div style={{ width: `${dailyDdStats.usedPct}%`, height: '100%', background: dailyDdStats.breached ? '#ef4444' : dailyDdStats.usedPct > 80 ? '#f97316' : dailyDdStats.usedPct > 50 ? '#f59e0b' : '#22c55e', transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                          <span style={{ color: '#aaa' }}>Floor: ${Math.round(dailyDdStats.floor).toLocaleString()}</span>
                          <span style={{ color: dailyDdStats.breached ? '#ef4444' : dailyDdStats.remaining < 0 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{dailyDdStats.breached ? 'BREACHED' : `$${Math.round(dailyDdStats.remaining).toLocaleString()} remaining`}</span>
                        </div>
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>Today's start: ${Math.round(dailyDdStats.todayStart).toLocaleString()}</div>
                      </div>
                    )}
                    {/* Max Drawdown Status (red) */}
                    {maxDdStats && (
                      <div>
                        <div style={{ fontSize: '10px', color: '#ef4444', marginBottom: '6px', textTransform: 'uppercase', fontWeight: 600 }}>{maxDdStats.ddType === 'trailing' ? 'Trailing' : 'Max'} Drawdown ({maxDdStats.pct}%){maxDdStats.ddType === 'trailing' && <span style={{ marginLeft: '4px', fontSize: '9px', color: '#666' }}>({maxDdStats.stopsAt === 'initial' ? 'Stops at initial' : maxDdStats.stopsAt === 'buffer' ? 'Stops at buffer' : 'Always trails'})</span>}</div>
                        <div style={{ background: '#1a1a22', borderRadius: '4px', height: '10px', overflow: 'hidden', marginBottom: '6px' }}>
                          <div style={{ width: `${maxDdStats.usedPct}%`, height: '100%', background: maxDdStats.breached ? '#ef4444' : maxDdStats.usedPct > 80 ? '#ef4444' : maxDdStats.usedPct > 50 ? '#f59e0b' : '#22c55e', transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                          <span style={{ color: '#aaa' }}>Floor: ${Math.round(maxDdStats.floor).toLocaleString()}</span>
                          <span style={{ color: maxDdStats.breached ? '#ef4444' : maxDdStats.remaining < 0 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{maxDdStats.breached ? 'BREACHED' : `$${Math.round(maxDdStats.remaining).toLocaleString()} remaining`}</span>
                        </div>
                      </div>
                    )}
                    {/* Consistency Rule */}
                    {consistencyCheck && (
                      <div>
                        <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>Consistency Rule ({consistencyCheck.pct}%)</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', color: consistencyCheck.passed ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{consistencyCheck.passed ? '✓ Passing' : `✗ ${consistencyCheck.violations.length} violation(s)`}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#666' }}>Max per day: ${Math.round(consistencyCheck.maxAllowed).toLocaleString()}</div>
                        {!consistencyCheck.passed && consistencyCheck.violations.length > 0 && (
                          <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px' }}>
                            {consistencyCheck.violations.slice(0, 2).map((v, i) => <div key={i}>{new Date(v.date).toLocaleDateString()} - ${Math.round(v.pnl)} (limit: ${Math.round(v.limit)})</div>)}
                            {consistencyCheck.violations.length > 2 && <div>+{consistencyCheck.violations.length - 2} more</div>}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Current Status */}
                    <div>
                      <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>Current Balance</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: currentBalance >= startingBalance ? '#22c55e' : '#ef4444', marginBottom: '4px' }}>${Math.round(currentBalance).toLocaleString()}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>Started: ${Math.round(startingBalance).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              )}
              {/* Multi-Account Prop Firm Stats */}
              {viewMode !== 'this' && (() => {
                const accountsToShow = viewMode === 'selected' && selectedJournalIds.size > 0
                  ? allAccounts.filter(acc => selectedJournalIds.has(acc.id))
                  : allAccounts
                const propFirmAccounts = accountsToShow.filter(acc => acc.profit_target || acc.max_drawdown || acc.consistency_enabled || acc.daily_dd_enabled || acc.max_dd_enabled)
                if (propFirmAccounts.length === 0) return null

                // Calculate stats for each account
                const accountStats = propFirmAccounts.map(acc => {
                  const accTrades = allAccountsTrades[acc.id] || []
                  const accStartBal = parseFloat(acc.starting_balance) || 0
                  const accTotalPnl = accTrades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
                  const accCurrentBal = accStartBal + accTotalPnl

                  // Profit target calc
                  let profitTargetPct = null
                  let profitTargetPassed = false
                  if (acc.profit_target) {
                    const targetAmount = accStartBal * (parseFloat(acc.profit_target) / 100)
                    profitTargetPct = targetAmount > 0 ? Math.min(100, (accTotalPnl / targetAmount) * 100) : 0
                    profitTargetPassed = accTotalPnl >= targetAmount
                  }

                  // Legacy Drawdown calc (only if new max DD not enabled)
                  let ddStatus = null
                  if (acc.max_drawdown && !acc.max_dd_enabled) {
                    const maxDDPct = parseFloat(acc.max_drawdown) || 0
                    const ddType = acc.drawdown_type || 'static'
                    const trailingMode = acc.trailing_mode || 'eod'
                    let floor = accStartBal * (1 - maxDDPct / 100)
                    let breached = false

                    if (accTrades.length > 0) {
                      const sorted = [...accTrades].sort((a, b) => new Date(a.date) - new Date(b.date))
                      if (ddType === 'static') {
                        let runningBal = accStartBal
                        sorted.forEach(t => {
                          runningBal += parseFloat(t.pnl) || 0
                          if (!breached && runningBal < floor) breached = true
                        })
                      } else {
                        if (trailingMode === 'eod') {
                          const byDay = {}
                          let runningBal = accStartBal
                          sorted.forEach(t => { runningBal += parseFloat(t.pnl) || 0; byDay[t.date] = runningBal })
                          let peakEOD = accStartBal
                          Object.entries(byDay).sort((a, b) => new Date(a[0]) - new Date(b[0])).forEach(([_, balance]) => {
                            if (balance > peakEOD) { peakEOD = balance; floor = peakEOD * (1 - maxDDPct / 100) }
                            if (!breached && balance < floor) breached = true
                          })
                        } else {
                          let runningBal = accStartBal, peak = accStartBal
                          sorted.forEach(t => {
                            runningBal += parseFloat(t.pnl) || 0
                            if (runningBal > peak) { peak = runningBal; floor = peak * (1 - maxDDPct / 100) }
                            if (!breached && runningBal < floor) breached = true
                          })
                        }
                      }
                    }

                    const remaining = accCurrentBal - floor
                    const maxAllowedDD = accStartBal * (maxDDPct / 100)
                    ddStatus = { floor, remaining, breached, ddType, trailingMode, maxDDPct }
                  }

                  // Daily Drawdown calc (orange) - with reset time support
                  let dailyDdStatus = null
                  if (acc.daily_dd_enabled) {
                    const pct = parseFloat(acc.daily_dd_pct)
                    if (!isNaN(pct) && pct > 0) {
                      const dailyDdResetTime = acc.daily_dd_reset_time || '00:00'
                      const resetParts = dailyDdResetTime.split(':')
                      const resetHour = parseInt(resetParts[0]) || 0
                      const resetMin = parseInt(resetParts[1]) || 0

                      const getTradingDay = (date, time) => {
                        if (!date) return null
                        const tradeDateTime = new Date(`${date}T${time || '12:00'}`)
                        if (isNaN(tradeDateTime.getTime())) return new Date(date).toDateString()
                        const tradeHour = tradeDateTime.getHours()
                        const tradeMinute = tradeDateTime.getMinutes()
                        if (tradeHour < resetHour || (tradeHour === resetHour && tradeMinute < resetMin)) {
                          const prevDay = new Date(tradeDateTime)
                          prevDay.setDate(prevDay.getDate() - 1)
                          return prevDay.toDateString()
                        }
                        return tradeDateTime.toDateString()
                      }

                      const now = new Date()
                      const currentTradingDay = getTradingDay(now.toISOString().split('T')[0], `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)

                      const sorted = [...accTrades].sort((a, b) => new Date(a.date) - new Date(b.date))
                      let todayStart = accStartBal
                      let runningBal = accStartBal
                      sorted.forEach(t => {
                        const tradingDay = getTradingDay(t.date, t.time)
                        if (tradingDay !== currentTradingDay) {
                          runningBal += parseFloat(t.pnl) || 0
                        }
                      })
                      todayStart = runningBal
                      const floor = todayStart * (1 - pct / 100)
                      const remaining = accCurrentBal - floor
                      const breached = accCurrentBal < floor
                      dailyDdStatus = { floor, remaining, breached, todayStart, pct }
                    }
                  }

                  // Max Drawdown calc (red - new system)
                  let maxDdStatus = null
                  if (acc.max_dd_enabled) {
                    const pct = parseFloat(acc.max_dd_pct)
                    if (!isNaN(pct) && pct > 0) {
                      const ddType = acc.max_dd_type || 'static'
                      const stopsAt = acc.max_dd_trailing_stops_at || 'never'
                      const sorted = [...accTrades].sort((a, b) => new Date(a.date) - new Date(b.date))
                      let floor = accStartBal * (1 - pct / 100)
                      let breached = false

                      if (ddType === 'static') {
                        let runningBal = accStartBal
                        sorted.forEach(t => {
                          runningBal += parseFloat(t.pnl) || 0
                          if (!breached && runningBal < floor) breached = true
                        })
                      } else {
                        let peak = accStartBal
                        let runningBal = accStartBal
                        sorted.forEach(t => {
                          runningBal += parseFloat(t.pnl) || 0
                          if (runningBal > peak) {
                            peak = runningBal
                            const newFloor = peak * (1 - pct / 100)
                            if (stopsAt === 'initial' && newFloor >= accStartBal) {
                              floor = accStartBal
                            } else if (stopsAt === 'buffer') {
                              const buffer = accStartBal * 1.05
                              floor = newFloor >= buffer ? buffer : newFloor
                            } else {
                              floor = newFloor
                            }
                          }
                          if (!breached && runningBal < floor) breached = true
                        })
                      }

                      const remaining = accCurrentBal - floor
                      maxDdStatus = { floor, remaining, breached, pct, ddType, stopsAt }
                    }
                  }

                  // Consistency calc
                  let conStatus = null
                  if (acc.consistency_enabled) {
                    const pct = parseFloat(acc.consistency_pct) || 30
                    const profitTotal = Math.max(0, accTotalPnl)
                    const maxAllowedPerDay = profitTotal > 0 ? profitTotal * (pct / 100) : 0
                    const dailyPnL = {}
                    accTrades.forEach(t => { dailyPnL[t.date] = (dailyPnL[t.date] || 0) + (parseFloat(t.pnl) || 0) })
                    const violations = Object.entries(dailyPnL).filter(([_, pnl]) => pnl > maxAllowedPerDay && maxAllowedPerDay > 0)
                    conStatus = { passed: violations.length === 0, violations: violations.length, maxAllowed: maxAllowedPerDay, pct }
                  }

                  // Overall status
                  let status = 'IN PROGRESS', statusColor = '#f59e0b'
                  if (ddStatus?.breached || dailyDdStatus?.breached || maxDdStatus?.breached || (conStatus && !conStatus.passed)) {
                    status = 'FAILED'; statusColor = '#ef4444'
                  } else if (profitTargetPassed) {
                    status = 'PASSED'; statusColor = '#22c55e'
                  }

                  return { acc, accCurrentBal, accStartBal, accTotalPnl, profitTargetPct, profitTargetPassed, ddStatus, dailyDdStatus, maxDdStatus, conStatus, status, statusColor }
                })

                // Summary counts
                const passedCount = accountStats.filter(s => s.status === 'PASSED').length
                const failedCount = accountStats.filter(s => s.status === 'FAILED').length
                const inProgressCount = accountStats.filter(s => s.status === 'IN PROGRESS').length

                return (
                  <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px', gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Prop Firm Challenges ({accountStats.length})</span>
                      <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                        {passedCount > 0 && <span style={{ background: '#22c55e', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, color: '#fff' }}>{passedCount} PASSED</span>}
                        {inProgressCount > 0 && <span style={{ background: '#f59e0b', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, color: '#fff' }}>{inProgressCount} IN PROGRESS</span>}
                        {failedCount > 0 && <span style={{ background: '#ef4444', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, color: '#fff' }}>{failedCount} FAILED</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {accountStats.map(({ acc, accCurrentBal, accStartBal, accTotalPnl, profitTargetPct, profitTargetPassed, ddStatus, dailyDdStatus, maxDdStatus, conStatus, status, statusColor }) => (
                        <div key={acc.id} style={{ background: '#141418', border: `1px solid ${statusColor}33`, borderRadius: '6px', padding: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                            <span style={{ background: statusColor, padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 600, color: '#fff' }}>{status}</span>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>{acc.name}</span>
                            <span style={{ fontSize: '11px', color: accCurrentBal >= accStartBal ? '#22c55e' : '#ef4444', marginLeft: 'auto' }}>${Math.round(accCurrentBal).toLocaleString()}</span>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', fontSize: '11px' }}>
                            {acc.profit_target && (
                              <div style={{ background: '#0d0d12', padding: '8px 10px', borderRadius: '4px' }}>
                                <div style={{ color: '#666', fontSize: '10px', marginBottom: '2px' }}>Profit Target ({acc.profit_target}%)</div>
                                <span style={{ color: profitTargetPassed ? '#22c55e' : '#3b82f6', fontWeight: 600 }}>{profitTargetPassed ? '✓ PASSED' : `${Math.round(profitTargetPct || 0)}% complete`}</span>
                              </div>
                            )}
                            {ddStatus && (
                              <div style={{ background: '#0d0d12', padding: '8px 10px', borderRadius: '4px' }}>
                                <div style={{ color: '#666', fontSize: '10px', marginBottom: '2px' }}>{ddStatus.ddType === 'trailing' ? 'Trailing' : 'Max'} DD ({ddStatus.maxDDPct}%)</div>
                                <span style={{ color: ddStatus.breached ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{ddStatus.breached ? '✗ BREACHED' : `$${Math.round(ddStatus.remaining).toLocaleString()} left`}</span>
                              </div>
                            )}
                            {dailyDdStatus && (
                              <div style={{ background: '#0d0d12', padding: '8px 10px', borderRadius: '4px', borderLeft: '2px solid #f97316' }}>
                                <div style={{ color: '#f97316', fontSize: '10px', marginBottom: '2px' }}>Daily DD ({dailyDdStatus.pct}%)</div>
                                <span style={{ color: dailyDdStatus.breached ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{dailyDdStatus.breached ? '✗ BREACHED' : `$${Math.round(dailyDdStatus.remaining).toLocaleString()} left`}</span>
                              </div>
                            )}
                            {maxDdStatus && (
                              <div style={{ background: '#0d0d12', padding: '8px 10px', borderRadius: '4px', borderLeft: '2px solid #ef4444' }}>
                                <div style={{ color: '#ef4444', fontSize: '10px', marginBottom: '2px' }}>{maxDdStatus.ddType === 'trailing' ? 'Trailing' : 'Max'} DD ({maxDdStatus.pct}%)</div>
                                <span style={{ color: maxDdStatus.breached ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{maxDdStatus.breached ? '✗ BREACHED' : `$${Math.round(maxDdStatus.remaining).toLocaleString()} left`}</span>
                              </div>
                            )}
                            {conStatus && (
                              <div style={{ background: '#0d0d12', padding: '8px 10px', borderRadius: '4px' }}>
                                <div style={{ color: '#666', fontSize: '10px', marginBottom: '2px' }}>Consistency ({conStatus.pct}%)</div>
                                <span style={{ color: conStatus.passed ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{conStatus.passed ? '✓ PASSING' : `✗ ${conStatus.violations} violation${conStatus.violations > 1 ? 's' : ''}`}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
              </div>
              {/* RIGHT: Visual widgets stacked */}
              <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Pair Analysis */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', borderBottom: '1px solid #1a1a22', paddingBottom: '5px', fontWeight: 600 }}>Pair Analysis</div>
                <select value={pairAnalysisType} onChange={e => setPairAnalysisType(e.target.value)} style={{ width: '100%', padding: '4px 8px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '11px', cursor: 'pointer', boxShadow: '0 0 4px rgba(255,255,255,0.1)', marginBottom: '10px' }}>
                  <option value="best">Best Pair</option>
                  <option value="worst">Worst Pair</option>
                  <option value="most">Most Traded</option>
                </select>
                {(() => { const ps = {}; displayTrades.forEach(t => { if (!ps[t.symbol]) ps[t.symbol] = { w: 0, l: 0, pnl: 0, count: 0, rrs: [], wins: [], losses: [] }; if (t.outcome === 'win') { ps[t.symbol].w++; ps[t.symbol].wins.push(parseFloat(t.pnl) || 0) } else if (t.outcome === 'loss') { ps[t.symbol].l++; ps[t.symbol].losses.push(Math.abs(parseFloat(t.pnl)) || 0) }; ps[t.symbol].pnl += parseFloat(t.pnl) || 0; ps[t.symbol].count++; if (t.rr) ps[t.symbol].rrs.push(parseFloat(t.rr)) }); let selected; if (pairAnalysisType === 'best') selected = Object.entries(ps).sort((a, b) => b[1].pnl - a[1].pnl)[0]; else if (pairAnalysisType === 'worst') selected = Object.entries(ps).sort((a, b) => a[1].pnl - b[1].pnl)[0]; else selected = Object.entries(ps).sort((a, b) => b[1].count - a[1].count)[0]; if (!selected) return <div style={{ color: '#999', textAlign: 'center', fontSize: '12px' }}>No data</div>; const data = selected[1]; const wr = data.w + data.l > 0 ? Math.round((data.w / (data.w + data.l)) * 100) : 0; const pairAvgRR = data.rrs.length > 0 ? (data.rrs.reduce((a, b) => a + b, 0) / data.rrs.length).toFixed(1) : '-'; const totalWins = data.wins.reduce((a, b) => a + b, 0); const totalLosses = data.losses.reduce((a, b) => a + b, 0); const pf = totalLosses > 0 ? (totalWins / totalLosses).toFixed(2) : totalWins > 0 ? '∞' : '-'; const size = 80, stroke = 7, r = (size - stroke) / 2, c = 2 * Math.PI * r; return (<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}><div style={{ position: 'relative', width: size, height: size }}><svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ef4444" strokeWidth={stroke} /><circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#22c55e" strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c * (1 - wr/100)} strokeLinecap="butt" /></svg><div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>{selected[0]}</div><div style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e' }}>{wr}%</div></div></div><div style={{ display: 'flex', gap: '10px', marginTop: '8px', fontSize: '11px' }}><span><span style={{ color: '#22c55e' }}>●</span> Win</span><span><span style={{ color: '#ef4444' }}>●</span> Loss</span></div><div style={{ marginTop: '10px', width: '100%' }}><StatBox label="PnL" value={(data.pnl >= 0 ? '+' : '') + '$' + Math.round(data.pnl)} color={data.pnl >= 0 ? '#22c55e' : '#ef4444'} /><StatBox label="Avg RR" value={pairAvgRR} color="#fff" /><StatBox label="Profit Factor" value={pf} color="#fff" /></div></div>) })()}
              </div>
              {/* Avg Rating */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', borderBottom: '1px solid #1a1a22', paddingBottom: '5px', fontWeight: 600, alignSelf: 'stretch' }}>Avg Rating</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '3px' }}>{[1,2,3,4,5].map(star => { const rating = parseFloat(displayAvgRating); const isFullStar = rating >= star; const isHalfStar = rating >= star - 0.5 && rating < star; return (<div key={star} style={{ position: 'relative', width: '20px', height: '20px' }}><span style={{ position: 'absolute', color: '#1a1a22', fontSize: '20px', lineHeight: 1 }}>★</span>{isHalfStar && <span style={{ position: 'absolute', color: '#22c55e', fontSize: '20px', lineHeight: 1, width: '10px', overflow: 'hidden', filter: 'drop-shadow(0 0 4px rgba(34,197,94,0.5))' }}>★</span>}{isFullStar && <span style={{ position: 'absolute', color: '#22c55e', fontSize: '20px', lineHeight: 1, filter: 'drop-shadow(0 0 4px rgba(34,197,94,0.5))' }}>★</span>}</div>) })}</div>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>{displayAvgRating}</span>
                </div>
              </div>
              {/* Weekly PnL */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '10px 14px' }}>
                <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', borderBottom: '1px solid #1a1a22', paddingBottom: '5px', fontWeight: 600 }}>Weekly PnL</div>
                {(() => { const dayNames = ['M', 'T', 'W', 'T', 'F']; const dayPnL = [0, 0, 0, 0, 0]; displayTrades.forEach(t => { const day = new Date(t.date).getDay(); if (day >= 1 && day <= 5) dayPnL[day - 1] += parseFloat(t.pnl) || 0 }); const maxAbs = Math.max(...dayPnL.map(p => Math.abs(p)), 1); return (<div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>{dayPnL.map((pnl, i) => { const heightPct = Math.max(Math.min((Math.abs(pnl) / maxAbs) * 100, 100), 8); const isPositive = pnl >= 0; const color = isPositive ? '#22c55e' : '#ef4444'; return (<div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}><div style={{ fontSize: '10px', fontWeight: 600, color: pnl === 0 ? '#444' : color }}>{pnl !== 0 ? (pnl >= 0 ? '+' : '') + Math.round(pnl) : '0'}</div><div style={{ width: '100%', height: '24px', background: '#1a1a22', borderRadius: '3px', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}><div style={{ width: '100%', height: pnl === 0 ? '2px' : `${heightPct}%`, background: pnl === 0 ? '#2a2a35' : color, borderRadius: '2px', opacity: pnl === 0 ? 1 : 0.8 }} /></div><div style={{ fontSize: '9px', fontWeight: 600, color: '#666' }}>{dayNames[i]}</div></div>) })}</div>) })()}
              </div>
              {/* AI Insight */}
              {trades.length >= 5 && (() => { const pf = parseFloat(profitFactor) || 0; const rr = parseFloat(avgRR) || 0; let insight = ''; if (winrate >= 60 && pf >= 2) insight = `Outstanding! ${winrate}% WR with ${profitFactor} profit factor.`; else if (winrate >= 50 && pf >= 1.5) insight = `Solid edge: ${winrate}% WR, ${profitFactor} profit factor.`; else if (winrate < 40) insight = `${winrate}% WR needs work. Focus on A+ setups.`; else insight = `${winrate}% WR is decent. Stay consistent.`; if (rr >= 2) insight += ` Great ${avgRR}R avg!`; if (streaks.cs < -3) insight = `On a ${Math.abs(streaks.cs)}-loss streak. Reduce size.`; return (<div style={{ flex: 1, background: 'linear-gradient(180deg, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0.03) 100%)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '8px', padding: '14px', display: 'flex', flexDirection: 'column' }}><div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}><span style={{ fontSize: '14px' }}>✨</span><span style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI Insight</span></div><span style={{ fontSize: '12px', color: '#ccc', lineHeight: 1.5 }}>{insight}</span></div>) })()}
              </div>
            </div>
              )
            })()}


                      </div>
          )
        })()}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div style={{ padding: isMobile ? '0' : '8px 16px 16px 12px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              {['daily', 'weekly', 'custom'].map(sub => (
                <button key={sub} onClick={() => setNotesSubTab(sub)} style={{ padding: '12px 24px', background: notesSubTab === sub ? '#22c55e' : 'transparent', border: notesSubTab === sub ? 'none' : '1px solid #2a2a35', borderRadius: '8px', color: notesSubTab === sub ? '#fff' : '#888', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{sub}</button>
              ))}
            </div>

            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: '#999', textTransform: 'uppercase' }}>Write {notesSubTab} Note</span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {notesSubTab === 'custom' && <input type="text" placeholder="Note title..." value={customNoteTitle} onChange={e => setCustomNoteTitle(e.target.value)} maxLength={100} style={{ padding: '8px 12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '160px' }} />}
                  <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} style={{ padding: '8px 12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px' }} />
                </div>
              </div>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} maxLength={10000} placeholder={`Write your ${notesSubTab} note...`} style={{ width: '100%', minHeight: '140px', padding: '14px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', lineHeight: '1.6', resize: 'vertical', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button onClick={saveNote} disabled={!noteText.trim()} style={{ padding: '12px 24px', background: noteText.trim() ? '#22c55e' : '#1a1a22', border: 'none', borderRadius: '8px', color: noteText.trim() ? '#fff' : '#666', fontWeight: 600, fontSize: '14px', cursor: noteText.trim() ? 'pointer' : 'not-allowed' }}>Save Note</button>
              </div>
            </div>

            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '12px' }}>
              <span style={{ fontSize: '13px', color: '#999', textTransform: 'uppercase' }}>{notesSubTab} Notes</span>
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
                {notesSubTab === 'custom' ? (
                  (notes.custom || []).length === 0 ? <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>No custom notes yet.</div> : (notes.custom || []).map((note, idx) => (
                    <div key={idx} style={{ padding: '12px', background: '#0a0a0e', borderRadius: '8px', border: '1px solid #1a1a22' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '14px', color: '#22c55e', fontWeight: 600 }}>{note.title}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '12px', color: '#999' }}>{new Date(note.date).toLocaleDateString()}</span>
                          <button onClick={() => deleteNote('custom', idx)} style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', fontSize: '16px' }}>×</button>
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', color: '#fff', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{note.text}</div>
                    </div>
                  ))
                ) : (
                  Object.keys(notes[notesSubTab] || {}).length === 0 ? <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>No {notesSubTab} notes yet.</div> : Object.entries(notes[notesSubTab] || {}).sort((a, b) => new Date(b[0]) - new Date(a[0])).map(([date, text]) => (
                    <div key={date} style={{ padding: '12px', background: '#0a0a0e', borderRadius: '8px', border: '1px solid #1a1a22' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontSize: '14px', color: '#22c55e', fontWeight: 600 }}>{new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        <button onClick={() => deleteNote(notesSubTab, date)} style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', fontSize: '16px' }}>×</button>
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

      {/* FILTERS MODAL */}
      {showFilters && (() => {
        // Get inputs based on whether viewing all journals or single journal
        const filterInputs = showCumulativeStats && allAccounts.length > 1 ? mergedInputsForAllJournals : inputs
        // Get custom inputs that can be filtered (exclude fixed fields that are already in the UI)
        const customFilterInputs = filterInputs.filter(i =>
          i.enabled && !i.hidden &&
          !['symbol', 'outcome', 'pnl', 'riskPercent', 'rr', 'date', 'direction', 'rating', 'confidence', 'timeframe', 'session'].includes(i.id)
        )
        // Calculate preview count
        const previewCount = baseTradesToFilter.filter(t => {
          if (draftFilters.dateFrom && t.date < draftFilters.dateFrom) return false
          if (draftFilters.dateTo && t.date > draftFilters.dateTo) return false
          if (draftFilters.outcome) {
            const fo = draftFilters.outcome.toLowerCase(), to = (t.outcome || '').toLowerCase()
            if (fo === 'breakeven') { if (to !== 'be' && to !== 'breakeven') return false }
            else if (to !== fo) return false
          }
          if (draftFilters.direction && t.direction !== draftFilters.direction) return false
          if (draftFilters.symbol && !t.symbol?.toLowerCase().includes(draftFilters.symbol.toLowerCase())) return false
          if (draftFilters.session && t.session !== draftFilters.session) return false
          if (draftFilters.timeframe && t.timeframe !== draftFilters.timeframe) return false
          if (draftFilters.confidence && t.confidence !== draftFilters.confidence) return false
          if (draftFilters.rr && parseFloat(t.rr || 0) < parseFloat(draftFilters.rr)) return false
          if (draftFilters.rating && parseInt(t.rating || 0) < parseInt(draftFilters.rating)) return false
          if (draftFilters.custom && Object.keys(draftFilters.custom).length > 0) {
            const extra = getExtraData(t)
            for (const [inputId, filterValue] of Object.entries(draftFilters.custom)) {
              if (!filterValue) continue
              const tradeValue = t[inputId] || extra[inputId] || ''
              if (typeof tradeValue === 'string' && typeof filterValue === 'string') {
                if (!tradeValue.toLowerCase().includes(filterValue.toLowerCase())) return false
              } else if (tradeValue !== filterValue) return false
            }
          }
          return true
        }).length
        const hasAnyFilter = draftFilters.dateFrom || draftFilters.dateTo || draftFilters.outcome || draftFilters.direction || draftFilters.symbol || draftFilters.session || draftFilters.timeframe || draftFilters.confidence || draftFilters.rr || draftFilters.rating || (draftFilters.custom && Object.values(draftFilters.custom).some(v => v))

        return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowFilters(false)}>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', width: '400px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1a1a22', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                <span style={{ fontSize: '14px', color: '#fff', fontWeight: 600 }}>Filter Trades</span>
                {viewMode === 'all' && allAccounts.length > 1 && (
                  <span style={{ fontSize: '10px', color: '#3b82f6', background: 'rgba(59,130,246,0.15)', padding: '2px 6px', borderRadius: '4px' }}>All Journals</span>
                )}
                {viewMode === 'selected' && selectedJournalIds.size > 0 && (
                  <span style={{ fontSize: '10px', color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '2px 6px', borderRadius: '4px' }}>Selected ({selectedJournalIds.size})</span>
                )}
              </div>
              <button onClick={() => setShowFilters(false)} style={{ width: '28px', height: '28px', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>

            {/* Content - scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {/* Date Range Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px', fontWeight: 600 }}>From</label>
                  <input type="date" value={draftFilters.dateFrom} onChange={e => setDraftFilters({...draftFilters, dateFrom: e.target.value, quickSelect: ''})} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px', fontWeight: 600 }}>To</label>
                  <input type="date" value={draftFilters.dateTo} onChange={e => setDraftFilters({...draftFilters, dateTo: e.target.value, quickSelect: ''})} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Quick Select */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                {[
                  { label: 'Today', key: 'today', fn: () => { const d = new Date().toISOString().split('T')[0]; return { dateFrom: d, dateTo: d } } },
                  { label: 'This Week', key: 'week', fn: () => { const now = new Date(); const start = new Date(now); start.setDate(now.getDate() - now.getDay()); return { dateFrom: start.toISOString().split('T')[0], dateTo: now.toISOString().split('T')[0] } } },
                  { label: 'This Month', key: 'month', fn: () => { const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), 1); return { dateFrom: start.toISOString().split('T')[0], dateTo: now.toISOString().split('T')[0] } } },
                  { label: 'Last 7 Days', key: '7days', fn: () => { const now = new Date(); const start = new Date(now); start.setDate(now.getDate() - 7); return { dateFrom: start.toISOString().split('T')[0], dateTo: now.toISOString().split('T')[0] } } },
                  { label: 'Last 30 Days', key: '30days', fn: () => { const now = new Date(); const start = new Date(now); start.setDate(now.getDate() - 30); return { dateFrom: start.toISOString().split('T')[0], dateTo: now.toISOString().split('T')[0] } } },
                ].map(preset => (
                  <button key={preset.key} onClick={() => { const dates = preset.fn(); setDraftFilters({...draftFilters, ...dates, quickSelect: preset.key}) }} style={{ padding: '6px 10px', background: draftFilters.quickSelect === preset.key ? 'rgba(34,197,94,0.2)' : '#0a0a0f', border: draftFilters.quickSelect === preset.key ? '1px solid #22c55e' : '1px solid #1a1a22', borderRadius: '6px', color: draftFilters.quickSelect === preset.key ? '#22c55e' : '#888', fontSize: '11px', cursor: 'pointer' }}>{preset.label}</button>
                ))}
              </div>

              {/* Direction + Outcome Row */}
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px', fontWeight: 600 }}>Direction</label>
                  <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #1a1a22' }}>
                    {['', 'long', 'short'].map(d => (
                      <button key={d || 'all'} onClick={() => setDraftFilters({...draftFilters, direction: d})} style={{ flex: 1, padding: '9px', background: draftFilters.direction === d ? (d === 'long' ? 'rgba(34,197,94,0.2)' : d === 'short' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)') : '#0a0a0f', border: 'none', borderLeft: d !== '' ? '1px solid #1a1a22' : 'none', color: draftFilters.direction === d ? (d === 'long' ? '#22c55e' : d === 'short' ? '#ef4444' : '#22c55e') : '#666', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase' }}>{d || 'ALL'}</button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px', fontWeight: 600 }}>Outcome</label>
                  <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #1a1a22' }}>
                    {[{v: '', l: 'ALL'}, {v: 'win', l: 'W'}, {v: 'loss', l: 'L'}, {v: 'breakeven', l: 'BE'}].map((o, i) => (
                      <button key={o.v || 'all'} onClick={() => setDraftFilters({...draftFilters, outcome: o.v})} style={{ flex: 1, padding: '9px', background: draftFilters.outcome === o.v ? (o.v === 'win' ? 'rgba(34,197,94,0.2)' : o.v === 'loss' ? 'rgba(239,68,68,0.2)' : o.v === 'breakeven' ? 'rgba(234,179,8,0.2)' : 'rgba(34,197,94,0.15)') : '#0a0a0f', border: 'none', borderLeft: i > 0 ? '1px solid #1a1a22' : 'none', color: draftFilters.outcome === o.v ? (o.v === 'win' ? '#22c55e' : o.v === 'loss' ? '#ef4444' : o.v === 'breakeven' ? '#eab308' : '#22c55e') : '#666', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{o.l}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Symbol + Min RR Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px', fontWeight: 600 }}>Symbol</label>
                  <input type="text" value={draftFilters.symbol} onChange={e => setDraftFilters({...draftFilters, symbol: e.target.value})} placeholder="XAUUSD" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px', fontWeight: 600 }}>Min R:R</label>
                  <input type="number" step="0.1" value={draftFilters.rr} onChange={e => setDraftFilters({...draftFilters, rr: e.target.value})} placeholder="2.5" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Confidence + Rating Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px', fontWeight: 600 }}>Confidence</label>
                  <select value={draftFilters.confidence} onChange={e => setDraftFilters({...draftFilters, confidence: e.target.value})} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23666\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                    <option value="">Any</option>
                    {(filterInputs.find(i => i.id === 'confidence')?.options || ['high', 'medium', 'low']).map(c => (
                      <option key={getOptVal(c)} value={getOptVal(c)}>{getOptVal(c)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px', fontWeight: 600 }}>Min Rating</label>
                  <div style={{ display: 'flex', gap: '4px', padding: '8px 0' }}>
                    {[0, 1, 2, 3, 4, 5].map(r => (
                      <span key={r} onClick={() => setDraftFilters({...draftFilters, rating: r === 0 ? '' : String(r)})} style={{ fontSize: '18px', cursor: 'pointer', color: (draftFilters.rating ? parseInt(draftFilters.rating) >= r : r === 0) && r > 0 ? '#f59e0b' : '#333' }}>★</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timeframe + Session Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px', fontWeight: 600 }}>Timeframe</label>
                  <select value={draftFilters.timeframe} onChange={e => setDraftFilters({...draftFilters, timeframe: e.target.value})} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23666\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                    <option value="">Any</option>
                    {(filterInputs.find(i => i.id === 'timeframe')?.options || ['1m', '5m', '15m', '1h', '4h', 'daily']).map(t => (
                      <option key={getOptVal(t)} value={getOptVal(t)}>{getOptVal(t)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px', fontWeight: 600 }}>Session</label>
                  <select value={draftFilters.session} onChange={e => setDraftFilters({...draftFilters, session: e.target.value})} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23666\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                    <option value="">Any</option>
                    {(filterInputs.find(i => i.id === 'session')?.options || ['london', 'new york', 'asian', 'other']).map(s => (
                      <option key={getOptVal(s)} value={getOptVal(s)}>{getOptVal(s)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Inputs Section */}
              {customFilterInputs.length > 0 && (
                <>
                  <div style={{ borderTop: '1px solid #1a1a22', marginTop: '8px', paddingTop: '12px', marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px', fontWeight: 600 }}>Custom Inputs</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {customFilterInputs.map(inp => (
                        <div key={inp.id}>
                          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '5px', fontWeight: 600 }}>{inp.label}</label>
                          {inp.type === 'select' ? (
                            <select
                              value={draftFilters.custom?.[inp.id] || ''}
                              onChange={e => setDraftFilters({...draftFilters, custom: {...(draftFilters.custom || {}), [inp.id]: e.target.value}})}
                              style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23666\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
                            >
                              <option value="">Any</option>
                              {(inp.options || []).map(opt => (
                                <option key={getOptVal(opt)} value={getOptVal(opt)}>{getOptVal(opt)}</option>
                              ))}
                            </select>
                          ) : inp.type === 'number' ? (
                            <input
                              type="number"
                              value={draftFilters.custom?.[inp.id] || ''}
                              onChange={e => setDraftFilters({...draftFilters, custom: {...(draftFilters.custom || {}), [inp.id]: e.target.value}})}
                              placeholder={`Min ${inp.label}`}
                              style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                          ) : (
                            <input
                              type="text"
                              value={draftFilters.custom?.[inp.id] || ''}
                              onChange={e => setDraftFilters({...draftFilters, custom: {...(draftFilters.custom || {}), [inp.id]: e.target.value}})}
                              placeholder={`Search ${inp.label}`}
                              style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer with preview and actions */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #1a1a22', background: '#0a0a0f' }}>
              {hasAnyFilter && (
                <div style={{ marginBottom: '12px', padding: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#22c55e' }}>
                    {previewCount} of {baseTradesToFilter.length} trades match
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setDraftFilters({ dateFrom: '', dateTo: '', outcome: '', direction: '', symbol: '', session: '', timeframe: '', confidence: '', rr: '', rating: '', quickSelect: '', custom: {} })} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#888', fontSize: '13px', cursor: 'pointer' }}>Clear All</button>
                <button onClick={() => { setFilters({...draftFilters}); setShowFilters(false) }} style={{ flex: 1, padding: '10px', background: '#22c55e', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Apply Filters</button>
              </div>
            </div>
          </div>
        </div>
      )})()}

      {/* MODALS */}
      {showAddTrade && (() => {
        // Separate inputs: left side (grid) vs right side (date, rating, file, textarea)
        const rightSideTypes = ['date', 'rating', 'file', 'textarea']
        const leftInputs = customInputs.filter(i => !rightSideTypes.includes(i.type))
        const rightInputs = customInputs.filter(i => rightSideTypes.includes(i.type))
        // Sort right inputs: file first (images), then date, then rating, then textarea (notes)
        const rightOrder = { file: 0, date: 1, rating: 2, textarea: 3 }
        rightInputs.sort((a, b) => (rightOrder[a.type] ?? 99) - (rightOrder[b.type] ?? 99))

        return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => { setShowAddTrade(false); setEditingTrade(null) }}>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '16px', padding: '0', width: '95%', maxWidth: '900px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #1a1a22', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '18px', color: '#fff', fontWeight: 600 }}>{editingTrade ? 'Edit Trade' : 'Log Trade'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!editingTrade && (
                  <button onClick={() => { setShowAddTrade(false); setShowEditInputs(true) }} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#888', fontWeight: 500, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                    Edit Inputs
                  </button>
                )}
                <button onClick={() => { setShowAddTrade(false); setEditingTrade(null) }} style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '24px', cursor: 'pointer', padding: '4px', lineHeight: 1 }}>×</button>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '20px 24px', overflow: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', gap: '24px' }}>
                {/* Left: 3-column grid of inputs */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                    {leftInputs.map(input => {
                      const optionsArr = Array.isArray(input.options) ? input.options : []
                      const isDropdownOpen = input.id === 'direction' ? directionDropdownOpen : input.id === 'outcome' ? outcomeDropdownOpen : (customDropdownOpen[input.id] || false)
                      const currentVal = tradeForm[input.id] || ''
                      const currentOpt = optionsArr.find(o => getOptVal(o).toLowerCase() === currentVal.toLowerCase())
                      const getColor = (val, opt) => {
                        if (!val) return '#888'
                        if (input.id === 'direction') return val === 'long' ? '#22c55e' : val === 'short' ? '#ef4444' : '#fff'
                        if (input.id === 'outcome') return val === 'win' ? '#22c55e' : val === 'loss' ? '#ef4444' : val === 'be' ? '#f59e0b' : '#fff'
                        if (opt && typeof opt === 'object') return opt.textColor || '#fff'
                        return '#fff'
                      }
                      const currentColor = getColor(currentVal, currentOpt)
                      return (
                        <div key={input.id} style={input.type === 'select' ? { position: 'relative' } : {}}>
                          <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>{input.label}</label>
                          {input.type === 'select' ? (
                            <>
                              <button type="button" onClick={() => {
                                if (input.id === 'direction') { setDirectionDropdownOpen(!directionDropdownOpen); setOutcomeDropdownOpen(false); setCustomDropdownOpen({}) }
                                else if (input.id === 'outcome') { setOutcomeDropdownOpen(!outcomeDropdownOpen); setDirectionDropdownOpen(false); setCustomDropdownOpen({}) }
                                else { setCustomDropdownOpen(prev => ({ ...Object.fromEntries(Object.keys(prev).map(k => [k, false])), [input.id]: !isDropdownOpen })); setDirectionDropdownOpen(false); setOutcomeDropdownOpen(false) }
                              }} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: isDropdownOpen ? '1px solid #22c55e' : '1px solid #1a1a22', borderRadius: isDropdownOpen ? '8px 8px 0 0' : '8px', color: currentColor, fontSize: '13px', boxSizing: 'border-box', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{currentVal ? (currentOpt ? getOptVal(currentOpt) : currentVal) : '-'}</span>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}><path d="M6 9l6 6 6-6" /></svg>
                              </button>
                              {isDropdownOpen && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#0a0a0f', border: '1px solid #22c55e', borderTop: 'none', borderRadius: '0 0 8px 8px', zIndex: 100, overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }}>
                                  <div onClick={() => { setTradeForm({...tradeForm, [input.id]: ''}); setDirectionDropdownOpen(false); setOutcomeDropdownOpen(false); setCustomDropdownOpen({}) }} style={{ padding: '10px 12px', cursor: 'pointer', color: '#888', fontSize: '13px', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#1a1a22'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>-</div>
                                  {optionsArr.map((o, idx) => {
                                    const optVal = getOptVal(o)
                                    const optColor = getColor(optVal.toLowerCase(), o)
                                    const optBg = typeof o === 'object' ? (o.bgColor || null) : null
                                    const defaultBg = input.id === 'direction' ? (optVal.toLowerCase() === 'long' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)') : input.id === 'outcome' ? (optVal.toLowerCase() === 'win' ? 'rgba(34,197,94,0.15)' : optVal.toLowerCase() === 'loss' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)') : null
                                    return (
                                      <div key={idx} onClick={() => { setTradeForm({...tradeForm, [input.id]: optVal.toLowerCase()}); setDirectionDropdownOpen(false); setOutcomeDropdownOpen(false); setCustomDropdownOpen({}) }} style={{ padding: '10px 12px', cursor: 'pointer', color: optColor, fontSize: '13px', fontWeight: 600, transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = optBg || defaultBg || 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>{optVal}</div>
                                    )
                                  })}
                                </div>
                              )}
                            </>
                          ) : input.type === 'value' ? (
                            <div style={{ display: 'flex', gap: '0' }}>
                              <span style={{ padding: '10px 12px', background: '#141418', border: '1px solid #1a1a22', borderRight: 'none', borderRadius: '8px 0 0 8px', color: '#888', fontSize: '13px' }}>{input.currency || '$'}</span>
                              <input type="number" value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} placeholder="0" style={{ flex: 1, padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '0 8px 8px 0', color: '#fff', fontSize: '13px', boxSizing: 'border-box', minWidth: 0 }} />
                            </div>
                          ) : (
                            <input type={input.type === 'number' ? 'number' : input.type === 'time' ? 'time' : 'text'} value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} placeholder={input.id === 'symbol' ? 'XAUUSD' : input.id === 'rr' ? '2.5' : input.id === 'riskPercent' ? '1' : ''} maxLength={input.type === 'text' ? (input.id === 'symbol' ? 20 : 100) : undefined} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Right: Images, Date, Rating, Notes */}
                <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {rightInputs.map(input => {
                    return (
                      <div key={input.id} style={input.type === 'textarea' ? { flex: 1 } : {}}>
                        <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '8px', fontWeight: 600 }}>{input.type === 'file' ? 'Images' : input.label}</label>
                        {input.type === 'file' ? (
                          <div>
                            <input id={`file-upload-${input.id}`} type="file" accept="image/*" onChange={e => { const file = e.target.files[0]; if (file) uploadImage(file, input.id) }} style={{ display: 'none' }} />
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                              {tradeForm[input.id] && (
                                <div style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #1a1a22' }}>
                                  <img src={tradeForm[input.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  <button onClick={() => setTradeForm({...tradeForm, [input.id]: ''})} style={{ position: 'absolute', top: '2px', right: '2px', width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>×</button>
                                </div>
                              )}
                              <label style={{ width: '60px', height: '60px', borderRadius: '8px', border: '1px dashed #333', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploadingImage ? 'wait' : 'pointer', opacity: uploadingImage ? 0.5 : 1 }}>
                                <input type="file" accept="image/*" onChange={e => { const file = e.target.files[0]; if (file) uploadImage(file, input.id) }} style={{ display: 'none' }} disabled={uploadingImage} />
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                              </label>
                            </div>
                          </div>
                        ) : input.type === 'date' ? (
                          <input type="date" value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                        ) : input.type === 'rating' ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ display: 'inline-flex', gap: '3px', padding: '8px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px' }} onMouseLeave={() => setHoverRatings(prev => ({...prev, [input.id]: 0}))}>
                              {[1, 2, 3, 4, 5].map(star => {
                                const displayRating = hoverRatings[input.id] || parseFloat(tradeForm[input.id] || 0)
                                const isFullStar = displayRating >= star
                                const isHalfStar = displayRating >= star - 0.5 && displayRating < star
                                return (
                                  <div key={star} style={{ position: 'relative', width: '22px', height: '22px', cursor: 'pointer' }}
                                    onMouseMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const x = e.clientX - rect.left; setHoverRatings(prev => ({...prev, [input.id]: x < rect.width / 2 ? star - 0.5 : star})) }}
                                    onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const x = e.clientX - rect.left; const newRating = x < rect.width / 2 ? star - 0.5 : star; setTradeForm({...tradeForm, [input.id]: parseFloat(tradeForm[input.id]) === newRating ? '' : String(newRating)}) }}>
                                    <span style={{ position: 'absolute', color: '#2a2a35', fontSize: '22px', lineHeight: 1 }}>★</span>
                                    {isHalfStar && <span style={{ position: 'absolute', color: input.textColor || '#22c55e', fontSize: '22px', lineHeight: 1, width: '48%', overflow: 'hidden' }}>★</span>}
                                    {isFullStar && <span style={{ position: 'absolute', color: input.textColor || '#22c55e', fontSize: '22px', lineHeight: 1 }}>★</span>}
                                  </div>
                                )
                              })}
                            </div>
                            <span style={{ background: '#1a1a22', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: '#fff' }}>
                              {hoverRatings[input.id] || parseFloat(tradeForm[input.id]) || 0}/5
                            </span>
                          </div>
                        ) : input.type === 'textarea' ? (
                          <textarea value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} maxLength={5000} placeholder="Trade notes..." rows={4} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', resize: 'none', fontFamily: 'inherit' }} />
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Footer with action buttons */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #1a1a22', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => { setShowAddTrade(false); setEditingTrade(null) }} style={{ padding: '12px 24px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '10px', color: '#888', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={editingTrade ? updateTrade : addTrade} disabled={saving || !tradeForm.symbol || !tradeForm.pnl} style={{ padding: '12px 32px', background: (saving || !tradeForm.symbol || !tradeForm.pnl) ? '#1a1a22' : editingTrade ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)', border: 'none', borderRadius: '10px', color: (saving || !tradeForm.symbol || !tradeForm.pnl) ? '#666' : '#fff', fontWeight: 600, fontSize: '15px', cursor: (saving || !tradeForm.symbol || !tradeForm.pnl) ? 'not-allowed' : 'pointer', boxShadow: (saving || !tradeForm.symbol || !tradeForm.pnl) ? 'none' : editingTrade ? '0 0 20px rgba(245,158,11,0.5)' : '0 0 20px rgba(147,51,234,0.5), 0 0 40px rgba(147,51,234,0.3)' }}>{saving ? 'Saving...' : editingTrade ? 'Update Trade' : 'Log Trade'}</button>
            </div>
          </div>
        </div>
        )
      })()}

      {showEditInputs && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 101 }} onClick={() => setShowEditInputs(false)}>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', width: '560px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a1a22', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>Column Settings</h2>
                <p style={{ fontSize: '12px', color: '#666', margin: '4px 0 0 0' }}>Customize fields and styling for trade entries</p>
              </div>
              <button onClick={() => setShowEditInputs(false)} style={{ width: '32px', height: '32px', background: '#141418', border: '1px solid #2a2a35', borderRadius: '6px', color: '#888', fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
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
                {inputs.map((input, i) => !input.hidden && (
                  <div key={input.id} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 100px 80px 28px', gap: '10px', padding: '10px 12px', background: input.enabled ? '#141418' : '#0d0d12', borderRadius: '8px', border: '1px solid #1a1a22', alignItems: 'center', opacity: input.enabled ? 1 : 0.6 }}>
                    <input type="checkbox" checked={input.enabled} onChange={e => updateInput(i, 'enabled', e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#22c55e', cursor: 'pointer' }} />
                    <input type="text" value={input.label} onChange={e => updateInput(i, 'label', e.target.value)} style={{ padding: '6px 8px', background: '#0a0a0e', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '12px', width: '100%' }} placeholder="Field name" />
                    <select value={input.type} onChange={e => updateInput(i, 'type', e.target.value)} style={{ padding: '6px 8px', background: '#0a0a0e', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '11px', cursor: 'pointer' }}>
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
                    {input.type === 'number' || input.type === 'value' ? (
                      <button onClick={() => openColorEditor(i)} style={{ padding: '6px 10px', background: '#0a0a0e', border: '1px solid #2a2a35', borderRadius: '6px', color: '#22c55e', fontSize: '11px', cursor: 'pointer' }}>Options</button>
                    ) : input.type === 'select' ? (
                      <button onClick={() => openOptionsEditor(i)} style={{ padding: '6px 10px', background: '#0a0a0e', border: '1px solid #2a2a35', borderRadius: '6px', color: '#22c55e', fontSize: '11px', cursor: 'pointer' }}>Options</button>
                    ) : (
                      <button onClick={() => openColorEditor(i)} style={{ padding: '6px 10px', background: '#0a0a0e', border: '1px solid #2a2a35', borderRadius: '6px', color: '#22c55e', fontSize: '11px', cursor: 'pointer' }}>Options</button>
                    )}
                    <button onClick={() => setDeleteInputConfirm({ index: i, label: input.label || input.id, id: input.id })} style={{ width: '28px', height: '28px', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                  </div>
                ))}
              </div>

              {/* Add field button */}
              <button onClick={addNewInput} style={{ width: '100%', padding: '12px', background: '#141418', border: '1px dashed #2a2a35', borderRadius: '8px', color: '#888', fontSize: '13px', cursor: 'pointer', marginBottom: '20px' }}>+ Add New Column</button>

              {/* Hidden Fields */}
              {inputs.filter(inp => inp.hidden).length > 0 && (
                <div style={{ marginBottom: '20px', padding: '14px', background: '#0a0a0e', borderRadius: '8px', border: '1px solid #1a1a22' }}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Hidden Columns (click to restore)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {inputs.map((inp, idx) => inp.hidden && (
                      <button key={inp.id} onClick={() => restoreInput(idx)} style={{ padding: '8px 14px', background: '#141418', border: '1px solid #2a2a35', borderRadius: '6px', color: '#888', fontSize: '12px', cursor: 'pointer' }}>
                        {inp.label} <span style={{ color: '#22c55e', marginLeft: '4px' }}>Restore</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Transfer Section */}
              {allAccounts.filter(a => a.id !== accountId).length > 0 && (
                <div style={{ padding: '14px', background: '#0a0a0e', borderRadius: '8px', border: '1px solid #1a1a22' }}>
                  <div style={{ fontSize: '11px', color: '#666', marginBottom: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Copy Settings From Another Journal</div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select
                      value={transferFromJournal}
                      onChange={e => setTransferFromJournal(e.target.value)}
                      style={{ flex: 1, padding: '10px 12px', background: '#141418', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '13px', cursor: 'pointer' }}
                    >
                      <option value="">Select journal...</option>
                      {allAccounts.filter(a => a.id !== accountId).map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => transferColumnsFromJournal(transferFromJournal)}
                      disabled={!transferFromJournal}
                      style={{ padding: '10px 20px', background: transferFromJournal ? '#3b82f6' : '#1a1a22', border: 'none', borderRadius: '6px', color: transferFromJournal ? '#fff' : '#555', fontWeight: 600, fontSize: '13px', cursor: transferFromJournal ? 'pointer' : 'not-allowed' }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Footer - Action buttons */}
            <div style={{ padding: '16px 28px 24px', borderTop: '1px solid #1a1a22', background: '#0d0d12', borderRadius: '0 0 12px 12px', display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowRestoreDefaults(true)} style={{ padding: '12px 16px', background: 'transparent', border: '1px solid #f59e0b', borderRadius: '8px', color: '#f59e0b', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Restore Defaults</button>
              <button onClick={() => setShowEditInputs(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveInputs} style={{ flex: 1, padding: '12px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Defaults Confirmation */}
      {showRestoreDefaults && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 103 }} onClick={() => setShowRestoreDefaults(false)}>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '24px', width: '400px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>Restore Defaults?</h2>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>This will reset all default field names and settings to their original values. Custom fields will not be affected.</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => {
                setInputs(prev => {
                  const customFields = prev.filter(inp => !inp.fixed)
                  return [...defaultInputs, ...customFields]
                })
                setShowRestoreDefaults(false)
              }} style={{ flex: 1, padding: '12px', background: '#f59e0b', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Yes, Restore</button>
              <button onClick={() => setShowRestoreDefaults(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editingOptions !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 102 }} onClick={() => { setEditingOptions(null); setOptionsList([]) }}>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '24px', width: '720px', maxWidth: '95vw', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px', color: '#fff' }}>Edit Options</h2>
            <p style={{ fontSize: '12px', color: '#555', marginBottom: '16px' }}>Customize colors and styling for each option</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
              {optionsList.map((opt, idx) => (
                <div key={idx} style={{ padding: '16px', background: '#0a0a0e', borderRadius: '10px', border: '1px solid #1a1a22' }}>
                  {/* Colors row - first */}
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
                      <select
                        value={opt.bgColor ? 'custom' : 'none'}
                        onChange={e => {
                          if (e.target.value === 'none') {
                            updateOptionBgColor(idx, null)
                          } else {
                            const hex = (opt.textColor || '#fff').replace('#', '')
                            const r = parseInt(hex.substr(0, 2), 16) || 255
                            const g = parseInt(hex.substr(2, 2), 16) || 255
                            const b = parseInt(hex.substr(4, 2), 16) || 255
                            updateOptionBgColor(idx, `rgba(${r},${g},${b},0.15)`)
                          }
                        }}
                        style={{ padding: '8px 12px', background: '#141418', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
                      >
                        <option value="none">No Fill</option>
                        <option value="custom">Fill</option>
                      </select>
                      {opt.bgColor && (
                        <div style={{ position: 'relative', width: '36px', height: '36px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: opt.bgColor, border: '2px solid #2a2a35', cursor: 'pointer' }} />
                          <input type="color" value={opt.textColor || '#ffffff'} onChange={e => {
                            const hex = e.target.value.replace('#', '')
                            const r = parseInt(hex.substr(0, 2), 16)
                            const g = parseInt(hex.substr(2, 2), 16)
                            const b = parseInt(hex.substr(4, 2), 16)
                            updateOptionBgColor(idx, `rgba(${r},${g},${b},0.15)`)
                          }} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                        </div>
                      )}
                      <span style={{ fontSize: '12px', color: '#888' }}>Background</span>
                    </div>
                    {/* Border */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <select
                        value={opt.borderColor ? 'custom' : 'none'}
                        onChange={e => {
                          if (e.target.value === 'none') {
                            updateOptionBorderColor(idx, null)
                          } else {
                            updateOptionBorderColor(idx, opt.textColor || '#fff')
                          }
                        }}
                        style={{ padding: '8px 12px', background: '#141418', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
                      >
                        <option value="none">No Border</option>
                        <option value="custom">Border</option>
                      </select>
                      {opt.borderColor && (
                        <div style={{ position: 'relative', width: '36px', height: '36px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'transparent', border: `3px solid ${opt.borderColor}`, cursor: 'pointer' }} />
                          <input type="color" value={opt.borderColor || '#ffffff'} onChange={e => updateOptionBorderColor(idx, e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                        </div>
                      )}
                      <span style={{ fontSize: '12px', color: '#888' }}>Border</span>
                    </div>
                  </div>
                  {/* Option name and preview row - second */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <input type="text" value={opt.value} onChange={e => updateOptionValue(idx, e.target.value)} placeholder="Option name" style={{ flex: 1, padding: '10px 14px', background: '#141418', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '14px', fontWeight: 600 }} />
                    <span style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: 600, background: opt.bgColor || 'transparent', color: opt.textColor || '#fff', border: opt.borderColor ? `1px solid ${opt.borderColor}` : 'none', whiteSpace: 'nowrap' }}>
                      {opt.value || 'Preview'}
                    </span>
                    <button onClick={() => removeOption(idx)} style={{ padding: '8px 12px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#666', cursor: 'pointer', fontSize: '14px' }}>×</button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={addOption} style={{ width: '100%', padding: '12px', marginBottom: '16px', background: 'transparent', border: '1px dashed #2a2a35', borderRadius: '6px', color: '#555', fontSize: '13px', cursor: 'pointer' }}>+ Add Option</button>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={saveOptions} style={{ flex: 1, padding: '12px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Save</button>
              <button onClick={() => { setEditingOptions(null); setOptionsList([]) }} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Color Editor Modal */}
      {editingColor !== null && (() => {
        const inp = inputs[editingColor] || {}
        const isNumber = inp.type === 'number'
        const isValue = inp.type === 'value'
        const isRating = inp.type === 'rating'
        const isFile = inp.type === 'file'
        return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 102 }} onClick={() => setEditingColor(null)}>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '24px', width: '420px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px', color: '#fff' }}>Style Settings</h2>
            <p style={{ fontSize: '12px', color: '#555', marginBottom: '16px' }}>{isValue ? 'Configure currency and display' : isRating ? 'Customize star appearance' : isFile ? 'Image fields have no style options' : 'Customize colors for this field'}</p>

            {isValue ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {/* Currency Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#0a0a0e', borderRadius: '8px' }}>
                  <select value={inp.currency || '$'} onChange={e => updateInput(editingColor, 'currency', e.target.value)} style={{ padding: '8px 12px', background: '#141418', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '14px', cursor: 'pointer' }}>
                    <option value="$">$ Dollar</option>
                    <option value="£">£ Pound</option>
                    <option value="€">€ Euro</option>
                    <option value="¥">¥ Yen</option>
                    <option value="₹">₹ Rupee</option>
                    <option value="₿">₿ Bitcoin</option>
                    <option value="">No symbol</option>
                  </select>
                  <span style={{ fontSize: '13px', color: '#888', flex: 1 }}>Currency Symbol</span>
                </div>
                {/* Info */}
                <div style={{ padding: '12px', background: '#0a0a0e', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>Values show as <span style={{ color: '#22c55e' }}>green</span> (positive) / <span style={{ color: '#ef4444' }}>red</span> (negative)</div>
                </div>
              </div>
            ) : isFile ? (
              <div style={{ padding: '16px', background: '#0a0a0e', borderRadius: '8px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', color: '#888', textAlign: 'center' }}>Image uploads display as thumbnails with no custom styling</div>
              </div>
            ) : isRating ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {/* Star Color */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#0a0a0e', borderRadius: '8px' }}>
                  <div style={{ position: 'relative', width: '36px', height: '36px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: inp.textColor || '#22c55e', border: '2px solid #2a2a35', cursor: 'pointer' }} />
                    <input type="color" value={inp.textColor || '#22c55e'} onChange={e => updateInput(editingColor, 'textColor', e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                  </div>
                  <span style={{ fontSize: '13px', color: '#888', flex: 1 }}>Star Color</span>
                </div>
                {/* Preview */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', background: '#0a0a0e', borderRadius: '8px', gap: '4px' }}>
                  {[1,2,3,4,5].map(s => <span key={s} style={{ fontSize: '24px', color: s <= 3 ? (inp.textColor || '#22c55e') : '#2a2a35' }}>★</span>)}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {/* Text Color */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#0a0a0e', borderRadius: '8px' }}>
                  <div style={{ position: 'relative', width: '36px', height: '36px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: inp.textColor || '#fff', border: '2px solid #2a2a35', cursor: 'pointer' }} />
                    <input type="color" value={inp.textColor || '#ffffff'} onChange={e => updateInput(editingColor, 'textColor', e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                  </div>
                  <span style={{ fontSize: '13px', color: '#888', flex: 1 }}>Text Color</span>
                </div>
                {/* Background */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#0a0a0e', borderRadius: '8px' }}>
                  <select value={inp.bgColor ? 'custom' : 'none'} onChange={e => {
                    if (e.target.value === 'none') updateInput(editingColor, 'bgColor', null)
                    else {
                      const hex = (inp.textColor || '#fff').replace('#', '')
                      const r = parseInt(hex.substr(0, 2), 16) || 255
                      const g = parseInt(hex.substr(2, 2), 16) || 255
                      const b = parseInt(hex.substr(4, 2), 16) || 255
                      updateInput(editingColor, 'bgColor', `rgba(${r},${g},${b},0.15)`)
                    }
                  }} style={{ padding: '8px 12px', background: '#141418', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>
                    <option value="none">No Fill</option>
                    <option value="custom">Fill</option>
                  </select>
                  {inp.bgColor && (
                    <div style={{ position: 'relative', width: '36px', height: '36px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: inp.bgColor, border: '2px solid #2a2a35', cursor: 'pointer' }} />
                      <input type="color" value={inp.textColor || '#ffffff'} onChange={e => {
                        const hex = e.target.value.replace('#', '')
                        const r = parseInt(hex.substr(0, 2), 16)
                        const g = parseInt(hex.substr(2, 2), 16)
                        const b = parseInt(hex.substr(4, 2), 16)
                        updateInput(editingColor, 'bgColor', `rgba(${r},${g},${b},0.15)`)
                      }} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                    </div>
                  )}
                  <span style={{ fontSize: '13px', color: '#888', flex: 1 }}>Background</span>
                </div>
                {/* Border */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#0a0a0e', borderRadius: '8px' }}>
                  <select value={inp.borderColor ? 'custom' : 'none'} onChange={e => {
                    if (e.target.value === 'none') updateInput(editingColor, 'borderColor', null)
                    else updateInput(editingColor, 'borderColor', inp.textColor || '#fff')
                  }} style={{ padding: '8px 12px', background: '#141418', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '12px', cursor: 'pointer' }}>
                    <option value="none">No Border</option>
                    <option value="custom">Border</option>
                  </select>
                  {inp.borderColor && (
                    <div style={{ position: 'relative', width: '36px', height: '36px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'transparent', border: `3px solid ${inp.borderColor}`, cursor: 'pointer' }} />
                      <input type="color" value={inp.borderColor || '#ffffff'} onChange={e => updateInput(editingColor, 'borderColor', e.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                    </div>
                  )}
                  <span style={{ fontSize: '13px', color: '#888', flex: 1 }}>Border</span>
                </div>
                {/* Preview */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px', background: '#0a0a0e', borderRadius: '8px' }}>
                  <span style={{ padding: '6px 14px', borderRadius: '6px', fontSize: '14px', fontWeight: 600, background: inp.bgColor || 'transparent', color: inp.textColor || '#fff', border: inp.borderColor ? `1px solid ${inp.borderColor}` : 'none' }}>Preview</span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setEditingColor(null)} style={{ flex: 1, padding: '12px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Done</button>
              {!isValue && !isFile && <button onClick={() => { updateInput(editingColor, 'textColor', null); updateInput(editingColor, 'bgColor', null); updateInput(editingColor, 'borderColor', null); setEditingColor(null) }} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Reset</button>}
            </div>
          </div>
        </div>
        )
      })()}

      {/* Delete Input Confirmation Modal */}
      {deleteInputConfirm && (() => {
        const hasData = inputHasData(deleteInputConfirm.id)
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 103 }} onClick={() => setDeleteInputConfirm(null)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#ef4444' }}>Delete "{deleteInputConfirm.label}"?</h3>
              {hasData ? (
                <>
                  <p style={{ color: '#888', fontSize: '14px', marginBottom: '12px' }}>This field has existing data in your trades. What would you like to do?</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ padding: '12px', background: '#0a0a0e', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '13px', marginBottom: '4px' }}>Hide Only</div>
                      <div style={{ color: '#666', fontSize: '12px' }}>Column hidden, data preserved. Can restore anytime.</div>
                    </div>
                    <div style={{ padding: '12px', background: '#0a0a0e', borderRadius: '6px', borderLeft: '3px solid #ef4444' }}>
                      <div style={{ fontWeight: 600, color: '#fff', fontSize: '13px', marginBottom: '4px' }}>Delete Permanently</div>
                      <div style={{ color: '#666', fontSize: '12px' }}>Column and ALL data removed forever. Cannot undo.</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setDeleteInputConfirm(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '8px', color: '#888', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Cancel</button>
                    <button onClick={() => { hideInput(deleteInputConfirm.index); setDeleteInputConfirm(null) }} style={{ flex: 1, padding: '12px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Hide Only</button>
                    <button onClick={() => { permanentlyDeleteInput(deleteInputConfirm.index); setDeleteInputConfirm(null) }} style={{ flex: 1, padding: '12px', background: '#ef4444', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Delete All</button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ color: '#888', fontSize: '14px', marginBottom: '12px' }}>This field has no data. It will be permanently removed.</p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setDeleteInputConfirm(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '8px', color: '#888', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Cancel</button>
                    <button onClick={() => { permanentlyDeleteInput(deleteInputConfirm.index); setDeleteInputConfirm(null) }} style={{ flex: 1, padding: '12px', background: '#ef4444', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Delete</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {showExpandedNote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowExpandedNote(null)}>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '28px', width: '520px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: '#fff' }}>Notes</h2>
            <div style={{ background: '#0a0a0e', borderRadius: '6px', padding: '16px', maxHeight: '320px', overflowY: 'auto', fontSize: '14px', color: '#fff', lineHeight: '1.7' }}>{showExpandedNote}</div>
            <button onClick={() => setShowExpandedNote(null)} style={{ marginTop: '12px', width: '100%', padding: '14px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#999', fontWeight: 600, cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}

      {showExpandedImage && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, overflow: 'auto', padding: '20px' }} onClick={() => setShowExpandedImage(null)}>
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <img
              src={showExpandedImage}
              alt="Trade"
              draggable={false}
              style={{
                maxWidth: '95vw',
                maxHeight: '90vh',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                imageRendering: 'crisp-edges'
              }}
            />
            <button onClick={() => setShowExpandedImage(null)} style={{ position: 'absolute', top: '-40px', right: '0', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', padding: '4px 12px', borderRadius: '4px' }}>×</button>
          </div>
        </div>
      )}

      {/* Slideshow Modal */}
      {slideshowMode && (() => {
        const imgs = getSlideshowImages()
        if (!imgs.length) { setSlideshowMode(false); return null }
        const idx = Math.min(slideshowIndex, imgs.length - 1)
        const { trade, image } = imgs[idx]
        const pnl = parseFloat(trade.pnl) || 0
        return (
          <div onClick={() => setSlideshowMode(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.98)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100, cursor: 'pointer' }}>
            <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 16, padding: '12px 24px', background: '#0d0d12', borderRadius: 8, border: '1px solid #1a1a22', cursor: 'default' }}>
              <span style={{ fontWeight: 600, color: '#fff', fontSize: 16 }}>{trade.symbol}</span>
              <span style={{ padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600, background: trade.outcome === 'win' ? 'rgba(34,197,94,0.15)' : trade.outcome === 'loss' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: trade.outcome === 'win' ? '#22c55e' : trade.outcome === 'loss' ? '#ef4444' : '#f59e0b' }}>{trade.outcome?.toUpperCase()}</span>
              <span style={{ fontWeight: 600, color: pnl >= 0 ? '#22c55e' : '#ef4444' }}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(0)}</span>
              <span style={{ color: '#666', fontSize: 12 }}>{new Date(trade.date).toLocaleDateString()}</span>
            </div>
            <button onClick={() => setSlideshowMode(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'transparent', border: 'none', color: '#999', fontSize: 32, cursor: 'pointer', zIndex: 101 }}>×</button>
            {imgs.length > 1 && <>
              <button onClick={e => { e.stopPropagation(); setSlideshowIndex(idx === 0 ? imgs.length - 1 : idx - 1) }} style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '50%', width: 48, height: 48, color: '#fff', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              <button onClick={e => { e.stopPropagation(); setSlideshowIndex(idx === imgs.length - 1 ? 0 : idx + 1) }} style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '50%', width: 48, height: 48, color: '#fff', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            </>}
            <img onClick={e => e.stopPropagation()} src={image} alt="" draggable={false} style={{ maxWidth: '90vw', maxHeight: '75vh', width: 'auto', height: 'auto', objectFit: 'contain', cursor: 'default', imageRendering: 'crisp-edges' }} />
            <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', bottom: 30, display: 'flex', alignItems: 'center', gap: 12, cursor: 'default' }}>
              <span style={{ color: '#666', fontSize: 14 }}>{idx + 1} / {imgs.length}</span>
              {imgs.length <= 10 && <div style={{ display: 'flex', gap: 6 }}>{imgs.map((_, i) => <button key={i} onClick={() => setSlideshowIndex(i)} style={{ width: 8, height: 8, borderRadius: '50%', background: i === idx ? '#22c55e' : '#333', border: 'none', cursor: 'pointer', padding: 0 }} />)}</div>}
            </div>
          </div>
        )
      })()}

      {/* Enlarged Chart Modal */}
      {enlargedChart && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setEnlargedChart(null)}>
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '12px', padding: '24px', width: '95vw', maxWidth: '1600px', height: '90vh' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{enlargedChart === 'equity' ? 'EQUITY CURVE' : enlargedChart === 'bar' ? 'PERFORMANCE BY ' + (graphGroupBy === 'symbol' ? 'PAIR' : graphGroupBy.toUpperCase()) : 'NET DAILY PNL'}</span>
                {enlargedChart === 'equity' && (
                  <>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: currentBalance >= startingBalance ? '#22c55e' : '#ef4444' }}>${Math.round(currentBalance).toLocaleString()}</span>
                    <select value={equityCurveGroupBy} onChange={e => { setEquityCurveGroupBy(e.target.value); setSelectedCurveLines({}) }} style={{ padding: '4px 8px', background: '#141418', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '11px', boxShadow: '0 0 4px rgba(255,255,255,0.1)' }}>
                      <option value="total">Total PnL</option>
                      <option value="symbol">By Pair</option>
                      {inputs.filter(inp => inp.type === 'select' && inp.enabled).map(inp => (
                        <option key={inp.id} value={inp.id}>By {inp.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowObjectiveLines(!showObjectiveLines)}
                      style={{
                        padding: '5px 10px',
                        background: showObjectiveLines ? 'rgba(147,51,234,0.15)' : 'transparent',
                        border: showObjectiveLines ? '1px solid rgba(147,51,234,0.4)' : '1px solid transparent',
                        borderRadius: '4px',
                        color: showObjectiveLines ? '#9333ea' : '#666',
                        fontSize: '11px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#9333ea'; e.currentTarget.style.borderColor = 'rgba(147,51,234,0.4)' }}
                      onMouseLeave={e => { if (!showObjectiveLines) { e.currentTarget.style.color = '#666'; e.currentTarget.style.borderColor = 'transparent' } }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                      <span>Show Objectives</span>
                    </button>
                  </>
                )}
                {enlargedChart === 'equity' && equityCurveGroupBy !== 'total' && (
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowLinesDropdown(!showLinesDropdown) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        padding: '6px 12px', background: '#1a1a22', border: '1px solid #2a2a35',
                        borderRadius: '4px', color: '#999', fontSize: '11px', cursor: 'pointer'
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
                                  fontSize: '11px', color: '#999', cursor: 'pointer',
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
                                  style={{ flex: 1, padding: '4px 8px', background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '4px', color: '#999', fontSize: '10px', cursor: 'pointer' }}
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
                      {inputs.filter(inp => inp.type === 'select' && inp.enabled).map(inp => (
                        <option key={inp.id} value={inp.id}>{inp.label}</option>
                      ))}
                    </select>
                  </>
                )}
              </div>
              <button onClick={() => setEnlargedChart(null)} style={{ background: 'transparent', border: 'none', color: '#999', fontSize: '28px', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ height: 'calc(100% - 60px)', display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {enlargedChart === 'equity' && (() => {
                const sorted = trades.length >= 2 ? [...trades].sort((a, b) => new Date(a.date) - new Date(b.date)) : []
                if (sorted.length < 2) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Need 2+ trades</div>

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
                let maxBal = allBalances.length > 0 ? Math.max(...allBalances) : startingBalance
                let minBal = allBalances.length > 0 ? Math.min(...allBalances) : startingBalance

                // Include profit target and drawdown floor in range - clamp to valid ranges
                const ddParsedEnl = parseFloat(account?.max_drawdown)
                const ddClampedEnl = !isNaN(ddParsedEnl) ? Math.min(99, Math.max(0, ddParsedEnl)) : 0
                const ptParsedEnl = parseFloat(account?.profit_target)
                const ptClampedEnl = !isNaN(ptParsedEnl) ? Math.min(500, Math.max(0, ptParsedEnl)) : 0
                const ddFloorValEnl = ddClampedEnl > 0 && !account?.max_dd_enabled ? startingBalance * (1 - ddClampedEnl / 100) : null
                const profitTargetValEnl = ptClampedEnl > 0 ? startingBalance * (1 + ptClampedEnl / 100) : null
                // New DD floor values for range - clamp to valid ranges
                const dailyDdPctEnlRaw = parseFloat(account?.daily_dd_pct)
                const dailyDdPctEnl = !isNaN(dailyDdPctEnlRaw) ? Math.min(99, Math.max(0, dailyDdPctEnlRaw)) : 0
                const dailyDdFloorValEnl = account?.daily_dd_enabled && dailyDdPctEnl > 0 ? startingBalance * (1 - dailyDdPctEnl / 100) : null
                const maxDdPctEnlRaw = parseFloat(account?.max_dd_pct)
                const maxDdPctEnl = !isNaN(maxDdPctEnlRaw) ? Math.min(99, Math.max(0, maxDdPctEnlRaw)) : 0
                const maxDdFloorValEnl = account?.max_dd_enabled && maxDdPctEnl > 0 ? startingBalance * (1 - maxDdPctEnl / 100) : null
                // Only include objective lines in range when showObjectiveLines is true
                if (equityCurveGroupBy === 'total' && showObjectiveLines) {
                  if (ddFloorValEnl) minBal = Math.min(minBal, ddFloorValEnl)
                  if (profitTargetValEnl) maxBal = Math.max(maxBal, profitTargetValEnl)
                  if (dailyDdFloorValEnl) minBal = Math.min(minBal, dailyDdFloorValEnl)
                  if (maxDdFloorValEnl) minBal = Math.min(minBal, maxDdFloorValEnl)
                }

                const range = maxBal - minBal || 1000
                const actualMinEnl = equityCurveGroupBy === 'total' ? Math.min(minBal, startingBalance) : minBal
                const actualMaxEnl = equityCurveGroupBy === 'total' ? Math.max(maxBal, startingBalance) : maxBal
                const dataRangeEnl = actualMaxEnl - actualMinEnl || 1000

                // To get 1/16 of TOTAL graph height as padding on each side:
                // If data takes 14/16 of total, padding = dataRange / 14 on each side
                const paddingAmountEnl = dataRangeEnl / 14
                const lowestFloorEnl = Math.min(ddFloorValEnl || Infinity, dailyDdFloorValEnl || Infinity, maxDdFloorValEnl || Infinity)

                let yMax, yMin
                if (!showObjectiveLines) {
                  // Tight fit: data + 1/16 padding on each side
                  yMax = actualMaxEnl + paddingAmountEnl
                  yMin = actualMinEnl - paddingAmountEnl
                  if (yMin < 0 && actualMinEnl >= 0) yMin = 0
                } else {
                  // Expanded fit for objective lines
                  yMax = actualMaxEnl + paddingAmountEnl
                  yMin = actualMinEnl - paddingAmountEnl
                  if (profitTargetValEnl) yMax = Math.max(yMax, profitTargetValEnl + paddingAmountEnl)
                  if (lowestFloorEnl !== Infinity) yMin = Math.min(yMin, lowestFloorEnl - paddingAmountEnl)
                }

                // Calculate step size to get ~10 unique labels for enlarged chart
                const displayRangeEnl = yMax - yMin || 1000
                const targetLabelsEnl = 10
                const rawStepEnl = displayRangeEnl / (targetLabelsEnl - 1)

                // Round to a nice step value
                const magnitudeEnl = Math.pow(10, Math.floor(Math.log10(rawStepEnl)))
                const normalizedEnl = rawStepEnl / magnitudeEnl
                let niceStepEnl
                if (normalizedEnl <= 1) niceStepEnl = magnitudeEnl
                else if (normalizedEnl <= 2) niceStepEnl = 2 * magnitudeEnl
                else if (normalizedEnl <= 2.5) niceStepEnl = 2.5 * magnitudeEnl
                else if (normalizedEnl <= 5) niceStepEnl = 5 * magnitudeEnl
                else niceStepEnl = 10 * magnitudeEnl

                const yStep = niceStepEnl
                // For multi-line mode, use tighter rounding to preserve 1/8 padding
                if (equityCurveGroupBy !== 'total') {
                  const halfStep = yStep / 2
                  yMax = Math.ceil(yMax / halfStep) * halfStep
                  yMin = Math.floor(yMin / halfStep) * halfStep
                } else {
                  yMax = Math.ceil(yMax / yStep) * yStep
                  yMin = Math.floor(yMin / yStep) * yStep
                }
                if (yMin < 0 && actualMinEnl >= 0 && !showObjectiveLines) yMin = 0

                // Format y-axis label with appropriate precision based on step size
                const formatYLabelEnl = (v) => {
                  if (Math.abs(v) >= 1000000) return `$${(v/1000000).toFixed(1)}M`
                  if (Math.abs(v) >= 1000) {
                    const needsDecimal = yStep < 1000
                    return needsDecimal ? `$${(v/1000).toFixed(1)}k` : `$${(v/1000).toFixed(0)}k`
                  }
                  return `$${v}`
                }

                // Generate y-axis labels - anchor depends on mode
                // For total mode: anchor to starting balance
                // For grouped modes: anchor to 0 (since lines show cumulative PnL from 0)
                const labelAnchorEnl = equityCurveGroupBy === 'total' ? startingBalance : 0
                const yLabels = [labelAnchorEnl]
                // Add labels above anchor - extend beyond yMax to ensure padding
                for (let v = labelAnchorEnl + yStep; v < yMax + yStep; v += yStep) {
                  yLabels.push(v)
                }
                // Add labels below anchor - extend beyond yMin to ensure padding
                for (let v = labelAnchorEnl - yStep; v > yMin - yStep; v -= yStep) {
                  if (v >= 0 || minBal < 0 || showObjectiveLines || equityCurveGroupBy !== 'total') yLabels.push(v)
                }
                // Sort from highest to lowest
                yLabels.sort((a, b) => b - a)

                // Update yMax/yMin to match label bounds
                yMax = yLabels[0]
                yMin = yLabels[yLabels.length - 1]
                const yRangeFinal = yMax - yMin || yStep

                const hasNegative = minBal < 0
                const belowStartEnl = equityCurveGroupBy === 'total' && minBal < startingBalance
                const zeroY = hasNegative ? ((yMax - 0) / yRangeFinal) * 100 : null
                // Drawdown floor for enlarged chart - use clamped values
                const ddFloorEnl = ddClampedEnl > 0 ? startingBalance * (1 - ddClampedEnl / 100) : null
                const ddFloorYEnl = equityCurveGroupBy === 'total' && ddFloorEnl ? ((yMax - ddFloorEnl) / yRangeFinal) * 100 : null
                // Profit target for enlarged chart - use clamped values
                const profitTargetEnl = ptClampedEnl > 0 ? startingBalance * (1 + ptClampedEnl / 100) : null
                const profitTargetYEnl = equityCurveGroupBy === 'total' && profitTargetEnl ? ((yMax - profitTargetEnl) / yRangeFinal) * 100 : null

                // X-axis labels - adaptive based on date range
                const xLabels = []
                if (sorted.length > 0) {
                  const firstDate = new Date(sorted[0].date)
                  const lastDate = new Date(sorted[sorted.length - 1].date)
                  const totalDays = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)))

                  // Determine number of labels based on date range (supports up to 100 years)
                  let numLabels
                  if (totalDays <= 12) {
                    numLabels = totalDays + 1
                  } else if (totalDays <= 84) {
                    numLabels = Math.min(12, Math.ceil(totalDays / 7) + 1)
                  } else if (totalDays <= 180) {
                    numLabels = Math.min(12, Math.ceil(totalDays / 14) + 1)
                  } else if (totalDays <= 365) {
                    numLabels = Math.min(12, Math.ceil(totalDays / 30) + 1)
                  } else if (totalDays <= 730) {
                    numLabels = Math.min(12, Math.ceil(totalDays / 60) + 1)
                  } else if (totalDays <= 1825) {
                    numLabels = Math.min(12, Math.ceil(totalDays / 90) + 1)
                  } else if (totalDays <= 3650) {
                    numLabels = Math.min(12, Math.ceil(totalDays / 180) + 1)
                  } else if (totalDays <= 9125) {
                    numLabels = Math.min(12, Math.ceil(totalDays / 365) + 1)
                  } else if (totalDays <= 18250) {
                    numLabels = Math.min(12, Math.ceil(totalDays / 730) + 1)
                  } else {
                    numLabels = Math.min(12, Math.ceil(totalDays / 1825) + 1)
                  }
                  numLabels = Math.min(numLabels, sorted.length)

                  for (let i = 0; i < numLabels; i++) {
                    const idx = numLabels > 1 ? Math.floor(i * (sorted.length - 1) / (numLabels - 1)) : 0
                    const trade = sorted[idx]
                    if (trade?.date) {
                      const d = new Date(trade.date)
                      xLabels.push({ label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, pct: numLabels > 1 ? 5 + (i / (numLabels - 1)) * 90 : 50 })
                    }
                  }
                }

                const svgW = 100, svgH = 100
                const startYEnl = svgH - ((startingBalance - yMin) / yRangeFinal) * svgH
                const lineData = visibleLines.map(line => {
                  const chartPoints = line.points.map((p, i) => ({
                    x: line.points.length > 1 ? (i / (line.points.length - 1)) * svgW : svgW / 2,
                    y: svgH - ((p.balance - yMin) / yRangeFinal) * svgH,
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
                const areaBottom = hasNegative ? svgH - ((0 - yMin) / yRangeFinal) * svgH : svgH
                const areaD = equityCurveGroupBy === 'total' && mainLine ? mainLine.pathD + ` L ${mainLine.chartPoints[mainLine.chartPoints.length - 1].x} ${areaBottom} L ${mainLine.chartPoints[0].x} ${areaBottom} Z` : null

                // Daily Drawdown path calculation for enlarged chart
                const dailyDdEnabledEnl = account?.daily_dd_enabled
                const dailyDdPctEnlCalc = !isNaN(dailyDdPctEnlRaw) ? Math.min(99, Math.max(0, dailyDdPctEnlRaw)) : 0
                const dailyDdTypeEnl = account?.daily_dd_type || 'static'
                const dailyDdLocksAtEnl = account?.daily_dd_locks_at || 'start_balance'
                const dailyDdLocksAtPctEnl = parseFloat(account?.daily_dd_locks_at_pct) || 0
                const dailyDdResetTimeEnl = account?.daily_dd_reset_time || '00:00'

                const getTradingDayEnl = (tradeDate, tradeTime) => {
                  if (!tradeDate) return null
                  const resetParts = (dailyDdResetTimeEnl || '00:00').split(':')
                  const resetHour = parseInt(resetParts[0]) || 0
                  const resetMin = parseInt(resetParts[1]) || 0
                  const tradeDateTime = new Date(`${tradeDate}T${tradeTime || '12:00'}`)
                  if (isNaN(tradeDateTime.getTime())) return new Date(tradeDate).toDateString()
                  const tradeHour = tradeDateTime.getHours()
                  const tradeMinute = tradeDateTime.getMinutes()
                  if (tradeHour < resetHour || (tradeHour === resetHour && tradeMinute < resetMin)) {
                    const prevDay = new Date(tradeDateTime)
                    prevDay.setDate(prevDay.getDate() - 1)
                    return prevDay.toDateString()
                  }
                  return tradeDateTime.toDateString()
                }

                let dailyDdFloorPointsEnl = []
                if (equityCurveGroupBy === 'total' && dailyDdEnabledEnl && dailyDdPctEnlCalc > 0) {
                  let currentDayStart = startingBalance
                  let currentTradingDay = null
                  let isLocked = false
                  let lockedFloor = null
                  const getLockThresholdEnl = () => {
                    if (dailyDdLocksAtEnl === 'start_balance') return startingBalance
                    if (dailyDdLocksAtEnl === 'custom' && dailyDdLocksAtPctEnl > 0) return startingBalance * (1 + dailyDdLocksAtPctEnl / 100)
                    return startingBalance
                  }
                  const lockThresholdEnl = getLockThresholdEnl()
                  const totalPointsEnl = [{ balance: startingBalance, date: null, time: null }]
                  sorted.forEach(t => totalPointsEnl.push({ balance: totalPointsEnl[totalPointsEnl.length - 1].balance + (parseFloat(t.pnl) || 0), date: t.date, time: t.time }))
                  totalPointsEnl.forEach((p, i) => {
                    if (i === 0) {
                      dailyDdFloorPointsEnl.push({ idx: i, floor: startingBalance * (1 - dailyDdPctEnlCalc / 100), isNewDay: true })
                    } else {
                      const tradingDay = getTradingDayEnl(p.date, p.time)
                      const isNewDay = tradingDay && tradingDay !== currentTradingDay
                      if (isNewDay) {
                        const prevBalance = totalPointsEnl[i - 1].balance
                        currentDayStart = currentTradingDay ? prevBalance : startingBalance
                        currentTradingDay = tradingDay
                      }
                      let floor = currentDayStart * (1 - dailyDdPctEnlCalc / 100)
                      if (dailyDdTypeEnl === 'trailing' && !isLocked) {
                        if (floor >= lockThresholdEnl) { isLocked = true; lockedFloor = lockThresholdEnl; floor = lockedFloor }
                      } else if (dailyDdTypeEnl === 'trailing' && isLocked) { floor = lockedFloor }
                      dailyDdFloorPointsEnl.push({ idx: i, floor, isNewDay })
                    }
                  })
                }

                // Max Drawdown trailing path for enlarged chart
                const maxDdEnabledEnl = account?.max_dd_enabled
                const maxDdPctEnlCalc = !isNaN(maxDdPctEnlRaw) ? Math.min(99, Math.max(0, maxDdPctEnlRaw)) : 0
                const maxDdTypeEnl = account?.max_dd_type || 'static'
                const maxDdStopsAtEnl = account?.max_dd_trailing_stops_at || 'never'
                const maxDdLocksAtPctEnl = parseFloat(account?.max_dd_locks_at_pct) || 0
                let maxDdFloorPointsEnl = []
                let maxDdStaticFloorEnl = null
                if (equityCurveGroupBy === 'total' && maxDdEnabledEnl && maxDdPctEnlCalc > 0) {
                  if (maxDdTypeEnl === 'static') {
                    maxDdStaticFloorEnl = startingBalance * (1 - maxDdPctEnlCalc / 100)
                  } else {
                    let peak = startingBalance
                    let trailingFloor = startingBalance * (1 - maxDdPctEnlCalc / 100)
                    let isLocked = false
                    let lockedFloor = null
                    const getLockThresholdMaxEnl = () => {
                      if (maxDdStopsAtEnl === 'initial') return startingBalance
                      if (maxDdStopsAtEnl === 'custom' && maxDdLocksAtPctEnl > 0) return startingBalance * (1 + maxDdLocksAtPctEnl / 100)
                      return null
                    }
                    const lockThresholdMaxEnl = getLockThresholdMaxEnl()
                    const totalPointsMax = [{ balance: startingBalance }]
                    sorted.forEach(t => totalPointsMax.push({ balance: totalPointsMax[totalPointsMax.length - 1].balance + (parseFloat(t.pnl) || 0) }))
                    totalPointsMax.forEach((p, i) => {
                      if (i === 0) { maxDdFloorPointsEnl.push({ idx: i, floor: trailingFloor }) }
                      else {
                        if (p.balance > peak) { peak = p.balance; trailingFloor = peak * (1 - maxDdPctEnlCalc / 100) }
                        let floor = trailingFloor
                        if (lockThresholdMaxEnl !== null && !isLocked && floor >= lockThresholdMaxEnl) { isLocked = true; lockedFloor = lockThresholdMaxEnl; floor = lockedFloor }
                        else if (isLocked) { floor = lockedFloor }
                        maxDdFloorPointsEnl.push({ idx: i, floor })
                      }
                    })
                  }
                }

                // Build SVG paths for daily DD and trailing max DD
                let dailyDdPathEnl = ''
                if (dailyDdFloorPointsEnl.length > 0) {
                  const ddChartPointsEnl = dailyDdFloorPointsEnl.map((p, i) => {
                    const totalLen = dailyDdFloorPointsEnl.length
                    const x = totalLen > 1 ? (p.idx / (totalLen - 1)) * svgW : svgW / 2
                    const y = svgH - ((p.floor - yMin) / yRangeFinal) * svgH
                    const aboveProfitTarget = profitTargetEnl && p.floor >= profitTargetEnl
                    return { x, y, isNewDay: p.isNewDay, floor: p.floor, aboveProfitTarget }
                  })
                  let pathParts = []
                  let inPath = false
                  for (let i = 0; i < ddChartPointsEnl.length; i++) {
                    const p = ddChartPointsEnl[i]
                    const prevP = i > 0 ? ddChartPointsEnl[i - 1] : null
                    if (p.aboveProfitTarget) { inPath = false; continue }
                    if (!inPath) { pathParts.push(`M ${p.x} ${p.y}`); inPath = true }
                    else { pathParts.push(`H ${p.x}`); if (prevP && p.y !== prevP.y && !prevP.aboveProfitTarget) { pathParts.push(`V ${p.y}`) } }
                  }
                  dailyDdPathEnl = pathParts.join(' ')
                }

                let trailingMaxDdPathEnl = ''
                if (maxDdFloorPointsEnl.length > 0) {
                  const maxDdChartPointsEnl = maxDdFloorPointsEnl.map(p => {
                    const totalLen = maxDdFloorPointsEnl.length
                    const x = totalLen > 1 ? (p.idx / (totalLen - 1)) * svgW : svgW / 2
                    const y = svgH - ((p.floor - yMin) / yRangeFinal) * svgH
                    return { x, y }
                  })
                  trailingMaxDdPathEnl = maxDdChartPointsEnl.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                }

                // Static max DD floor Y position
                const maxDdStaticFloorYEnl = maxDdStaticFloorEnl ? ((yMax - maxDdStaticFloorEnl) / yRangeFinal) * 100 : null

                return (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Chart row - Y-axis and chart area aligned */}
                    <div style={{ flex: 1, display: 'flex' }}>
                      {/* Y-axis labels - same height as chart */}
                      <div style={{ width: '44px', flexShrink: 0, position: 'relative', borderRight: '1px solid #2a2a35', borderBottom: '1px solid transparent', overflow: 'visible' }}>
                        {yLabels.map((v, i) => {
                          const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                          const isStart = v === startingBalance
                          return (
                            <Fragment key={i}>
                              <span style={{ position: 'absolute', right: '5px', top: `${topPct}%`, transform: 'translateY(-50%)', fontSize: '10px', color: '#999', lineHeight: 1, textAlign: 'right', fontWeight: 400 }}>{formatYLabelEnl(v)}</span>
                              <div style={{ position: 'absolute', right: 0, top: `${topPct}%`, width: '4px', borderTop: `1px solid ${isStart ? '#888' : '#2a2a35'}` }} />
                            </Fragment>
                          )
                        })}
                        {/* DD Floor value on Y-axis */}
                        {ddFloorYEnl !== null && (
                          <Fragment>
                            <span style={{ position: 'absolute', right: '5px', top: `${ddFloorYEnl}%`, transform: 'translateY(-50%)', fontSize: '10px', color: propFirmDrawdown?.breached ? '#ef4444' : '#f59e0b', textAlign: 'right', fontWeight: 600 }}>{formatYLabelEnl(ddFloorEnl)}</span>
                            <div style={{ position: 'absolute', right: 0, top: `${ddFloorYEnl}%`, width: '4px', borderTop: `1px solid ${propFirmDrawdown?.breached ? '#ef4444' : '#f59e0b'}` }} />
                          </Fragment>
                        )}
                        {/* Profit target value on Y-axis */}
                        {profitTargetYEnl !== null && (
                          <Fragment>
                            <span style={{ position: 'absolute', right: '5px', top: `${profitTargetYEnl}%`, transform: 'translateY(-50%)', fontSize: '10px', color: distanceFromTarget?.passed ? '#22c55e' : '#3b82f6', textAlign: 'right', fontWeight: 600 }}>{formatYLabelEnl(profitTargetEnl)}</span>
                            <div style={{ position: 'absolute', right: 0, top: `${profitTargetYEnl}%`, width: '4px', borderTop: `1px solid ${distanceFromTarget?.passed ? '#22c55e' : '#3b82f6'}` }} />
                          </Fragment>
                        )}
                      </div>
                      {/* Chart area */}
                      <div style={{ flex: 1, position: 'relative', overflow: 'visible', borderBottom: '1px solid #2a2a35' }}>
                          {/* Horizontal grid lines - bottom line is x-axis border */}
                          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                            {yLabels.map((v, i) => {
                              const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                              const isLast = i === yLabels.length - 1
                              if (isLast) return null
                              const isStart = v === startingBalance
                              return (
                                <Fragment key={i}>
                                  <div style={{ position: 'absolute', left: 0, right: isStart ? '40px' : 0, top: `${topPct}%`, borderTop: isStart ? '1px dashed #666' : '1px solid rgba(51,51,51,0.5)', zIndex: isStart ? 1 : 0 }} />
                                  {isStart && <span style={{ position: 'absolute', right: '4px', top: `${topPct}%`, transform: 'translateY(-50%)', fontSize: '10px', color: '#666', fontWeight: 500 }}>Start</span>}
                                </Fragment>
                              )
                            })}
                          </div>
                          {zeroY !== null && <div style={{ position: 'absolute', left: 0, right: 0, top: `${zeroY}%`, borderTop: '1px solid rgba(51,51,51,0.5)', zIndex: 1 }}><span style={{ position: 'absolute', left: '-60px', top: '-6px', fontSize: '11px', color: '#666' }}>$0</span></div>}
                          {/* DD Floor line - dashed orange/red horizontal line */}
                          {showObjectiveLines && ddFloorYEnl !== null && (
                            <>
                              <div style={{ position: 'absolute', left: 0, right: '55px', top: `${ddFloorYEnl}%`, borderTop: `1px dashed ${propFirmDrawdown?.breached ? '#ef4444' : '#f59e0b'}`, zIndex: 1 }} />
                              <span style={{ position: 'absolute', right: '4px', top: `${ddFloorYEnl}%`, transform: 'translateY(-50%)', fontSize: '10px', color: propFirmDrawdown?.breached ? '#ef4444' : '#f59e0b', fontWeight: 500 }}>{propFirmDrawdown?.breached ? 'BREACHED' : 'DD Floor'}</span>
                            </>
                          )}
                          {/* Profit target line - dashed blue/green horizontal line */}
                          {showObjectiveLines && profitTargetYEnl !== null && (
                            <>
                              <div style={{ position: 'absolute', left: 0, right: '45px', top: `${profitTargetYEnl}%`, borderTop: `1px dashed ${distanceFromTarget?.passed ? '#22c55e' : '#3b82f6'}`, zIndex: 1 }} />
                              <span style={{ position: 'absolute', right: '4px', top: `${profitTargetYEnl}%`, transform: 'translateY(-50%)', fontSize: '10px', color: distanceFromTarget?.passed ? '#22c55e' : '#3b82f6', fontWeight: 500 }}>{distanceFromTarget?.passed ? 'PASSED' : 'Target'}</span>
                            </>
                          )}
                          {/* Static Max DD floor line - dashed red horizontal line */}
                          {showObjectiveLines && maxDdStaticFloorYEnl !== null && (
                            <>
                              <div style={{ position: 'absolute', left: 0, right: '65px', top: `${maxDdStaticFloorYEnl}%`, borderTop: '1px dashed #ef4444', zIndex: 1 }} />
                              <span style={{ position: 'absolute', right: '4px', top: `${maxDdStaticFloorYEnl}%`, transform: 'translateY(-50%)', fontSize: '10px', color: '#ef4444', fontWeight: 500 }}>Max DD</span>
                            </>
                          )}
                          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 2 }} viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none"
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
                                {/* Objective lines - daily DD and trailing max DD */}
                                {showObjectiveLines && dailyDdPathEnl && <path d={dailyDdPathEnl} fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="5,5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                                {showObjectiveLines && trailingMaxDdPathEnl && <path d={trailingMaxDdPathEnl} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                              </>
                            ) : (() => {
                              // Sort lines by final Y position (end of line) - top lines first
                              const sortedLines = [...lineData].map((line, origIdx) => {
                                const lastY = line.chartPoints[line.chartPoints.length - 1]?.y || 0
                                return { ...line, origIdx, lastY }
                              }).sort((a, b) => a.lastY - b.lastY) // Top lines first (lowest Y)

                              // Helper to interpolate Y value at a given X for a line
                              const interpolateY = (pts, x) => {
                                if (pts.length === 0) return svgH
                                if (x <= pts[0].x) return pts[0].y
                                if (x >= pts[pts.length - 1].x) return pts[pts.length - 1].y
                                for (let i = 0; i < pts.length - 1; i++) {
                                  if (x >= pts[i].x && x <= pts[i + 1].x) {
                                    const t = (x - pts[i].x) / (pts[i + 1].x - pts[i].x)
                                    return pts[i].y + t * (pts[i + 1].y - pts[i].y)
                                  }
                                }
                                return pts[pts.length - 1].y
                              }

                              return (
                                <>
                                  <defs>
                                    {/* Create clipPath for each line - clips glow to region between this line and next line below */}
                                    {sortedLines.map((line, sortIdx) => {
                                      const pts = line.chartPoints
                                      const nextLine = sortedLines[sortIdx + 1]
                                      const xMin = pts.length > 0 ? Math.min(...pts.map(p => p.x)) : 0
                                      const xMax = pts.length > 0 ? Math.max(...pts.map(p => p.x)) : 100
                                      const numSamples = 50
                                      const xSamples = []
                                      for (let i = 0; i <= numSamples; i++) {
                                        xSamples.push(xMin + (xMax - xMin) * (i / numSamples))
                                      }
                                      const topEdge = xSamples.map(x => ({ x, y: interpolateY(pts, x) }))
                                      const bottomEdge = nextLine
                                        ? xSamples.map(x => ({ x, y: interpolateY(nextLine.chartPoints, x) }))
                                        : xSamples.map(x => ({ x, y: svgH }))
                                      const clipPath = topEdge.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') +
                                        bottomEdge.slice().reverse().map(p => ` L ${p.x} ${p.y}`).join('') + ' Z'
                                      return <clipPath key={`clipEnl${line.origIdx}`} id={`clipEnl${line.origIdx}`}><path d={clipPath} /></clipPath>
                                    })}
                                    {/* Gradient for each line */}
                                    {sortedLines.map((line) => (
                                      <linearGradient key={`gradEnl${line.origIdx}`} id={`gradEnl${line.origIdx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor={line.color} stopOpacity="0.4" />
                                        <stop offset="100%" stopColor={line.color} stopOpacity="0" />
                                      </linearGradient>
                                    ))}
                                  </defs>
                                  {/* Draw gradient areas with clipPaths - bottom to top order */}
                                  {[...sortedLines].reverse().map((line) => {
                                    const pts = line.chartPoints
                                    const areaPath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') +
                                      ` L ${pts[pts.length - 1].x} ${svgH} L ${pts[0].x} ${svgH} Z`
                                    return <path key={`areaEnl${line.origIdx}`} d={areaPath} fill={`url(#gradEnl${line.origIdx})`} clipPath={`url(#clipEnl${line.origIdx})`} />
                                  })}
                                  {/* Draw all lines on top */}
                                  {lineData.map((line, idx) => (
                                    <path key={`line${idx}`} d={line.pathD} fill="none" stroke={line.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                  ))}
                                </>
                              )
                            })()}
                          </svg>
                          {/* Line labels at end of each line - with collision detection */}
                          {equityCurveGroupBy !== 'total' && (() => {
                            const minYSpacing = 16 // Minimum Y pixels between labels

                            // Get label data with positions
                            const labels = lineData.map((line, idx) => {
                              const pts = line.chartPoints
                              if (pts.length < 2) return null
                              return { line, idx, pts, yPos: pts[pts.length - 1].y, xPos: pts[pts.length - 1].x, ptIndex: pts.length - 1 }
                            }).filter(Boolean)

                            // Sort by Y position (top to bottom)
                            labels.sort((a, b) => a.yPos - b.yPos)

                            // Check all labels against each other and move back along line if overlapping
                            const placedLabels = []
                            for (const label of labels) {
                              let ptIndex = label.ptIndex
                              let attempts = 0
                              const maxAttempts = Math.min(25, label.pts.length - 2)

                              while (attempts < maxAttempts) {
                                const testY = label.pts[ptIndex].y
                                const testX = label.pts[ptIndex].x

                                // Check against all placed labels
                                let hasCollision = false
                                for (const placed of placedLabels) {
                                  const yDiff = Math.abs(testY - placed.yPos)
                                  const xDiff = Math.abs(testX - placed.xPos)
                                  // Collision if both X and Y are close
                                  if (yDiff < minYSpacing && xDiff < 60) {
                                    hasCollision = true
                                    break
                                  }
                                }

                                if (!hasCollision) {
                                  label.ptIndex = ptIndex
                                  label.yPos = testY
                                  label.xPos = testX
                                  break
                                }

                                ptIndex--
                                if (ptIndex < 1) break
                                attempts++
                              }

                              placedLabels.push(label)
                            }

                            return labels.map(({ line, idx, pts, ptIndex }) => {
                              const pt = pts[ptIndex]
                              const prevPt = pts[Math.max(0, ptIndex - 1)]
                              const dx = pt.x - prevPt.x
                              const dy = pt.y - prevPt.y
                              const angle = Math.atan2(dy, dx) * (180 / Math.PI)
                              const clampedAngle = Math.max(-30, Math.min(30, angle))
                              const yPct = (pt.y / svgH) * 100
                              const xPct = (pt.x / svgW) * 100
                              const isAtEnd = ptIndex === pts.length - 1

                              return (
                                <div key={`labelEnl${idx}`} style={{
                                  position: 'absolute',
                                  right: isAtEnd ? '8px' : 'auto',
                                  left: isAtEnd ? 'auto' : `${xPct}%`,
                                  top: `${yPct}%`,
                                  transform: `translateY(-100%) ${isAtEnd ? '' : 'translateX(-50%)'} rotate(${clampedAngle}deg)`,
                                  transformOrigin: isAtEnd ? 'right bottom' : 'center bottom',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  color: line.color,
                                  whiteSpace: 'nowrap',
                                  pointerEvents: 'none',
                                  marginTop: '-4px'
                                }}>
                                  {line.name}
                                </div>
                              )
                            })
                          })()}
                          {/* Legend - top left for multi-line */}
                          {equityCurveGroupBy !== 'total' && (
                            <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(13,13,18,0.9)', padding: '8px 10px', borderRadius: '6px', fontSize: '10px' }}>
                              {lineData.map((line, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: line.color }} />
                                  <span style={{ color: '#aaa' }}>{line.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {hoverPoint && <div style={{ position: 'absolute', left: `${hoverPoint.xPct}%`, top: `${hoverPoint.yPct}%`, transform: 'translate(-50%, -50%)', width: '12px', height: '12px', borderRadius: '50%', background: equityCurveGroupBy === 'total' ? (hoverPoint.balance >= startingBalance ? '#22c55e' : '#ef4444') : (hoverPoint.lineColor || '#22c55e'), border: '2px solid #fff', pointerEvents: 'none', zIndex: 10 }} />}
                          {hoverPoint && (
                            <div style={{ position: 'absolute', left: `${hoverPoint.xPct}%`, top: `${hoverPoint.yPct}%`, transform: `translate(${hoverPoint.xPct > 80 ? 'calc(-100% - 15px)' : '15px'}, ${hoverPoint.yPct < 20 ? '0%' : hoverPoint.yPct > 80 ? '-100%' : '-50%'})`, background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '10px 14px', fontSize: '12px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
                              {hoverPoint.lineName && equityCurveGroupBy !== 'total' && <div style={{ color: hoverPoint.lineColor, fontWeight: 600, marginBottom: '4px' }}>{hoverPoint.lineName}</div>}
                              <div style={{ color: '#999' }}>{hoverPoint.date ? new Date(hoverPoint.date).toLocaleDateString() : 'Start'}</div>
                              <div style={{ fontWeight: 600, fontSize: '16px', color: '#fff' }}>${hoverPoint.balance?.toLocaleString()}</div>
                              {hoverPoint.symbol && <div style={{ color: hoverPoint.pnl >= 0 ? '#22c55e' : '#ef4444' }}>{hoverPoint.symbol}: {hoverPoint.pnl >= 0 ? '+' : ''}${hoverPoint.pnl?.toFixed(0)}</div>}
                            </div>
                          )}
                        </div>
                    </div>
                    {/* X-axis row - spacer + labels */}
                    <div style={{ display: 'flex' }}>
                      <div style={{ width: '44px', flexShrink: 0 }} />
                      <div style={{ flex: 1, height: '28px', position: 'relative' }}>
                        {xLabels.map((l, i) => (
                          <div key={i} style={{ position: 'absolute', left: `${l.pct}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '1px', height: '4px', background: '#2a2a35' }} />
                            <span style={{ fontSize: '10px', color: '#999', marginTop: '4px', whiteSpace: 'nowrap' }}>{l.label}</span>
                          </div>
                        ))}
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
                
                if (entries.length === 0) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>No data</div>

                const maxVal = barGraphMetric === 'winrate' ? 100 : Math.max(...entries.map(e => Math.abs(e.val)), 1)
                const niceMax = barGraphMetric === 'winrate' ? 100 : Math.ceil(maxVal / 100) * 100 || 100

                // Generate Y-axis labels - more labels for better readability
                const yLabelCount = 11
                const yLabelsBar = []
                for (let i = 0; i < yLabelCount; i++) {
                  const val = Math.round((niceMax / (yLabelCount - 1)) * (yLabelCount - 1 - i))
                  if (barGraphMetric === 'winrate') yLabelsBar.push({ val, disp: val + '%' })
                  else if (barGraphMetric === 'pnl' || barGraphMetric === 'avgpnl') yLabelsBar.push({ val, disp: '$' + val })
                  else yLabelsBar.push({ val, disp: val.toString() })
                }

                return (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Chart row - Y-axis and chart area aligned */}
                    <div style={{ flex: 1, display: 'flex' }}>
                      {/* Y-axis labels - same height as chart */}
                      <div style={{ width: '44px', flexShrink: 0, position: 'relative', borderBottom: '1px solid transparent', overflow: 'visible' }}>
                        {yLabelsBar.map((v, i) => {
                          const topPct = yLabelsBar.length > 1 ? (i / (yLabelsBar.length - 1)) * 100 : 0
                          return (
                            <Fragment key={i}>
                              <span style={{ position: 'absolute', right: '5px', top: `${topPct}%`, transform: 'translateY(-50%)', fontSize: '10px', color: '#999', textAlign: 'right' }}>{v.disp}</span>
                              <div style={{ position: 'absolute', right: 0, top: `${topPct}%`, width: '4px', borderTop: '1px solid #2a2a35' }} />
                            </Fragment>
                          )
                        })}
                      </div>
                      {/* Chart area */}
                      <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #2a2a35', borderBottom: '1px solid #2a2a35' }}>
                        {/* Horizontal grid lines - bottom line is x-axis */}
                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                          {yLabelsBar.map((_, i) => {
                            const topPct = yLabelsBar.length > 1 ? (i / (yLabelsBar.length - 1)) * 100 : 0
                            const isLast = i === yLabelsBar.length - 1
                            if (isLast) return null
                            return <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${topPct}%`, borderTop: '1px solid rgba(51,51,51,0.5)' }} />
                          })}
                        </div>
                        {/* Bars */}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: '12px', padding: '0 20px' }}>
                          {entries.map((item, i) => {
                            const hPct = item.val === 0 ? 1 : Math.max((Math.abs(item.val) / niceMax) * 100, 5)
                            const isGreen = barGraphMetric === 'winrate' || barGraphMetric === 'count' ? true : item.val >= 0
                            const isHovered = barHover === i
                            return (
                              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}
                                onMouseEnter={() => setBarHover(i)}
                                onMouseLeave={() => setBarHover(null)}
                              >
                                <div style={{ width: '100%', maxWidth: '80px', height: `${hPct}%`, background: `linear-gradient(to bottom, ${isGreen ? `rgba(34, 197, 94, ${0.15 + (hPct / 100) * 0.2})` : `rgba(239, 68, 68, ${0.15 + (hPct / 100) * 0.2})`} 0%, transparent 100%)`, border: `1px solid ${isGreen ? '#22c55e' : '#ef4444'}`, borderBottom: 'none', borderRadius: '6px 6px 0 0', minHeight: item.val === 0 ? '2px' : '20px', position: 'relative', cursor: 'pointer' }}>
                                  <div style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '14px', color: isGreen ? '#22c55e' : '#ef4444', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.disp}</div>
                                  {isHovered && (
                                    <>
                                      <div style={{ position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)', width: '10px', height: '10px', borderRadius: '50%', background: isGreen ? '#22c55e' : '#ef4444', border: '2px solid #fff', zIndex: 5 }} />
                                      <div style={{ position: 'absolute', bottom: '0px', left: 'calc(50% + 12px)', background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
                                        <div style={{ fontWeight: 700, color: '#fff', fontSize: '14px', marginBottom: '2px' }}>{item.name}</div>
                                        <div style={{ fontWeight: 600, fontSize: '16px', color: isGreen ? '#22c55e' : '#ef4444' }}>{barGraphMetric === 'winrate' ? 'Winrate: ' : barGraphMetric === 'pnl' ? 'PnL: ' : barGraphMetric === 'avgpnl' ? 'Avg PnL: ' : 'Count: '}{item.disp}</div>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                    {/* X-axis row - spacer + labels, NO borders */}
                    <div style={{ display: 'flex' }}>
                      <div style={{ width: '44px', flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', gap: '12px', padding: '8px 20px 0' }}>
                        {entries.map((item, i) => (
                          <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: '#999' }}>{item.name}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })()}
              </div>
              {/* Stats Sidebar - Matches chart height exactly */}
              <div style={{ width: '280px', background: '#0a0a0e', borderRadius: '12px', border: '1px solid #1a1a22', padding: '16px', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                <div style={{ fontSize: '13px', color: '#fff', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 700, letterSpacing: '1px', borderBottom: '1px solid #1a1a22', paddingBottom: '8px' }}>Statistics</div>
                {(() => {
                  // Calculate stats based on selected lines/data
                  let filteredTrades = []
                  if (enlargedChart === 'equity') {
                    if (equityCurveGroupBy === 'total') {
                      filteredTrades = trades
                    } else {
                      // Get visible line names from lineData that are actually shown
                      const visibleLineNames = Object.keys(selectedCurveLines).length > 0
                        ? Object.keys(selectedCurveLines).filter(k => selectedCurveLines[k] !== false)
                        : []
                      if (visibleLineNames.length > 0) {
                        filteredTrades = trades.filter(t => {
                          let key
                          if (equityCurveGroupBy === 'symbol') key = t.symbol
                          else if (equityCurveGroupBy === 'direction') key = t.direction
                          else key = (getExtraData(t)[equityCurveGroupBy] || 'Unknown')
                          return visibleLineNames.includes(key)
                        })
                      } else {
                        filteredTrades = trades
                      }
                    }
                  } else if (enlargedChart === 'bar') {
                    filteredTrades = trades
                  } else {
                    filteredTrades = trades
                  }

                  const wins = filteredTrades.filter(t => t.outcome === 'win')
                  const losses = filteredTrades.filter(t => t.outcome === 'loss')
                  const totalPnl = filteredTrades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0)
                  const winrate = filteredTrades.length > 0 ? ((wins.length / filteredTrades.length) * 100).toFixed(0) : '-'
                  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + parseFloat(t.pnl), 0) / wins.length : 0
                  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + parseFloat(t.pnl), 0) / losses.length) : 0
                  const profitFactor = avgLoss > 0 && losses.length > 0 ? ((avgWin * wins.length) / (avgLoss * losses.length)).toFixed(2) : wins.length > 0 ? '∞' : '-'
                  const biggestWin = wins.length > 0 ? Math.max(...wins.map(t => parseFloat(t.pnl))) : 0
                  const biggestLoss = losses.length > 0 ? Math.min(...losses.map(t => parseFloat(t.pnl))) : 0
                  const avgPnl = filteredTrades.length > 0 ? totalPnl / filteredTrades.length : 0
                  const expectancy = filteredTrades.length > 0 ? (parseFloat(winrate) / 100 * avgWin - (1 - parseFloat(winrate) / 100) * avgLoss).toFixed(0) : '-'
                  const avgRR = avgLoss > 0 ? (avgWin / avgLoss).toFixed(1) : avgWin > 0 ? '∞' : '-'
                  const breakeven = filteredTrades.filter(t => parseFloat(t.pnl) === 0).length

                  // Calculate streak
                  const sortedTrades = [...filteredTrades].sort((a, b) => new Date(a.date) - new Date(b.date))
                  let currentStreak = 0, maxWinStreak = 0, maxLossStreak = 0, tempStreak = 0
                  sortedTrades.forEach(t => {
                    if (t.outcome === 'win') { tempStreak = tempStreak > 0 ? tempStreak + 1 : 1; maxWinStreak = Math.max(maxWinStreak, tempStreak) }
                    else if (t.outcome === 'loss') { tempStreak = tempStreak < 0 ? tempStreak - 1 : -1; maxLossStreak = Math.max(maxLossStreak, Math.abs(tempStreak)) }
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
                    { label: 'Total P&L', value: `${totalPnl >= 0 ? '+' : ''}$${Math.round(totalPnl).toLocaleString()}`, color: totalPnl >= 0 ? '#22c55e' : '#ef4444', big: true },
                    { label: 'Total Trades', value: filteredTrades.length, color: '#fff' },
                    { label: 'Wins', value: wins.length, color: '#22c55e' },
                    { label: 'Losses', value: losses.length, color: '#ef4444' },
                    { label: 'Winrate', value: `${winrate}%`, color: winrate === '-' ? '#666' : parseFloat(winrate) >= 50 ? '#22c55e' : '#ef4444' },
                    { label: 'Profit Factor', value: profitFactor, color: profitFactor === '-' ? '#666' : profitFactor === '∞' ? '#22c55e' : parseFloat(profitFactor) >= 1 ? '#22c55e' : '#ef4444' },
                    { label: 'Avg RR', value: `${avgRR}R`, color: avgRR === '-' ? '#666' : avgRR === '∞' ? '#22c55e' : parseFloat(avgRR) >= 1 ? '#22c55e' : '#ef4444' },
                    { label: 'Avg Win', value: `+$${Math.round(avgWin).toLocaleString()}`, color: '#22c55e' },
                    { label: 'Avg Loss', value: `-$${Math.round(avgLoss).toLocaleString()}`, color: '#ef4444' },
                    { label: 'Avg Trade', value: `${avgPnl >= 0 ? '+' : ''}$${Math.round(avgPnl).toLocaleString()}`, color: avgPnl >= 0 ? '#22c55e' : '#ef4444' },
                    { label: 'Expectancy', value: expectancy === '-' ? '-' : `${parseFloat(expectancy) >= 0 ? '+' : ''}$${expectancy}`, color: expectancy === '-' ? '#666' : parseFloat(expectancy) >= 0 ? '#22c55e' : '#ef4444' },
                    { label: 'Best Trade', value: `+$${Math.round(biggestWin).toLocaleString()}`, color: '#22c55e' },
                    { label: 'Worst Trade', value: `$${Math.round(biggestLoss).toLocaleString()}`, color: '#ef4444' },
                    { label: 'Trade Streak', value: currentStreak >= 0 ? `+${currentStreak}` : `${currentStreak}`, color: currentStreak >= 0 ? '#22c55e' : '#ef4444' },
                    { label: 'Best Win Streak', value: `+${maxWinStreak}`, color: '#22c55e' },
                    { label: 'Worst Loss Streak', value: `-${maxLossStreak}`, color: '#ef4444' },
                    { label: 'Days Traded', value: totalDays, color: '#fff' },
                    { label: 'Green Days', value: greenDays, color: '#22c55e' },
                    { label: 'Red Days', value: redDays, color: '#ef4444' },
                    { label: 'Day Streak', value: currentDayStreak >= 0 ? `+${currentDayStreak}` : `${currentDayStreak}`, color: currentDayStreak >= 0 ? '#22c55e' : '#ef4444' },
                  ]

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      {stats.map((stat, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: stat.big ? '10px 12px' : '6px 10px', background: stat.big ? 'linear-gradient(135deg, #0d0d12 0%, #141418 100%)' : '#0d0d12', borderRadius: '6px', border: stat.big ? '1px solid #1a1a22' : '1px solid #141418' }}>
                          <span style={{ fontSize: stat.big ? '12px' : '11px', color: '#888', fontWeight: 500 }}>{stat.label}</span>
                          <span style={{ fontSize: stat.big ? '16px' : '13px', fontWeight: 700, color: stat.color }}>{stat.value}</span>
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
