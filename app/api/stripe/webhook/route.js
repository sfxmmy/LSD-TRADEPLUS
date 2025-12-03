import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

export async function POST(request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return NextResponse.json({ error: 'Webhook error' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const subscription = await stripe.subscriptions.retrieve(session.subscription)
      const userId = subscription.metadata?.supabase_user_id
      if (userId) {
        await supabase.from('profiles').update({ subscription_status: 'active', stripe_subscription_id: session.subscription }).eq('id', userId)
      }
    } else if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object
      const userId = subscription.metadata?.supabase_user_id
      if (userId) {
        await supabase.from('profiles').update({ subscription_status: subscription.status === 'active' ? 'active' : 'past_due' }).eq('id', userId)
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object
      const userId = subscription.metadata?.supabase_user_id
      if (userId) {
        await supabase.from('profiles').update({ subscription_status: 'canceled' }).eq('id', userId)
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
  }

  return NextResponse.json({ received: true })
}
