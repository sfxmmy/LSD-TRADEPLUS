import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function POST(request) {
  try {
    // Get auth token from cookies
    const authHeader = request.headers.get('cookie')
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            cookie: authHeader || ''
          }
        }
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()

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
      .select('customer_id')
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

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ 
        price: process.env.STRIPE_PRICE_ID, 
        quantity: 1 
      }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
      subscription_data: {
        metadata: { supabase_user_id: user.id }
      }
    })

    return NextResponse.json({ url: session.url })

  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
