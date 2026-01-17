'use client'

// Mouse-following tooltip with edge detection
// Used for chart tooltips and button hints

// Data tooltip - shows value, date, and optional extra info
export function DataTooltip({ data, mousePos }) {
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

  // Ensure tooltip stays within viewport
  left = Math.max(10, Math.min(left, windowWidth - tooltipWidth - 10))
  top = Math.max(10, Math.min(top, windowHeight - tooltipHeight - 10))

  return (
    <div
      role="tooltip"
      style={{
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
      }}
    >
      <div style={{ color: '#999', marginBottom: '4px' }}>{data.date}</div>
      <div style={{ fontWeight: 700, fontSize: '16px', color: '#fff' }}>
        ${data.value?.toLocaleString()}
      </div>
      {data.extra && (
        <div style={{ color: data.extra.color || '#22c55e', marginTop: '4px' }}>
          {data.extra.text}
        </div>
      )}
    </div>
  )
}

// Simple text tooltip - shows hint text near element
export function ButtonTooltip({ tooltip }) {
  if (!tooltip) return null

  const { text, x, y, showBelow } = tooltip
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800

  // Calculate base position
  let left = x
  let top = showBelow ? y + 10 : y - 36

  // Ensure tooltip stays within viewport horizontally (approximate width check)
  const estimatedWidth = text.length * 7 + 20 // rough estimate
  if (left - estimatedWidth / 2 < 10) left = estimatedWidth / 2 + 10
  if (left + estimatedWidth / 2 > windowWidth - 10) left = windowWidth - estimatedWidth / 2 - 10

  // Ensure tooltip stays within viewport vertically
  if (top < 10) top = y + 10 // flip below
  if (top > windowHeight - 40) top = y - 36 // flip above

  return (
    <div
      role="tooltip"
      style={{
        position: 'fixed',
        left,
        top,
        transform: 'translateX(-50%)',
        background: '#1a1a22',
        border: '1px solid #333',
        borderRadius: '6px',
        padding: '6px 10px',
        fontSize: '12px',
        color: '#fff',
        whiteSpace: 'nowrap',
        zIndex: 9999,
        pointerEvents: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)'
      }}
    >
      {text}
    </div>
  )
}

// Chart point tooltip - shows value at specific chart position
export function ChartTooltip({ point, containerRef }) {
  if (!point) return null

  // Get container bounds for positioning
  const bounds = containerRef?.current?.getBoundingClientRect() || { left: 0, top: 0, width: 500, height: 300 }
  const tooltipWidth = 120
  const tooltipHeight = 60

  // Calculate position with edge detection
  let left = point.x + 10
  let top = point.y - 40

  // Flip to left if too close to right edge
  if (point.x + tooltipWidth + 20 > bounds.width) {
    left = point.x - tooltipWidth - 10
  }
  // Flip below if too close to top
  if (point.y < tooltipHeight + 10) {
    top = point.y + 10
  }
  // Keep within container bounds
  left = Math.max(5, Math.min(left, bounds.width - tooltipWidth - 5))
  top = Math.max(5, top)

  return (
    <div
      role="tooltip"
      style={{
        position: 'absolute',
        left,
        top,
        background: '#1a1a22',
        border: '1px solid #2a2a35',
        borderRadius: '6px',
        padding: '8px 12px',
        fontSize: '12px',
        zIndex: 100,
        pointerEvents: 'none',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        whiteSpace: 'nowrap'
      }}
    >
      {point.date && <div style={{ color: '#888', marginBottom: '2px' }}>{point.date}</div>}
      <div style={{ fontWeight: 600, color: point.color || '#fff' }}>
        {point.label || `$${point.value?.toLocaleString()}`}
      </div>
      {point.pnl !== undefined && (
        <div style={{ color: point.pnl >= 0 ? '#22c55e' : '#ef4444', fontSize: '11px' }}>
          {point.pnl >= 0 ? '+' : ''}${point.pnl.toLocaleString()}
        </div>
      )}
    </div>
  )
}

// Bar chart hover tooltip
export function BarTooltip({ data, x, y }) {
  if (!data) return null

  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800
  const tooltipWidth = 140
  const tooltipHeight = 80

  // Calculate position with edge detection
  let left = x + 15
  let top = y - 60

  // Flip to left if too close to right edge
  if (x > windowWidth - tooltipWidth - 30) {
    left = x - tooltipWidth - 15
  }
  // Flip below if too close to top
  if (y < tooltipHeight + 20) {
    top = y + 15
  }
  // Ensure stays within viewport
  left = Math.max(10, Math.min(left, windowWidth - tooltipWidth - 10))
  top = Math.max(10, Math.min(top, windowHeight - tooltipHeight - 10))

  return (
    <div
      role="tooltip"
      style={{
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
        minWidth: '120px'
      }}
    >
      <div style={{ fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{data.label}</div>
      {data.items && data.items.map((item, i) => (
        <div key={i} style={{ color: item.color || '#999', fontSize: '11px' }}>
          {item.label}: {item.value}
        </div>
      ))}
    </div>
  )
}

export default { DataTooltip, ButtonTooltip, ChartTooltip, BarTooltip }
