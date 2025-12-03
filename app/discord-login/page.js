'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DiscordLoginPage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/login')
  }, [router])

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0a0f', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      color: '#666' 
    }}>
      Redirecting...
    </div>
  )
}
