import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  try {
    const { data: { user } } = await supabase.auth.getUser()

    // Protected routes - require subscription
    const protectedPaths = ['/dashboard', '/account']
    const isProtectedPath = protectedPaths.some(path => 
      request.nextUrl.pathname.startsWith(path)
    )

    // Not logged in - redirect to login
    if (isProtectedPath && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Logged in - check subscription
    if (isProtectedPath && user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, created_at')
        .eq('id', user.id)
        .single()

      if (!profile) {
        return NextResponse.redirect(new URL('/pricing', request.url))
      }

      // Check if trial is valid (7 days from account creation)
      const trialEndDate = new Date(profile.created_at)
      trialEndDate.setDate(trialEndDate.getDate() + 7)
      const isTrialActive = new Date() < trialEndDate

      // Allow access if: active subscription OR valid trial
      const hasAccess = profile.subscription_status === 'active' || isTrialActive

      if (!hasAccess) {
        return NextResponse.redirect(new URL('/pricing', request.url))
      }
    }

    // Logged in user on login page - redirect based on access
    if (request.nextUrl.pathname === '/login' && user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, created_at')
        .eq('id', user.id)
        .single()

      if (!profile) {
        return NextResponse.redirect(new URL('/pricing', request.url))
      }

      const trialEndDate = new Date(profile.created_at)
      trialEndDate.setDate(trialEndDate.getDate() + 7)
      const isTrialActive = new Date() < trialEndDate
      const hasAccess = profile.subscription_status === 'active' || isTrialActive

      if (hasAccess) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } else {
        return NextResponse.redirect(new URL('/pricing', request.url))
      }
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return response
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/account/:path*', '/login'],
}