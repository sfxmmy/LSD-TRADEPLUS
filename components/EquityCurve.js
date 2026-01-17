'use client'

import { useState, useRef, Fragment } from 'react'
import { getTradeTime } from '@/lib/utils'

// Equity curve SVG chart component
// Used in dashboard journal widgets and account statistics page

export function EquityCurve({
  trades = [],
  startingBalance = 10000,
  account = null,
  showObjectiveLines = false,
  height = '100%'
}) {
  const [hoverPoint, setHoverPoint] = useState(null)
  const [hoverLine, setHoverLine] = useState(null)
  const svgRef = useRef(null)

  // Check if prop firm rules are configured
  const hasPropFirmRules = account?.profit_target || account?.max_drawdown || account?.max_dd_enabled || account?.daily_dd_enabled

  if (!trades || trades.length === 0) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '14px' }}>
        No trades yet
      </div>
    )
  }

  // Helper to create sortable datetime from date and time
  const getDateTime = (trade) => {
    if (!trade.date) return new Date(0)
    const time = getTradeTime(trade) || '00:00'
    const dateTime = new Date(`${trade.date}T${time}`)
    return isNaN(dateTime.getTime()) ? new Date(trade.date) : dateTime
  }

  // Sort trades by date and time for accurate sequencing
  const sortedTrades = [...trades].sort((a, b) => getDateTime(a) - getDateTime(b))

  const start = parseFloat(startingBalance) || 10000
  let cumulative = start
  const points = [{ balance: cumulative, date: null, time: null, pnl: 0, idx: 0 }]
  sortedTrades.forEach((t, i) => {
    cumulative += parseFloat(t.pnl) || 0
    points.push({
      balance: cumulative,
      date: t.date,
      time: getTradeTime(t),
      pnl: parseFloat(t.pnl) || 0,
      symbol: t.symbol,
      idx: i + 1
    })
  })

  let maxBal = Math.max(...points.map(p => p.balance))
  let minBal = Math.min(...points.map(p => p.balance))

  // Calculate prop firm lines
  const maxDDParsed = parseFloat(account?.max_drawdown)
  const ptParsed = parseFloat(account?.profit_target)
  const maxDDClamped = !isNaN(maxDDParsed) ? Math.min(99, Math.max(0, maxDDParsed)) : 0
  const ptClamped = !isNaN(ptParsed) ? Math.min(500, Math.max(0, ptParsed)) : 0
  const ddFloor = maxDDClamped > 0 ? start * (1 - maxDDClamped / 100) : null
  const profitTarget = ptClamped > 0 ? start * (1 + ptClamped / 100) : null

  // Daily Drawdown calculation
  const dailyDdEnabled = account?.daily_dd_enabled
  const dailyDdPctRaw = parseFloat(account?.daily_dd_pct)
  const dailyDdPct = !isNaN(dailyDdPctRaw) ? Math.min(99, Math.max(0, dailyDdPctRaw)) : 0
  const dailyDdResetTime = account?.daily_dd_reset_time || '00:00'
  const dailyDdType = account?.daily_dd_type || 'static'
  const dailyDdLocksAt = account?.daily_dd_locks_at || 'start_balance'
  const dailyDdLocksAtPctValue = parseFloat(account?.daily_dd_locks_at_pct) || 0

  // Helper to get trading day for a trade based on reset time
  const getTradingDay = (tradeDate, tradeTime) => {
    if (!tradeDate) return null
    const resetParts = (dailyDdResetTime || '00:00').split(':')
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

  let dailyDdFloorPoints = []
  if (dailyDdEnabled && dailyDdPct > 0) {
    let currentDayStart = start
    let currentTradingDay = null
    let isLocked = false
    let lockedFloor = null
    const getLockThreshold = () => {
      if (dailyDdLocksAt === 'start_balance') return start
      if (dailyDdLocksAt === 'custom' && dailyDdLocksAtPctValue > 0) return start * (1 + dailyDdLocksAtPctValue / 100)
      return start
    }
    const lockThreshold = getLockThreshold()

    points.forEach((p, i) => {
      if (i === 0) {
        const floor = start * (1 - dailyDdPct / 100)
        dailyDdFloorPoints.push({ idx: i, floor, isNewDay: true })
      } else {
        const tradingDay = getTradingDay(p.date, p.time)
        const isNewDay = tradingDay && tradingDay !== currentTradingDay
        if (isNewDay) {
          const prevBalance = points[i - 1].balance
          currentDayStart = currentTradingDay ? prevBalance : start
          currentTradingDay = tradingDay
        }
        let floor = currentDayStart * (1 - dailyDdPct / 100)
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

  // Max Drawdown calculation
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
      maxDdStaticFloor = start * (1 - maxDdPct / 100)
    } else {
      let peak = start
      let trailingFloor = start * (1 - maxDdPct / 100)
      let isLocked = false
      let lockedFloor = null
      const getLockThreshold = () => {
        if (maxDdStopsAt === 'initial') return start
        if (maxDdStopsAt === 'custom' && maxDdLocksAtPctValue > 0) return start * (1 + maxDdLocksAtPctValue / 100)
        return null
      }
      const lockThreshold = getLockThreshold()

      points.forEach((p, i) => {
        if (!isLocked && p.balance > peak) {
          peak = p.balance
          const newFloor = peak * (1 - maxDdPct / 100)
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

  // Track the lowest DD floor for padding calculation
  let lowestDdFloor = null

  if (showObjectiveLines) {
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
    if (ddFloor) {
      minBal = Math.min(minBal, ddFloor)
      lowestDdFloor = lowestDdFloor ? Math.min(lowestDdFloor, ddFloor) : ddFloor
    }
    if (profitTarget) maxBal = Math.max(maxBal, profitTarget)
  }

  const hasNegative = minBal < 0
  const belowStart = minBal < start

  // Calculate Y-axis range
  const actualMin = Math.min(minBal, start)
  const actualMax = Math.max(maxBal, start)
  const dataRange = actualMax - actualMin || 1000
  const paddingAmount = dataRange / 14

  let yMax, yMin
  if (!showObjectiveLines) {
    yMax = actualMax + paddingAmount
    yMin = actualMin - paddingAmount
    if (yMin < 0 && actualMin >= 0) yMin = 0
  } else {
    yMax = actualMax + paddingAmount
    yMin = actualMin - paddingAmount
    if (profitTarget) yMax = Math.max(yMax, profitTarget + paddingAmount)
    if (lowestDdFloor !== null) yMin = Math.min(yMin, lowestDdFloor - paddingAmount)
  }

  // Calculate step size for Y labels
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
  const yStep = niceStep

  // Generate Y labels anchored to starting balance
  const yLabels = [start]
  for (let v = start + yStep; v < yMax + yStep; v += yStep) yLabels.push(v)
  for (let v = start - yStep; v > yMin - yStep; v -= yStep) {
    if (v >= 0 || hasNegative || showObjectiveLines) yLabels.push(v)
  }
  yLabels.sort((a, b) => b - a)
  yMax = yLabels[0]
  yMin = yLabels[yLabels.length - 1]
  const yRange = yMax - yMin || yStep

  const startLineY = ((yMax - start) / yRange) * 100
  const ddFloorY = ddFloor ? ((yMax - ddFloor) / yRange) * 100 : null
  const profitTargetY = profitTarget ? ((yMax - profitTarget) / yRange) * 100 : null
  const maxDdStaticFloorY = maxDdStaticFloor ? ((yMax - maxDdStaticFloor) / yRange) * 100 : null

  const formatYLabel = (v) => {
    if (Math.abs(v) >= 1000000) return `$${(v/1000000).toFixed(1)}M`
    if (Math.abs(v) >= 1000) {
      const needsDecimal = yStep < 1000
      return needsDecimal ? `$${(v/1000).toFixed(1)}k` : `$${(v/1000).toFixed(0)}k`
    }
    return `$${v}`
  }

  // Generate X labels
  const datesWithTrades = points.filter(p => p.date).map((p, idx) => ({ date: p.date, pointIdx: idx + 1 }))
  const xLabels = []
  if (datesWithTrades.length > 0) {
    const firstDate = new Date(datesWithTrades[0].date)
    const lastDate = new Date(datesWithTrades[datesWithTrades.length - 1].date)
    const totalDays = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)))

    let intervalDays, numLabels
    if (totalDays <= 12) { intervalDays = 1; numLabels = totalDays + 1 }
    else if (totalDays <= 84) { intervalDays = 7; numLabels = Math.min(12, Math.ceil(totalDays / 7) + 1) }
    else if (totalDays <= 180) { intervalDays = 14; numLabels = Math.min(12, Math.ceil(totalDays / 14) + 1) }
    else if (totalDays <= 365) { intervalDays = 30; numLabels = Math.min(12, Math.ceil(totalDays / 30) + 1) }
    else if (totalDays <= 730) { intervalDays = 60; numLabels = Math.min(12, Math.ceil(totalDays / 60) + 1) }
    else { intervalDays = 90; numLabels = Math.min(12, Math.ceil(totalDays / 90) + 1) }

    const actualLabels = Math.min(numLabels, datesWithTrades.length, 12)
    for (let i = 0; i < actualLabels; i++) {
      const idx = actualLabels > 1 ? Math.round(i * (datesWithTrades.length - 1) / (actualLabels - 1)) : 0
      const trade = datesWithTrades[idx]
      if (trade?.date) {
        const d = new Date(trade.date)
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

  const startY = svgH - ((start - yMin) / yRange) * svgH
  const greenSegments = [], redSegments = []

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
    for (let i = 0; i < chartPoints.length - 1; i++) {
      const p1 = chartPoints[i], p2 = chartPoints[i + 1]
      greenSegments.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
    }
  }

  const greenPath = greenSegments.map(s => `M ${s.x1} ${s.y1} L ${s.x2} ${s.y2}`).join(' ')
  const redPath = belowStart ? redSegments.map(s => `M ${s.x1} ${s.y1} L ${s.x2} ${s.y2}`).join(' ') : ''
  const greenAreaPath = greenSegments.map(s => `M ${s.x1} ${s.y1} L ${s.x2} ${s.y2} L ${s.x2} ${startY} L ${s.x1} ${startY} Z`).join(' ')
  const redAreaPath = belowStart ? redSegments.map(s => `M ${s.x1} ${s.y1} L ${s.x2} ${s.y2} L ${s.x2} ${startY} L ${s.x1} ${startY} Z`).join(' ') : ''

  // Build daily DD path
  let dailyDdPath = ''
  if (dailyDdFloorPoints.length > 0) {
    const ddChartPoints = dailyDdFloorPoints.map((p, i) => {
      const x = points.length > 1 ? (p.idx / (points.length - 1)) * svgW : svgW / 2
      const y = svgH - ((p.floor - yMin) / yRange) * svgH
      const aboveProfitTarget = profitTarget && p.floor >= profitTarget
      return { x, y, floor: p.floor, isNewDay: p.isNewDay, aboveProfitTarget }
    })
    let pathParts = []
    let inPath = false
    for (let i = 0; i < ddChartPoints.length; i++) {
      const p = ddChartPoints[i]
      if (p.aboveProfitTarget) { inPath = false; continue }
      if (!inPath) { pathParts.push(`M ${p.x} ${p.y}`); inPath = true }
      else { pathParts.push(`H ${p.x}`) }
    }
    dailyDdPath = pathParts.join(' ')
  }

  // Build trailing max DD path
  let trailingMaxDdPath = ''
  if (maxDdFloorPoints.length > 0) {
    const maxDdChartPoints = maxDdFloorPoints.map(p => {
      const x = points.length > 1 ? (p.idx / (points.length - 1)) * svgW : svgW / 2
      const y = svgH - ((p.floor - yMin) / yRange) * svgH
      return { x, y, floor: p.floor }
    })
    trailingMaxDdPath = maxDdChartPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  }

  function handleMouseMove(e) {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const mouseXPct = ((e.clientX - rect.left) / rect.width) * svgW
    let closest = chartPoints[0], minDist = Math.abs(mouseXPct - chartPoints[0].x)
    chartPoints.forEach(p => { const d = Math.abs(mouseXPct - p.x); if (d < minDist) { minDist = d; closest = p } })
    if (minDist < 10) {
      setHoverPoint({ ...closest, xPct: (closest.x / svgW) * 100, yPct: (closest.y / svgH) * 100 })
    } else {
      setHoverPoint(null)
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Chart row */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* Y-axis labels */}
        <div style={{ width: '30px', flexShrink: 0, position: 'relative', borderRight: '1px solid #2a2a35', overflow: 'visible' }}>
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
          {/* Legend */}
          {showObjectiveLines && (
            <div style={{ position: 'absolute', top: '4px', left: '8px', display: 'flex', gap: '12px', zIndex: 15, background: 'rgba(10, 10, 15, 0.85)', padding: '4px 8px', borderRadius: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '16px', height: '0', borderTop: '2px dashed #666' }} />
                <span style={{ fontSize: '9px', color: '#666', fontWeight: 500 }}>Start</span>
              </div>
              {profitTargetY !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '16px', height: '0', borderTop: '1px dashed #22c55e' }} />
                  <span style={{ fontSize: '9px', color: '#22c55e', fontWeight: 500 }}>Target {account?.profit_target}%</span>
                </div>
              )}
              {(maxDdStaticFloorY !== null || trailingMaxDdPath) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '16px', height: '0', borderTop: '1px dashed #ef4444' }} />
                  <span style={{ fontSize: '9px', color: '#ef4444', fontWeight: 500 }}>Max DD {account?.max_dd_pct || account?.max_drawdown}%</span>
                </div>
              )}
              {dailyDdPath && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '16px', height: '0', borderTop: '1px dashed #f97316' }} />
                  <span style={{ fontSize: '9px', color: '#f97316', fontWeight: 500 }}>Daily DD {account?.daily_dd_pct}%</span>
                </div>
              )}
            </div>
          )}
          {/* Grid lines */}
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
            {showObjectiveLines && dailyDdPath && <path d={dailyDdPath} fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
            {showObjectiveLines && trailingMaxDdPath && <path d={trailingMaxDdPath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
          </svg>
          {/* Start line */}
          {startLineY !== null && <div style={{ position: 'absolute', left: 0, right: 0, top: `${startLineY}%`, borderTop: '1px dashed #666', zIndex: 1 }} />}
          {/* DD Floor line */}
          {showObjectiveLines && ddFloorY !== null && !maxDdEnabled && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: `${ddFloorY}%`, borderTop: '1px dashed #ef4444' }} />
          )}
          {/* Static Max DD floor line */}
          {showObjectiveLines && maxDdStaticFloorY !== null && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: `${maxDdStaticFloorY}%`, borderTop: '1px dashed #ef4444' }} />
          )}
          {/* Profit target line */}
          {showObjectiveLines && profitTargetY !== null && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: `${profitTargetY}%`, borderTop: '1px dashed #22c55e' }} />
          )}
          {/* Hover dot */}
          {hoverPoint && (
            <div style={{ position: 'absolute', left: `${hoverPoint.xPct}%`, top: `${hoverPoint.yPct}%`, transform: 'translate(-50%, -50%)', width: '12px', height: '12px', borderRadius: '50%', background: hoverPoint.balance >= start ? '#22c55e' : '#ef4444', border: '2px solid #fff', pointerEvents: 'none', zIndex: 10 }} />
          )}
          {/* Tooltip */}
          {hoverPoint && (
            <div style={{ position: 'absolute', left: `${hoverPoint.xPct}%`, top: `${hoverPoint.yPct}%`, transform: `translate(${hoverPoint.xPct > 80 ? 'calc(-100% - 15px)' : '15px'}, ${hoverPoint.yPct < 20 ? '0%' : hoverPoint.yPct > 80 ? '-100%' : '-50%'})`, background: '#1a1a22', border: '1px solid #2a2a35', borderRadius: '6px', padding: '8px 12px', fontSize: '11px', whiteSpace: 'nowrap', zIndex: 10, pointerEvents: 'none' }}>
              <div style={{ color: '#999' }}>{hoverPoint.date ? new Date(hoverPoint.date).toLocaleDateString() : 'Start'}</div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>${hoverPoint.balance.toLocaleString()}</div>
              {hoverPoint.symbol && <div style={{ color: hoverPoint.pnl >= 0 ? '#22c55e' : '#ef4444' }}>{hoverPoint.symbol}: {hoverPoint.pnl >= 0 ? '+' : ''}${hoverPoint.pnl.toFixed(0)}</div>}
            </div>
          )}
        </div>
      </div>
      {/* X-axis row */}
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

export default EquityCurve
