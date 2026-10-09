import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { billingApi } from '@/core/lib/billing/billing';
import { getTranslation } from '@/core/lib/shared/i18n';
import {
  AccountCreationDisabledNotice,
  PricingProvider,
  useAccountCreationDisabled,
} from '@/core/components/context/PricingContext';
import { createCatalogFixture } from '../../helpers/paddleCatalogFixture.js';

const authMocks = vi.hoisted(() => ({ register: vi.fn() }));

vi.mock('@/core/components/context/I18nContext', () => ({
  useTranslation: () => ({ t: (key, params) => getTranslation(key, params, 'en'), language: 'en' }),
}));
vi.mock('@/core/components/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    login: vi.fn(),
    register: authMocks.register,
    refreshProfile: vi.fn(),
  }),
}));
vi.mock('@/core/components/context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }),
}));
vi.mock('@/core/components/shared/SeoHead', () => ({ default: () => null }));
vi.mock('@/core/components/shared/LanguageSelector', () => ({ default: () => null }));
vi.mock('@/core/components/shared/AccessibleDialog', () => ({ default: () => null }));
vi.mock('@/core/components/landing/InfisicalEnvironmentBadge', () => ({ default: () => null }));

import LoginPage from '@/core/components/auth/LoginPage';
import LandingPage from '@/core/components/landing/LandingPage';

const DISABLED_MESSAGE = 'Account creation is disabled because pricing is unavailable';

function catalog() {
  return {
    ...createCatalogFixture().catalog,
    fetchedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
  };
}

const pricingDown = () => vi.spyOn(billingApi, 'getPricing').mockRejectedValue(new Error('Pricing is temporarily unavailable.'));
const pricingUp = () => vi.spyOn(billingApi, 'getPricing').mockResolvedValue(catalog());

function renderWithPricing(ui, path = '/') {
  return render(
    <PricingProvider>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </PricingProvider>,
  );
}

function GateProbe() {
  const disabled = useAccountCreationDisabled();
  return (
    <>
      <span data-testid="gate">{disabled ? 'closed' : 'open'}</span>
      <AccountCreationDisabledNotice />
    </>
  );
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  authMocks.register.mockReset();
});

describe('account creation gate state', () => {
  it('stays open while pricing loads, closes when pricing is unavailable, and reopens after retry', async () => {
    let resolveFirst;
    vi.spyOn(billingApi, 'getPricing')
      .mockImplementationOnce(() => new Promise((_, reject) => { resolveFirst = reject; }))
      .mockResolvedValueOnce(catalog());
    render(<PricingProvider><GateProbe /></PricingProvider>);
    expect(screen.getByTestId('gate').textContent).toBe('open');
    expect(screen.queryByRole('alert')).toBeNull();

    await act(async () => resolveFirst(new Error('Pricing is temporarily unavailable.')));
    expect(screen.getByTestId('gate').textContent).toBe('closed');
    expect(screen.getByRole('alert').textContent).toContain(DISABLED_MESSAGE);

    fireEvent.click(screen.getByRole('button', { name: 'Retry pricing' }));
    await waitFor(() => expect(screen.getByTestId('gate').textContent).toBe('open'));
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('create-account page while pricing is unavailable', () => {
  it('disables the create-account button, says why, and never submits the registration', async () => {
    pricingDown();
    const { container } = renderWithPricing(<LoginPage initialView="register" />, '/register');
    const submit = container.querySelector('form button[type="submit"]');
    await waitFor(() => expect(submit.disabled).toBe(true));
    expect(screen.getAllByRole('alert').map((node) => node.textContent).join(' ')).toContain(DISABLED_MESSAGE);

    fireEvent.submit(container.querySelector('form'));
    expect(authMocks.register).not.toHaveBeenCalled();
  });

  it('disables the "Create Account" link on the sign-in view but keeps sign-in usable', async () => {
    pricingDown();
    const { container } = renderWithPricing(<LoginPage initialView="login" />, '/login');
    const createAccount = screen.getByRole('button', { name: 'Create Account' });
    await waitFor(() => expect(createAccount.disabled).toBe(true));
    expect(container.querySelector('#login-identifier').disabled).toBe(false);
    expect(container.querySelector('form button[type="submit"]').disabled).toBe(false);
  });

  it('enables the create-account button when pricing is available', async () => {
    pricingUp();
    const { container } = renderWithPricing(<LoginPage initialView="register" />, '/register');
    await waitFor(() => expect(billingApi.getPricing).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector('form button[type="submit"]').disabled).toBe(false));
    expect(screen.queryByText(new RegExp(DISABLED_MESSAGE))).toBeNull();
  });

  it('shows the server rejection and re-checks pricing when the backend reports PRICING_UNAVAILABLE', async () => {
    vi.spyOn(billingApi, 'getPricing')
      .mockResolvedValueOnce(catalog())
      .mockRejectedValue(new Error('Pricing is temporarily unavailable.'));
    const serverError = new Error(`${DISABLED_MESSAGE}. Please try again later.`);
    serverError.code = 'PRICING_UNAVAILABLE';
    authMocks.register.mockRejectedValue(serverError);

    const { container } = renderWithPricing(<LoginPage initialView="register" />, '/register');
    const submit = container.querySelector('form button[type="submit"]');
    await waitFor(() => expect(submit.disabled).toBe(false));

    fireEvent.change(container.querySelector('#register-first-name'), { target: { value: 'Dan' } });
    fireEvent.change(container.querySelector('#register-last-name'), { target: { value: 'Estimator' } });
    fireEvent.change(container.querySelector('#register-username'), { target: { value: 'danestimator' } });
    fireEvent.change(container.querySelector('#register-email'), { target: { value: 'dan@example.com' } });
    fireEvent.change(container.querySelector('#register-password'), { target: { value: 'T7!qV9#nK2@xR4$m' } });
    fireEvent.click(container.querySelector('#register-age-confirmation'));
    fireEvent.click(container.querySelector('#register-accept-terms'));
    fireEvent.submit(container.querySelector('form'));

    await waitFor(() => expect(authMocks.register).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(billingApi.getPricing).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(submit.disabled).toBe(true));
    expect(container.querySelector('#auth-error').textContent).toContain(DISABLED_MESSAGE);
  });
});

describe('landing page sign-up entry points', () => {
  const signUpButtonNames = [
    'Get Started Free',
    'Start Free Trial (5 Free Takeoffs)',
    'Import Complete Multi-Line Takeoff Sheet',
    'Create Free Account',
    'Choose Starter',
    'Upgrade to Pro',
    'Choose Enterprise',
  ];

  function signUpButtons() {
    return signUpButtonNames.flatMap((name) => screen.getAllByRole('button', { name, hidden: true }));
  }

  it('disables every button that leads to account creation and replaces the footer link', async () => {
    pricingDown();
    const { container } = renderWithPricing(<LandingPage />, '/home');
    await waitFor(() => expect(screen.getAllByText(new RegExp(DISABLED_MESSAGE)).length).toBeGreaterThan(0));

    const buttons = signUpButtons();
    // Desktop nav + mobile nav + free-trial plan all share the "Get Started Free" label.
    expect(screen.getAllByRole('button', { name: 'Get Started Free', hidden: true })).toHaveLength(3);
    for (const button of buttons) expect(button.disabled).toBe(true);
    expect(container.querySelector('a[href="/register"]')).toBeNull();
    expect(screen.getByText('Create Account', { selector: 'span[aria-disabled="true"]' })).toBeTruthy();

    for (const signIn of screen.getAllByRole('button', { name: 'Sign In', hidden: true })) {
      expect(signIn.disabled).toBe(false);
    }
    expect(container.querySelector('#calculator input').disabled).toBe(false);
  });

  it('enables every sign-up entry point when pricing is available', async () => {
    pricingUp();
    const { container } = renderWithPricing(<LandingPage />, '/home');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Choose Starter' }).disabled).toBe(false));

    for (const button of signUpButtons()) expect(button.disabled).toBe(false);
    expect(container.querySelector('a[href="/register"]')).not.toBeNull();
    expect(screen.queryByText(new RegExp(DISABLED_MESSAGE))).toBeNull();
  });
});
