import { afterEach, describe, it, expect, vi } from 'vitest';
import { projectsApi } from '@/product/lib/projects';
import type { ColumnDefinition } from '@/types/models';

/**
 * The column schema is persisted with the project's estimate. These tests pin the exact request bodies
 * so a refactor cannot quietly stop sending (or start sending) the schema.
 */
describe('projectsApi column schema persistence', () => {
  const columns: ColumnDefinition[] = [
    { key: 'col_po_number', label: 'PO Number', type: 'text', field: null, source: 'imported', includeInDocuments: false },
  ];

  /** Stubs fetch and returns the parsed JSON body of the first request. */
  function stubFetch(payload: unknown = { project: { id: 'proj-1' } }) {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(payload) });
    vi.stubGlobal('fetch', fetchMock);
    return () => JSON.parse(String(fetchMock.mock.calls[0][1].body)) as Record<string, unknown>;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the schema when creating a project', async () => {
    const bodyOf = stubFetch();

    await projectsApi.create({ name: 'Job', items: [], rates: {}, columns });

    expect(bodyOf().columns).toEqual(columns);
  });

  it('omits the schema when creating without one', async () => {
    const bodyOf = stubFetch();

    await projectsApi.create({ name: 'Job' });

    expect('columns' in bodyOf()).toBe(false);
  });

  it('sends the schema when updating a project', async () => {
    const bodyOf = stubFetch();

    await projectsApi.update('proj-1', { columns });

    expect(bodyOf().columns).toEqual(columns);
  });

  it('persists an empty schema when every passthrough column is deleted', async () => {
    const bodyOf = stubFetch();

    await projectsApi.update('proj-1', { columns: [] });

    expect(bodyOf().columns).toEqual([]);
  });

  it('leaves a project schema untouched when the update does not mention it', async () => {
    const bodyOf = stubFetch();

    await projectsApi.update('proj-1', { name: 'Renamed' });

    expect('columns' in bodyOf()).toBe(false);
  });
});
