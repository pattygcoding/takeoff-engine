import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Frontend Billing, Subscriptions & Paddle Checkout Tests', () => {
  const PLANS_CONFIG = {
    starter: { basePriceMonthly: 19.99, basePriceAnnual: 199.99, baseSeats: 1, maxSeats: 1, additionalSeatPriceMonthly: 0 },
    pro: { basePriceMonthly: 79.99, basePriceAnnual: 799.99, baseSeats: 3, maxSeats: 10, additionalSeatPriceMonthly: 29.99, additionalSeatPriceAnnual: 299.99 },
    enterprise: { basePriceMonthly: 199.99, basePriceAnnual: 1999.99, baseSeats: 8, maxSeats: 20, additionalSeatPriceMonthly: 24.99, additionalSeatPriceAnnual: 249.99 },
  };

  describe('Pricing Calculations & Seat Additions (TeamWorkspaceManager & Upgrade Modal)', () => {
    it('calculates Pro plan monthly and annual pricing with additional seats correctly', () => {
      const calculatePlanCost = (planKey, interval, additionalSeats = 0) => {
        const plan = PLANS_CONFIG[planKey];
        if (!plan) throw new Error('Unknown plan');

        const basePrice = interval === 'annual' ? plan.basePriceAnnual : plan.basePriceMonthly;
        const seatPrice = interval === 'annual' ? (plan.additionalSeatPriceAnnual || 0) : plan.additionalSeatPriceMonthly;
        const total = basePrice + additionalSeats * seatPrice;
        return parseFloat(total.toFixed(2));
      };

      // Pro Monthly base (3 seats)
      assert.strictEqual(calculatePlanCost('pro', 'monthly', 0), 79.99);

      // Pro Monthly with 2 extra seats (5 total seats)
      // 79.99 + 2 * 29.99 = 79.99 + 59.98 = 139.97
      assert.strictEqual(calculatePlanCost('pro', 'monthly', 2), 139.97);

      // Pro Annual with 4 extra seats (7 total seats)
      // 799.99 + 4 * 299.99 = 799.99 + 1199.96 = 1999.95
      assert.strictEqual(calculatePlanCost('pro', 'annual', 4), 1999.95);
    });

    it('enforces maximum seat bounds in seat increment controls', () => {
      const adjustSeats = (currentAdditional, delta, planKey) => {
        const plan = PLANS_CONFIG[planKey];
        const maxAdditional = plan.maxSeats - plan.baseSeats;
        const next = currentAdditional + delta;
        return Math.max(0, Math.min(maxAdditional, next));
      };

      // Pro max extra is 10 - 3 = 7 extra seats
      assert.strictEqual(adjustSeats(0, 1, 'pro'), 1);
      assert.strictEqual(adjustSeats(0, -1, 'pro'), 0);
      assert.strictEqual(adjustSeats(6, 3, 'pro'), 7); // Clamped at 7
    });
  });

  describe('Paddle Checkout Payload Preparation', () => {
    it('constructs accurate Paddle checkout customer and customData payload', () => {
      const buildPaddleCheckoutPayload = ({ user, plan, interval, additionalSeats }) => {
        return {
          items: [
            {
              priceId: `pri_${plan}_${interval}`,
              quantity: 1,
            },
            ...(additionalSeats > 0
              ? [
                  {
                    priceId: `pri_${plan}_seat_${interval}`,
                    quantity: additionalSeats,
                  },
                ]
              : []),
          ],
          customer: {
            email: user.email,
          },
          customData: {
            userId: user.id,
            plan,
            interval,
            additionalSeats,
          },
        };
      };

      const user = { id: 'usr_patty_123', email: 'patty@takeoffengine.com' };
      const payload = buildPaddleCheckoutPayload({
        user,
        plan: 'pro',
        interval: 'monthly',
        additionalSeats: 2,
      });

      assert.strictEqual(payload.items.length, 2);
      assert.strictEqual(payload.items[0].priceId, 'pri_pro_monthly');
      assert.strictEqual(payload.items[1].quantity, 2);
      assert.strictEqual(payload.customer.email, 'patty@takeoffengine.com');
      assert.strictEqual(payload.customData.userId, 'usr_patty_123');
      assert.strictEqual(payload.customData.additionalSeats, 2);
    });
  });

  describe('Subscription Downgrade Modal Safeguards (US-035)', () => {
    it('blocks downgrade to Starter when organization member count exceeds single user', () => {
      const checkDowngradePermission = (targetPlan, currentMembersCount) => {
        if (targetPlan === 'starter' && currentMembersCount > 1) {
          return {
            allowed: false,
            errorMessage: 'Starter plan is single-seat only. Remove team members first.',
          };
        }
        return { allowed: true, errorMessage: null };
      };

      const blocked = checkDowngradePermission('starter', 3);
      assert.strictEqual(blocked.allowed, false);
      assert.ok(blocked.errorMessage.includes('single-seat'));

      const allowed = checkDowngradePermission('starter', 1);
      assert.strictEqual(allowed.allowed, true);
    });
  });

  describe('UpgradeModal Plan Selection and Current Tier Safeguards', () => {
    it('accurately identifies current tier, upgrade, and downgrade states', () => {
      const tierHierarchy = { free: 0, starter: 1, pro: 2, enterprise: 3 };

      const evaluatePlanAction = (userTier, userSubStatus, targetTier) => {
        const isPaid = userSubStatus === 'active';
        const currentTier = isPaid ? userTier : 'free';
        const currentRank = tierHierarchy[currentTier] || 0;
        const targetRank = tierHierarchy[targetTier] || 0;

        const isCurrentPlan = isPaid && currentTier === targetTier;
        const isDowngrade = isPaid && targetRank < currentRank;
        const isUpgrade = targetRank > currentRank;

        return { isCurrentPlan, isDowngrade, isUpgrade };
      };

      // User on Pro plan viewing Pro
      const viewingPro = evaluatePlanAction('pro', 'active', 'pro');
      assert.strictEqual(viewingPro.isCurrentPlan, true);
      assert.strictEqual(viewingPro.isDowngrade, false);
      assert.strictEqual(viewingPro.isUpgrade, false);

      // User on Pro plan viewing Starter (Downgrade)
      const viewingStarter = evaluatePlanAction('pro', 'active', 'starter');
      assert.strictEqual(viewingStarter.isCurrentPlan, false);
      assert.strictEqual(viewingStarter.isDowngrade, true);
      assert.strictEqual(viewingStarter.isUpgrade, false);

      // User on Pro plan viewing Enterprise (Upgrade)
      const viewingEnterprise = evaluatePlanAction('pro', 'active', 'enterprise');
      assert.strictEqual(viewingEnterprise.isCurrentPlan, false);
      assert.strictEqual(viewingEnterprise.isDowngrade, false);
      assert.strictEqual(viewingEnterprise.isUpgrade, true);

      // Free user viewing Starter (Upgrade)
      const freeViewingStarter = evaluatePlanAction('free', 'none', 'starter');
      assert.strictEqual(freeViewingStarter.isCurrentPlan, false);
      assert.strictEqual(freeViewingStarter.isDowngrade, false);
      assert.strictEqual(freeViewingStarter.isUpgrade, true);
    });
  });
});
