import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

vi.mock('@/core/components/context/I18nContext', () => ({
  useTranslation: () => ({
    t: (key: string) => (({
      'core.footer.devInfisicalEnvironment': 'B',
      'core.footer.prodInfisicalEnvironment': 'A',
      'core.footer.devInfisicalEnvironmentDescription': 'Dev Infisical values are in use',
      'core.footer.prodInfisicalEnvironmentDescription': 'Prod Infisical values are in use',
      'core.footer.unknownInfisicalEnvironmentDescription': 'Infisical environment could not be identified',
    } as Record<string, string>)[key] ?? key),
  }),
}));

import InfisicalEnvironmentBadge from '@/core/components/landing/InfisicalEnvironmentBadge';

describe('InfisicalEnvironmentBadge', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('shows B when Vite receives the dev Infisical environment value', () => {
    vi.stubEnv('VITE_INFISICAL_ENVIRONMENT', 'dev');
    render(<InfisicalEnvironmentBadge />);

    const badge = screen.getByLabelText('Dev Infisical values are in use');
    expect(badge.textContent).toBe('B');
    expect(badge.getAttribute('title')).toBe('Dev Infisical values are in use');
    expect(screen.queryByText('A')).toBeNull();
  });

  it('shows A when Vite receives the prod Infisical environment value', () => {
    vi.stubEnv('VITE_INFISICAL_ENVIRONMENT', 'prod');
    render(<InfisicalEnvironmentBadge />);

    const badge = screen.getByLabelText('Prod Infisical values are in use');
    expect(badge.textContent).toBe('A');
    expect(badge.getAttribute('title')).toBe('Prod Infisical values are in use');
    expect(screen.queryByText('B')).toBeNull();
  });

  it('does not claim dev or prod when the Infisical environment value is missing', () => {
    vi.stubEnv('VITE_INFISICAL_ENVIRONMENT', undefined);
    render(<InfisicalEnvironmentBadge />);

    const badge = screen.getByLabelText('Infisical environment could not be identified');
    expect(badge.textContent).toBe('?');
    expect(screen.queryByText('B')).toBeNull();
    expect(screen.queryByText('A')).toBeNull();
  });
});
