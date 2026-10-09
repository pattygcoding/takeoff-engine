import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { billingApi } from '@/core/lib/billing/billing';
import { PricingProvider } from '@/core/components/context/PricingContext';
import { PENDING_INVITE_KEY } from '@/core/lib/auth/organizations';
import { createCatalogFixture } from '../../helpers/paddleCatalogFixture.ts';

vi.mock('@/core/components/context/AuthContext', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, refreshProfile: vi.fn() }),
}));
vi.mock('@/core/components/context/ModalContext', () => ({
  useModal: () => ({ showAlert: vi.fn() }),
}));
vi.mock('@/core/components/context/I18nContext', () => ({
  useTranslation: () => ({
    t: (key: string, params: Record<string, any> = {}) => `${key} ${params.orgName || ''}`.trim(),
    language: 'en',
  }),
}));

import AcceptInvitePage from '@/core/components/auth/AcceptInvitePage';

const token = 'private-invite-token';

function availableCatalog() {
  return {
    ...createCatalogFixture().catalog,
    fetchedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 300_000).toISOString(),
  };
}

function stubInviteLookup() {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      invitation: {
        organizationName: 'Acme Construction',
        email: 'invitee@example.test',
        role: 'viewer',
        inviterName: 'Owner',
      },
    }),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage() {
  return render(
    <PricingProvider>
      <MemoryRouter initialEntries={[`/accept-invite?token=${token}`]}>
        <Routes>
          <Route path="/accept-invite" element={<AcceptInvitePage />} />
          <Route path="/register" element={<p>Register page</p>} />
        </Routes>
      </MemoryRouter>
    </PricingProvider>,
  );
}

describe('AcceptInvitePage component harness', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('verifies an invite without rendering its token and offers sign-in or sign-up to anonymous recipients', async () => {
    vi.spyOn(billingApi, 'getPricing').mockResolvedValue(availableCatalog());
    const fetchMock = stubInviteLookup();
    renderPage();
    await waitFor(() => expect(screen.queryByText('Acme Construction')).not.toBeNull());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(`token=${token}`));
    expect(document.body.textContent).not.toContain(token);
    expect((screen.getByRole('button', { name: 'core.acceptInvite.signInToAccept' }) as HTMLButtonElement).disabled).toBe(false);
    await waitFor(() => expect(
      (screen.getByRole('button', { name: 'core.acceptInvite.createAccountToAccept' }) as HTMLButtonElement).disabled,
    ).toBe(false));
    expect(screen.queryByText('core.catalogPricing.accountCreationDisabled')).toBeNull();
  });

  it('disables account creation and explains why when pricing is unavailable, while sign-in stays available', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(billingApi, 'getPricing').mockRejectedValue(new Error('Pricing is temporarily unavailable.'));
    stubInviteLookup();
    renderPage();
    await waitFor(() => expect(screen.queryByText('Acme Construction')).not.toBeNull());

    const createAccount = screen.getByRole('button', { name: 'core.acceptInvite.createAccountToAccept' }) as HTMLButtonElement;
    await waitFor(() => expect(createAccount.disabled).toBe(true));
    expect(screen.getByRole('alert').textContent).toContain('core.catalogPricing.accountCreationDisabled');
    expect((screen.getByRole('button', { name: 'core.acceptInvite.signInToAccept' }) as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(createAccount);
    expect(screen.queryByText('Register page')).toBeNull();
    expect(sessionStorage.getItem(PENDING_INVITE_KEY)).toBeNull();
  });

  it('re-enables account creation after a successful pricing retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(billingApi, 'getPricing')
      .mockRejectedValueOnce(new Error('Pricing is temporarily unavailable.'))
      .mockResolvedValueOnce(availableCatalog());
    stubInviteLookup();
    renderPage();
    await waitFor(() => expect(screen.queryByText('Acme Construction')).not.toBeNull());
    await waitFor(() => expect(
      (screen.getByRole('button', { name: 'core.acceptInvite.createAccountToAccept' }) as HTMLButtonElement).disabled,
    ).toBe(true));

    fireEvent.click(screen.getByRole('button', { name: 'core.catalogPricing.retry' }));
    await waitFor(() => expect(
      (screen.getByRole('button', { name: 'core.acceptInvite.createAccountToAccept' }) as HTMLButtonElement).disabled,
    ).toBe(false));

    fireEvent.click(screen.getByRole('button', { name: 'core.acceptInvite.createAccountToAccept' }));
    expect(await screen.findByText('Register page')).toBeTruthy();
    expect(sessionStorage.getItem(PENDING_INVITE_KEY)).toBe(token);
  });
});