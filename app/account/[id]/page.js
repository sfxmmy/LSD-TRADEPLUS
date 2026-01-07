'use client'

import { useState, useEffect, useRef } from 'react'
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
    if (accountData.notes_data) { try { setNotes(JSON.parse(accountData.notes_data)) } catch {} }
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
    // Use input LABEL as key (not ID) so data is human-readable
    const extraData = {}
    inputs.forEach(inp => {
      if (!['symbol', 'outcome', 'pnl', 'rr', 'date', 'notes', 'direction'].includes(inp.id)) {
        // Use label as key for readability, fallback to id if no label
        const key = inp.label || inp.id
        extraData[key] = tradeForm[inp.id] || ''
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
    await supabase.from('trades').delete().eq('id', tradeId)
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

    // Use input LABEL as key (not ID) so data is human-readable
    const extraData = {}
    inputs.forEach(inp => {
      if (!['symbol', 'outcome', 'pnl', 'rr', 'date', 'notes', 'direction'].includes(inp.id)) {
        const key = inp.label || inp.id
        extraData[key] = tradeForm[inp.id] || ''
      }
    })

    const { data, error } = await supabase.from('trades').update({
      symbol: tradeForm.symbol?.toUpperCase(),
      direction: tradeForm.direction || 'long',
      outcome: tradeForm.outcome || 'win',
      pnl: parseFloat(tradeForm.pnl) || 0,
      rr: parseFloat(tradeForm.rr) || 0,
      date: tradeForm.date || new Date().toISOString().split('T')[0],
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
    await supabase.from('accounts').update({ custom_inputs: JSON.stringify(newInputs) }).eq('id', accountId)
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
  async function uploadImage(file, inputId) {
    if (!file || !user?.id || !accountId) {
      console.log('Upload skipped - missing:', { file: !!file, userId: user?.id, accountId })
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
      // Fallback to base64 if storage upload fails
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
  // Get slideshow images
  function getSlideshowImages() {
    const target = selectedTrades.size > 0 ? trades.filter(t => selectedTrades.has(t.id)) : trades
    return target.map(t => { const e = getExtraData(t); return { trade: t, image: e.image || e.Image } }).filter(x => x.image)
  }

  // Calculate cumulative stats across all accounts
  function getCumulativeStats() {
    const allTrades = []
    allAccounts.forEach(acc => {
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
    const totalStartingBalance = allAccounts.reduce((sum, acc) => sum + (parseFloat(acc.starting_balance) || 0), 0)
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
        <div style={{ fontSize: '40px', fontWeight: 700, marginBottom: '16px' }}><span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE</span><span style={{ color: '#22c55e' }}>+</span></div>
        <div style={{ color: '#999' }}>Loading...</div>
      </div>
    </div>
  )

  // Get base trades - either current account or all accounts when viewing cumulative
  const baseTradesToFilter = showCumulativeStats && allAccounts.length > 1
    ? Object.values(allAccountsTrades).flat().sort((a, b) => new Date(b.date) - new Date(a.date))
    : trades

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
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, padding: '4px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0f', borderBottom: '1px solid #1a1a22' }}>
        <a href="/" style={{ fontSize: isMobile ? '28px' : '42px', fontWeight: 700, textDecoration: 'none', letterSpacing: '-0.5px' }}><span style={{ color: '#22c55e' }}>LSD</span><span style={{ color: '#fff' }}>TRADE</span><span style={{ color: '#22c55e' }}>+</span></a>
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
        <div style={{ position: 'fixed', top: '60px', left: '180px', right: 0, zIndex: 46, padding: '17px 40px 13px 40px', background: '#0a0a0f', borderBottom: '1px solid #1a1a22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '28px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>{account?.name}</span>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {activeTab === 'trades' && trades.length > 0 && !selectMode && (
                <button onClick={() => setSelectMode(true)} style={{ height: '28px', margin: 0, padding: '0 16px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Select</button>
              )}
              {activeTab === 'trades' && selectMode && (
                <>
                  <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600, lineHeight: 1, margin: 0 }}>{selectedTrades.size} selected</span>
                  <button onClick={() => { const allSelected = filteredTrades.every(t => selectedTrades.has(t.id)); if (allSelected) { const newSet = new Set(selectedTrades); filteredTrades.forEach(t => newSet.delete(t.id)); setSelectedTrades(newSet) } else { const newSet = new Set(selectedTrades); filteredTrades.forEach(t => newSet.add(t.id)); setSelectedTrades(newSet) } }} style={{ height: '28px', margin: 0, padding: '0 16px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '8px', color: '#22c55e', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{filteredTrades.every(t => selectedTrades.has(t.id)) && filteredTrades.length > 0 ? 'Deselect All' : 'Select All'}</button>
                  {selectedTrades.size > 0 && <button onClick={() => { setViewingSelectedStats(true); setActiveTab('statistics') }} style={{ height: '28px', margin: 0, padding: '0 16px', background: 'rgba(34,197,94,0.15)', border: '1px solid #22c55e', borderRadius: '8px', color: '#22c55e', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>View Stats</button>}
                  {selectedTrades.size > 0 && <button onClick={() => setDeleteSelectedConfirm(true)} style={{ height: '28px', margin: 0, padding: '0 16px', background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', borderRadius: '8px', color: '#ef4444', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Delete</button>}
                  <button onClick={exitSelectMode} style={{ height: '28px', margin: 0, padding: '0 16px', background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '8px', color: '#666', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cancel</button>
                </>
              )}
              {!selectMode && (
                <button onClick={() => { setDraftFilters({...filters, quickSelect: ''}); setShowFilters(true) }} style={{ height: '28px', margin: 0, padding: '0 16px', background: hasActiveFilters ? 'rgba(34,197,94,0.15)' : 'transparent', border: hasActiveFilters ? '1px solid #22c55e' : '1px solid #2a2a35', borderRadius: '6px', color: hasActiveFilters ? '#22c55e' : '#fff', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                  Filters{hasActiveFilters && ` (${Object.values(filters).filter(Boolean).length})`}
                </button>
              )}
              {activeTab === 'trades' && !selectMode && (
                <>
                  <button onClick={() => setShowEditInputs(true)} style={{ height: '28px', margin: 0, padding: '0 16px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#fff', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Edit Columns</button>
                  <button onClick={() => { setTradeForm({ date: new Date().toISOString().split('T')[0] }); setEditingTrade(null); setShowAddTrade(true) }} style={{ height: '28px', margin: 0, padding: '0 20px', background: 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(147,51,234,0.4)' }}>+ LOG TRADE</button>
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

          {/* Stats View Selector - show on all tabs */}
          <div style={{ marginBottom: '8px', padding: '10px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px' }}>
            <div style={{ fontSize: '9px', color: '#666', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>Viewing {activeTab === 'trades' ? 'Trades' : activeTab === 'notes' ? 'Notes' : 'Stats'} For</div>

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
                    onClick={() => setShowCumulativeStats(false)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      background: !showCumulativeStats ? '#22c55e' : 'transparent',
                      border: !showCumulativeStats ? 'none' : '1px solid #1a1a22',
                      borderRadius: '6px',
                      color: !showCumulativeStats ? '#fff' : '#666',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      boxShadow: !showCumulativeStats ? '0 0 12px rgba(34,197,94,0.5), 0 0 24px rgba(34,197,94,0.3)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: !showCumulativeStats ? '#fff' : '#444'
                      }} />
                      This Journal
                    </div>
                  </button>
                  {allAccounts.length > 1 && (
                    <button
                      onClick={() => setShowCumulativeStats(true)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: showCumulativeStats ? '#22c55e' : 'transparent',
                        border: showCumulativeStats ? 'none' : '1px solid #1a1a22',
                        borderRadius: '6px',
                        color: showCumulativeStats ? '#fff' : '#666',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        boxShadow: showCumulativeStats ? '0 0 12px rgba(34,197,94,0.5), 0 0 24px rgba(34,197,94,0.3)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          background: showCumulativeStats ? '#fff' : '#444'
                        }} />
                        All Journals
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>

          {/* Slideshow Button */}
          {getTradesWithImages().length > 0 && (
            <button onClick={() => { setSlideshowIndex(0); setSlideshowMode(true) }} style={{ width: '100%', padding: '10px', marginTop: '4px', background: '#0d0d12', border: '1px solid #2a2a35', borderRadius: '6px', color: '#888', fontSize: '11px', cursor: 'pointer' }}>
              Slideshow ({getSlideshowImages().length})
            </button>
          )}
        </div>
        {/* Spacer */}
        <div style={{ flex: 1 }} />
        {/* Journals List - at bottom */}
        <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {allAccounts.map((acc) => {
            const isSelected = acc.id === accountId
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
                <span style={{ fontSize: '11px', color: isSelected ? '#22c55e' : '#666' }}>${(acc.starting_balance || 0).toLocaleString()}</span>
              </a>
            )
          })}
        </div>
        <div style={{ padding: '12px', background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '6px' }}>
          <div style={{ fontSize: '11px', color: '#888', lineHeight: '1.4' }}>{tabDescriptions[activeTab]}</div>
        </div>
      </div>
      )}

      {/* MAIN CONTENT */}
      <div style={{ marginLeft: isMobile ? 0 : '180px', marginTop: isMobile ? '100px' : '130px', padding: isMobile ? '12px' : '0' }}>

        {/* TRADES TAB */}
        {activeTab === 'trades' && (
          <div style={{ position: 'relative', height: 'calc(100vh - 130px)' }}>
            {/* Green glow from bottom */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(to top, rgba(34,197,94,0.03) 0%, rgba(34,197,94,0.01) 50%, transparent 100%)', pointerEvents: 'none', zIndex: 1 }} />
            {filteredTrades.length === 0 && trades.length > 0 ? (
              <div style={{ padding: isMobile ? '40px 20px' : '60px', textAlign: 'center' }}>
                <div style={{ color: '#999', fontSize: '15px', marginBottom: '12px' }}>No trades match your filters.</div>
                <button onClick={() => setFilters({ dateFrom: '', dateTo: '', outcome: '', direction: '', symbol: '', session: '', timeframe: '', confidence: '', rr: '', rating: '', custom: {} })} style={{ padding: '10px 20px', background: 'transparent', border: '1px solid #22c55e', borderRadius: '8px', color: '#22c55e', fontSize: '13px', cursor: 'pointer' }}>Clear Filters</button>
              </div>
            ) : (
              <>
              {/* All Journals Note */}
              {showCumulativeStats && allAccounts.length > 1 && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 11, padding: '8px 16px', background: 'rgba(59,130,246,0.1)', borderBottom: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 6px #3b82f6' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#3b82f6' }}>VIEWING ALL JOURNALS ({allAccounts.length} journals, {filteredTrades.length} trades)</span>
                  </div>
                  <button onClick={() => setShowCumulativeStats(false)} style={{ padding: '4px 10px', background: '#1a1a22', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '11px', cursor: 'pointer' }}>View This Journal</button>
                </div>
              )}
              <div
                ref={tradesScrollRef}
                style={{
                  position: 'absolute',
                  top: showCumulativeStats && allAccounts.length > 1 ? '40px' : 0,
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
                        <tr key={trade.id} onClick={() => selectMode && toggleTradeSelection(trade.id)} style={{ borderBottom: '1px solid #141418', background: selectMode && selectedTrades.has(trade.id) ? 'rgba(34,197,94,0.06)' : 'transparent', cursor: selectMode ? 'pointer' : 'default' }}>
                          {selectMode && <td style={{ padding: '14px 6px', width: '32px', minWidth: '32px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={selectedTrades.has(trade.id)} onChange={() => toggleTradeSelection(trade.id)} style={{ width: '14px', height: '14px', accentColor: '#22c55e', cursor: 'pointer' }} /></td>}
                          {enabledInputs.map(inp => (
                            <td key={inp.id} style={{ padding: '14px 12px', textAlign: 'center', fontSize: '14px', fontWeight: 600, color: '#fff', verticalAlign: 'middle', minWidth: '100px' }}>
                              {inp.id === 'symbol' ? (
                                <span style={{ fontWeight: 600, fontSize: '16px', color: '#fff' }}>{trade.symbol}</span>
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
                                <span style={{ fontWeight: 600, fontSize: '16px', color: pnlValue >= 0 ? '#22c55e' : '#ef4444' }}>{pnlValue >= 0 ? '+' : ''}${pnlValue.toFixed(0)}</span>
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
                                <button onClick={() => setShowExpandedImage(extra[inp.id] || extra[inp.label])} style={{ width: '50px', height: '50px', background: '#1a1a22', borderRadius: '6px', border: '1px solid #2a2a35', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', overflow: 'hidden', padding: 0 }}>
                                  <img src={extra[inp.id] || extra[inp.label]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'auto' }} onError={e => { e.target.style.display = 'none' }} />
                                </button>
                              ) : inp.id === 'image' ? (
                                <span style={{ color: '#444' }}>-</span>
                              ) : inp.id === 'notes' ? (
                                noteContent ? (
                                  <div onClick={() => setShowExpandedNote(noteContent)} style={{ cursor: 'pointer', color: '#fff', fontSize: '14px', fontWeight: 600, maxWidth: '160px', margin: '0 auto', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textAlign: 'left' }}>{noteContent}</div>
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
                              <button onClick={() => startEditTrade(trade)} style={{ background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px', padding: '4px' }} title="Edit trade">✎</button>
                              <button onClick={() => setDeleteConfirmId(trade.id)} style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', fontSize: '18px', padding: '4px' }} title="Delete trade">×</button>
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

          // Get stats based on toggle - either this journal or all journals (disabled when viewing selected)
          const cumStats = showCumulativeStats && allAccounts.length > 1 && !viewingSelectedStats ? getCumulativeStats() : null
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
          <div style={{ padding: isMobile ? '0' : '0 12px' }}>
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
                  <span style={{ fontSize: '12px', color: '#888' }}>Total PnL</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: displayTotalPnl >= 0 ? '#22c55e' : '#ef4444' }}>{displayTotalPnl >= 0 ? '+' : ''}${Math.abs(displayTotalPnl).toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Total Trades</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{displayTrades.length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Winrate</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: displayWinrate >= 50 ? '#22c55e' : '#ef4444' }}>{displayWinrate}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Profit Factor</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: displayProfitFactor === '-' ? '#666' : displayProfitFactor === '∞' ? '#22c55e' : parseFloat(displayProfitFactor) >= 1 ? '#22c55e' : '#ef4444' }}>{displayProfitFactor}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Avg RR</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{displayAvgRR}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Expectancy</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: displayExpectancy >= 0 ? '#22c55e' : '#ef4444' }}>${displayExpectancy}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Avg Win</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e' }}>+${displayAvgWin}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Avg Loss</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#ef4444' }}>-${displayAvgLoss}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Long WR</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: displayLongWinrate >= 50 ? '#22c55e' : '#ef4444' }}>{displayLongWinrate}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Short WR</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: displayShortWinrate >= 50 ? '#22c55e' : '#ef4444' }}>{displayShortWinrate}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Day WR</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: displayDayWinrate >= 50 ? '#22c55e' : '#ef4444' }}>{displayDayWinrate}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Consistency</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: displayConsistencyScore >= 50 ? '#22c55e' : '#ef4444' }}>{displayConsistencyScore}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a22' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Win Streak</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e' }}>{displayStreaks.mw}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#888' }}>Loss Streak</span>
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase' }}>Equity Curve</span>
                            <span style={{ fontSize: '11px', color: '#999' }}>Start: <span style={{ color: '#fff' }}>${chartStart.toLocaleString()}</span></span>
                            <span style={{ fontSize: '11px', color: '#999' }}>Current: <span style={{ color: chartCurrent >= chartStart ? '#22c55e' : '#ef4444' }}>${Math.round(chartCurrent).toLocaleString()}</span></span>
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
                            <button onClick={() => setEnlargedChart(enlargedChart === 'equity' ? null : 'equity')} style={{ background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '4px', padding: '4px 8px', color: '#999', fontSize: '10px', cursor: 'pointer' }}>⛶</button>
                          </div>
                        </div>
                        {/* Graph area - full width now */}
                        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '40px' }}>
                          {sorted.length < 2 ? (
                            <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Need 2+ trades</div>
                          ) : (() => {
                            const allBalances = visibleLines.flatMap(l => l.points.map(p => p.balance))
                            const maxBal = allBalances.length > 0 ? Math.max(...allBalances) : startingBalance
                            const minBal = allBalances.length > 0 ? Math.min(...allBalances) : startingBalance
                            const range = maxBal - minBal || 1000
                            
                            // Calculate tight Y-axis range - no huge gaps
                            const actualMin = equityCurveGroupBy === 'total' ? Math.min(minBal, displayStartingBalance) : minBal
                            const actualRange = maxBal - actualMin || 1000
                            const targetLabels = enlargedChart === 'equity' ? 10 : 6
                            const yStep = Math.ceil(actualRange / targetLabels / 1000) * 1000 || 1000
                            const yMax = Math.ceil(maxBal / yStep) * yStep
                            // yMin is just one step below actual minimum - no huge gaps
                            const yMin = Math.max(0, Math.floor(actualMin / yStep) * yStep)
                            const yRange = yMax - yMin || yStep
                            
                            const yLabels = []
                            for (let v = yMax; v >= yMin; v -= yStep) yLabels.push(v)
                            
                            const hasNegative = minBal < 0
                            const belowStart = equityCurveGroupBy === 'total' && minBal < displayStartingBalance
                            const zeroY = hasNegative ? ((yMax - 0) / yRange) * 100 : null
                            // Starting balance line - always show if within range
                            const startLineY = equityCurveGroupBy === 'total' && !hasNegative && displayStartingBalance >= yMin && displayStartingBalance <= yMax ? ((yMax - displayStartingBalance) / yRange) * 100 : null

                            const svgW = 100, svgH = 100

                            // Calculate starting balance Y position in SVG coordinates
                            const startY = svgH - ((displayStartingBalance - yMin) / yRange) * svgH

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
                                xLabels.push({ label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, pct: xLabelCount > 1 ? 5 + (i / (xLabelCount - 1)) * 90 : 50 })
                              }
                            }

                            return (
                              <>
                                {/* Chart row - Y-axis and chart area aligned */}
                                <div style={{ flex: 1, display: 'flex' }}>
                                  {/* Y-axis labels - same height as chart */}
                                  <div style={{ width: '28px', flexShrink: 0, position: 'relative', borderRight: '1px solid #2a2a35' }}>
                                    {yLabels.map((v, i) => {
                                      const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                                      return (
                                        <div key={i} style={{ position: 'absolute', right: 0, top: `${topPct}%`, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                                          <span style={{ fontSize: '8px', color: '#999', lineHeight: 1, textAlign: 'right' }}>{equityCurveGroupBy === 'total' ? `$${(v/1000).toFixed(v >= 1000 ? 0 : 1)}k` : `$${v}`}</span>
                                          <div style={{ width: '4px', height: '1px', background: '#2a2a35', marginLeft: '2px' }} />
                                        </div>
                                      )
                                    })}
                                  </div>
                                  {/* Chart area */}
                                  <div style={{ flex: 1, position: 'relative', overflow: 'visible' }}>
                                    {/* Horizontal grid lines - all lines including bottom */}
                                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                                      {yLabels.map((_, i) => {
                                        const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                                        return <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${topPct}%`, height: '1px', background: '#2a2a35', transform: 'translateY(-50%)' }} />
                                      })}
                                    </div>
                                    {/* Zero line if negative */}
                                    {zeroY !== null && (
                                      <div style={{ position: 'absolute', left: 0, right: 0, top: `${zeroY}%`, borderTop: '1px solid #2a2a35', zIndex: 1 }} />
                                    )}
                                    {/* Starting balance dotted line - extends to label */}
                                    {startLineY !== null && (
                                      <div style={{ position: 'absolute', left: 0, right: '50px', top: `${startLineY}%`, borderTop: '1px dashed #666', zIndex: 1 }} />
                                    )}
                                    {/* Start label at end of line - shows starting balance value */}
                                    {startLineY !== null && (
                                      <span style={{ position: 'absolute', right: '4px', top: `${startLineY}%`, transform: 'translateY(-50%)', fontSize: '9px', color: '#22c55e', background: '#0d0d12', padding: '0 4px', fontWeight: 600 }}>
                                        Start: ${(displayStartingBalance/1000).toFixed(displayStartingBalance >= 1000 ? 0 : 1)}k
                                      </span>
                                    )}
                                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }} viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none"
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
                                    {equityCurveGroupBy !== 'total' && (() => {
                                      const minYSpacing = 12 // Minimum Y pixels between labels

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
                                        const maxAttempts = Math.min(20, label.pts.length - 2)

                                        while (attempts < maxAttempts) {
                                          const testY = label.pts[ptIndex].y
                                          const testX = label.pts[ptIndex].x

                                          // Check against all placed labels
                                          let hasCollision = false
                                          for (const placed of placedLabels) {
                                            const yDiff = Math.abs(testY - placed.yPos)
                                            const xDiff = Math.abs(testX - placed.xPos)
                                            // Collision if both X and Y are close
                                            if (yDiff < minYSpacing && xDiff < 40) {
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
                                          <div key={`label${idx}`} style={{
                                            position: 'absolute',
                                            right: isAtEnd ? '4px' : 'auto',
                                            left: isAtEnd ? 'auto' : `${xPct}%`,
                                            top: `${yPct}%`,
                                            transform: `translateY(-100%) ${isAtEnd ? '' : 'translateX(-50%)'} rotate(${clampedAngle}deg)`,
                                            transformOrigin: isAtEnd ? 'right bottom' : 'center bottom',
                                            fontSize: '9px',
                                            fontWeight: 600,
                                            color: line.color,
                                            whiteSpace: 'nowrap',
                                            pointerEvents: 'none',
                                            marginTop: '-2px'
                                          }}>
                                            {line.name}
                                          </div>
                                        )
                                      })
                                    })()}
                                    {hoverPoint && <div style={{ position: 'absolute', left: `${hoverPoint.xPct}%`, top: `${hoverPoint.yPct}%`, transform: 'translate(-50%, -50%)', width: '10px', height: '10px', borderRadius: '50%', background: equityCurveGroupBy === 'total' ? (hoverPoint.balance >= displayStartingBalance ? '#22c55e' : '#ef4444') : (hoverPoint.lineColor || '#22c55e'), border: '2px solid #fff', pointerEvents: 'none', zIndex: 10 }} />}
                                    {hoverPoint && (
                                      <div style={{ position: 'absolute', left: `${hoverPoint.xPct}%`, top: `${hoverPoint.yPct}%`, transform: `translate(${hoverPoint.xPct > 80 ? 'calc(-100% - 15px)' : '15px'}, ${hoverPoint.yPct < 20 ? '0%' : hoverPoint.yPct > 80 ? '-100%' : '-50%'})`, background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '8px 12px', fontSize: '11px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
                                        {hoverPoint.lineName && equityCurveGroupBy !== 'total' && <div style={{ color: hoverPoint.lineColor, fontWeight: 600, marginBottom: '2px' }}>{hoverPoint.lineName}</div>}
                                        <div style={{ color: '#999' }}>{hoverPoint.date ? new Date(hoverPoint.date).toLocaleDateString() : 'Start'}</div>
                                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>${hoverPoint.balance?.toLocaleString()}</div>
                                        {hoverPoint.symbol && <div style={{ color: hoverPoint.pnl >= 0 ? '#22c55e' : '#ef4444' }}>{hoverPoint.symbol}: {hoverPoint.pnl >= 0 ? '+' : ''}${hoverPoint.pnl?.toFixed(0)}</div>}
                                      </div>
                                    )}
                                    {/* Legend */}
                                    {equityCurveGroupBy === 'total' ? (
                                      <div style={{ position: 'absolute', bottom: '4px', left: '4px', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(13,13,18,0.9)', padding: '3px 6px', borderRadius: '3px', fontSize: '9px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                          <div style={{ width: '10px', height: '2px', background: '#22c55e' }} />
                                          <span style={{ color: '#999' }}>Above</span>
                                        </div>
                                        {belowStart && (
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <div style={{ width: '10px', height: '2px', background: '#ef4444' }} />
                                            <span style={{ color: '#999' }}>Below</span>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div style={{ position: 'absolute', top: '4px', left: '4px', display: 'flex', flexDirection: 'column', gap: '3px', background: 'rgba(13,13,18,0.9)', padding: '6px 8px', borderRadius: '4px', fontSize: '8px' }}>
                                        {lineData.map((line, idx) => (
                                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: line.color }} />
                                            <span style={{ color: '#aaa' }}>{line.name}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* X-axis row - spacer + labels */}
                                <div style={{ display: 'flex' }}>
                                  <div style={{ width: '28px', flexShrink: 0 }} />
                                  <div style={{ flex: 1, height: '24px', position: 'relative' }}>
                                    {xLabels.map((l, i) => (
                                      <div key={i} style={{ position: 'absolute', left: `${l.pct}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <div style={{ width: '1px', height: '5px', background: '#2a2a35' }} />
                                        <span style={{ fontSize: '9px', color: '#999', marginTop: '3px', whiteSpace: 'nowrap' }}>{l.label}</span>
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
                          <span style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase' }}>Performance by {graphGroupBy === 'symbol' ? 'Pair' : graphGroupBy}</span>
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
                            <button onClick={() => setEnlargedChart(enlargedChart === 'bar' ? null : 'bar')} style={{ background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '4px', padding: '4px 8px', color: '#999', fontSize: '10px', cursor: 'pointer' }}>⛶</button>
                          </div>
                        </div>
                        {/* Graph - restructured so Y-axis aligns only with chart area */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '40px' }}>
                          {/* Chart row - Y-axis and chart area aligned */}
                          <div style={{ flex: 1, display: 'flex' }}>
                            {/* Y-axis labels - same height as chart */}
                            <div style={{ width: '28px', flexShrink: 0, position: 'relative' }}>
                              {yLabels.map((v, i) => {
                                const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                                return (
                                  <div key={i} style={{ position: 'absolute', right: 0, top: `${topPct}%`, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ fontSize: '8px', color: '#999', lineHeight: 1, textAlign: 'right' }}>{v}</span>
                                    <div style={{ width: '3px', height: '1px', background: '#2a2a35', marginLeft: '2px' }} />
                                  </div>
                                )
                              })}
                            </div>
                            {/* Chart area */}
                            <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #2a2a35' }}>
                              {/* Horizontal grid lines - all lines including bottom */}
                              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                                {yLabels.map((_, i) => {
                                  const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                                  return <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${topPct}%`, height: '1px', background: '#2a2a35', transform: 'translateY(-50%)' }} />
                                })}
                              </div>
                              {/* Bars */}
                              <div style={{ position: 'absolute', inset: '0', display: 'flex', alignItems: 'flex-end', gap: '6px', padding: '0 4px' }}>
                                {entries.map((item, i) => {
                                  const hPct = Math.max((Math.abs(item.val) / niceMax) * 100, 5)
                                  const isGreen = barGraphMetric === 'winrate' ? item.val >= 50 : item.val >= 0
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
                <span style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase' }}>Direction</span>
                <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 700 }}>{displayLongPct}% Long</span>
                <div style={{ flex: 1, height: '10px', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: `${displayLongPct}%`, background: '#22c55e' }} />
                  <div style={{ width: `${100 - displayLongPct}%`, background: '#ef4444' }} />
                </div>
                <span style={{ fontSize: '13px', color: '#ef4444', fontWeight: 700 }}>{100 - displayLongPct}% Short</span>
              </div>
              <div style={{ flex: 1, background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase' }}>Sentiment</span>
                <span style={{ fontSize: '13px', color: '#22c55e', fontWeight: 700 }}>{displayWinrate}% Bullish</span>
                <div style={{ flex: 1, height: '10px', borderRadius: '5px', overflow: 'hidden', display: 'flex' }}>
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
                  <span style={{ fontSize: '13px', color: '#999', textTransform: 'uppercase' }}>Net Daily PnL</span>
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
                        {/* Chart row - Y-axis and chart area aligned */}
                        <div style={{ flex: 1, display: 'flex' }}>
                          {/* Y-axis labels - same height as chart */}
                          <div style={{ width: '28px', flexShrink: 0, position: 'relative' }}>
                            {yLabels.map((v, i) => {
                              const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                              return (
                                <div key={i} style={{ position: 'absolute', right: 0, top: `${topPct}%`, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                                  <span style={{ fontSize: '8px', color: '#999', lineHeight: 1, textAlign: 'right' }}>{i === yLabels.length - 1 ? '$0' : `$${v}`}</span>
                                  <div style={{ width: '3px', height: '1px', background: '#2a2a35', marginLeft: '2px' }} />
                                </div>
                              )
                            })}
                          </div>
                          {/* Chart area */}
                          <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #2a2a35' }}>
                            {/* Horizontal grid lines - all lines including bottom */}
                            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                              {yLabels.map((_, i) => {
                                const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                                return <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${topPct}%`, height: '1px', background: '#2a2a35', transform: 'translateY(-50%)' }} />
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
                                    <div style={{ width: '100%', height: hasData ? `${Math.max(hPct, 2)}%` : '2px', background: hasData ? (isPositive ? '#22c55e' : '#ef4444') : '#2a2a35', borderRadius: '2px 2px 0 0', position: 'relative' }}>
                                      {isHovered && (
                                        <>
                                          <div style={{ position: 'absolute', bottom: hasData ? '4px' : '-2px', left: '50%', transform: 'translateX(-50%)', width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', border: '2px solid #fff', zIndex: 5 }} />
                                          <div style={{ position: 'absolute', bottom: '0px', left: 'calc(50% + 10px)', background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
                                            <div style={{ color: '#999' }}>{new Date(d.date).toLocaleDateString()}</div>
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
                        </div>
                        {/* X-axis row - spacer + labels */}
                        <div style={{ display: 'flex' }}>
                          <div style={{ width: '28px', flexShrink: 0 }} />
                          <div style={{ flex: 1, height: '24px', position: 'relative' }}>
                            {xLabels.map((l, i) => (
                              <div key={i} style={{ position: 'absolute', left: `${l.pct}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ width: '1px', height: '5px', background: '#2a2a35' }} />
                                <span style={{ fontSize: '9px', color: '#999', marginTop: '3px', whiteSpace: 'nowrap' }}>{l.label}</span>
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
                    <div style={{ fontSize: '11px', color: '#22c55e', textTransform: 'uppercase', fontWeight: 700, textShadow: '0 0 10px rgba(34,197,94,0.5)', letterSpacing: '1px' }}>Trade Analysis</div>
                    <div style={{ fontSize: '9px', color: '#999' }}>{displayTrades.length} trades</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                    <select value={analysisGroupBy} onChange={e => setAnalysisGroupBy(e.target.value)} style={{ flex: 1, padding: '6px 8px', background: 'linear-gradient(180deg, #1a1a22 0%, #141418 100%)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '6px', color: '#fff', fontSize: '10px', cursor: 'pointer' }}>
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
                    <select value={analysisMetric} onChange={e => setAnalysisMetric(e.target.value)} style={{ flex: 1, padding: '6px 8px', background: 'linear-gradient(180deg, #1a1a22 0%, #141418 100%)', border: '1px solid rgba(34,197,94,0.4)', borderRadius: '6px', color: '#fff', fontSize: '10px', cursor: 'pointer' }}>
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
                          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', background: 'linear-gradient(90deg, rgba(34,197,94,0.08) 0%, rgba(34,197,94,0.02) 100%)', borderRadius: '5px', border: '1px solid rgba(34,197,94,0.15)', position: 'relative', overflow: 'hidden' }}>
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

              const StatBox = ({ label, value, color }) => <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}><span style={{ fontSize: '12px', color: '#999', fontWeight: 500 }}>{label}</span><span style={{ fontSize: '14px', fontWeight: 700, color }}>{value}</span></div>
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
              </div>
              {/* RIGHT: Visual widgets stacked */}
              <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Pair Analysis */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px' }}>
                <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px', borderBottom: '1px solid #1a1a22', paddingBottom: '5px', fontWeight: 600 }}>Pair Analysis</div>
                <select value={pairAnalysisType} onChange={e => setPairAnalysisType(e.target.value)} style={{ width: '100%', fontSize: '12px', color: '#fff', marginBottom: '10px', background: '#141418', border: '1px solid #2a2a35', borderRadius: '6px', padding: '8px 10px', cursor: 'pointer' }}>
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
          <div style={{ padding: isMobile ? '0' : '0 16px 16px 12px' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              {['daily', 'weekly', 'custom'].map(sub => (
                <button key={sub} onClick={() => setNotesSubTab(sub)} style={{ padding: '12px 24px', background: notesSubTab === sub ? '#22c55e' : 'transparent', border: notesSubTab === sub ? 'none' : '1px solid #2a2a35', borderRadius: '8px', color: notesSubTab === sub ? '#fff' : '#888', fontSize: '14px', fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize' }}>{sub}</button>
              ))}
            </div>

            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: '#999', textTransform: 'uppercase' }}>Write {notesSubTab} Note</span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {notesSubTab === 'custom' && <input type="text" placeholder="Note title..." value={customNoteTitle} onChange={e => setCustomNoteTitle(e.target.value)} style={{ padding: '8px 12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '160px' }} />}
                  <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} style={{ padding: '8px 12px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px' }} />
                </div>
              </div>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder={`Write your ${notesSubTab} note...`} style={{ width: '100%', minHeight: '140px', padding: '14px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '8px', color: '#fff', fontSize: '14px', lineHeight: '1.6', resize: 'vertical', boxSizing: 'border-box' }} />
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
                {showCumulativeStats && allAccounts.length > 1 && (
                  <span style={{ fontSize: '10px', color: '#3b82f6', background: 'rgba(59,130,246,0.15)', padding: '2px 6px', borderRadius: '4px' }}>All Journals</span>
                )}
              </div>
              <button onClick={() => setShowFilters(false)} style={{ width: '28px', height: '28px', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>

            {/* Content - scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {/* Date Range Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>From</label>
                  <input type="date" value={draftFilters.dateFrom} onChange={e => setDraftFilters({...draftFilters, dateFrom: e.target.value, quickSelect: ''})} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>To</label>
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
                  <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Direction</label>
                  <div style={{ display: 'flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #1a1a22' }}>
                    {['', 'long', 'short'].map(d => (
                      <button key={d || 'all'} onClick={() => setDraftFilters({...draftFilters, direction: d})} style={{ flex: 1, padding: '9px', background: draftFilters.direction === d ? (d === 'long' ? 'rgba(34,197,94,0.2)' : d === 'short' ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.15)') : '#0a0a0f', border: 'none', borderLeft: d !== '' ? '1px solid #1a1a22' : 'none', color: draftFilters.direction === d ? (d === 'long' ? '#22c55e' : d === 'short' ? '#ef4444' : '#22c55e') : '#666', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase' }}>{d || 'ALL'}</button>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Outcome</label>
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
                  <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Symbol</label>
                  <input type="text" value={draftFilters.symbol} onChange={e => setDraftFilters({...draftFilters, symbol: e.target.value})} placeholder="XAUUSD" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Min R:R</label>
                  <input type="number" step="0.1" value={draftFilters.rr} onChange={e => setDraftFilters({...draftFilters, rr: e.target.value})} placeholder="2.5" style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Confidence + Rating Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Confidence</label>
                  <select value={draftFilters.confidence} onChange={e => setDraftFilters({...draftFilters, confidence: e.target.value})} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23666\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                    <option value="">Any</option>
                    {(filterInputs.find(i => i.id === 'confidence')?.options || ['high', 'medium', 'low']).map(c => (
                      <option key={getOptVal(c)} value={getOptVal(c)}>{getOptVal(c)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Min Rating</label>
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
                  <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Timeframe</label>
                  <select value={draftFilters.timeframe} onChange={e => setDraftFilters({...draftFilters, timeframe: e.target.value})} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23666\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                    <option value="">Any</option>
                    {(filterInputs.find(i => i.id === 'timeframe')?.options || ['1m', '5m', '15m', '1h', '4h', 'daily']).map(t => (
                      <option key={getOptVal(t)} value={getOptVal(t)}>{getOptVal(t)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Session</label>
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
                    <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '10px' }}>Custom Inputs</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {customFilterInputs.map(inp => (
                        <div key={inp.id}>
                          <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>{inp.label}</label>
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
      {showAddTrade && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => { setShowAddTrade(false); setEditingTrade(null) }}>
          <div style={{ background: 'linear-gradient(180deg, #0f0f14 0%, #0a0a0f 100%)', border: '1px solid #1a1a22', borderRadius: '12px', padding: '24px', width: customInputs.filter(i => !['symbol', 'outcome', 'pnl', 'riskPercent', 'rr', 'date', 'direction', 'rating'].includes(i.id) && !i.hidden).length > 4 ? '560px' : customInputs.filter(i => !['symbol', 'outcome', 'pnl', 'riskPercent', 'rr', 'date', 'direction', 'rating'].includes(i.id) && !i.hidden).length > 2 ? '500px' : '440px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: editingTrade ? '#f59e0b' : '#9333ea' }} />
                <span style={{ fontSize: '13px', color: '#fff', fontWeight: 600, letterSpacing: '0.5px' }}>{editingTrade ? 'EDIT TRADE' : 'LOG TRADE'}</span>
                {!editingTrade && (
                  <button onClick={() => { setShowAddTrade(false); setShowEditInputs(true) }} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '4px', color: '#666', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit
                  </button>
                )}
              </div>
              <button onClick={() => { setShowAddTrade(false); setEditingTrade(null) }} style={{ padding: '6px 8px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '6px', color: '#666', fontSize: '14px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>

            {/* All inputs - unified dynamic grid (file/textarea at bottom) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', gridAutoFlow: 'dense' }}>
              {[...customInputs].sort((a, b) => {
                const order = (t) => t === 'textarea' ? 2 : t === 'file' ? 1 : 0
                return order(a.type) - order(b.type)
              }).map(input => {
                const optionsArr = Array.isArray(input.options) ? input.options : []
                return (
                  <div key={input.id} style={{ gridColumn: input.type === 'textarea' ? 'span 2' : 'span 1' }}>
                    <label style={{ display: 'block', fontSize: '10px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>{input.label}</label>
                    {input.type === 'select' ? (
                      <select value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }}>
                        <option value="">-</option>
                        {optionsArr.map((o, idx) => <option key={idx} value={getOptVal(o).toLowerCase()}>{getOptVal(o)}</option>)}
                      </select>
                    ) : input.type === 'textarea' ? (
                      <textarea value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} placeholder="..." rows={3} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
                    ) : input.type === 'rating' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '2px', padding: '8px 10px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', alignItems: 'center' }} onMouseLeave={() => setHoverRatings(prev => ({...prev, [input.id]: 0}))}>
                          {[1, 2, 3, 4, 5].map(star => {
                            const displayRating = hoverRatings[input.id] || parseFloat(tradeForm[input.id] || 0)
                            const isFullStar = displayRating >= star
                            const isHalfStar = displayRating >= star - 0.5 && displayRating < star
                            return (
                              <div key={star} style={{ position: 'relative', width: '24px', height: '24px', cursor: 'pointer' }}
                                onMouseMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const x = e.clientX - rect.left; setHoverRatings(prev => ({...prev, [input.id]: x < rect.width / 2 ? star - 0.5 : star})) }}
                                onClick={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const x = e.clientX - rect.left; const newRating = x < rect.width / 2 ? star - 0.5 : star; setTradeForm({...tradeForm, [input.id]: parseFloat(tradeForm[input.id]) === newRating ? '' : String(newRating)}) }}>
                                <span style={{ position: 'absolute', color: '#2a2a35', fontSize: '24px', lineHeight: 1 }}>★</span>
                                {isHalfStar && <span style={{ position: 'absolute', color: input.textColor || '#22c55e', fontSize: '24px', lineHeight: 1, clipPath: 'inset(0 50% 0 0)' }}>★</span>}
                                {isFullStar && <span style={{ position: 'absolute', color: input.textColor || '#22c55e', fontSize: '24px', lineHeight: 1 }}>★</span>}
                              </div>
                            )
                          })}
                        </div>
                        <span style={{ background: '#1a1a22', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: '#fff', whiteSpace: 'nowrap', minWidth: '40px', textAlign: 'center' }}>
                          {hoverRatings[input.id] || parseFloat(tradeForm[input.id]) || 0} / 5
                        </span>
                      </div>
                    ) : input.type === 'file' ? (
                      <div>
                        <input id={`file-upload-${input.id}`} type="file" accept="image/*" onChange={e => { const file = e.target.files[0]; if (file) uploadImage(file, input.id) }} style={{ display: 'none' }} />
                        {uploadingImage ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px' }}>
                            <span style={{ color: '#f59e0b', fontSize: '12px' }}>Uploading...</span>
                          </div>
                        ) : tradeForm[input.id] ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px' }}>
                            <span style={{ color: '#22c55e', fontSize: '12px' }}>✓ Uploaded</span>
                            <button type="button" onClick={() => setTradeForm({...tradeForm, [input.id]: ''})} style={{ padding: '4px 8px', background: '#1a1a22', border: 'none', borderRadius: '4px', color: '#999', fontSize: '11px', cursor: 'pointer' }}>×</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => document.getElementById(`file-upload-${input.id}`).click()} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#666', fontSize: '12px', cursor: 'pointer', textAlign: 'left' }}>+ Image</button>
                        )}
                      </div>
                    ) : input.type === 'value' ? (
                      <div style={{ display: 'flex', gap: '0' }}>
                        <span style={{ padding: '10px 12px', background: '#141418', border: '1px solid #1a1a22', borderRight: 'none', borderRadius: '6px 0 0 6px', color: '#888', fontSize: '13px' }}>{input.currency || '$'}</span>
                        <input type="number" value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} placeholder="0" style={{ flex: 1, padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '0 6px 6px 0', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                      </div>
                    ) : (
                      <input type={input.type === 'number' ? 'number' : input.type === 'date' ? 'date' : input.type === 'time' ? 'time' : 'text'} value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} placeholder={input.id === 'symbol' ? 'XAUUSD' : input.id === 'rr' ? '2.5' : input.id === 'riskPercent' ? '1' : ''} style={{ width: '100%', padding: '10px 12px', background: '#0a0a0f', border: '1px solid #1a1a22', borderRadius: '6px', color: '#fff', fontSize: '13px', boxSizing: 'border-box' }} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button onClick={() => { setShowAddTrade(false); setEditingTrade(null) }} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #2a2a35', borderRadius: '8px', color: '#888', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={editingTrade ? updateTrade : addTrade} disabled={saving || !tradeForm.symbol || !tradeForm.pnl} style={{ flex: 1, padding: '12px', background: (saving || !tradeForm.symbol || !tradeForm.pnl) ? '#1a1a22' : editingTrade ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)', border: 'none', borderRadius: '8px', color: (saving || !tradeForm.symbol || !tradeForm.pnl) ? '#666' : '#fff', fontWeight: 600, fontSize: '14px', cursor: (saving || !tradeForm.symbol || !tradeForm.pnl) ? 'not-allowed' : 'pointer' }}>{saving ? '...' : editingTrade ? 'Update Trade' : 'Log Trade'}</button>
            </div>
          </div>
        </div>
      )}

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
                <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>On</span>
                <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>Name</span>
                <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>Type</span>
                <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', fontWeight: 600 }}>Options</span>
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
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>{enlargedChart === 'equity' ? 'Equity Curve' : enlargedChart === 'bar' ? 'Performance by ' + (graphGroupBy === 'symbol' ? 'Pair' : graphGroupBy) : 'Net Daily PnL'}</span>
                {enlargedChart === 'equity' && (
                  <>
                    <span style={{ fontSize: '12px', color: '#999' }}>Start: <span style={{ color: '#fff' }}>${startingBalance.toLocaleString()}</span></span>
                    <span style={{ fontSize: '12px', color: '#999' }}>Current: <span style={{ color: currentBalance >= startingBalance ? '#22c55e' : '#ef4444' }}>${Math.round(currentBalance).toLocaleString()}</span></span>
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
                      <option value="direction">Direction</option>
                      <option value="session">Session</option>
                      <option value="confidence">Confidence</option>
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
                const maxBal = allBalances.length > 0 ? Math.max(...allBalances) : startingBalance
                const minBal = allBalances.length > 0 ? Math.min(...allBalances) : startingBalance
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
                    xLabels.push({ label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, pct: xLabelCount > 1 ? 5 + (i / (xLabelCount - 1)) * 90 : 50 })
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
                    {/* Chart row - Y-axis and chart area aligned */}
                    <div style={{ flex: 1, display: 'flex' }}>
                      {/* Y-axis labels - same height as chart */}
                      <div style={{ width: '44px', flexShrink: 0, position: 'relative', borderRight: '1px solid #2a2a35' }}>
                        {yLabels.map((v, i) => {
                          const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                          return (
                            <div key={i} style={{ position: 'absolute', right: 0, top: `${topPct}%`, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                              <span style={{ fontSize: '10px', color: '#999', textAlign: 'right' }}>{equityCurveGroupBy === 'total' ? `$${(v/1000).toFixed(v >= 1000 ? 0 : 1)}k` : `$${v}`}</span>
                              <div style={{ width: '4px', height: '1px', background: '#2a2a35', marginLeft: '3px' }} />
                            </div>
                          )
                        })}
                      </div>
                      {/* Chart area */}
                      <div style={{ flex: 1, position: 'relative', overflow: 'visible' }}>
                          {/* Horizontal grid lines - all lines including bottom */}
                          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                            {yLabels.map((_, i) => {
                              const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
                              return <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${topPct}%`, height: '1px', background: '#2a2a35', transform: 'translateY(-50%)' }} />
                            })}
                          </div>
                          {zeroY !== null && <div style={{ position: 'absolute', left: 0, right: 0, top: `${zeroY}%`, height: '1px', background: '#2a2a35', transform: 'translateY(-50%)', zIndex: 1 }}><span style={{ position: 'absolute', left: '-60px', top: '-6px', fontSize: '11px', color: '#666' }}>$0</span></div>}
                          {/* Start line - dashed horizontal line at starting balance */}
                          {equityCurveGroupBy === 'total' && startYEnl >= 0 && startYEnl <= svgH && (
                            <>
                              <div style={{ position: 'absolute', left: 0, right: '55px', top: `${(startYEnl / svgH) * 100}%`, borderTop: '1px dashed #666', transform: 'translateY(-50%)', zIndex: 1 }} />
                              <span style={{ position: 'absolute', right: '4px', top: `${(startYEnl / svgH) * 100}%`, transform: 'translateY(-50%)', fontSize: '10px', color: '#22c55e', background: '#0d0d12', padding: '0 4px', fontWeight: 600 }}>Start: ${(startingBalance/1000).toFixed(startingBalance >= 1000 ? 0 : 1)}k</span>
                            </>
                          )}
                          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }} viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none"
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
                            <div style={{ width: '1px', height: '8px', background: '#333' }} />
                            <span style={{ fontSize: '10px', color: '#999', marginTop: '2px', whiteSpace: 'nowrap' }}>{l.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Legend - only for total mode (multi-line has legend in top-left of chart) */}
                    {equityCurveGroupBy === 'total' && (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '8px 0', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '16px', height: '3px', background: '#22c55e' }} />
                          <span style={{ fontSize: '10px', color: '#999' }}>Above Start</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '16px', height: '3px', background: '#ef4444' }} />
                          <span style={{ fontSize: '10px', color: '#999' }}>Below Start</span>
                        </div>
                      </div>
                    )}
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
                      <div style={{ width: '44px', flexShrink: 0, position: 'relative' }}>
                        {yLabelsBar.map((v, i) => {
                          const topPct = yLabelsBar.length > 1 ? (i / (yLabelsBar.length - 1)) * 100 : 0
                          return (
                            <div key={i} style={{ position: 'absolute', right: 0, top: `${topPct}%`, transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                              <span style={{ fontSize: '10px', color: '#999', textAlign: 'right' }}>{v.disp}</span>
                              <div style={{ width: '4px', height: '1px', background: '#2a2a35', marginLeft: '3px' }} />
                            </div>
                          )
                        })}
                      </div>
                      {/* Chart area */}
                      <div style={{ flex: 1, position: 'relative', borderLeft: '1px solid #2a2a35' }}>
                        {/* Horizontal grid lines - all lines including bottom */}
                        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                          {yLabelsBar.map((_, i) => {
                            const topPct = yLabelsBar.length > 1 ? (i / (yLabelsBar.length - 1)) * 100 : 0
                            return <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: `${topPct}%`, height: '1px', background: '#2a2a35', transform: 'translateY(-50%)' }} />
                          })}
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
                                <div style={{ width: '100%', maxWidth: '80px', height: `${hPct}%`, background: `linear-gradient(to bottom, ${isGreen ? `rgba(34, 197, 94, ${0.15 + (hPct / 100) * 0.2})` : `rgba(239, 68, 68, ${0.15 + (hPct / 100) * 0.2})`} 0%, transparent 100%)`, border: `1px solid ${isGreen ? '#22c55e' : '#ef4444'}`, borderBottom: 'none', borderRadius: '6px 6px 0 0', minHeight: '20px', position: 'relative', cursor: 'pointer' }}>
                                  <div style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '14px', color: isGreen ? '#22c55e' : '#ef4444', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.disp}</div>
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
