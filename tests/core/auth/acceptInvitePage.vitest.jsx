import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/core/components/context/AuthContext', () => ({
  useAuth: () => ({ user: null, token: null, refreshProfile: vi.fn() }),
}));
vi.mock('@/core/components/context/ModalContext', () => ({
  useModal: () => ({ showAlert: vi.fn() }),
}));
vi.mock('@/core/components/context/I18nContext', () => ({
  useTranslation: () => ({ t: (key, params = {}) => `${key} ${params.orgName || ''}`.trim() }),
}));

import AcceptInvitePage from '@/core/components/auth/AcceptInvitePage';

describe('AcceptInvitePage component harness', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('verifies an invite without rendering its token and offers sign-in to anonymous recipients', async () => {
    const token = 'private-invite-token';
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
    render(<MemoryRouter initialEntries={[`/accept-invite?token=${token}`]}><AcceptInvitePage /></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText('Acme Construction')).not.toBeNull());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(`token=${token}`));
    expect(document.body.textContent).not.toContain(token);
    expect(screen.getByRole('button').disabled).toBe(false);
  });
});