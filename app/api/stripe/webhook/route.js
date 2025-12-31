import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Helper to find user by customer ID if metadata is missing
async function findUserByCustomerId(supabase, customerId) {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('customer_id', customerId)
    .single()
  return data?.id
}

export async function POST(request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object

        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription)
          let userId = subscription.metadata?.supabase_user_id

          // Fallback: find user by customer ID if metadata missing
          if (!userId && session.customer) {
            userId = await findUserByCustomerId(supabase, session.customer)
            console.warn(`Metadata missing, found user by customer_id: ${userId}`)
          }

          if (userId) {
            const { error } = await supabase
              .from('profiles')
              .update({
                subscription_status: 'active',
                subscription_id: session.subscription,
                customer_id: session.customer,
                subscription_start: new Date().toISOString(),
                subscription_end: null,
                cancelled_at: null
              })
              .eq('id', userId)

            if (error) {
              console.error(`Failed to activate subscription for ${userId}:`, error)
            } else {
              console.log(`Activated subscription for user ${userId}`)
            }
          } else {
            console.error('checkout.session.completed: Could not find user ID', { session: session.id })
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object
        let userId = subscription.metadata?.supabase_user_id

        if (!userId && subscription.customer) {
          userId = await findUserByCustomerId(supabase, subscription.customer)
        }

        if (userId) {
          const status = subscription.status === 'active' ? 'active' :
                        subscription.status === 'past_due' ? 'past_due' :
                        subscription.status === 'canceled' ? 'cancelled' : subscription.status

          const updateData = { subscription_status: status }

          // If subscription has cancel_at_period_end, store when access ends
          if (subscription.cancel_at_period_end && subscription.current_period_end) {
            updateData.subscription_end = new Date(subscription.current_period_end * 1000).toISOString()
          }

          const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId)

          if (error) {
            console.error(`Failed to update subscription for ${userId}:`, error)
          } else {
            console.log(`Updated subscription status to ${status} for user ${userId}`)
          }
        } else {
          console.error('customer.subscription.updated: Could not find user ID', { sub: subscription.id })
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        let userId = subscription.metadata?.supabase_user_id

        if (!userId && subscription.customer) {
          userId = await findUserByCustomerId(supabase, subscription.customer)
        }

        if (userId) {
          // Set to 'none' - no longer paying, no access
          const { error } = await supabase
            .from('profiles')
            .update({
              subscription_status: 'none',
              subscription_id: null,
              cancelled_at: new Date().toISOString(),
              subscription_end: new Date().toISOString()
            })
            .eq('id', userId)

          if (error) {
            console.error(`Failed to cancel subscription for ${userId}:`, error)
          } else {
            console.log(`Canceled subscription for user ${userId}`)
          }
        } else {
          console.error('customer.subscription.deleted: Could not find user ID', { sub: subscription.id })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const subscriptionId = invoice.subscription

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          let userId = subscription.metadata?.supabase_user_id

          if (!userId && subscription.customer) {
            userId = await findUserByCustomerId(supabase, subscription.customer)
          }

          if (userId) {
            const { error } = await supabase
              .from('profiles')
              .update({ subscription_status: 'past_due' })
              .eq('id', userId)

            if (error) {
              console.error(`Failed to mark past_due for ${userId}:`, error)
            } else {
              console.log(`Payment failed for user ${userId}`)
            }
          } else {
            console.error('invoice.payment_failed: Could not find user ID', { invoice: invoice.id })
          }
        }
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    // Return 500 so Stripe retries
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
