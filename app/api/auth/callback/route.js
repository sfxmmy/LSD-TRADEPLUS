import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(`${origin}/login?error=oauth_error`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Exchange code for session
    const { data: { session }, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError || !session) {
      console.error('Code exchange error:', exchangeError)
      return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
    }

    const user = session.user
    const providerToken = session.provider_token

    // Check if this is a Discord login
    if (user.app_metadata?.provider === 'discord' && providerToken) {
      // Check if user is in the Discord server
      const discordGuildId = process.env.DISCORD_GUILD_ID

      if (discordGuildId) {
        try {
          // Get user's guilds from Discord API
          const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: {
              'Authorization': `Bearer ${providerToken}`
            }
          })

          if (guildsResponse.ok) {
            const guilds = await guildsResponse.json()
            const isMember = guilds.some(guild => guild.id === discordGuildId)

            // Create service client for admin operations
            const serviceSupabase = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL,
              process.env.SUPABASE_SERVICE_ROLE_KEY
            )

            if (isMember) {
              // User is a Discord member - give them free access
              await serviceSupabase
                .from('profiles')
                .upsert({
                  id: user.id,
                  email: user.email,
                  username: user.user_metadata?.full_name || user.email?.split('@')[0],
                  subscription_status: 'active',
                  updated_at: new Date().toISOString()
                }, { onConflict: 'id' })

              return NextResponse.redirect(`${origin}/dashboard`)
            } else {
              // User is NOT a Discord member - show error
              await serviceSupabase
                .from('profiles')
                .upsert({
                  id: user.id,
                  email: user.email,
                  username: user.user_metadata?.full_name || user.email?.split('@')[0],
                  subscription_status: 'free',
                  updated_at: new Date().toISOString()
                }, { onConflict: 'id' })

              // Sign out the user since they don't have access
              await supabase.auth.signOut()
              return NextResponse.redirect(`${origin}/discord-login?error=not_member`)
            }
          }
        } catch (discordError) {
          console.error('Discord API error:', discordError)
          // Continue without server check if Discord API fails
        }
      }
    }

    // For non-Discord logins or if guild check wasn't configured
    // Create/update profile and check subscription
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get existing profile to preserve subscription status
    const { data: existingProfile } = await serviceSupabase
      .from('profiles')
      .select('subscription_status, is_admin')
      .eq('id', user.id)
      .single()

    // Determine subscription status (preserve existing, default to free for new users)
    let subscriptionStatus = existingProfile?.subscription_status || 'free'

    // Upsert profile (preserve is_admin if exists)
    await serviceSupabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        username: user.user_metadata?.full_name || user.email?.split('@')[0],
        subscription_status: subscriptionStatus,
        is_admin: existingProfile?.is_admin || false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    // Redirect based on access (admin or active subscription goes to dashboard)
    if (existingProfile?.is_admin || subscriptionStatus === 'active') {
      return NextResponse.redirect(`${origin}/dashboard`)
    } else {
      return NextResponse.redirect(`${origin}/pricing`)
    }

  } catch (err) {
    console.error('Auth callback error:', err)
    return NextResponse.redirect(`${origin}/login?error=callback_failed`)
  }
}
