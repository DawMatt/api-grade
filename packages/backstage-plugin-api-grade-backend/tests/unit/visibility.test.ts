import { describe, it, expect } from 'vitest';
import { canViewDetailed } from '../../src/router.js';
import type { VisibilityConfig } from '../../src/router.js';

const defaultVisibility: VisibilityConfig = { allowAll: false, groups: [] };

describe('canViewDetailed()', () => {
  describe('owner check (US2)', () => {
    it('returns true when userEntityRef matches entityOwner', () => {
      expect(
        canViewDetailed('user:default/alice', 'user:default/alice', defaultVisibility),
      ).toBe(true);
    });

    it('returns false when userEntityRef does not match entityOwner', () => {
      expect(
        canViewDetailed('user:default/bob', 'user:default/alice', defaultVisibility),
      ).toBe(false);
    });

    it('returns false when userEntityRef is undefined', () => {
      expect(canViewDetailed(undefined, 'user:default/alice', defaultVisibility)).toBe(false);
    });

    it('returns false when entityOwner is undefined', () => {
      expect(canViewDetailed('user:default/alice', undefined, defaultVisibility)).toBe(false);
    });

    it('returns false when both are undefined', () => {
      expect(canViewDetailed(undefined, undefined, defaultVisibility)).toBe(false);
    });
  });

  describe('allowAll (US4)', () => {
    it('returns true for any user when allowAll is true', () => {
      const config: VisibilityConfig = { allowAll: true, groups: [] };
      expect(canViewDetailed('user:default/bob', 'user:default/alice', config)).toBe(true);
    });

    it('returns true even for unauthenticated user when allowAll is true', () => {
      const config: VisibilityConfig = { allowAll: true, groups: [] };
      expect(canViewDetailed(undefined, undefined, config)).toBe(true);
    });
  });

  describe('group membership (US4)', () => {
    it('returns true when user ownershipEntityRefs intersects visibility groups', () => {
      const config: VisibilityConfig = {
        allowAll: false,
        groups: ['group:default/platform-engineering'],
      };
      expect(
        canViewDetailed(
          'user:default/bob',
          'user:default/alice',
          config,
          ['group:default/platform-engineering'],
        ),
      ).toBe(true);
    });

    it('returns false when user ownershipEntityRefs does not intersect visibility groups', () => {
      const config: VisibilityConfig = {
        allowAll: false,
        groups: ['group:default/platform-engineering'],
      };
      expect(
        canViewDetailed(
          'user:default/bob',
          'user:default/alice',
          config,
          ['group:default/other-team'],
        ),
      ).toBe(false);
    });

    it('returns false when ownershipEntityRefs is empty', () => {
      const config: VisibilityConfig = {
        allowAll: false,
        groups: ['group:default/platform-engineering'],
      };
      expect(
        canViewDetailed('user:default/bob', 'user:default/alice', config, []),
      ).toBe(false);
    });

    it('returns false when groups config is empty', () => {
      const config: VisibilityConfig = { allowAll: false, groups: [] };
      expect(
        canViewDetailed(
          'user:default/bob',
          'user:default/alice',
          config,
          ['group:default/platform-engineering'],
        ),
      ).toBe(false);
    });
  });

  describe('default deny (US4)', () => {
    it('returns false for non-owner with no allowAll and no matching groups', () => {
      expect(
        canViewDetailed('user:default/bob', 'user:default/alice', defaultVisibility, []),
      ).toBe(false);
    });
  });
});
