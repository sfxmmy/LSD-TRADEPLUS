'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{
        background: '#14141a',
        border: '1px solid #222230',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '480px',
        textAlign: 'center',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#fff',
          marginBottom: '12px',
        }}>
          Something went wrong
        </h1>

        <p style={{
          color: '#888',
          fontSize: '14px',
          lineHeight: '1.6',
          marginBottom: '24px',
        }}>
          We've been notified of this issue and are working to fix it.
          Please try again.
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <div style={{
            background: '#0a0a0f',
            border: '1px solid #2a2a35',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '24px',
            textAlign: 'left',
          }}>
            <p style={{
              color: '#ef4444',
              fontSize: '12px',
              fontFamily: 'monospace',
              margin: 0,
              wordBreak: 'break-word',
            }}>
              {error.message || error.toString()}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: '1px solid #2a2a35',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            style={{
              padding: '12px 24px',
              background: '#22c55e',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
