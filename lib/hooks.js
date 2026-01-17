'use client'

// Shared custom hooks for trading journal
// Used by both dashboard and account pages

import { useState, useEffect, useRef, useCallback } from 'react'

// ============================================
// Responsive Hooks
// ============================================

// Check if viewport is mobile width (< 768px)
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < breakpoint)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [breakpoint])

  return isMobile
}

// ============================================
// Tooltip Hooks
// ============================================

// Delayed tooltip show/hide with position tracking
export function useTooltip(delay = 600) {
  const [tooltip, setTooltip] = useState(null)
  const timerRef = useRef(null)

  const showTooltip = useCallback((text, x, y) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const showBelow = y < 50
      setTooltip({ text, x, y, showBelow })
    }, delay)
  }, [delay])

  const hideTooltip = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setTooltip(null)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return { tooltip, showTooltip, hideTooltip }
}

// ============================================
// Click Outside Hook
// ============================================

// Close dropdowns/modals when clicking outside
export function useClickOutside(ref, callback, isActive = true) {
  useEffect(() => {
    if (!isActive) return

    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [ref, callback, isActive])
}

// Alternative using data attribute selector
export function useClickOutsideSelector(selector, callback, isActive = true) {
  useEffect(() => {
    if (!isActive) return

    const handleClickOutside = (e) => {
      if (!e.target.closest(selector)) {
        callback()
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [selector, callback, isActive])
}

// ============================================
// Local Storage Hook
// ============================================

// Persist state to localStorage
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      return initialValue
    }
  })

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }, [key, storedValue])

  return [storedValue, setValue]
}

// ============================================
// Mouse Position Hook
// ============================================

// Track mouse position for tooltips
export function useMousePosition() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY })
  }, [])

  return { mousePos, handleMouseMove }
}

// ============================================
// Scroll Sync Hook
// ============================================

// Sync scroll between two elements (for fixed scrollbar)
export function useScrollSync(primaryRef, secondaryRef) {
  const [scrollWidth, setScrollWidth] = useState(0)

  useEffect(() => {
    const primary = primaryRef.current
    const secondary = secondaryRef.current
    if (!primary || !secondary) return

    const updateScrollWidth = () => {
      if (primary.scrollWidth) setScrollWidth(primary.scrollWidth)
    }
    updateScrollWidth()

    const syncToSecondary = () => { if (secondary) secondary.scrollLeft = primary.scrollLeft }
    const syncToPrimary = () => { if (primary) primary.scrollLeft = secondary.scrollLeft }

    primary.addEventListener('scroll', syncToSecondary)
    secondary.addEventListener('scroll', syncToPrimary)

    const resizeObserver = new ResizeObserver(updateScrollWidth)
    resizeObserver.observe(primary)

    return () => {
      primary.removeEventListener('scroll', syncToSecondary)
      secondary.removeEventListener('scroll', syncToPrimary)
      resizeObserver.disconnect()
    }
  }, [primaryRef, secondaryRef])

  return scrollWidth
}

// ============================================
// Debounce Hook
// ============================================

// Debounce a value
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

// ============================================
// Previous Value Hook
// ============================================

// Get previous value of a state
export function usePrevious(value) {
  const ref = useRef()
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}
