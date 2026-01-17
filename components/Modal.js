'use client'

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
    >
      <div
        style={{
          background: '#0d0d12',
          border: '1px solid #1a1a22',
          borderRadius: '12px',
          padding,
          width,
          maxWidth,
          maxHeight,
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: '#fff' }}>
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
    >
      <div
        style={{
          background: '#0d0d12',
          border: '1px solid #1a1a22',
          borderRadius: '12px',
          padding: '24px',
          width: '90%',
          maxWidth: '380px'
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontSize: '18px', marginBottom: '8px', color: danger ? '#ef4444' : '#fff' }}>
          {title}
        </h3>
        {message && (
          <p style={{ color: '#999', fontSize: '14px', marginBottom: '20px' }}>
            {message}
          </p>
        )}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid #333',
              borderRadius: '8px',
              color: '#999',
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
