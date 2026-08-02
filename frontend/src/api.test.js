import { describe, it, expect, vi, afterEach } from 'vitest';
import { getApiBase } from './api.js';
import { normalizeRows } from './utils/reportData.js';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('getApiBase', () => {
  it('defaults to the Vite proxy base when no API URL is configured', () => {
    vi.stubEnv('VITE_API_URL', '');
    expect(getApiBase()).toBe('/api');
  });

  it('uses a configured API URL when provided', () => {
    vi.stubEnv('VITE_API_URL', 'http://localhost:3002/api');
    expect(getApiBase()).toBe('http://localhost:3002/api');
  });
});

describe('normalizeRows', () => {
  it('extracts rows from common API payload shapes', () => {
    expect(normalizeRows({ rows: [{ id: 1 }] })).toEqual([{ id: 1 }]);
    expect(normalizeRows({ data: [{ id: 2 }] })).toEqual([{ id: 2 }]);
    expect(normalizeRows({ complaints: [{ id: 3 }] })).toEqual([{ id: 3 }]);
    expect(normalizeRows({ total: 1 })).toEqual([]);
  });
});
