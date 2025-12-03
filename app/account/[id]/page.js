'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

export default function AccountPage() {
  const router = useRouter()
  const params = useParams()
  const accountId = params.id
  const { user, hasAccess, loading: authLoading, supabase } = useAuth()

  const [account, setAccount] = useState(null)
  const [trades, setTrades] = useState([])
  const [ready, setReady] = useState(false)
  const [showAddTrade, setShowAddTrade] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tradeForm, setTradeForm] = useState({
    symbol: '',
    direction: 'long',
    outcome: 'win',
    pnl: '',
    rr: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (!hasAccess) {
      router.push('/pricing')
      return
    }

    const loadData = async () => {
      try {
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('*')
          .eq('id', accountId)
          .eq('user_id', user.id)
          .single()

        if (accountError || !accountData) {
          router.push('/dashboard')
          return
        }
        setAccount(accountData)

        const { data: tradesData } = await supabase
          .from('trades')
          .select('*')
          .eq('account_id', accountId)
          .order('date', { ascending: false })

        setTrades(tradesData || [])
      } catch (err) {
        console.error('Error loading data:', err)
        router.push('/dashboard')
        return
      }
      setReady(true)
    }

    loadData()
  }, [user, hasAccess, authLoading, accountId, router, supabase])

  const addTrade = async () => {
    if (!tradeForm.symbol || !tradeForm.pnl) return
    setSaving(true)

    try {
      const { data, error } = await supabase
        .from('trades')
        .insert({
          account_id: accountId,
          symbol: tradeForm.symbol.toUpperCase(),
          direction: tradeForm.direction,
          outcome: tradeForm.outcome,
          pnl: parseFloat(tradeForm.pnl) || 0,
          rr: parseFloat(tradeForm.rr) || 0,
          date: tradeForm.date,
          notes: tradeForm.notes
        })
        .select()
        .single()

      if (error) {
        alert('Error adding trade: ' + error.message)
        setSaving(false)
        return
      }

      setTrades([data, ...trades])
      setTradeForm({
        symbol: '',
        direction: 'long',
        outcome: 'win',
        pnl: '',
        rr: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      })
      setShowAddTrade(false)
    } catch (err) {
      alert('Error: ' + err.message)
    }
    setSaving(false)
  }

  const deleteTrade = async (tradeId) => {
    if (!confirm('Delete this trade?')) return
    
    try {
      await supabase.from('trades').delete().eq('id', tradeId)
      setTrades(trades.filter(t => t.id !== tradeId))
    } catch (err) {
      alert('Error deleting trade: ' + err.message)
    }
  }

  if (!ready) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0a0a0f', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: '#666' 
      }}>
        Loading...
      </div>
    )
  }

  const wins = trades.filter(t => t.outcome === 'win').length
  const losses = trades.filter(t => t.outcome === 'loss').length
  const totalPnl = trades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
  const winrate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0
  const avgRR = trades.length > 0 
    ? (trades.reduce((sum, t) => sum + (parseFloat(t.rr) || 0), 0) / trades.length).toFixed(2) 
    : '0'
  const currentBalance = (parseFloat(account?.starting_balance) || 0) + totalPnl

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px 48px' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '32px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <a href="/dashboard" style={{ color: '#666', fontSize: '14px' }}>← Back to Dashboard</a>
            <span style={{ fontSize: '24px', fontWeight: 700 }}>{account?.name}</span>
          </div>
          <button 
            onClick={() => setShowAddTrade(true)} 
            style={{ 
              padding: '12px 24px', 
              background: '#22c55e', 
              border: 'none', 
              borderRadius: '8px', 
              color: '#fff', 
              fontSize: '14px', 
              fontWeight: 600, 
              cursor: 'pointer' 
            }}
          >
            + Add Trade
          </button>
        </div>

        {/* Stats */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(5, 1fr)', 
          gap: '16px', 
          marginBottom: '32px' 
        }}>
          {[
            { label: 'Current Balance', value: `$${currentBalance.toLocaleString()}` },
            { 
              label: 'Total PnL', 
              value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString()}`, 
              color: totalPnl >= 0 ? '#22c55e' : '#ef4444' 
            },
            { 
              label: 'Win Rate', 
              value: `${winrate}%`, 
              color: winrate >= 50 ? '#22c55e' : '#ef4444' 
            },
            { label: 'Total Trades', value: trades.length },
            { label: 'Avg RR', value: `${avgRR}R` }
          ].map((s, i) => (
            <div 
              key={i} 
              style={{ 
                background: '#14141a', 
                border: '1px solid #222230', 
                borderRadius: '12px', 
                padding: '20px' 
              }}
            >
              <div style={{ 
                fontSize: '12px', 
                color: '#666', 
                marginBottom: '8px', 
                textTransform: 'uppercase' 
              }}>
                {s.label}
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: s.color || '#fff' }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Trades Table */}
        <div style={{ 
          background: '#14141a', 
          border: '1px solid #222230', 
          borderRadius: '14px', 
          overflow: 'hidden' 
        }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #222230' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
              Trade History ({trades.length} trades)
            </h3>
          </div>

          {trades.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#666' }}>
              No trades yet. Click "+ Add Trade" to log your first trade.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#0a0a0f' }}>
                    {['Date', 'Symbol', 'Direction', 'Outcome', 'PnL', 'RR', ''].map((h, i) => (
                      <th 
                        key={i} 
                        style={{ 
                          padding: '12px 16px', 
                          textAlign: i >= 4 ? 'right' : 'left', 
                          color: '#888', 
                          fontSize: '12px', 
                          fontWeight: 600, 
                          textTransform: 'uppercase' 
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map(trade => (
                    <tr key={trade.id} style={{ borderBottom: '1px solid #1a1a22' }}>
                      <td style={{ padding: '14px 16px', color: '#aaa', fontSize: '14px' }}>
                        {new Date(trade.date).toLocaleDateString('en-GB', { 
                          day: '2-digit', 
                          month: 'short', 
                          year: 'numeric' 
                        })}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: '14px' }}>
                        {trade.symbol}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '4px', 
                          fontSize: '12px', 
                          fontWeight: 600, 
                          background: trade.direction === 'long' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', 
                          color: trade.direction === 'long' ? '#22c55e' : '#ef4444' 
                        }}>
                          {trade.direction?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ 
                          padding: '4px 10px', 
                          borderRadius: '4px', 
                          fontSize: '12px', 
                          fontWeight: 600, 
                          background: trade.outcome === 'win' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', 
                          color: trade.outcome === 'win' ? '#22c55e' : '#ef4444' 
                        }}>
                          {trade.outcome?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ 
                        padding: '14px 16px', 
                        textAlign: 'right', 
                        fontWeight: 600, 
                        color: parseFloat(trade.pnl) >= 0 ? '#22c55e' : '#ef4444' 
                      }}>
                        {parseFloat(trade.pnl) >= 0 ? '+' : ''}${parseFloat(trade.pnl || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#aaa' }}>
                        {trade.rr}R
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <button 
                          onClick={() => deleteTrade(trade.id)} 
                          style={{ 
                            background: 'transparent', 
                            border: 'none', 
                            color: '#666', 
                            cursor: 'pointer', 
                            fontSize: '18px' 
                          }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Trade Modal */}
        {showAddTrade && (
          <div 
            style={{ 
              position: 'fixed', 
              inset: 0, 
              background: 'rgba(0,0,0,0.85)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              zIndex: 100 
            }} 
            onClick={() => setShowAddTrade(false)}
          >
            <div 
              style={{ 
                background: '#14141a', 
                border: '1px solid #222230', 
                borderRadius: '16px', 
                padding: '32px', 
                width: '500px' 
              }} 
              onClick={e => e.stopPropagation()}
            >
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px' }}>Add New Trade</h2>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '16px', 
                marginBottom: '16px' 
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '12px', 
                    color: '#888', 
                    marginBottom: '6px', 
                    textTransform: 'uppercase' 
                  }}>
                    Symbol
                  </label>
                  <input 
                    type="text" 
                    value={tradeForm.symbol} 
                    onChange={e => setTradeForm({...tradeForm, symbol: e.target.value})} 
                    placeholder="e.g. EURUSD" 
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      background: '#0a0a0f', 
                      border: '1px solid #2a2a35', 
                      borderRadius: '8px', 
                      color: '#fff', 
                      fontSize: '14px', 
                      boxSizing: 'border-box' 
                    }} 
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '12px', 
                    color: '#888', 
                    marginBottom: '6px', 
                    textTransform: 'uppercase' 
                  }}>
                    Date
                  </label>
                  <input 
                    type="date" 
                    value={tradeForm.date} 
                    onChange={e => setTradeForm({...tradeForm, date: e.target.value})} 
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      background: '#0a0a0f', 
                      border: '1px solid #2a2a35', 
                      borderRadius: '8px', 
                      color: '#fff', 
                      fontSize: '14px', 
                      boxSizing: 'border-box' 
                    }} 
                  />
                </div>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '16px', 
                marginBottom: '16px' 
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '12px', 
                    color: '#888', 
                    marginBottom: '6px', 
                    textTransform: 'uppercase' 
                  }}>
                    Direction
                  </label>
                  <select 
                    value={tradeForm.direction} 
                    onChange={e => setTradeForm({...tradeForm, direction: e.target.value})} 
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      background: '#0a0a0f', 
                      border: '1px solid #2a2a35', 
                      borderRadius: '8px', 
                      color: '#fff', 
                      fontSize: '14px', 
                      boxSizing: 'border-box' 
                    }}
                  >
                    <option value="long">Long</option>
                    <option value="short">Short</option>
                  </select>
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '12px', 
                    color: '#888', 
                    marginBottom: '6px', 
                    textTransform: 'uppercase' 
                  }}>
                    Outcome
                  </label>
                  <select 
                    value={tradeForm.outcome} 
                    onChange={e => setTradeForm({...tradeForm, outcome: e.target.value})} 
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      background: '#0a0a0f', 
                      border: '1px solid #2a2a35', 
                      borderRadius: '8px', 
                      color: '#fff', 
                      fontSize: '14px', 
                      boxSizing: 'border-box' 
                    }}
                  >
                    <option value="win">Win</option>
                    <option value="loss">Loss</option>
                    <option value="breakeven">Breakeven</option>
                  </select>
                </div>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '16px', 
                marginBottom: '16px' 
              }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '12px', 
                    color: '#888', 
                    marginBottom: '6px', 
                    textTransform: 'uppercase' 
                  }}>
                    PnL ($)
                  </label>
                  <input 
                    type="number" 
                    value={tradeForm.pnl} 
                    onChange={e => setTradeForm({...tradeForm, pnl: e.target.value})} 
                    placeholder="e.g. 150 or -50" 
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      background: '#0a0a0f', 
                      border: '1px solid #2a2a35', 
                      borderRadius: '8px', 
                      color: '#fff', 
                      fontSize: '14px', 
                      boxSizing: 'border-box' 
                    }} 
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '12px', 
                    color: '#888', 
                    marginBottom: '6px', 
                    textTransform: 'uppercase' 
                  }}>
                    RR
                  </label>
                  <input 
                    type="number" 
                    step="0.1" 
                    value={tradeForm.rr} 
                    onChange={e => setTradeForm({...tradeForm, rr: e.target.value})} 
                    placeholder="e.g. 2.5" 
                    style={{ 
                      width: '100%', 
                      padding: '12px', 
                      background: '#0a0a0f', 
                      border: '1px solid #2a2a35', 
                      borderRadius: '8px', 
                      color: '#fff', 
                      fontSize: '14px', 
                      boxSizing: 'border-box' 
                    }} 
                  />
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '12px', 
                  color: '#888', 
                  marginBottom: '6px', 
                  textTransform: 'uppercase' 
                }}>
                  Notes
                </label>
                <textarea 
                  value={tradeForm.notes} 
                  onChange={e => setTradeForm({...tradeForm, notes: e.target.value})} 
                  placeholder="Optional notes..." 
                  rows={2} 
                  style={{ 
                    width: '100%', 
                    padding: '12px', 
                    background: '#0a0a0f', 
                    border: '1px solid #2a2a35', 
                    borderRadius: '8px', 
                    color: '#fff', 
                    fontSize: '14px', 
                    boxSizing: 'border-box', 
                    resize: 'none' 
                  }} 
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={addTrade} 
                  disabled={saving || !tradeForm.symbol || !tradeForm.pnl} 
                  style={{ 
                    flex: 1, 
                    padding: '14px', 
                    background: (saving || !tradeForm.symbol || !tradeForm.pnl) ? '#166534' : '#22c55e', 
                    border: 'none', 
                    borderRadius: '10px', 
                    color: '#fff', 
                    fontWeight: 600, 
                    fontSize: '15px', 
                    cursor: saving ? 'wait' : 'pointer' 
                  }}
                >
                  {saving ? 'Saving...' : 'Add Trade'}
                </button>
                <button 
                  onClick={() => setShowAddTrade(false)} 
                  style={{ 
                    flex: 1, 
                    padding: '14px', 
                    background: '#1a1a24', 
                    border: '1px solid #2a2a35', 
                    borderRadius: '10px', 
                    color: '#fff', 
                    fontWeight: 600, 
                    fontSize: '15px', 
                    cursor: 'pointer' 
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
