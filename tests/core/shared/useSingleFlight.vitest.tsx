import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useSingleFlight } from '@/core/lib/shared/useSingleFlight';

function deferred() {
  let resolve!: (value?: unknown) => void;
  const promise = new Promise<unknown>((r) => { resolve = r; });
  return { promise, resolve };
}

describe('useSingleFlight', () => {
  it('ignores a repeat call with the same key while the first is still running', async () => {
    const pending = deferred();
    const handler = vi.fn(() => pending.promise);
    const { result } = renderHook(() => useSingleFlight());
    const run = result.current('save', handler);

    const first = run();
    const second = run();
    expect(handler).toHaveBeenCalledTimes(1);
    await expect(second).resolves.toBeUndefined();

    pending.resolve('done');
    await expect(first).resolves.toBe('done');

    await run();
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('releases the key when the handler throws', async () => {
    const handler = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok');
    const { result } = renderHook(() => useSingleFlight());
    const run = result.current('save', handler);

    await expect(run()).rejects.toThrow('boom');
    await expect(run()).resolves.toBe('ok');
  });

  it('tracks per-argument keys independently', async () => {
    const pending = deferred();
    const handler = vi.fn((_id: string) => pending.promise);
    const { result } = renderHook(() => useSingleFlight());
    const run = result.current<string[], unknown>((id: string) => `remove:${id}`, handler);

    run('a');
    run('a');
    run('b');
    expect(handler.mock.calls.map(([id]) => id)).toEqual(['a', 'b']);
    pending.resolve();
  });

  it('fires a form submit API call once on a same-tick double submit and blocks the native submit', async () => {
    const pending = deferred();
    const api = vi.fn(() => pending.promise);

    function Form() {
      const guard = useSingleFlight();
      const [loading, setLoading] = useState(false);
      const onSubmit = guard<[FormEvent], void>('submit', async (event) => {
        event.preventDefault();
        setLoading(true);
        await api();
        setLoading(false);
      });
      return (
        <form onSubmit={onSubmit}>
          <button type="submit" disabled={loading}>Send</button>
        </form>
      );
    }

    render(<Form />);
    const form = screen.getByRole('button', { name: 'Send' }).closest('form')!;
    const first = new Event('submit', { bubbles: true, cancelable: true });
    const second = new Event('submit', { bubbles: true, cancelable: true });
    act(() => {
      form.dispatchEvent(first);
      form.dispatchEvent(second);
    });

    expect(api).toHaveBeenCalledTimes(1);
    expect(second.defaultPrevented).toBe(true);
    await act(async () => { pending.resolve(); });
    fireEvent.submit(form);
    expect(api).toHaveBeenCalledTimes(2);
  });
});
