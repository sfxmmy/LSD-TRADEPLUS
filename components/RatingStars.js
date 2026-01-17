'use client'

import { useState } from 'react'

// Star rating input component
// Used for trade rating in both dashboard quick trade and account trade form

export function RatingStars({
  value = 0,
  onChange,
  maxStars = 5,
  size = 20,
  color = '#fbbf24',
  emptyColor = '#444',
  readOnly = false,
  showValue = false
}) {
  const [hoverValue, setHoverValue] = useState(0)
  const currentValue = parseInt(value) || 0

  const handleClick = (rating) => {
    if (readOnly) return
    // Toggle off if clicking same value
    onChange?.(currentValue === rating ? 0 : rating)
  }

  const renderStar = (index) => {
    const starValue = index + 1
    const isFilled = starValue <= (hoverValue || currentValue)

    return (
      <span
        key={index}
        onClick={() => handleClick(starValue)}
        onMouseEnter={() => !readOnly && setHoverValue(starValue)}
        onMouseLeave={() => setHoverValue(0)}
        style={{
          cursor: readOnly ? 'default' : 'pointer',
          fontSize: `${size}px`,
          color: isFilled ? color : emptyColor,
          transition: 'color 0.15s, transform 0.15s',
          transform: hoverValue === starValue ? 'scale(1.2)' : 'scale(1)',
          display: 'inline-block'
        }}
      >
        ★
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
      {Array.from({ length: maxStars }, (_, i) => renderStar(i))}
      {showValue && (
        <span style={{ marginLeft: '8px', color: '#888', fontSize: '14px' }}>
          {currentValue > 0 ? currentValue : '-'}
        </span>
      )}
    </div>
  )
}

// Compact rating display (read-only, smaller)
export function RatingDisplay({ value, size = 14, color = '#fbbf24' }) {
  const rating = parseInt(value) || 0

  if (rating === 0) {
    return <span style={{ color: '#666', fontSize: `${size}px` }}>-</span>
  }

  return (
    <span style={{ color, fontSize: `${size}px`, letterSpacing: '-1px' }}>
      {'★'.repeat(rating)}
      <span style={{ color: '#333' }}>{'★'.repeat(5 - rating)}</span>
    </span>
  )
}

export default RatingStars
