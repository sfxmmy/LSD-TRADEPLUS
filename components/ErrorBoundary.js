'use client'

import { Component } from 'react'
import * as Sentry from '@sentry/nextjs'
import { getSupabase } from '@/lib/supabase'

/**
 * Error Boundary component that catches JavaScript errors anywhere in the child
 * component tree and displays a fallback UI instead of crashing the whole app.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to Sentry
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
      },
    })

    this.setState({ errorInfo })

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  handleReset = async () => {
    // Check if user is still authenticated before retrying
    try {
      const supabase = getSupabase()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        // Session expired, redirect to login
        window.location.href = '/login'
        return
      }
      // Auth is valid, allow retry
      this.setState({ hasError: false, error: null, errorInfo: null })
    } catch (err) {
      // Auth check failed, redirect to login
      window.location.href = '/login'
    }
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

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
              Please try refreshing the page.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
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
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
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
                onClick={this.handleReload}
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
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

/**
 * Smaller error boundary for individual components/sections
 * Shows a less intrusive error message
 */
export class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
        section: this.props.name || 'unknown',
      },
    })
  }

  handleRetry = async () => {
    // Check if user is still authenticated before retrying
    try {
      const supabase = getSupabase()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        window.location.href = '/login'
        return
      }
      this.setState({ hasError: false })
    } catch (err) {
      window.location.href = '/login'
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '8px',
          padding: '24px',
          textAlign: 'center',
        }}>
          <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '12px' }}>
            {this.props.message || 'This section failed to load'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '8px 16px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: '#ef4444',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
