import type { UserProfile } from '@/types/models';

/** Paid tiers that grant full access while the subscription is active. */
const PAID_TIERS = new Set(['starter', 'pro', 'enterprise']);

/**
 * True when the account may use every feature without spending trial credits: admins,
 * payment-exempt accounts, anyone flagged with an unlimited bypass, or an active paid plan.
 */
export function hasFullAccess(user: UserProfile | null | undefined): boolean {
  return (
    user?.role === 'admin' ||
    user?.role === 'payment_exempt' ||
    user?.has_unlimited_bypass === true ||
    (user?.subscription_status === 'active' && PAID_TIERS.has(user?.subscription_tier ?? ''))
  );
}

/** Trial credits left before the upgrade prompt appears; profiles without a count default to 5. */
export function remainingTrialCredits(user: UserProfile | null | undefined): number {
  return typeof user?.trial_uses_remaining === 'number' ? user.trial_uses_remaining : 5;
}
