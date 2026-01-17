'use client'

// Loading screen with TRADESAVE+ branding
// Used across dashboard and account pages

export function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '40px',
          fontWeight: 700,
          marginBottom: '16px'
        }}>
          <span style={{ color: '#22c55e' }}>TRADE</span>
          <span style={{ color: '#fff' }}>SAVE</span>
          <span style={{ color: '#22c55e' }}>+</span>
        </div>
        <div style={{ color: '#999' }}>{message}</div>
      </div>
    </div>
  )
}

export default LoadingScreen
