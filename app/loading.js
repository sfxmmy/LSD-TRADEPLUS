export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px', fontWeight: 700 }}>
          <span style={{ color: '#22c55e' }}>TRADE</span><span style={{ color: '#fff' }}>SAVE</span><span style={{ color: '#22c55e' }}>+</span>
        </div>
        <div style={{ color: '#888' }}>Loading...</div>
      </div>
    </div>
  )
}
