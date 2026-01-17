'use client'

import { useState, useRef, useEffect } from 'react'
import { getOptVal, getOptTextColor, getOptBgColor } from '@/lib/utils'

// Custom styled dropdown with color support for options
// Used for direction, outcome, confidence, session, timeframe, etc.

export function CustomDropdown({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  disabled = false,
  width = '100%',
  showColorBg = true
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const dropdownRef = useRef(null)
  const listRef = useRef(null)

  // Find current selected index
  const selectedIndex = options.findIndex(o =>
    getOptVal(o).toLowerCase() === (value || '').toLowerCase()
  )

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Reset highlighted index when opening
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
    }
  }, [isOpen, selectedIndex])

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const option = listRef.current.children[highlightedIndex]
      if (option) {
        option.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex, isOpen])

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          const opt = options[highlightedIndex]
          onChange(getOptVal(opt).toLowerCase())
          setIsOpen(false)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex(prev =>
            prev < options.length - 1 ? prev + 1 : 0
          )
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex(prev =>
            prev > 0 ? prev - 1 : options.length - 1
          )
        }
        break
      case 'Home':
        if (isOpen) {
          e.preventDefault()
          setHighlightedIndex(0)
        }
        break
      case 'End':
        if (isOpen) {
          e.preventDefault()
          setHighlightedIndex(options.length - 1)
        }
        break
      case 'Tab':
        if (isOpen) {
          setIsOpen(false)
        }
        break
    }
  }

  // Find current option
  const currentOption = options.find(o =>
    getOptVal(o).toLowerCase() === (value || '').toLowerCase()
  )
  const currentValue = currentOption ? getOptVal(currentOption) : ''
  const currentTextColor = currentOption ? getOptTextColor(currentOption, '#fff') : '#888'
  const currentBgColor = showColorBg && currentOption ? getOptBgColor(currentOption) : null

  const listboxId = useRef(`listbox-${Math.random().toString(36).substr(2, 9)}`).current

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: currentBgColor || '#141418',
          border: '1px solid #2a2a35',
          borderRadius: '8px',
          color: currentTextColor,
          fontSize: '14px',
          fontWeight: currentValue ? 500 : 400,
          textAlign: 'left',
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          opacity: disabled ? 0.5 : 1,
          textTransform: 'capitalize'
        }}
      >
        <span>{currentValue || placeholder}</span>
        <span style={{
          color: '#666',
          transition: 'transform 0.2s',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
        }}>▼</span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-activedescendant={highlightedIndex >= 0 ? `${listboxId}-option-${highlightedIndex}` : undefined}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: '#141418',
            border: '1px solid #2a2a35',
            borderRadius: '8px',
            zIndex: 100,
            maxHeight: '200px',
            overflowY: 'auto',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
          }}
        >
          {options.map((opt, i) => {
            const optValue = getOptVal(opt)
            const optTextColor = getOptTextColor(opt, '#fff')
            const optBgColor = showColorBg ? getOptBgColor(opt) : null
            const isSelected = optValue.toLowerCase() === (value || '').toLowerCase()
            const isHighlighted = i === highlightedIndex

            return (
              <div
                key={i}
                id={`${listboxId}-option-${i}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(optValue.toLowerCase())
                  setIsOpen(false)
                }}
                onMouseEnter={() => setHighlightedIndex(i)}
                style={{
                  padding: '10px 12px',
                  color: optTextColor,
                  background: isHighlighted
                    ? (optBgColor || 'rgba(255,255,255,0.1)')
                    : isSelected
                      ? (optBgColor || 'rgba(255,255,255,0.05)')
                      : 'transparent',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  borderBottom: i < options.length - 1 ? '1px solid #1a1a22' : 'none',
                  transition: 'background 0.15s',
                  outline: isHighlighted ? '2px solid rgba(255,255,255,0.2)' : 'none',
                  outlineOffset: '-2px'
                }}
              >
                {optValue}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Simple inline dropdown for table cells
export function InlineDropdown({
  value,
  onChange,
  options = [],
  textColor = '#fff',
  bgColor = null
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const ref = useRef(null)

  // Find current selected index
  const selectedIndex = options.findIndex(o =>
    getOptVal(o).toLowerCase() === (value || '').toLowerCase()
  )

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  // Reset highlighted index when opening
  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
    }
  }, [isOpen, selectedIndex])

  // Keyboard navigation
  const handleKeyDown = (e) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          onChange(getOptVal(options[highlightedIndex]))
          setIsOpen(false)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
      case 'ArrowDown':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex(prev => prev < options.length - 1 ? prev + 1 : 0)
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex(prev => prev > 0 ? prev - 1 : options.length - 1)
        }
        break
      case 'Tab':
        if (isOpen) setIsOpen(false)
        break
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <span
        tabIndex={0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        style={{
          color: textColor,
          background: bgColor,
          padding: bgColor ? '2px 8px' : '0',
          borderRadius: '4px',
          cursor: 'pointer',
          textTransform: 'capitalize',
          outline: 'none'
        }}
      >
        {value || '-'}
      </span>
      {isOpen && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '4px',
            background: '#1a1a22',
            border: '1px solid #2a2a35',
            borderRadius: '6px',
            zIndex: 100,
            minWidth: '80px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
          }}
        >
          {options.map((opt, i) => {
            const optValue = getOptVal(opt)
            const optColor = getOptTextColor(opt, '#fff')
            const isHighlighted = i === highlightedIndex
            return (
              <div
                key={i}
                role="option"
                aria-selected={optValue.toLowerCase() === (value || '').toLowerCase()}
                onClick={() => { onChange(optValue); setIsOpen(false) }}
                onMouseEnter={() => setHighlightedIndex(i)}
                style={{
                  padding: '8px 12px',
                  color: optColor,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  textAlign: 'center',
                  background: isHighlighted ? 'rgba(255,255,255,0.1)' : 'transparent'
                }}
              >
                {optValue}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CustomDropdown
