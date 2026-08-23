import { describe, it } from 'node:test';
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
});
