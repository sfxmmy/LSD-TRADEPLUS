'use client'

import { useEffect, useRef } from 'react'

/**
 * Reusable Modal Component
 *
 * Usage:
 * <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
 *   <Modal.Header>Title</Modal.Header>
 *   <Modal.Body>Content here</Modal.Body>
 *   <Modal.Footer>Buttons here</Modal.Footer>
 * </Modal>
 *
 * Or simpler:
 * <Modal isOpen={show} onClose={close} title="My Modal" width="420px">
 *   Content here
 * </Modal>
 */

export default function Modal({
  isOpen,
  onClose,
  children,
  title,
  width = '420px',
  maxWidth = '95vw',
  maxHeight = '90vh',
  zIndex = 100,
  blur = false,
  padding = '24px'
}) {
  const modalRef = useRef(null)
  const previousActiveElement = useRef(null)

  // Handle ESC key and focus trapping
  useEffect(() => {
    if (!isOpen) return

    // Save currently focused element
    previousActiveElement.current = document.activeElement

    // Focus the modal
    if (modalRef.current) {
      modalRef.current.focus()
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      // Focus trapping
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Restore focus when modal closes
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: blur ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex,
        ...(blur && { backdropFilter: 'blur(4px)' })
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
        style={{
          background: '#0d0d12',
          border: '1px solid #1a1a22',
          borderRadius: '12px',
          padding,
          width,
          maxWidth,
          maxHeight,
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          outline: 'none'
        }}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <h2 id="modal-title" style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: '#fff' }}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  )
}

// Sub-components for more control
Modal.Header = function ModalHeader({ children, color = '#fff' }) {
  return (
    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color }}>
      {children}
    </h2>
  )
}

Modal.Body = function ModalBody({ children }) {
  return <div>{children}</div>
}

Modal.Footer = function ModalFooter({ children }) {
  return (
    <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
      {children}
    </div>
  )
}

// Confirmation modal variant
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false
}) {
  const modalRef = useRef(null)

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    if (modalRef.current) modalRef.current.focus()

    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={message ? 'confirm-message' : undefined}
        tabIndex={-1}
        style={{
          background: '#0d0d12',
          border: '1px solid #1a1a22',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '380px',
          outline: 'none'
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 id="confirm-title" style={{ fontSize: '18px', marginBottom: '8px', color: danger ? '#ef4444' : '#fff' }}>
          {title}
        </h3>
        {message && (
          <p id="confirm-message" style={{ color: '#999', fontSize: '14px', marginBottom: '20px' }}>
            {message}
          </p>
        )}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid #444',
              borderRadius: '8px',
              color: '#ccc',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              background: danger ? '#ef4444' : '#22c55e',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
