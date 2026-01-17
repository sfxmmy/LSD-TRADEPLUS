// Shared constants for trading journal
// Used by both dashboard and account pages

// Color mappings for select options - textColor and bgColor
export const optionStyles = {
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

// Default inputs for Edit Inputs modal
export const defaultInputs = [
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
  { id: 'mistake', label: 'Trade Mistake', type: 'textarea', required: false, enabled: true, fixed: true, color: '#ef4444' },
]

// Known fields for CSV/Excel import with aliases
export const knownImportFields = [
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

// Validation constants
export const MAX_NAME_LENGTH = 50
export const MAX_BALANCE = 9999999999.99 // DECIMAL(12,2) max
export const MAX_PERCENTAGE = 999.99 // DECIMAL(5,2) max
export const MAX_SYMBOL_LENGTH = 20
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
export const MAX_BASE64_SIZE = 1 * 1024 * 1024 // 1MB for base64 fallback

// Timezone options for daily DD reset
export const timezoneOptions = [
  'Europe/London',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Australia/Sydney',
  'UTC'
]
