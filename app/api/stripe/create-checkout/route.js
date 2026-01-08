import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function POST(request) {
  try {
    // Get site URL - fallback to production URL if env var not set
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://lsdtradeplus.com'

    // Get auth token from Authorization header
    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

    // Get or create Stripe customer
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: profile } = await serviceSupabase
      .from('profiles')
      .select('customer_id, subscription_start, subscription_id')
      .eq('id', user.id)
      .single()

    let customerId = profile?.customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id }
      })
      customerId = customer.id

      await serviceSupabase
        .from('profiles')
        .update({ customer_id: customerId })
        .eq('id', user.id)
    }

    // Check if user has ever subscribed before (no trial for returning users)
    const hasSubscribedBefore = !!(profile?.subscription_start || profile?.subscription_id)

    // Create checkout session - only include trial for first-time subscribers
    const subscriptionData = {
      metadata: { supabase_user_id: user.id }
    }

    // Only add trial for new users who have never subscribed
    if (!hasSubscribedBefore) {
      subscriptionData.trial_period_days = 7
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: `${siteUrl}/dashboard?success=true`,
      cancel_url: `${siteUrl}/pricing`,
      subscription_data: subscriptionData
    })

    return NextResponse.json({ url: session.url })

  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
