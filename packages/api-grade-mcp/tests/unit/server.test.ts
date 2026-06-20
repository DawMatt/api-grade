import { describe, it, expect } from 'vitest';
import { createServer } from '../../src/server.js';

describe('createServer()', () => {
  it('returns an object with a connect method', () => {
    const server = createServer();
    expect(typeof server.connect).toBe('function');
  });

  it('can be called multiple times independently', () => {
    const s1 = createServer();
    const s2 = createServer();
    expect(s1).not.toBe(s2);
  });
});
