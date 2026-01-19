'use client'

import { useState, Fragment } from 'react'
import { formatCurrency, getTradeTime } from '@/lib/utils'

// Journal card component for dashboard grid view
// Displays account info, mini equity curve, and stats

export function JournalCard({
  account,
  trades = [],
  onEdit,
  onNavigate,
  showObjectiveLines = false,
  onToggleObjectives,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd
}) {
  const [hoverPoint, setHoverPoint] = useState(null)

  // Calculate stats
  const wins = trades.filter(t => t.outcome === 'win').length
  const losses = trades.filter(t => t.outcome === 'loss').length
  const totalPnl = trades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0)
  const winrate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : 0
  const startingBalance = parseFloat(account.starting_balance) || 0
  const currentBalance = startingBalance + totalPnl
  const grossProfit = trades.filter(t => parseFloat(t.pnl) > 0).reduce((sum, t) => sum + parseFloat(t.pnl), 0)
  const grossLoss = Math.abs(trades.filter(t => parseFloat(t.pnl) < 0).reduce((sum, t) => sum + parseFloat(t.pnl), 0))
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(1) : grossProfit > 0 ? '∞' : '-'
  const isProfitable = totalPnl >= 0

  // Calculate consistency
  const tradeDays = {}
  trades.forEach(t => { if (!tradeDays[t.date]) tradeDays[t.date] = 0; tradeDays[t.date] += parseFloat(t.pnl) || 0 })
  const consistency = Object.keys(tradeDays).length > 0 ? Math.round((Object.values(tradeDays).filter(v => v > 0).length / Object.keys(tradeDays).length) * 100) : 0

  // Calculate equity curve points
  let cumBalance = startingBalance
  const sortedTrades = trades.slice().sort((a, b) => new Date(a.date) - new Date(b.date))
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

  const hasObjectives = profitTarget || maxDdFloor

  const stats = [
    { label: 'PnL', value: `${totalPnl >= 0 ? '+' : ''}$${formatCurrency(totalPnl)}`, color: totalPnl >= 0 ? '#22c55e' : '#ef4444' },
    { label: 'Trades', value: trades.length, color: '#fff' },
    { label: 'Winrate', value: `${winrate}%`, color: winrate >= 50 ? '#22c55e' : '#ef4444' },
    { label: 'W/L', value: `${wins}/${losses}`, color: '#fff' },
    { label: 'Profit Factor', value: profitFactor, color: profitFactor === '-' ? '#666' : profitFactor === '∞' ? '#22c55e' : parseFloat(profitFactor) >= 1 ? '#22c55e' : '#ef4444' },
    { label: 'Consistency', value: `${consistency}%`, color: consistency >= 50 ? '#3b82f6' : '#666' },
  ]

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, account.id)}
      onDragOver={(e) => onDragOver?.(e, account.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop?.(e, account.id)}
      onDragEnd={onDragEnd}
      style={{
        background: 'linear-gradient(135deg, #0f0f14 0%, #0a0a0f 100%)',
        border: isDragOver ? '2px dashed #9333ea' : isDragging ? '2px solid #9333ea' : '1px solid #1a1a22',
        borderRadius: '16px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        transition: 'border 0.2s, opacity 0.2s, transform 0.2s',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragOver ? 'scale(1.02)' : 'scale(1)'
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 16px 12px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '2px', wordBreak: 'break-word', lineHeight: 1.3 }}>{account.name}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 700, color: isProfitable ? '#22c55e' : '#ef4444' }}>
                ${formatCurrency(currentBalance)}
              </span>
              <span style={{ fontSize: '11px', color: '#666', whiteSpace: 'nowrap' }}>
                <span style={{ fontWeight: 600, color: '#888' }}>${formatCurrency(startingBalance)}</span> INITIAL
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {hasObjectives && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleObjectives?.(account.id) }}
                style={{
                  padding: '4px 8px',
                  background: showObjectiveLines ? 'rgba(147,51,234,0.15)' : 'transparent',
                  border: showObjectiveLines ? '1px solid rgba(147,51,234,0.4)' : '1px solid transparent',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '10px',
                  color: showObjectiveLines ? '#9333ea' : '#666',
                  transition: 'all 0.2s'
                }}
                title={showObjectiveLines ? 'Hide objectives' : 'Show objectives'}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <span style={{ whiteSpace: 'nowrap' }}>Objectives</span>
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(account) }}
              style={{
                padding: '5px',
                background: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.6,
                transition: 'opacity 0.2s'
              }}
              title="Edit journal"
              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
              onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mini Chart */}
      <div style={{ padding: '0 12px 12px 12px' }}>
        <MiniEquityCurve
          balancePoints={balancePoints}
          startingBalance={startingBalance}
          sortedTrades={sortedTrades}
          profitTarget={showObjectiveLines ? profitTarget : null}
          maxDdFloor={showObjectiveLines ? maxDdFloor : null}
          accountId={account.id}
          hoverPoint={hoverPoint}
          onHover={setHoverPoint}
        />
      </div>

      {/* Stats Grid */}
      <div style={{ padding: '0 12px 12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          {stats.map((stat, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 0',
              borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none'
            }}>
              <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>{stat.label}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: stat.color }}>{stat.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div onClick={e => e.stopPropagation()} style={{ padding: '12px 16px 16px', display: 'flex', gap: '8px' }}>
        <a
          href={`/account/${account.id}`}
          style={{
            flex: 1,
            padding: '10px',
            background: '#0a0a0f',
            border: '2px solid rgba(34,197,94,0.3)',
            borderRadius: '10px',
            color: '#22c55e',
            fontWeight: 600,
            fontSize: '14px',
            textAlign: 'center',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.08)'; e.currentTarget.style.border = '2px solid rgba(34,197,94,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#0a0a0f'; e.currentTarget.style.border = '2px solid rgba(34,197,94,0.3)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
          </svg>
          Enter Journal
        </a>
        <a
          href={`/account/${account.id}?tab=statistics`}
          style={{
            padding: '10px 14px',
            background: '#0a0a0f',
            border: '2px solid rgba(34,197,94,0.3)',
            borderRadius: '10px',
            color: '#22c55e',
            fontWeight: 600,
            fontSize: '14px',
            textAlign: 'center',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,197,94,0.08)'; e.currentTarget.style.border = '2px solid rgba(34,197,94,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.background = '#0a0a0f'; e.currentTarget.style.border = '2px solid rgba(34,197,94,0.3)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 20V10M12 20V4M6 20v-6"/>
          </svg>
          Stats
        </a>
      </div>
    </div>
  )
}

// Mini equity curve for journal card
function MiniEquityCurve({
  balancePoints,
  startingBalance,
  sortedTrades,
  profitTarget,
  maxDdFloor,
  accountId,
  hoverPoint,
  onHover
}) {
  if (balancePoints.length < 2) {
    return (
      <div style={{ height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '12px' }}>
        No trades yet
      </div>
    )
  }

  const svgW = 100, svgH = 100
  const allValues = balancePoints.map(p => p.value)
  const dataMin = Math.min(...allValues, startingBalance)
  const dataMax = Math.max(...allValues, startingBalance)

  const rangeMin = maxDdFloor ? Math.min(dataMin, maxDdFloor) : dataMin
  const rangeMax = profitTarget ? Math.max(dataMax, profitTarget) : dataMax
  const dataRange = rangeMax - rangeMin || 1000
  const paddingAmt = dataRange / 14

  let yMin = rangeMin - paddingAmt
  let yMax = rangeMax + paddingAmt
  if (yMin < 0 && dataMin >= 0) yMin = 0

  // Calculate nice step
  const displayRange = yMax - yMin || 1000
  const rawStep = displayRange / 4
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const normalized = rawStep / magnitude
  let niceStep
  if (normalized <= 1) niceStep = magnitude
  else if (normalized <= 2) niceStep = 2 * magnitude
  else if (normalized <= 2.5) niceStep = 2.5 * magnitude
  else if (normalized <= 5) niceStep = 5 * magnitude
  else niceStep = 10 * magnitude

  // Generate Y labels
  const yLabels = [startingBalance]
  for (let v = startingBalance + niceStep; v < yMax + niceStep; v += niceStep) yLabels.push(v)
  for (let v = startingBalance - niceStep; v > yMin - niceStep; v -= niceStep) {
    if (v >= 0 || dataMin < 0) yLabels.push(v)
  }
  yLabels.sort((a, b) => b - a)
  yMax = yLabels[0]
  yMin = yLabels[yLabels.length - 1]
  const yRange = yMax - yMin || niceStep

  const formatY = (v) => {
    if (Math.abs(v) >= 1000000) return `$${(v/1000000).toFixed(1)}M`
    if (Math.abs(v) >= 1000) return `$${(v/1000).toFixed(niceStep < 1000 ? 1 : 0)}k`
    return `$${v}`
  }

  // X labels
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

  // Chart points
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

  // Build paths
  const greenSegs = [], redSegs = []
  for (let i = 0; i < chartPts.length - 1; i++) {
    const p1 = chartPts[i], p2 = chartPts[i + 1]
    const above1 = p1.balance >= startingBalance, above2 = p2.balance >= startingBalance
    if (above1 === above2) {
      (above1 ? greenSegs : redSegs).push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
    } else {
      const t = (startingBalance - p1.balance) / (p2.balance - p1.balance)
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

  const isHovered = hoverPoint?.accountId === accountId

  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '-12px' }}>
      <div style={{ display: 'flex', height: '160px' }}>
        {/* Y-Axis */}
        <div style={{ width: '42px', flexShrink: 0, position: 'relative', borderRight: '1px solid #2a2a35', overflow: 'visible' }}>
          {yLabels.map((v, i) => {
            const topPct = yLabels.length > 1 ? (i / (yLabels.length - 1)) * 100 : 0
            const isStart = v === startingBalance
            return (
              <Fragment key={i}>
                <span style={{ position: 'absolute', right: '6px', top: `${topPct}%`, transform: 'translateY(-50%)', fontSize: '8px', color: '#888', lineHeight: 1, whiteSpace: 'nowrap' }}>{formatY(v)}</span>
                <div style={{ position: 'absolute', right: 0, top: `${topPct}%`, width: '4px', borderTop: `1px solid ${isStart ? '#666' : '#2a2a35'}` }} />
              </Fragment>
            )
          })}
        </div>
        {/* Chart */}
        <div style={{ flex: 1, position: 'relative', borderBottom: '1px solid #2a2a35', overflow: 'visible' }}>
          {/* Grid lines */}
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
          {/* Objective lines */}
          {profitTargetLineY !== null && profitTargetLineY >= 0 && profitTargetLineY <= 100 && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: `${profitTargetLineY}%`, borderTop: '1px dashed #22c55e', zIndex: 1 }} />
          )}
          {maxDdFloorLineY !== null && maxDdFloorLineY >= 0 && maxDdFloorLineY <= 100 && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: `${maxDdFloorLineY}%`, borderTop: '1px dashed #ef4444', zIndex: 1 }} />
          )}
          {/* SVG */}
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 2 }}
            viewBox={`0 0 ${svgW} ${svgH}`}
            preserveAspectRatio="none"
            onMouseMove={e => {
              const rect = e.currentTarget.getBoundingClientRect()
              const mouseX = ((e.clientX - rect.left) / rect.width) * svgW
              let closest = chartPts[0], minDist = Math.abs(mouseX - chartPts[0].x)
              chartPts.forEach(p => { const d = Math.abs(mouseX - p.x); if (d < minDist) { minDist = d; closest = p } })
              onHover({ ...closest, accountId, xPct: (closest.x / svgW) * 100, yPct: (closest.y / svgH) * 100 })
            }}
            onMouseLeave={() => onHover(null)}
          >
            <defs>
              <linearGradient id={`eqGreen${accountId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`eqRed${accountId}`} x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={mkArea(greenSegs)} fill={`url(#eqGreen${accountId})`} />
            <path d={mkArea(redSegs)} fill={`url(#eqRed${accountId})`} />
            <path d={mkPath(greenSegs)} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={mkPath(redSegs)} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {/* Hover dot */}
          {isHovered && hoverPoint && (
            <div style={{ position: 'absolute', left: `${hoverPoint.xPct}%`, top: `${hoverPoint.yPct}%`, transform: 'translate(-50%, -50%)', width: '8px', height: '8px', borderRadius: '50%', background: hoverPoint.balance >= startingBalance ? '#22c55e' : '#ef4444', border: '2px solid #fff', pointerEvents: 'none', zIndex: 10 }} />
          )}
          {/* Hover tooltip */}
          {isHovered && hoverPoint && (
            <div style={{ position: 'absolute', left: `${hoverPoint.xPct}%`, top: `${hoverPoint.yPct}%`, transform: `translate(${hoverPoint.xPct > 70 ? 'calc(-100% - 10px)' : '10px'}, ${hoverPoint.yPct < 25 ? '0%' : hoverPoint.yPct > 75 ? '-100%' : '-50%'})`, background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '6px 10px', fontSize: '10px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
              <div style={{ color: '#888', fontSize: '9px' }}>{hoverPoint.date ? new Date(hoverPoint.date).toLocaleDateString() : 'Start'}</div>
              <div style={{ fontWeight: 700, fontSize: '12px', color: '#fff' }}>${hoverPoint.balance?.toLocaleString()}</div>
              {hoverPoint.symbol && <div style={{ color: hoverPoint.pnl >= 0 ? '#22c55e' : '#ef4444', marginTop: '2px' }}>{hoverPoint.symbol}: {hoverPoint.pnl >= 0 ? '+' : ''}${hoverPoint.pnl?.toFixed(0)}</div>}
            </div>
          )}
        </div>
      </div>
      {/* X-Axis */}
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
}

export default JournalCard
