import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('@/core/components/context/I18nContext', () => ({
  useTranslation: () => ({ t: (key: string) => key, language: 'en' }),
}));

import TakeoffGrid from '@/product/components/TakeoffGrid';
import { DEFAULT_RATES } from '@/product/constants/calculations.constants';
import type { Rates } from '@/types/models';

describe('equipment rental preview (step 2) matches the pricing engine (step 3)', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('shows the engine-computed total instead of the local duration x rate + delivery + fuel shortcut', async () => {
    // A deliberately "engine-wonky" number the old client-side formula could never produce
    // (the naive shortcut for the default mini-excavator 1-week rental would be 1200 + 250 + 60 = 1510).
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ directCost: 3082.5 }) });
    vi.stubGlobal('fetch', fetchMock);

    render(<TakeoffGrid items={[]} onChange={() => {}} rates={DEFAULT_RATES as unknown as Rates} />);
    fireEvent.click(screen.getByRole('button', { name: /addEquipmentRental/ }));

    await waitFor(() => expect(screen.getByText('$3,082.50')).toBeTruthy());
    expect(screen.queryByText('$1,510.00')).toBeNull();

    const [url, request] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/calculations\/item-cost$/);
    expect(request.method).toBe('POST');
  });
});
