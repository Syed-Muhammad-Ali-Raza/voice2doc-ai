import Stripe from 'stripe'
import { db } from '../db.js'

export type PaidPlan = 'pro' | 'business'

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(key)
}

export function priceIdForPlan(plan: PaidPlan): string | null {
  if (plan === 'pro') return process.env.STRIPE_PRICE_PRO || null
  if (plan === 'business') return process.env.STRIPE_PRICE_BUSINESS || null
  return null
}

export function planFromPriceId(priceId: string | undefined | null): PaidPlan | 'free' {
  if (!priceId) return 'free'
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro'
  if (priceId === process.env.STRIPE_PRICE_BUSINESS) return 'business'
  return 'free'
}

export function appUrl(): string {
  return (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '')
}

/** Ensure SQLite columns exist for Stripe (safe on existing DBs). */
export function migrateBillingColumns() {
  const cols = db.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>
  const names = new Set(cols.map((c) => c.name))
  const add = (name: string, ddl: string) => {
    if (!names.has(name)) db.exec(`ALTER TABLE users ADD COLUMN ${ddl}`)
  }
  add('stripe_customer_id', 'stripe_customer_id TEXT')
  add('stripe_subscription_id', 'stripe_subscription_id TEXT')
  add('stripe_status', 'stripe_status TEXT')
}

export function setUserPlan(
  userId: string,
  plan: string,
  extras?: {
    stripeCustomerId?: string | null
    stripeSubscriptionId?: string | null
    stripeStatus?: string | null
  },
) {
  const current = db
    .prepare(
      'SELECT stripe_customer_id, stripe_subscription_id, stripe_status FROM users WHERE id = ?',
    )
    .get(userId) as
    | {
        stripe_customer_id: string | null
        stripe_subscription_id: string | null
        stripe_status: string | null
      }
    | undefined

  if (!current) return

  db.prepare(
    `UPDATE users SET
      plan = ?,
      stripe_customer_id = ?,
      stripe_subscription_id = ?,
      stripe_status = ?
     WHERE id = ?`,
  ).run(
    plan,
    extras?.stripeCustomerId === undefined ? current.stripe_customer_id : extras.stripeCustomerId,
    extras?.stripeSubscriptionId === undefined
      ? current.stripe_subscription_id
      : extras.stripeSubscriptionId,
    extras?.stripeStatus === undefined ? current.stripe_status : extras.stripeStatus,
    userId,
  )
}

export async function ensureStripeCustomer(userId: string, email: string, name: string): Promise<string> {
  const row = db
    .prepare('SELECT stripe_customer_id FROM users WHERE id = ?')
    .get(userId) as { stripe_customer_id: string | null }

  if (row?.stripe_customer_id) return row.stripe_customer_id

  const stripe = getStripe()
  const customer = await stripe.customers.create({
    email,
    name,
    metadata: { userId },
  })
  db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customer.id, userId)
  return customer.id
}
