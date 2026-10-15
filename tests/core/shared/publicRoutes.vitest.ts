import { describe, expect, it } from 'vitest';
import { isClientProposalPath, isPublicLandingPath, normalizePathname } from '@/core/lib/shared/publicRoutes';

describe('public route detection', () => {
  it('normalizes trailing slashes, keeping the root path intact', () => {
    expect(normalizePathname('/home')).toBe('/home');
    expect(normalizePathname('/home/')).toBe('/home');
    expect(normalizePathname('/home//')).toBe('/home');
    expect(normalizePathname('/')).toBe('/');
    expect(normalizePathname('')).toBe('/');
    expect(normalizePathname('/p/token/')).toBe('/p/token');
  });

  it('treats /home with or without the GitHub Pages trailing slash as the landing page', () => {
    expect(isPublicLandingPath('/home', false)).toBe(true);
    expect(isPublicLandingPath('/home/', false)).toBe(true);
    expect(isPublicLandingPath('/home', true)).toBe(true);
    expect(isPublicLandingPath('/home/', true)).toBe(true);
  });

  it('treats the root path as the landing page only for visitors', () => {
    expect(isPublicLandingPath('/', false)).toBe(true);
    expect(isPublicLandingPath('', false)).toBe(true);
    expect(isPublicLandingPath('/', true)).toBe(false);
  });

  it('keeps app routes out of the landing page treatment', () => {
    for (const path of ['/login', '/register', '/patrick', '/home-2', '/home/features', '/someone/not-a-real-page']) {
      expect(isPublicLandingPath(path, true)).toBe(false);
    }
  });

  it('recognizes client proposal links with or without a trailing slash', () => {
    expect(isClientProposalPath('/p/abc123')).toBe(true);
    expect(isClientProposalPath('/p/abc123/')).toBe(true);
    expect(isClientProposalPath('/patrick')).toBe(false);
    expect(isClientProposalPath('/p')).toBe(false);
    expect(isClientProposalPath('/home/')).toBe(false);
  });
});
