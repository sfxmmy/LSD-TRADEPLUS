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
  const [showAddTrade, setShowAddTrade] = useState(false)
  const [showEditInputs, setShowEditInputs] = useState(false)
  const [showExpandedNote, setShowExpandedNote] = useState(null)
  const [showExpandedImage, setShowExpandedImage] = useState(null)
  const [editingOptions, setEditingOptions] = useState(null)
  const [optionsText, setOptionsText] = useState('')
  const [saving, setSaving] = useState(false)
  const [inputs, setInputs] = useState(defaultInputs)
  const [tradeForm, setTradeForm] = useState({})
  const [compareX, setCompareX] = useState('session')
  const [compareY, setCompareY] = useState('winrate')
  const [noteType, setNoteType] = useState('daily')
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0])
  const [noteText, setNoteText] = useState('')
  const [customNoteTitle, setCustomNoteTitle] = useState('')

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

  async function saveNote() {
    if (!noteText.trim()) return
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const newNotes = { ...notes }
    if (noteType === 'daily') {
      newNotes.daily = { ...newNotes.daily, [noteDate]: noteText }
    } else if (noteType === 'weekly') {
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

  async function deleteCustomNote(index) {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const newNotes = { ...notes, custom: notes.custom.filter((_, i) => i !== index) }
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

  function BarChart({ data, valueKey = 'value', labelKey = 'label', showPercent = false }) {
    if (!data?.length) return <div style={{ padding: '16px', textAlign: 'center', color: '#333', fontSize: '10px' }}>No data</div>
    const max = Math.max(...data.map(d => Math.abs(d[valueKey])))
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {data.map((item, i) => {
          const v = item[valueKey], pct = max > 0 ? (Math.abs(v) / max) * 100 : 0, pos = v >= 0
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '55px', fontSize: '10px', color: '#666', textAlign: 'right' }}>{item[labelKey]}</div>
              <div style={{ flex: 1, height: '18px', background: '#0a0a0e', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: pos ? '#22c55e' : '#ef4444', borderRadius: '3px' }} />
              </div>
              <div style={{ width: '45px', fontSize: '10px', fontWeight: 600, color: pos ? '#22c55e' : '#ef4444', textAlign: 'right' }}>
                {showPercent ? `${v}%` : (v >= 0 ? '+' : '') + '$' + v.toFixed(0)}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function DonutChart({ value, label, color = '#22c55e' }) {
    const r = 32, s = 6, c = 2 * Math.PI * r, o = c - (value / 100) * c
    return (
      <div style={{ textAlign: 'center' }}>
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#1a1a22" strokeWidth={s} />
          <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth={s} strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" transform="rotate(-90 40 40)" />
          <text x="40" y="40" textAnchor="middle" dy="0.35em" fontSize="14" fontWeight="700" fill="#fff">{value}%</text>
        </svg>
        <div style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>{label}</div>
      </div>
    )
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', marginBottom: '16px' }}><span style={{ color: '#22c55e' }}>LSD</span>TRADE+</div><div style={{ color: '#666' }}>Loading...</div></div></div>

  // Stats
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

  function getStatsByGroup(field, fromExtra = false) {
    const groups = {}
    trades.forEach(t => {
      const extra = getExtraData(t)
      let key = fromExtra ? extra[field] : t[field]
      if (!key) key = 'Unknown'
      if (!groups[key]) groups[key] = { trades: [], wins: 0, losses: 0, pnl: 0 }
      groups[key].trades.push(t)
      groups[key].pnl += parseFloat(t.pnl) || 0
      if (t.outcome === 'win') groups[key].wins++
      if (t.outcome === 'loss') groups[key].losses++
    })
    return groups
  }

  function getDayStats() {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const stats = {}
    days.forEach(d => stats[d] = { w: 0, l: 0, pnl: 0, n: 0 })
    trades.forEach(t => { const d = days[new Date(t.date).getDay()]; stats[d].n++; stats[d].pnl += parseFloat(t.pnl) || 0; if (t.outcome === 'win') stats[d].w++; if (t.outcome === 'loss') stats[d].l++ })
    return Object.entries(stats).filter(([_, v]) => v.n > 0).map(([d, v]) => ({ label: d, value: (v.w + v.l) > 0 ? Math.round((v.w / (v.w + v.l)) * 100) : 0, pnl: v.pnl }))
  }

  function getStreaks() {
    let mw = 0, ml = 0, ts = 0, lo = null, cs = 0
    const sorted = [...trades].sort((a, b) => new Date(a.date) - new Date(b.date))
    sorted.forEach(t => { if (t.outcome === 'win') { ts = lo === 'win' ? ts + 1 : 1; mw = Math.max(mw, ts); lo = 'win' } else if (t.outcome === 'loss') { ts = lo === 'loss' ? ts + 1 : 1; ml = Math.max(ml, ts); lo = 'loss' } })
    let i = sorted.length - 1
    if (i >= 0) { const last = sorted[i].outcome; while (i >= 0 && sorted[i].outcome === last) { cs++; i-- }; if (last === 'loss') cs = -cs }
    return { cs, mw, ml }
  }

  // Compare function
  function getCompareData() {
    const groups = getStatsByGroup(compareX, ['session', 'timeframe', 'confidence', 'rating'].includes(compareX))
    return Object.entries(groups).filter(([k]) => k !== 'Unknown').map(([k, v]) => {
      let val = 0
      if (compareY === 'winrate') val = (v.wins + v.losses) > 0 ? Math.round((v.wins / (v.wins + v.losses)) * 100) : 0
      else if (compareY === 'pnl') val = v.pnl
      else if (compareY === 'trades') val = v.trades.length
      else if (compareY === 'avgpnl') val = v.trades.length > 0 ? Math.round(v.pnl / v.trades.length) : 0
      return { label: k, value: val }
    }).sort((a, b) => b.value - a.value)
  }

  const streaks = getStreaks()
  const dayStats = getDayStats()
  const enabledInputs = inputs.filter(i => i.enabled)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '18px 28px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <a href="/dashboard" style={{ color: '#555', fontSize: '16px', textDecoration: 'none' }}>←</a>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '9px', color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>Journal</div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>{account?.name}</div>
          </div>
          <button onClick={() => setShowAddTrade(true)} style={{ padding: '10px 18px', background: '#22c55e', border: 'none', borderRadius: '5px', color: '#fff', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}>+ LOG NEW TRADE</button>
        </div>

        {/* Tabs - Centered and larger */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
          {['trades', 'statistics', 'notes'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '12px 32px', background: activeTab === tab ? '#22c55e' : 'transparent', border: activeTab === tab ? 'none' : '1px solid #1a1a22', borderRadius: '6px', color: activeTab === tab ? '#fff' : '#666', fontWeight: 600, fontSize: '13px', cursor: 'pointer', textTransform: 'capitalize' }}>{tab}</button>
          ))}
        </div>

        {/* TRADES TAB */}
        {activeTab === 'trades' && (
          <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #1a1a22', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: '#444', textTransform: 'uppercase', letterSpacing: '1px' }}>{trades.length} Trades</span>
              <button onClick={() => setShowEditInputs(true)} style={{ padding: '5px 10px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '4px', color: '#555', fontSize: '9px', cursor: 'pointer' }}>Edit Columns</button>
            </div>
            {trades.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#333', fontSize: '11px' }}>No trades yet. Click "LOG NEW TRADE" to add your first trade.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#0a0a0e' }}>
                      {['Symbol', 'W/L', 'PnL', '%', 'RR', 'Trend', 'Confidence', 'Rating', 'Image', 'Notes', 'Placed', 'Date', ''].map((h, i) => (
                        <th key={i} style={{ padding: '10px 14px', textAlign: i === 2 ? 'right' : 'center', color: '#444', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
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
                            <span style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: trade.outcome === 'win' ? 'rgba(34,197,94,0.15)' : trade.outcome === 'loss' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)', color: trade.outcome === 'win' ? '#22c55e' : trade.outcome === 'loss' ? '#ef4444' : '#888' }}>
                              {trade.outcome === 'win' ? 'WIN' : trade.outcome === 'loss' ? 'LOSS' : 'BE'}
                            </span>
                          </td>
                          <td style={{ padding: '14px', textAlign: 'right', fontWeight: 600, fontSize: '13px', color: parseFloat(trade.pnl) >= 0 ? '#22c55e' : '#ef4444' }}>{parseFloat(trade.pnl) >= 0 ? '+' : ''}${parseFloat(trade.pnl || 0).toFixed(0)}</td>
                          <td style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: '#555' }}>{extra.riskPercent || '1'}%</td>
                          <td style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: '#666' }}>{trade.rr || '-'}</td>
                          <td style={{ padding: '14px', textAlign: 'center', fontSize: '11px', color: trade.direction === 'long' ? '#22c55e' : '#ef4444' }}>{trade.direction?.toUpperCase() || '-'}</td>
                          <td style={{ padding: '14px', textAlign: 'center' }}>
                            {extra.confidence && <span style={{ padding: '3px 8px', borderRadius: '4px', fontSize: '9px', background: extra.confidence === 'High' ? 'rgba(34,197,94,0.1)' : extra.confidence === 'Low' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', color: extra.confidence === 'High' ? '#22c55e' : extra.confidence === 'Low' ? '#ef4444' : '#666' }}>{extra.confidence}</span>}
                          </td>
                          <td style={{ padding: '14px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>{[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= parseInt(extra.rating || 0) ? '#22c55e' : '#2a2a35', fontSize: '10px' }}>★</span>)}</div>
                          </td>
                          <td style={{ padding: '14px', textAlign: 'center' }}>
                            {trade.image_url ? (
                              <button onClick={() => setShowExpandedImage(trade.image_url)} style={{ width: '24px', height: '24px', background: '#1a1a22', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                              </button>
                            ) : <div style={{ width: '24px', height: '24px', background: '#141418', borderRadius: '4px', margin: '0 auto' }} />}
                          </td>
                          <td style={{ padding: '14px', maxWidth: '160px' }}>
                            {trade.notes ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '11px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{trade.notes}</span>
                                <button onClick={() => setShowExpandedNote(trade.notes)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px' }}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                                </button>
                              </div>
                            ) : <span style={{ fontSize: '11px', color: '#333' }}>-</span>}
                          </td>
                          <td style={{ padding: '14px', textAlign: 'center', fontSize: '11px', color: '#444' }}>{getDaysAgo(trade.date)}</td>
                          <td style={{ padding: '14px', textAlign: 'center', fontSize: '11px', color: '#444' }}>{new Date(trade.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                          <td style={{ padding: '14px', textAlign: 'center' }}><button onClick={() => deleteTrade(trade.id)} style={{ background: 'transparent', border: 'none', color: '#333', cursor: 'pointer', fontSize: '14px' }}>×</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* STATISTICS TAB */}
        {activeTab === 'statistics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
              {[
                { l: 'Total PnL', v: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString()}`, c: totalPnl >= 0 ? '#22c55e' : '#ef4444' },
                { l: 'Winrate', v: `${winrate}%`, c: winrate >= 50 ? '#22c55e' : '#ef4444' },
                { l: 'Profit Factor', v: profitFactor, c: '#fff' },
                { l: 'Avg RR', v: `${avgRR}R`, c: '#fff' },
                { l: 'Avg Win', v: `+$${avgWin}`, c: '#22c55e' },
                { l: 'Avg Loss', v: `-$${avgLoss}`, c: '#ef4444' },
              ].map((s, i) => (
                <div key={i} style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '12px' }}>
                  <div style={{ fontSize: '9px', color: '#444', textTransform: 'uppercase', marginBottom: '4px' }}>{s.l}</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>

            {/* Row 2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px' }}>
                <h3 style={{ fontSize: '9px', color: '#444', textTransform: 'uppercase', marginBottom: '14px' }}>Win/Loss</h3>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                  <DonutChart value={winrate} label="Win Rate" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#22c55e' }} /><span style={{ fontSize: '10px' }}>{wins} Wins</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ef4444' }} /><span style={{ fontSize: '10px' }}>{losses} Losses</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#555' }} /><span style={{ fontSize: '10px' }}>{be} BE</span></div>
                  </div>
                </div>
              </div>
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px' }}>
                <h3 style={{ fontSize: '9px', color: '#444', textTransform: 'uppercase', marginBottom: '14px' }}>Streaks</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[{ l: 'Current', v: streaks.cs, c: streaks.cs >= 0 ? '#22c55e' : '#ef4444' }, { l: 'Best Win', v: streaks.mw, c: '#22c55e' }, { l: 'Worst Loss', v: streaks.ml, c: '#ef4444' }].map((s, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#0a0a0e', borderRadius: '5px' }}>
                      <span style={{ fontSize: '10px', color: '#666' }}>{s.l}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: s.c }}>{s.v >= 0 ? (s.l === 'Current' ? '+' : '') : ''}{s.v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px' }}>
                <h3 style={{ fontSize: '9px', color: '#444', textTransform: 'uppercase', marginBottom: '14px' }}>Long vs Short</h3>
                {(() => {
                  const d = getStatsByGroup('direction')
                  return ['long', 'short'].map((dir, i) => {
                    const data = d[dir] || { wins: 0, losses: 0, pnl: 0, trades: [] }
                    const wr = (data.wins + data.losses) > 0 ? Math.round((data.wins / (data.wins + data.losses)) * 100) : 0
                    return (
                      <div key={i} style={{ padding: '8px', background: '#0a0a0e', borderRadius: '5px', marginBottom: i === 0 ? '6px' : 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}><span style={{ fontSize: '9px', color: dir === 'long' ? '#22c55e' : '#ef4444' }}>{dir.toUpperCase()}</span><span style={{ fontSize: '9px', color: '#555' }}>{data.trades?.length || 0} trades</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '11px', fontWeight: 600 }}>{wr}%</span><span style={{ fontSize: '11px', fontWeight: 600, color: data.pnl >= 0 ? '#22c55e' : '#ef4444' }}>{data.pnl >= 0 ? '+' : ''}${data.pnl.toFixed(0)}</span></div>
                      </div>
                    )
                  })
                })()}
              </div>
            </div>

            {/* Compare Tool */}
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <h3 style={{ fontSize: '9px', color: '#444', textTransform: 'uppercase' }}>Compare</h3>
                <select value={compareX} onChange={e => setCompareX(e.target.value)} style={{ padding: '5px 10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#888', fontSize: '10px' }}>
                  {['session', 'timeframe', 'confidence', 'rating', 'direction', 'symbol'].map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                </select>
                <span style={{ color: '#444', fontSize: '10px' }}>vs</span>
                <select value={compareY} onChange={e => setCompareY(e.target.value)} style={{ padding: '5px 10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#888', fontSize: '10px' }}>
                  {[{ v: 'winrate', l: 'Win Rate' }, { v: 'pnl', l: 'PnL' }, { v: 'trades', l: 'Trade Count' }, { v: 'avgpnl', l: 'Avg PnL' }].map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
              <BarChart data={getCompareData()} showPercent={compareY === 'winrate'} />
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px' }}>
                <h3 style={{ fontSize: '9px', color: '#444', textTransform: 'uppercase', marginBottom: '10px' }}>PnL by Symbol</h3>
                <BarChart data={Object.entries(getStatsByGroup('symbol')).map(([s, d]) => ({ label: s, value: d.pnl })).sort((a, b) => b.value - a.value).slice(0, 6)} />
              </div>
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px' }}>
                <h3 style={{ fontSize: '9px', color: '#444', textTransform: 'uppercase', marginBottom: '10px' }}>Winrate by Day</h3>
                <BarChart data={dayStats} showPercent />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px' }}>
                <h3 style={{ fontSize: '9px', color: '#444', textTransform: 'uppercase', marginBottom: '10px' }}>By Session</h3>
                <BarChart data={Object.entries(getStatsByGroup('session', true)).filter(([k]) => k !== 'Unknown').map(([s, d]) => ({ label: s, value: (d.wins + d.losses) > 0 ? Math.round((d.wins / (d.wins + d.losses)) * 100) : 0 }))} showPercent />
              </div>
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px' }}>
                <h3 style={{ fontSize: '9px', color: '#444', textTransform: 'uppercase', marginBottom: '10px' }}>By Confidence</h3>
                <BarChart data={Object.entries(getStatsByGroup('confidence', true)).filter(([k]) => k !== 'Unknown').map(([s, d]) => ({ label: s, value: (d.wins + d.losses) > 0 ? Math.round((d.wins / (d.wins + d.losses)) * 100) : 0 }))} showPercent />
              </div>
            </div>
          </div>
        )}

        {/* NOTES TAB */}
        {activeTab === 'notes' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            {/* Add Note */}
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '16px' }}>
              <h3 style={{ fontSize: '10px', color: '#444', textTransform: 'uppercase', marginBottom: '12px' }}>Add Note</h3>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                {['daily', 'weekly', 'custom'].map(t => (
                  <button key={t} onClick={() => setNoteType(t)} style={{ padding: '6px 14px', background: noteType === t ? '#22c55e' : 'transparent', border: noteType === t ? 'none' : '1px solid #1a1a22', borderRadius: '4px', color: noteType === t ? '#fff' : '#666', fontSize: '10px', cursor: 'pointer', textTransform: 'capitalize' }}>{t}</button>
                ))}
              </div>
              {noteType !== 'custom' && (
                <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} style={{ width: '100%', padding: '8px 10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '11px', marginBottom: '10px', boxSizing: 'border-box' }} />
              )}
              {noteType === 'custom' && (
                <input type="text" value={customNoteTitle} onChange={e => setCustomNoteTitle(e.target.value)} placeholder="Note title..." style={{ width: '100%', padding: '8px 10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '11px', marginBottom: '10px', boxSizing: 'border-box' }} />
              )}
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Write your note..." rows={4} style={{ width: '100%', padding: '10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '11px', resize: 'none', boxSizing: 'border-box', marginBottom: '10px' }} />
              <button onClick={saveNote} disabled={!noteText.trim()} style={{ width: '100%', padding: '10px', background: '#22c55e', border: 'none', borderRadius: '5px', color: '#fff', fontWeight: 600, fontSize: '11px', cursor: 'pointer', opacity: !noteText.trim() ? 0.5 : 1 }}>Save Note</button>
            </div>

            {/* Notes List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Daily Notes */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px' }}>
                <h3 style={{ fontSize: '9px', color: '#444', textTransform: 'uppercase', marginBottom: '10px' }}>Daily Notes</h3>
                {Object.keys(notes.daily || {}).length === 0 ? (
                  <p style={{ fontSize: '10px', color: '#444' }}>No daily notes yet</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                    {Object.entries(notes.daily).sort((a, b) => new Date(b[0]) - new Date(a[0])).slice(0, 5).map(([date, text]) => (
                      <div key={date} style={{ padding: '8px', background: '#0a0a0e', borderRadius: '4px' }}>
                        <div style={{ fontSize: '9px', color: '#555', marginBottom: '4px' }}>{new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                        <div style={{ fontSize: '10px', color: '#888' }}>{text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Weekly Notes */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px' }}>
                <h3 style={{ fontSize: '9px', color: '#444', textTransform: 'uppercase', marginBottom: '10px' }}>Weekly Notes</h3>
                {Object.keys(notes.weekly || {}).length === 0 ? (
                  <p style={{ fontSize: '10px', color: '#444' }}>No weekly notes yet</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                    {Object.entries(notes.weekly).sort((a, b) => new Date(b[0]) - new Date(a[0])).slice(0, 5).map(([week, text]) => (
                      <div key={week} style={{ padding: '8px', background: '#0a0a0e', borderRadius: '4px' }}>
                        <div style={{ fontSize: '9px', color: '#555', marginBottom: '4px' }}>Week of {new Date(week).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                        <div style={{ fontSize: '10px', color: '#888' }}>{text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Notes */}
              <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '14px' }}>
                <h3 style={{ fontSize: '9px', color: '#444', textTransform: 'uppercase', marginBottom: '10px' }}>Custom Notes</h3>
                {(notes.custom || []).length === 0 ? (
                  <p style={{ fontSize: '10px', color: '#444' }}>No custom notes yet</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                    {notes.custom.map((note, i) => (
                      <div key={i} style={{ padding: '8px', background: '#0a0a0e', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '10px', color: '#22c55e', marginBottom: '3px' }}>{note.title}</div>
                          <div style={{ fontSize: '10px', color: '#888' }}>{note.text}</div>
                        </div>
                        <button onClick={() => deleteCustomNote(i)} style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer', fontSize: '12px' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODALS */}
        {showAddTrade && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowAddTrade(false)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '18px', width: '520px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h2 style={{ fontSize: '13px', fontWeight: 600 }}>Log New Trade</h2>
                <button onClick={() => setShowEditInputs(true)} style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '4px', color: '#555', fontSize: '9px', cursor: 'pointer' }}>Edit Fields</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                {enabledInputs.map(input => (
                  <div key={input.id} style={{ gridColumn: input.type === 'textarea' ? 'span 2' : 'span 1' }}>
                    <label style={{ display: 'block', fontSize: '8px', color: '#444', marginBottom: '4px', textTransform: 'uppercase' }}>{input.label} {input.required && <span style={{ color: '#ef4444' }}>*</span>}</label>
                    {input.type === 'select' ? (
                      <select value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} style={{ width: '100%', padding: '8px 10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '11px', boxSizing: 'border-box' }}>
                        {input.options?.map(o => <option key={o} value={o.toLowerCase()}>{o}</option>)}
                      </select>
                    ) : input.type === 'textarea' ? (
                      <textarea value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} rows={2} style={{ width: '100%', padding: '8px 10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '11px', resize: 'none', boxSizing: 'border-box' }} />
                    ) : input.type === 'rating' ? (
                      <div style={{ display: 'flex', gap: '4px' }}>{[1,2,3,4,5].map(i => <button key={i} onClick={() => setTradeForm({...tradeForm, [input.id]: String(i)})} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '16px', color: i <= parseInt(tradeForm[input.id] || 0) ? '#22c55e' : '#333' }}>★</button>)}</div>
                    ) : (
                      <input type={input.type} value={tradeForm[input.id] || ''} onChange={e => setTradeForm({...tradeForm, [input.id]: e.target.value})} step={input.type === 'number' ? '0.1' : undefined} style={{ width: '100%', padding: '8px 10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '11px', boxSizing: 'border-box' }} />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={addTrade} disabled={saving || !tradeForm.symbol || !tradeForm.pnl} style={{ flex: 1, padding: '10px', background: '#22c55e', border: 'none', borderRadius: '5px', color: '#fff', fontWeight: 600, fontSize: '11px', cursor: 'pointer', opacity: (saving || !tradeForm.symbol || !tradeForm.pnl) ? 0.5 : 1 }}>{saving ? 'Saving...' : 'Save Trade'}</button>
                <button onClick={() => setShowAddTrade(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '5px', color: '#666', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showEditInputs && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 101 }} onClick={() => setShowEditInputs(false)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '18px', width: '450px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>Customize Fields</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                {inputs.map((input, i) => (
                  <div key={input.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', background: '#0a0a0e', borderRadius: '5px' }}>
                    <input type="checkbox" checked={input.enabled} onChange={e => updateInput(i, 'enabled', e.target.checked)} style={{ width: '14px', height: '14px' }} />
                    <input type="text" value={input.label} onChange={e => updateInput(i, 'label', e.target.value)} style={{ flex: 1, padding: '5px 8px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '4px', color: '#fff', fontSize: '11px' }} />
                    <select value={input.type} onChange={e => updateInput(i, 'type', e.target.value)} style={{ padding: '5px 8px', background: '#141418', border: '1px solid #1a1a22', borderRadius: '4px', color: '#666', fontSize: '10px' }}>
                      {['text', 'number', 'date', 'select', 'textarea', 'rating'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {input.type === 'select' && <button onClick={() => openOptionsEditor(i)} style={{ padding: '4px 8px', background: '#22c55e', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '9px', cursor: 'pointer' }}>Options</button>}
                    {!['symbol', 'date', 'outcome', 'pnl'].includes(input.id) && <button onClick={() => deleteInput(i)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}>×</button>}
                  </div>
                ))}
              </div>
              <button onClick={addNewInput} style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px dashed #1a1a22', borderRadius: '5px', color: '#555', fontSize: '11px', cursor: 'pointer', marginBottom: '14px' }}>+ Add New Field</button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={saveInputs} style={{ flex: 1, padding: '10px', background: '#22c55e', border: 'none', borderRadius: '5px', color: '#fff', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}>Save</button>
                <button onClick={() => setShowEditInputs(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '5px', color: '#666', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {editingOptions !== null && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 102 }} onClick={() => setEditingOptions(null)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '18px', width: '300px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>Edit Options</h2>
              <p style={{ fontSize: '10px', color: '#555', marginBottom: '10px' }}>One option per line</p>
              <textarea value={optionsText} onChange={e => setOptionsText(e.target.value)} rows={6} style={{ width: '100%', padding: '10px', background: '#0a0a0e', border: '1px solid #1a1a22', borderRadius: '5px', color: '#fff', fontSize: '11px', resize: 'none', boxSizing: 'border-box', marginBottom: '10px' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={saveOptions} style={{ flex: 1, padding: '10px', background: '#22c55e', border: 'none', borderRadius: '5px', color: '#fff', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}>Save</button>
                <button onClick={() => setEditingOptions(null)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '5px', color: '#666', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {showExpandedNote && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowExpandedNote(null)}>
            <div style={{ background: '#0d0d12', border: '1px solid #1a1a22', borderRadius: '8px', padding: '18px', width: '450px' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>Trade Notes</h2>
              <div style={{ background: '#0a0a0e', borderRadius: '5px', padding: '12px', maxHeight: '250px', overflowY: 'auto', fontSize: '12px', color: '#888', lineHeight: '1.6' }}>{showExpandedNote}</div>
              <button onClick={() => setShowExpandedNote(null)} style={{ marginTop: '12px', width: '100%', padding: '10px', background: 'transparent', border: '1px solid #1a1a22', borderRadius: '5px', color: '#666', fontWeight: 600, fontSize: '11px', cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        )}

        {showExpandedImage && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }} onClick={() => setShowExpandedImage(null)}>
            <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
              <img src={showExpandedImage} alt="Trade" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '6px' }} />
              <button onClick={() => setShowExpandedImage(null)} style={{ position: 'absolute', top: '-35px', right: '0', background: 'transparent', border: 'none', color: '#666', fontSize: '22px', cursor: 'pointer' }}>×</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
