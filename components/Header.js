'use client'

/**
 * Reusable Header Component
 *
 * Usage:
 * <Header>
 *   <a href="/dashboard">Back</a>
 * </Header>
 *
 * Or with center content:
 * <Header centerContent={<DashboardToggle />}>
 *   <a href="/settings">Settings</a>
 * </Header>
 */

// Logo component - shared across all headers
export function Logo({ size = 42 }) {
  // Scale based on size (default 42px height)
  const height = size
  const width = Math.round(size * 3.1) // Aspect ratio of logo is ~3.1:1
  return (
    <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
      <img src="/logo.svg" alt="TradeSave+" height={height} width={width} style={{ display: 'block' }} />
    </a>
  )
}

// Header button style
export const headerButtonStyle = {
  padding: '8px 16px',
  background: '#22c55e',
  borderRadius: '6px',
  color: '#fff',
  fontWeight: 600,
  fontSize: '13px',
  textDecoration: 'none',
  border: 'none',
  cursor: 'pointer'
}

export const headerOutlineButtonStyle = {
  padding: '8px 16px',
  background: 'transparent',
  border: '1px solid #2a2a35',
  borderRadius: '6px',
  color: '#fff',
  fontWeight: 600,
  fontSize: '13px',
  textDecoration: 'none',
  cursor: 'pointer'
}

// Simple header for public pages (login, signup, pricing)
export default function Header({
  children,
  centerContent,
  fixed = false,
  padding = '4px 16px',
  logoSize = 42
}) {
  return (
    <header
      style={{
        ...(fixed && { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: '#0a0a0f' }),
        padding,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #1a1a22'
      }}
    >
      <Logo size={logoSize} />

      {centerContent && (
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {centerContent}
        </div>
      )}

      {children && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {children}
        </div>
      )}
    </header>
  )
}

// Pre-made header variants for common use cases
export function PublicHeader({ showGetStarted = true }) {
  return (
    <Header>
      {showGetStarted && (
        <a href="/pricing" style={headerButtonStyle}>Get Started</a>
      )}
    </Header>
  )
}

export function AuthHeader() {
  return (
    <Header>
      <a href="/pricing" style={headerButtonStyle}>Get Started</a>
    </Header>
  )
}

export function AppHeader({ backTo = '/dashboard', backText = 'Back to Journal' }) {
  return (
    <Header>
      <a href={backTo} style={headerButtonStyle}>{backText}</a>
    </Header>
  )
}
