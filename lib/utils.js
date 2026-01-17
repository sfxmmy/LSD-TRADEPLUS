// Shared utility functions for trading journal
// Used by both dashboard and account pages

import { optionStyles } from './constants'

// ============================================
// Option/Select Field Helpers
// ============================================

// Extract value from option (supports both string and {value, textColor, bgColor} formats)
export function getOptVal(o) {
  if (o == null) return ''
  return typeof o === 'object' ? (o.value || '') : o
}

// Get text color from option object
export function getOptTextColor(o, fallback = '#fff') {
  if (o == null || typeof o !== 'object') return fallback
  return o.textColor || o.color || fallback
}

// Get background color from option object
export function getOptBgColor(o) {
  if (o == null || typeof o !== 'object') return null
  return o.bgColor || null
}

// Get border color from option object
export function getOptBorderColor(o) {
  if (o == null || typeof o !== 'object') return null
  return o.borderColor || null
}

// Find option styles from an options array
export function findOptStyles(opts, val) {
  if (!opts || !val) return { textColor: '#fff', bgColor: null, borderColor: null }
  const o = opts.find(x => getOptVal(x).toLowerCase() === val.toLowerCase())
  if (!o) return { textColor: '#fff', bgColor: null, borderColor: null }
  return { textColor: getOptTextColor(o), bgColor: getOptBgColor(o), borderColor: getOptBorderColor(o) }
}

// Get styles from static optionStyles constant
export function getOptionStyles(field, value) {
  if (!value) return { textColor: '#888', bgColor: null }
  const fieldStyles = optionStyles[field]
  if (fieldStyles && fieldStyles[value]) return fieldStyles[value]
  return { textColor: '#888', bgColor: null }
}

// Get option styles from account's custom_inputs (uses journal's actual settings)
export function getAccountOptionStyles(account, field, value) {
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

// ============================================
// Formatting Helpers
// ============================================

// Format currency with 2 decimal places
export function formatCurrency(num) {
  const val = parseFloat(num) || 0
  return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Format large numbers nicely (e.g., 1.2M, 500k)
export function formatPnl(value) {
  const num = parseFloat(value) || 0
  const absVal = Math.abs(num)
  if (absVal >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`
  if (absVal >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (absVal >= 100000) return `${(num / 1000).toFixed(0)}k`
  if (absVal >= 10000) return `${(num / 1000).toFixed(1)}k`
  return num.toFixed(0)
}

// Format compact number (shorter version)
export function formatCompact(num) {
  const val = parseFloat(num) || 0
  if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}M`
  if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(1)}k`
  return val.toFixed(0)
}

// ============================================
// Date/Time Helpers
// ============================================

// Get days ago text ("Today", "1d ago", "5d ago")
export function getDaysAgo(d) {
  const diff = Math.floor((new Date() - new Date(d)) / 86400000)
  return diff === 0 ? 'Today' : diff === 1 ? '1d ago' : `${diff}d ago`
}

// Parse various date formats (DD/MM/YYYY, D/M/YY, MM-DD-YYYY, etc.)
export function parseFlexibleDate(value) {
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

// Get week start date (Monday)
export function getWeekStart(dateStr) {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

// ============================================
// PnL/Value Parsing
// ============================================

// Parse PnL value (handles $, %, various formats)
export function parsePnlValue(value, startingBalance = 0) {
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

// Parse RR value - accepts "2.5" or "1:2" format
export function parseRR(rr) {
  if (!rr) return null
  const strRR = String(rr).trim()
  if (strRR.includes(':')) {
    const parts = strRR.split(':')
    if (parts.length === 2 && !isNaN(parseFloat(parts[1]))) return parseFloat(parts[1])
    return null
  }
  return isNaN(parseFloat(strRR)) ? null : parseFloat(strRR)
}

// ============================================
// Trade Data Helpers
// ============================================

// Parse extra_data from trade (handles both object and string formats)
export function getExtraData(trade, inputs = []) {
  // First get extra_data (from JSONB)
  let rawExtra = {}
  if (trade.extra_data) {
    if (typeof trade.extra_data === 'object') rawExtra = trade.extra_data
    else try { rawExtra = JSON.parse(trade.extra_data) } catch {}
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
  if (!extra.confidence && trade.confidence) extra.confidence = trade.confidence
  if (!extra.rating && trade.rating) extra.rating = String(trade.rating)
  if (!extra.timeframe && trade.timeframe) extra.timeframe = trade.timeframe
  if (!extra.session && trade.session) extra.session = trade.session
  if (!extra.riskPercent && trade.risk) extra.riskPercent = String(trade.risk)

  return extra
}

// Get trade time from extra_data
export function getTradeTime(trade) {
  if (trade.time) return trade.time
  if (trade.extra_data) {
    const extra = typeof trade.extra_data === 'object'
      ? trade.extra_data
      : (() => { try { return JSON.parse(trade.extra_data) } catch { return {} } })()
    return extra.time || null
  }
  return null
}

// Create sortable datetime from date and time
export function getTradeDateTime(trade) {
  if (!trade.date) return new Date(0)
  const time = getTradeTime(trade) || '00:00'
  const dateTime = new Date(`${trade.date}T${time}`)
  return isNaN(dateTime.getTime()) ? new Date(trade.date) : dateTime
}

// ============================================
// Statistics Calculation Helpers
// ============================================

// Calculate win rate
export function calcWinRate(trades) {
  const wins = trades.filter(t => t.outcome === 'win').length
  const losses = trades.filter(t => t.outcome === 'loss').length
  return (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0
}

// Calculate profit factor
export function calcProfitFactor(trades) {
  const grossProfit = trades.filter(t => parseFloat(t.pnl) > 0).reduce((s, t) => s + parseFloat(t.pnl), 0)
  const grossLoss = Math.abs(trades.filter(t => parseFloat(t.pnl) < 0).reduce((s, t) => s + parseFloat(t.pnl), 0))
  return grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '-'
}

// Calculate average RR
export function calcAvgRR(trades) {
  if (trades.length === 0) return '0'
  const total = trades.reduce((s, t) => s + (parseFloat(t.rr) || 0), 0)
  return (total / trades.length).toFixed(1)
}

// Calculate streaks
export function calcStreaks(trades) {
  let maxWin = 0, maxLoss = 0, currentStreak = 0, lastOutcome = null
  const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))

  sorted.forEach(t => {
    if (t.outcome === 'win') {
      currentStreak = lastOutcome === 'win' ? currentStreak + 1 : 1
      maxWin = Math.max(maxWin, currentStreak)
      lastOutcome = 'win'
    } else if (t.outcome === 'loss') {
      currentStreak = lastOutcome === 'loss' ? currentStreak + 1 : 1
      maxLoss = Math.max(maxLoss, currentStreak)
      lastOutcome = 'loss'
    }
  })

  // Calculate current streak
  let cs = 0
  let i = sorted.length - 1
  if (i >= 0) {
    const last = sorted[i].outcome
    while (i >= 0 && sorted[i].outcome === last) { cs++; i-- }
    if (last === 'loss') cs = -cs
  }

  return { currentStreak: cs, maxWinStreak: maxWin, maxLossStreak: maxLoss }
}

// ============================================
// Color Helpers
// ============================================

// Convert hex to rgba
export function hexToRgba(hex, alpha = 0.15) {
  if (!hex || typeof hex !== 'string') return `rgba(255,255,255,${alpha})`
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.substr(0, 2), 16) || 0
  const g = parseInt(cleanHex.substr(2, 2), 16) || 0
  const b = parseInt(cleanHex.substr(4, 2), 16) || 0
  return `rgba(${r},${g},${b},${alpha})`
}

// Generate background color from text color
export function generateBgFromTextColor(textColor) {
  if (!textColor) return null
  return hexToRgba(textColor, 0.15)
}
