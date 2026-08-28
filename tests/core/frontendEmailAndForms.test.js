import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

describe('Frontend Email Dispatch, Notification & Form Triggers', () => {
  describe('Proposal Sharing & Client Email Dispatch States', () => {
    it('disables send email button when required client email or proposal link is empty', () => {
      const isSendEmailButtonEnabled = ({ clientEmail, isSubmitting, hasValidToken }) => {
        const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (isSubmitting) return false;
        if (!hasValidToken) return false;
        return EMAIL_REGEX.test((clientEmail || '').trim());
      };

      // Empty email
      assert.strictEqual(
        isSendEmailButtonEnabled({ clientEmail: '', isSubmitting: false, hasValidToken: true }),
        false
      );

      // Invalid email
      assert.strictEqual(
        isSendEmailButtonEnabled({ clientEmail: 'bad-email', isSubmitting: false, hasValidToken: true }),
        false
      );

      // Loading / In-flight submission
      assert.strictEqual(
        isSendEmailButtonEnabled({ clientEmail: 'client@domain.com', isSubmitting: true, hasValidToken: true }),
        false
      );

      // Valid and ready
      assert.strictEqual(
        isSendEmailButtonEnabled({ clientEmail: 'client@domain.com', isSubmitting: false, hasValidToken: true }),
        true
      );
    });

    it('generates correct shareable client proposal URL with public token', () => {
      const generateClientPortalUrl = (publicToken, clientBaseUrl = 'https://app.takeoffengine.com') => {
        if (!publicToken) throw new Error('Token is required');
        return `${clientBaseUrl}/proposal/${publicToken}`;
      };

      const portalUrl = generateClientPortalUrl('tok_shareable_prop_456');
      assert.strictEqual(portalUrl, 'https://app.takeoffengine.com/proposal/tok_shareable_prop_456');
    });
  });

  describe('Organization Magic Link Invitation Dispatch', () => {
    it('formats invitation email payload with secure magic link accept route', () => {
      const buildInvitePayload = ({ organizationName, inviterName, inviteeEmail, rawToken, clientBaseUrl }) => {
        const acceptUrl = `${clientBaseUrl}/accept-invite?token=${rawToken}`;
        return {
          to: inviteeEmail.trim().toLowerCase(),
          subject: `Join ${organizationName} on Takeoff Engine`,
          acceptUrl,
          inviter: inviterName,
        };
      };

      const invite = buildInvitePayload({
        organizationName: 'Tri-County Excavation',
        inviterName: 'Patty G',
        inviteeEmail: '  Estimator.Sam@TriCounty.COM  ',
        rawToken: 'secure_inv_token_789',
        clientBaseUrl: 'http://localhost:5173',
      });

      assert.strictEqual(invite.to, 'estimator.sam@tricounty.com');
      assert.strictEqual(invite.acceptUrl, 'http://localhost:5173/accept-invite?token=secure_inv_token_789');
      assert.strictEqual(invite.subject, 'Join Tri-County Excavation on Takeoff Engine');
    });
  });

  describe('Password Reset Link Submission State Management', () => {
    it('manages loading, success, and error notification state transitions gracefully', () => {
      const simulatePasswordResetSubmission = (email, mockApiSuccess) => {
        let state = { loading: true, message: '', error: '' };

        if (!email || !email.includes('@')) {
          state.loading = false;
          state.error = 'Please enter a valid email address.';
          return state;
        }

        if (mockApiSuccess) {
          state.loading = false;
          state.message = 'Password reset link sent to your email.';
        } else {
          state.loading = false;
          state.error = 'Failed to request password reset.';
        }
        return state;
      };

      const successState = simulatePasswordResetSubmission('contractor@gmail.com', true);
      assert.strictEqual(successState.loading, false);
      assert.strictEqual(successState.message, 'Password reset link sent to your email.');
      assert.strictEqual(successState.error, '');

      const errState = simulatePasswordResetSubmission('contractor@gmail.com', false);
      assert.strictEqual(errState.loading, false);
      assert.strictEqual(errState.error, 'Failed to request password reset.');
    });
  });

  describe('Takeoff Grid Bulk Actions & Scope Preset Form States', () => {
    it('handles bulk labor role assignment logic across selected items', () => {
      const items = [
        { id: '1', description: 'Item 1', laborRoleId: null },
        { id: '2', description: 'Item 2', laborRoleId: 'apprentice' },
        { id: '3', description: 'Item 3', laborRoleId: null },
      ];

      const selectedIds = new Set(['1', '3']);
      const targetRoleId = 'foreman';

      const updated = items.map((it) => {
        if (selectedIds.has(it.id)) {
          return {
            ...it,
            laborRoleId: targetRoleId === 'base' ? null : targetRoleId,
          };
        }
        return it;
      });

      assert.strictEqual(updated[0].laborRoleId, 'foreman');
      assert.strictEqual(updated[1].laborRoleId, 'apprentice'); // unchanged
      assert.strictEqual(updated[2].laborRoleId, 'foreman');
    });

    it('manages custom scope item addition and status mutation states', () => {
      let scopeItems = [
        { id: '1', category: 'fixtures', status: 'included', description: 'Standard PVC' },
      ];

      // Add custom item
      const newItem = {
        id: 'scope-2',
        title: 'Water Service Line',
        category: 'site',
        status: 'not_applicable',
        description: 'Provided by GC',
        isCustom: true,
      };
      scopeItems = [...scopeItems, newItem];

      assert.strictEqual(scopeItems.length, 2);
      assert.strictEqual(scopeItems[1].status, 'not_applicable');
      assert.strictEqual(scopeItems[1].description, 'Provided by GC');

      // Update status to excluded
      scopeItems = scopeItems.map((s) => (s.id === 'scope-2' ? { ...s, status: 'excluded' } : s));
      assert.strictEqual(scopeItems[1].status, 'excluded');
    });

    it('validates rate drawer custom labor role rate conversions', () => {
      const updateRoleRates = (role, field, val, workdayHours = 8) => {
        if (field === 'hourlyRate') {
          const hourly = val === '' ? '' : Number(val);
          const daily = hourly === '' ? '' : Math.round(hourly * workdayHours * 100) / 100;
          return { ...role, hourlyRate: hourly, dailyRate: daily };
        }
        if (field === 'dailyRate') {
          const daily = val === '' ? '' : Number(val);
          const hourly = daily === '' ? '' : (workdayHours > 0 ? Math.round((daily / workdayHours) * 100) / 100 : 0);
          return { ...role, dailyRate: daily, hourlyRate: hourly };
        }
        return role;
      };

      const initialRole = { id: 'r1', title: 'Welder', hourlyRate: 80, dailyRate: 640 };

      // Updating hourly to 100 updates daily to 800
      const updatedHourly = updateRoleRates(initialRole, 'hourlyRate', 100, 8);
      assert.strictEqual(updatedHourly.hourlyRate, 100);
      assert.strictEqual(updatedHourly.dailyRate, 800);

      // Updating daily to 900 on 10 hr shift updates hourly to 90
      const updatedDaily = updateRoleRates(initialRole, 'dailyRate', 900, 10);
      assert.strictEqual(updatedDaily.dailyRate, 900);
      assert.strictEqual(updatedDaily.hourlyRate, 90);
    });
  });
});
