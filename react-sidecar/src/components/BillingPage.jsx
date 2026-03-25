import { useEffect, useMemo, useState } from 'react'
import AppHeader from './AppHeader'
import { getCurrentUser } from '../lib/auth'
import {
  getParentSubscription,
  getSubscriptionTiers,
  upsertParentSubscription,
  getParentCredits
} from '../lib/data'

function getCurrentPeriodWindow() {
  const now = new Date()
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))

  return {
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd: periodEnd.toISOString().slice(0, 10)
  }
}

export default function BillingPage() {
  const [user, setUser] = useState(null)
  const [tiers, setTiers] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [creditSummary, setCreditSummary] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const period = useMemo(() => getCurrentPeriodWindow(), [])

  const [formState, setFormState] = useState({
    tier: 'low',
    status: 'active',
    current_period_start: period.periodStart,
    current_period_end: period.periodEnd,
    cancel_at_period_end: false
  })

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          setError('Please sign in to continue.')
          return
        }

        const [tiersData, subscriptionData, parentCredits] = await Promise.all([
          getSubscriptionTiers(),
          getParentSubscription(currentUser.id),
          getParentCredits(currentUser.id)
        ])

        if (!mounted) return

        setUser(currentUser)
        setTiers(tiersData)
        setSubscription(subscriptionData)
        setCreditSummary({ credits_available: parentCredits ?? 0 })

        if (subscriptionData) {
          setFormState({
            tier: subscriptionData.tier || 'low',
            status: subscriptionData.status || 'active',
            current_period_start: subscriptionData.current_period_start || period.periodStart,
            current_period_end: subscriptionData.current_period_end || period.periodEnd,
            cancel_at_period_end: Boolean(subscriptionData.cancel_at_period_end)
          })
        }
      } catch (loadError) {
        if (!mounted) return
        setError(loadError.message || 'Failed to load billing data')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()

    return () => {
      mounted = false
    }
  }, [period.periodEnd, period.periodStart])

  async function handleSaveSubscription(event) {
    event.preventDefault()
    if (!user) return

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const saved = await upsertParentSubscription({
        parent_id: user.id,
        tier: formState.tier,
        status: formState.status,
        current_period_start: formState.current_period_start,
        current_period_end: formState.current_period_end,
        cancel_at_period_end: formState.cancel_at_period_end
      })

      setSubscription(saved)
      setSuccess('Subscription test profile saved.')
    } catch (saveError) {
      setError(saveError.message || 'Failed to save subscription profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <AppHeader />
      <main className="page-shell">
        <section className="panel hero-panel">
          <h2>Billing & Subscription Lab (No Stripe)</h2>
          <p>
            This environment is configured for manual testing. Choose your tier/profile below. Credits are stored directly on
            <code> parent_profiles.credits </code> and <code> children.credits </code>.
          </p>
        </section>

        {error ? <p className="error-banner">{error}</p> : null}
        {success ? <p className="success-banner">{success}</p> : null}

        <section className="panel">
          <h3>Plan tiers</h3>
          <div className="card-grid tier-grid">
            {tiers.map((tier) => (
              <article className="card" key={tier.tier}>
                <h4>{tier.tier.toUpperCase()}</h4>
                <p>{tier.modules_per_month} module unlock credits / month</p>
                <p>{tier.monthly_price_cents ? `$${(tier.monthly_price_cents / 100).toFixed(2)} / month` : 'Price TBD'}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <h3>Current period wallet</h3>
          <p className="muted">
            {period.periodStart} to {period.periodEnd}
          </p>
          {loading || !creditSummary ? (
            <p className="muted">Loading credit summary...</p>
          ) : (
            <div className="stats-row">
              <div className="stat-box">
                <span className="stat-label">Credits available</span>
                <strong>{creditSummary.credits_available}</strong>
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <h3>Subscription profile (testing)</h3>
          <form className="admin-form" onSubmit={handleSaveSubscription}>
            <label>
              Tier
              <select
                value={formState.tier}
                onChange={(event) => setFormState((prev) => ({ ...prev, tier: event.target.value }))}
              >
                {tiers.map((tier) => (
                  <option key={tier.tier} value={tier.tier}>
                    {tier.tier.toUpperCase()} ({tier.modules_per_month} modules/month)
                  </option>
                ))}
              </select>
            </label>

            <label>
              Status
              <select
                value={formState.status}
                onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value }))}
              >
                <option value="active">active</option>
                <option value="trialing">trialing</option>
                <option value="past_due">past_due</option>
                <option value="paused">paused</option>
                <option value="canceled">canceled</option>
                <option value="inactive">inactive</option>
              </select>
            </label>

            <label>
              Current period start
              <input
                type="date"
                value={formState.current_period_start}
                onChange={(event) => setFormState((prev) => ({ ...prev, current_period_start: event.target.value }))}
                required
              />
            </label>

            <label>
              Current period end
              <input
                type="date"
                value={formState.current_period_end}
                onChange={(event) => setFormState((prev) => ({ ...prev, current_period_end: event.target.value }))}
                required
              />
            </label>

            <label className="checkbox-line">
              <input
                type="checkbox"
                checked={formState.cancel_at_period_end}
                onChange={(event) =>
                  setFormState((prev) => ({
                    ...prev,
                    cancel_at_period_end: event.target.checked
                  }))
                }
              />
              Cancel at period end
            </label>

            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save subscription profile'}
            </button>
          </form>

          <p className="muted">
            {subscription
              ? `Saved tier: ${subscription.tier || 'none'} (${subscription.status})`
              : 'No subscription profile saved yet.'}
          </p>
        </section>

        <section className="panel">
          <h3>Current period ledger entries</h3>
          {ledgerRows.length === 0 ? (
            <p className="muted">No credit entries for this period yet.</p>
          ) : (
            <div className="ledger-table">
              <div className="ledger-row ledger-head">
                <span>When</span>
                <span>Type</span>
                <span>Delta</span>
                <span>Module</span>
                <span>Notes</span>
              </div>
              {ledgerRows.map((row) => (
                <div className="ledger-row" key={row.id}>
                  <span>{new Date(row.created_at).toLocaleString()}</span>
                  <span>{row.entry_type}</span>
                  <span>{row.credits_delta}</span>
                  <span>{row.module_id || '-'}</span>
                  <span>{row.notes || '-'}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  )
}
