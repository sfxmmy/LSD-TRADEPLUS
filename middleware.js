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

  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes that require login
  const protectedPaths = ['/dashboard', '/account']
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  // If accessing protected route without auth, redirect to login
  if (isProtectedPath && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If accessing protected route, check subscription status
  if (isProtectedPath && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    // Redirect to pricing if not subscribed (dashboard and account require subscription)
    if (profile?.subscription_status !== 'active') {
      return NextResponse.redirect(new URL('/pricing', request.url))
    }
  }

  // Redirect logged in users away from login page
  if (request.nextUrl.pathname === '/login' && user) {
    // Check subscription and redirect accordingly
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    if (profile?.subscription_status === 'active') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/pricing', request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/account/:path*', '/login'],
}