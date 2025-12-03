'use client'

import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Create supabase client once
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let mounted = true
    let timeoutId = null

    // Failsafe - never stay loading forever
    timeoutId = setTimeout(() => {
      if (mounted) {
        console.log('Auth timeout - forcing loading to false')
        setLoading(false)
      }
    }, 2000)

    const initAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setLoading(false)
          return
        }

        if (!session?.user) {
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }

        setUser(session.user)
        
        // Try to get profile, but don't fail if it doesn't exist
        try {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (mounted) {
            setProfile(profileData || null)
          }
        } catch (profileError) {
          console.log('Profile not found, will be created on first action')
        }
        
        if (mounted) {
          setLoading(false)
        }
      } catch (err) {
        console.error('Auth init error:', err)
        if (mounted) {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event)
      
      if (!mounted) return
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }

      setUser(session.user)
      
      // Get profile
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        
        if (mounted) {
          setProfile(profileData || null)
        }
      } catch (err) {
        console.log('Profile fetch error:', err)
      }
      
      if (mounted) {
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [supabase])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  // Admin email gets full access
  const isAdmin = user?.email === 'ssiagos@hotmail.com'
  const isPro = profile?.subscription_status === 'active'
  const hasAccess = isAdmin || isPro

  const value = {
    user,
    profile,
    loading,
    signOut,
    isPro,
    isAdmin,
    hasAccess,
    supabase
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
