'use client'

import { useState, useEffect } from 'react'

// Global toast state using module-level variable
let toastListeners = []
let toastId = 0

// Function to show toast from anywhere
export function showToast(message, type = 'error') {
  const id = ++toastId
  toastListeners.forEach(listener => listener({ id, message, type }))
  return id
}

// Toast container component - add this to your pages
export function ToastContainer() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const listener = (toast) => {
      setToasts(prev => [...prev, toast])
      // Auto-remove after 4 seconds
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, 4000)
    }
    toastListeners.push(listener)
    return () => {
      toastListeners = toastListeners.filter(l => l !== listener)
    }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            background: toast.type === 'success' ? 'rgba(34,197,94,0.95)' : toast.type === 'warning' ? 'rgba(245,158,11,0.95)' : 'rgba(239,68,68,0.95)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            maxWidth: '350px',
            animation: 'slideIn 0.2s ease-out'
          }}
          onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
        >
          {toast.message}
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
