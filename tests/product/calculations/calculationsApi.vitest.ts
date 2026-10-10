import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculationsApi, DEFAULT_RATES } from '@/product/lib/calculations';
import type { CrewMember, LaborRole, TakeoffItem } from '@/types/models';

const item = {
  id: 'a',
  system: 'Water',
  description: '6" PVC',
  sizeSpec: '6"',
  quantity: 100,
  unit: 'LF',
  avgDepthFt: 5,
  materialCostPerUnit: 20,
  laborHoursPerUnit: 0.5,
} as unknown as TakeoffItem;

function stubFetch(json: unknown = {}) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => json });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('calculationsApi HTTP contract (step 2 and step 3 both depend on it)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('posts items and rates to /calculations/estimate', async () => {
    const fetchMock = stubFetch({ totals: { finalBidAmount: 1 } });

    const result = await calculationsApi.computeEstimate([item], DEFAULT_RATES);

    const [url, request] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/calculations\/estimate$/);
    expect(request.method).toBe('POST');
    expect(request.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(request.body)).toEqual({ items: [item], rates: DEFAULT_RATES });
    expect(result).toEqual({ totals: { finalBidAmount: 1 } });
  });

  it('posts a single item to /calculations/item-cost', async () => {
    const fetchMock = stubFetch({ directCost: 2960 });

    await calculationsApi.computeItemCost(item, DEFAULT_RATES);

    const [url, request] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/calculations\/item-cost$/);
    expect(request.method).toBe('POST');
    expect(JSON.parse(request.body)).toEqual({ item, rates: DEFAULT_RATES });
  });

  it('posts rates to /calculations/normalize-rates', async () => {
    const fetchMock = stubFetch({ laborHourlyRate: 65 });

    await calculationsApi.normalizeRates(DEFAULT_RATES);

    const [url, request] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/calculations\/normalize-rates$/);
    expect(request.method).toBe('POST');
    expect(JSON.parse(request.body)).toEqual({ rates: DEFAULT_RATES });
  });

  it('posts the crew composition and roles to /calculations/blended-crew-rate', async () => {
    const fetchMock = stubFetch({ blendedHourlyRate: 70 });
    const crewComposition = [{ roleId: 'journeyman', count: 2 }] as unknown as CrewMember[];
    const laborRoles = DEFAULT_RATES.laborRoles as unknown as LaborRole[];

    await calculationsApi.calculateBlendedCrewRate(crewComposition, laborRoles);

    const [url, request] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/calculations\/blended-crew-rate$/);
    expect(request.method).toBe('POST');
    expect(JSON.parse(request.body)).toEqual({ crewComposition, laborRoles });
  });

  it('surfaces the server error message when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Boom' }) }));

    await expect(calculationsApi.computeEstimate([item], DEFAULT_RATES)).rejects.toThrow('Boom');
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => {
          throw new Error('not json');
        },
      }),
    );

    await expect(calculationsApi.computeItemCost(item, DEFAULT_RATES)).rejects.toThrow(/Failed to compute item cost/);
  });
});
