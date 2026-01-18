export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <img src="/logo.svg" alt="TradeSave+" style={{ height: '50px', width: 'auto', marginBottom: '16px' }} />
        <div style={{ color: '#888' }}>Loading...</div>
      </div>
    </div>
  )
}
