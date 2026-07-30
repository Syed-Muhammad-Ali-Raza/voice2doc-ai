import { Router } from 'express'
import { z } from 'zod'
import { db } from '../db.js'
import type { AuthedRequest } from '../middleware/auth.js'
import {
  appUrl,
  ensureStripeCustomer,
  getStripe,
  isStripeConfigured,
  planFromPriceId,
  priceIdForPlan,
  setUserPlan,
  type PaidPlan,
} from '../lib/stripe.js'

export const billingRouter = Router()

const planSchema = z.object({
  plan: z.enum(['free', 'pro', 'business']),
})

billingRouter.get('/config', (_req, res) => {
  res.json({
    stripeEnabled: isStripeConfigured(),
    pricesConfigured: {
      pro: Boolean(process.env.STRIPE_PRICE_PRO),
      business: Boolean(process.env.STRIPE_PRICE_BUSINESS),
    },
  })
})

billingRouter.get('/entitlements', (req: AuthedRequest, res) => {
  const row = db
    .prepare(
      `SELECT plan, trials_used, trials_limit, stripe_customer_id, stripe_subscription_id, stripe_status
       FROM users WHERE id = ?`,
    )
    .get(req.user!.sub) as
    | {
        plan: string
        trials_used: number
        trials_limit: number
        stripe_customer_id: string | null
        stripe_subscription_id: string | null
        stripe_status: string | null
      }
    | undefined
  if (!row) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  res.json({
    plan: row.plan,
    trialsUsed: row.trials_used,
    trialsLimit: row.trials_limit,
    unlimitedAi: row.plan === 'pro' || row.plan === 'business',
    stripeEnabled: isStripeConfigured(),
    stripeStatus: row.stripe_status,
    hasStripeCustomer: Boolean(row.stripe_customer_id),
  })
})

/**
 * Paid plans → Stripe Checkout when configured.
 * Free → cancel subscription (Stripe) or local downgrade.
 * Without Stripe keys → local demo plan switch (Phase 1 compat).
 */
billingRouter.post('/checkout', async (req: AuthedRequest, res) => {
  const parsed = planSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid plan' })
    return
  }

  const user = db
    .prepare('SELECT id, email, name, plan, stripe_customer_id, stripe_subscription_id FROM users WHERE id = ?')
    .get(req.user!.sub) as
    | {
        id: string
        email: string
        name: string
        plan: string
        stripe_customer_id: string | null
        stripe_subscription_id: string | null
      }
    | undefined

  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  const target = parsed.data.plan

  if (!isStripeConfigured()) {
    setUserPlan(user.id, target, {
      stripeStatus: target === 'free' ? null : 'local',
      stripeSubscriptionId: null,
    })
    res.json({ url: null, plan: target, mode: 'local' })
    return
  }

  if (target === 'free') {
    try {
      if (user.stripe_subscription_id) {
        const stripe = getStripe()
        await stripe.subscriptions.cancel(user.stripe_subscription_id)
      }
    } catch (err) {
      console.error('Stripe cancel failed', err)
    }
    setUserPlan(user.id, 'free', {
      stripeSubscriptionId: null,
      stripeStatus: 'canceled',
    })
    res.json({ url: null, plan: 'free', mode: 'stripe' })
    return
  }

  const priceId = priceIdForPlan(target as PaidPlan)
  if (!priceId) {
    res.status(400).json({
      error: `Missing STRIPE_PRICE_${target.toUpperCase()} in server/.env`,
    })
    return
  }

  try {
    const stripe = getStripe()
    const customerId = await ensureStripeCustomer(user.id, user.email, user.name)
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl()}/app/billing?checkout=success&plan=${target}`,
      cancel_url: `${appUrl()}/app/billing?checkout=cancel`,
      metadata: { userId: user.id, plan: target },
      subscription_data: {
        metadata: { userId: user.id, plan: target },
      },
      allow_promotion_codes: true,
    })
    res.json({ url: session.url, plan: target, mode: 'stripe' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Checkout failed' })
  }
})

billingRouter.post('/portal', async (req: AuthedRequest, res) => {
  if (!isStripeConfigured()) {
    res.status(400).json({ error: 'Stripe is not configured' })
    return
  }
  const user = db
    .prepare('SELECT email, name, stripe_customer_id FROM users WHERE id = ?')
    .get(req.user!.sub) as { email: string; name: string; stripe_customer_id: string | null }

  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }

  try {
    const stripe = getStripe()
    const customerId =
      user.stripe_customer_id || (await ensureStripeCustomer(req.user!.sub, user.email, user.name))
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl()}/app/billing`,
    })
    res.json({ url: portal.url })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Portal failed' })
  }
})

export async function handleStripeWebhook(rawBody: Buffer, signature: string | undefined) {
  if (!isStripeConfigured()) throw new Error('Stripe not configured')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  if (!signature) throw new Error('Missing stripe-signature header')

  const stripe = getStripe()
  const event = stripe.webhooks.constructEvent(rawBody, signature, secret)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const userId = session.metadata?.userId
      const plan = (session.metadata?.plan as string) || 'pro'
      if (userId) {
        setUserPlan(userId, plan, {
          stripeCustomerId: typeof session.customer === 'string' ? session.customer : null,
          stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
          stripeStatus: 'active',
        })
      }
      break
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub = event.data.object
      const userId = sub.metadata?.userId
      const priceId = sub.items.data[0]?.price?.id
      const plan = (sub.metadata?.plan as string) || planFromPriceId(priceId)
      const status = sub.status
      const active = status === 'active' || status === 'trialing'
      if (userId) {
        setUserPlan(userId, active ? plan : 'free', {
          stripeCustomerId: typeof sub.customer === 'string' ? sub.customer : null,
          stripeSubscriptionId: sub.id,
          stripeStatus: status,
        })
      } else if (typeof sub.customer === 'string') {
        const row = db
          .prepare('SELECT id FROM users WHERE stripe_customer_id = ?')
          .get(sub.customer) as { id: string } | undefined
        if (row) {
          setUserPlan(row.id, active ? plan : 'free', {
            stripeSubscriptionId: sub.id,
            stripeStatus: status,
          })
        }
      }
      break
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const userId = sub.metadata?.userId
      if (userId) {
        setUserPlan(userId, 'free', {
          stripeSubscriptionId: null,
          stripeStatus: 'canceled',
        })
      } else if (typeof sub.customer === 'string') {
        const row = db
          .prepare('SELECT id FROM users WHERE stripe_customer_id = ?')
          .get(sub.customer) as { id: string } | undefined
        if (row) {
          setUserPlan(row.id, 'free', {
            stripeSubscriptionId: null,
            stripeStatus: 'canceled',
          })
        }
      }
      break
    }
    default:
      break
  }

  return { received: true }
}
