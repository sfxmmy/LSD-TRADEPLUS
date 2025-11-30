import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  console.log('Middleware hit:', request.nextUrl.pathname)
  
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

    const protectedPaths = ['/dashboard', '/account']
    const isProtectedPath = protectedPaths.some(path => 
      request.nextUrl.pathname.startsWith(path)
    )

    if (isProtectedPath && !user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (isProtectedPath && user) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single()

      if (error || !profile) {
        console.error('Profile error:', error)
        return NextResponse.redirect(new URL('/pricing', request.url))
      }

      if (profile.subscription_status !== 'active') {
        return NextResponse.redirect(new URL('/pricing', request.url))
      }
    }

    if (request.nextUrl.pathname === '/login' && user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single()

      if (!profile) {
        return NextResponse.redirect(new URL('/pricing', request.url))
      }

      if (profile.subscription_status === 'active') {
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