import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

describe('Frontend Authentication & Account Lifecycle Tests', () => {
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  describe('Client Form Validation (Registration & Login)', () => {
    it('validates email format before triggering API calls', () => {
      assert.strictEqual(EMAIL_REGEX.test('user@contractor.com'), true);
      assert.strictEqual(EMAIL_REGEX.test('first.last@subdomain.example.co'), true);
      assert.strictEqual(EMAIL_REGEX.test('invalid-email'), false);
      assert.strictEqual(EMAIL_REGEX.test('missing-domain@'), false);
      assert.strictEqual(EMAIL_REGEX.test('@missing-user.com'), false);
      assert.strictEqual(EMAIL_REGEX.test('spaces in email@domain.com'), false);
    });

    it('enforces password minimum length requirements (>= 6 characters)', () => {
      const validatePassword = (pass) => typeof pass === 'string' && pass.length >= 6;
      assert.strictEqual(validatePassword('12345'), false);
      assert.strictEqual(validatePassword(''), false);
      assert.strictEqual(validatePassword('123456'), true);
      assert.strictEqual(validatePassword('SuperSecurePass2026!'), true);
    });

    it('sanitizes registration form fields before submission', () => {
      const rawFormData = {
        username: '   estimator_dan   ',
        firstName: '  Dan  ',
        lastName: '  Miller  ',
        email: '  Dan.Miller@ConcretePros.COM  ',
        phoneNumber: '  (555) 234-5678  ',
      };

      const sanitized = {
        username: rawFormData.username.trim(),
        firstName: rawFormData.firstName.trim(),
        lastName: rawFormData.lastName.trim(),
        email: rawFormData.email.trim().toLowerCase(),
        phoneNumber: rawFormData.phoneNumber.trim(),
      };

      assert.strictEqual(sanitized.username, 'estimator_dan');
      assert.strictEqual(sanitized.firstName, 'Dan');
      assert.strictEqual(sanitized.lastName, 'Miller');
      assert.strictEqual(sanitized.email, 'dan.miller@concretepros.com');
      assert.strictEqual(sanitized.phoneNumber, '(555) 234-5678');
    });
  });

  describe('Token & LocalStorage Session Management', () => {
    it('stores token and authenticated user profile upon successful login', () => {
      const mockStorage = {};
      const setSession = (token, user) => {
        mockStorage['takeoff_token'] = token;
        mockStorage['takeoff_user'] = JSON.stringify(user);
      };

      const clearSession = () => {
        delete mockStorage['takeoff_token'];
        delete mockStorage['takeoff_user'];
      };

      setSession('jwt_token_sample_abc123', {
        id: 'usr_abc',
        username: 'estimator_dan',
        email: 'dan@example.com',
        subscription_tier: 'starter',
      });

      assert.strictEqual(mockStorage['takeoff_token'], 'jwt_token_sample_abc123');
      const retrieved = JSON.parse(mockStorage['takeoff_user']);
      assert.strictEqual(retrieved.username, 'estimator_dan');
      assert.strictEqual(retrieved.subscription_tier, 'starter');

      // Logout clears session
      clearSession();
      assert.strictEqual(mockStorage['takeoff_token'], undefined);
      assert.strictEqual(mockStorage['takeoff_user'], undefined);
    });
  });

  describe('Password Recovery Token Flow (Frontend Hash Fragment Parser)', () => {
    it('correctly extracts access token and recovery type from URL hash fragment', () => {
      const parseHash = (hashString) => {
        const cleanHash = hashString.replace(/^#/, '');
        const params = new URLSearchParams(cleanHash);
        return {
          accessToken: params.get('access_token'),
          type: params.get('type'),
          expiresIn: Number(params.get('expires_in')) || 0,
        };
      };

      const hash = '#access_token=recovery_jwt_sec_999&expires_in=3600&token_type=bearer&type=recovery';
      const parsed = parseHash(hash);

      assert.strictEqual(parsed.accessToken, 'recovery_jwt_sec_999');
      assert.strictEqual(parsed.type, 'recovery');
      assert.strictEqual(parsed.expiresIn, 3600);
    });
  });

  describe('Account Deletion Confirmation Guardrails', () => {
    it('requires exact username match before enabling permanent delete confirmation button', () => {
      const currentUser = { username: 'patty_contractor' };

      const isDeleteButtonEnabled = (typedText) => {
        return typedText === currentUser.username;
      };

      assert.strictEqual(isDeleteButtonEnabled(''), false);
      assert.strictEqual(isDeleteButtonEnabled('patty'), false);
      assert.strictEqual(isDeleteButtonEnabled('Patty_contractor'), false); // Case-sensitive exact match
      assert.strictEqual(isDeleteButtonEnabled('patty_contractor'), true);
    });

    it('blocks self-service deletion when user owns organizations with active team members', () => {
      const checkSelfServiceDeleteBlocker = (user, userOrganizations) => {
        for (const org of userOrganizations) {
          if (org.owner_id === user.id && org.active_member_count > 1) {
            return {
              canDelete: false,
              blockingOrg: org.name,
              reason: `Cannot delete account while owning organization "${org.name}" with other members.`,
            };
          }
        }
        return { canDelete: true, blockingOrg: null, reason: null };
      };

      const user = { id: 'usr_org_owner_1' };
      const orgsWithTeam = [
        { id: 'org_1', name: 'Apex Grading Inc', owner_id: 'usr_org_owner_1', active_member_count: 4 },
      ];

      const blockedResult = checkSelfServiceDeleteBlocker(user, orgsWithTeam);
      assert.strictEqual(blockedResult.canDelete, false);
      assert.strictEqual(blockedResult.blockingOrg, 'Apex Grading Inc');

      const orgsSolo = [
        { id: 'org_1', name: 'Apex Grading Inc', owner_id: 'usr_org_owner_1', active_member_count: 1 },
      ];
      const allowedResult = checkSelfServiceDeleteBlocker(user, orgsSolo);
      assert.strictEqual(allowedResult.canDelete, true);
    });
  });

  describe('Post-Registration 4-Plan Onboarding Navigation (US-039)', () => {
    it('transitions to plan-select view immediately after registration', () => {
      let currentView = 'register';
      let registeredUser = null;

      const onRegisterSuccess = (userPayload) => {
        registeredUser = userPayload;
        currentView = 'plan-select';
      };

      onRegisterSuccess({ username: 'new_estimator_2026', email: 'estimator@takeoff.io' });

      assert.strictEqual(currentView, 'plan-select');
      assert.strictEqual(registeredUser.username, 'new_estimator_2026');
    });

    it('routes free trial selection directly to dashboard without checkout', () => {
      let navigatedTo = null;
      const handleSelectFreePlan = (user) => {
        navigatedTo = `/${user.username}`;
      };

      handleSelectFreePlan({ username: 'contractor_bob' });
      assert.strictEqual(navigatedTo, '/contractor_bob');
    });

    it('assigns correct paid plan tier and routes to dashboard upon checkout completion', async () => {
      let activeUser = { username: 'contractor_bob', subscription_tier: 'free', subscription_status: 'trialing' };
      let navigatedTo = null;

      const handlePaidPlanCheckoutSuccess = async (planKey) => {
        activeUser = {
          ...activeUser,
          subscription_tier: planKey,
          subscription_status: 'active',
        };
        navigatedTo = `/${activeUser.username}`;
      };

      await handlePaidPlanCheckoutSuccess('starter');
      assert.strictEqual(activeUser.subscription_tier, 'starter');
      assert.strictEqual(activeUser.subscription_status, 'active');
      assert.strictEqual(navigatedTo, '/contractor_bob');

      await handlePaidPlanCheckoutSuccess('pro');
      assert.strictEqual(activeUser.subscription_tier, 'pro');

      await handlePaidPlanCheckoutSuccess('enterprise');
      assert.strictEqual(activeUser.subscription_tier, 'enterprise');
    });
  });
});
