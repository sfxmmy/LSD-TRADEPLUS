'use client'

// Stat card component for displaying statistics
// Used in dashboard cumulative stats and account statistics tab

export function StatCard({
  label,
  value,
  subValue = null,
  color = '#fff',
  icon = null,
  size = 'medium', // 'small', 'medium', 'large'
  trend = null, // 'up', 'down', 'neutral'
  trendValue = null,
  onClick = null,
  highlight = false
}) {
  const sizes = {
    small: { padding: '12px', labelSize: '11px', valueSize: '18px', gap: '4px' },
    medium: { padding: '16px', labelSize: '12px', valueSize: '24px', gap: '6px' },
    large: { padding: '20px', labelSize: '14px', valueSize: '32px', gap: '8px' }
  }

  const s = sizes[size] || sizes.medium

  const trendColors = {
    up: '#22c55e',
    down: '#ef4444',
    neutral: '#888'
  }

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→'
  }

  return (
    <div
      onClick={onClick}
      style={{
        padding: s.padding,
        background: highlight ? 'rgba(34, 197, 94, 0.1)' : '#0f0f14',
        border: `1px solid ${highlight ? 'rgba(34, 197, 94, 0.3)' : '#1a1a22'}`,
        borderRadius: '12px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: s.gap }}>
        {icon && (
          <span style={{ fontSize: s.labelSize, opacity: 0.6 }}>{icon}</span>
        )}
        <span style={{
          fontSize: s.labelSize,
          color: '#888',
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{
          fontSize: s.valueSize,
          fontWeight: 700,
          color
        }}>
          {value}
        </span>

        {subValue && (
          <span style={{
            fontSize: s.labelSize,
            color: '#666'
          }}>
            {subValue}
          </span>
        )}

        {trend && (
          <span style={{
            fontSize: s.labelSize,
            color: trendColors[trend] || '#888',
            fontWeight: 500
          }}>
            {trendIcons[trend]} {trendValue}
          </span>
        )}
      </div>
    </div>
  )
}

// Grid of stat cards
export function StatCardGrid({ children, columns = 4, gap = '12px' }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap
    }}>
      {children}
    </div>
  )
}

// Mini stat - compact inline stat display
export function MiniStat({ label, value, color = '#fff', separator = ':' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ color: '#888', fontSize: '12px' }}>{label}{separator}</span>
      <span style={{ color, fontSize: '12px', fontWeight: 600 }}>{value}</span>
    </span>
  )
}

// Stat with progress bar
export function StatWithProgress({
  label,
  value,
  progress = 0, // 0-100
  color = '#22c55e',
  bgColor = 'rgba(34, 197, 94, 0.2)',
  showPercent = true
}) {
  return (
    <div style={{ padding: '16px', background: '#0f0f14', border: '1px solid #1a1a22', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '12px', color: '#888', fontWeight: 500, textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: '14px', color, fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: '6px', background: '#1a1a22', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, Math.max(0, progress))}%`,
          background: color,
          borderRadius: '3px',
          transition: 'width 0.3s ease'
        }} />
      </div>
      {showPercent && (
        <div style={{ marginTop: '4px', fontSize: '11px', color: '#666', textAlign: 'right' }}>
          {progress.toFixed(1)}%
        </div>
      )}
    </div>
  )
}

// Stat comparison (showing before/after or vs)
export function StatComparison({
  label,
  leftValue,
  rightValue,
  leftLabel = '',
  rightLabel = '',
  leftColor = '#fff',
  rightColor = '#fff',
  separator = 'vs'
}) {
  return (
    <div style={{ padding: '16px', background: '#0f0f14', border: '1px solid #1a1a22', borderRadius: '12px' }}>
      <div style={{ fontSize: '12px', color: '#888', fontWeight: 500, textTransform: 'uppercase', marginBottom: '8px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ textAlign: 'center' }}>
          {leftLabel && <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>{leftLabel}</div>}
          <div style={{ fontSize: '20px', fontWeight: 700, color: leftColor }}>{leftValue}</div>
        </div>
        <div style={{ fontSize: '12px', color: '#444' }}>{separator}</div>
        <div style={{ textAlign: 'center' }}>
          {rightLabel && <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>{rightLabel}</div>}
          <div style={{ fontSize: '20px', fontWeight: 700, color: rightColor }}>{rightValue}</div>
        </div>
      </div>
    </div>
  )
}

export default StatCard
