import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const reloadSpy = vi.hoisted(() => vi.fn());

vi.mock('@/core/lib/shared/staleBuild', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/lib/shared/staleBuild')>();
  return { ...actual, reloadForStaleBuild: reloadSpy };
});

import ErrorBoundary from '@/core/components/shared/ErrorBoundary';
import { isStaleBuildError } from '@/core/lib/shared/staleBuild';

const { reloadForStaleBuild } = await vi.importActual<typeof import('@/core/lib/shared/staleBuild')>('@/core/lib/shared/staleBuild');

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, String(value)),
  };
}

function Throws({ error }: { error: unknown }): React.ReactElement {
  throw error;
}

describe('stale build detection', () => {
  it('recognises failed lazy chunk loads across browsers', () => {
    for (const message of [
      'Failed to fetch dynamically imported module: https://www.takeoffengine.com/assets/LandingPage-CG6-GDe0.js',
      'error loading dynamically imported module: https://www.takeoffengine.com/assets/LandingPage-CG6-GDe0.js',
      'Importing a module script failed.',
      'Unable to preload CSS for /assets/LandingPage-CG6-GDe0.css',
    ]) {
      expect(isStaleBuildError(new TypeError(message))).toBe(true);
    }
    expect(isStaleBuildError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isStaleBuildError(undefined)).toBe(false);
  });

  it('reloads once and refuses to loop while the cooldown is active', () => {
    const storage = memoryStorage();
    const location = { reload: vi.fn() };
    expect(reloadForStaleBuild({ storage, location, now: 1_000_000 })).toBe(true);
    expect(reloadForStaleBuild({ storage, location, now: 1_010_000 })).toBe(false);
    expect(location.reload).toHaveBeenCalledTimes(1);
    expect(reloadForStaleBuild({ storage, location, now: 1_040_000 })).toBe(true);
    expect(location.reload).toHaveBeenCalledTimes(2);
  });

  it('does not reload when session storage is unavailable', () => {
    const storage = { getItem: () => { throw new Error('blocked'); }, setItem: vi.fn() };
    const location = { reload: vi.fn() };
    expect(reloadForStaleBuild({ storage, location })).toBe(false);
    expect(location.reload).not.toHaveBeenCalled();
  });
});

describe('ErrorBoundary', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  const chunkError = new TypeError('Failed to fetch dynamically imported module: https://www.takeoffengine.com/assets/LandingPage-CG6-GDe0.js');

  it('reloads into the latest build instead of showing the error when a lazy chunk is missing', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    reloadSpy.mockReturnValue(true);
    render(<ErrorBoundary><Throws error={chunkError} /></ErrorBoundary>);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status').textContent).toBe('Loading the latest version…');
    expect(screen.queryByText(/Failed to fetch/)).toBeNull();
  });

  it('explains a new version is available when an automatic reload was already attempted', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    reloadSpy.mockReturnValue(false);
    render(<ErrorBoundary><Throws error={chunkError} /></ErrorBoundary>);
    expect(screen.getByText('A new version of Takeoff Engine is available. Reload the page to update.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload Page' })).toBeTruthy();
  });

  it('keeps showing the original message for unrelated errors without reloading', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><Throws error={new Error('Render exploded')} /></ErrorBoundary>);
    expect(reloadSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Render exploded')).toBeTruthy();
  });
});
