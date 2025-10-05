import { describe, it, expect } from 'vitest';
import { sanitizeVersion, getAppVersion } from './version';

describe('Version Utilities', () => {
  describe('sanitizeVersion', () => {
    it('should extract major.minor version from full version string', () => {
      expect(sanitizeVersion('1.0.0')).toBe('1.0');
      expect(sanitizeVersion('2.3.4')).toBe('2.3');
      expect(sanitizeVersion('10.20.30')).toBe('10.20');
    });

    it('should handle version with pre-release tags', () => {
      expect(sanitizeVersion('1.0.0-beta.2')).toBe('1.0');
      expect(sanitizeVersion('2.3.4-alpha.1')).toBe('2.3');
      expect(sanitizeVersion('3.0.0-rc.5')).toBe('3.0');
    });

    it('should handle version with build metadata', () => {
      expect(sanitizeVersion('1.0.0+build.123')).toBe('1.0');
      expect(sanitizeVersion('2.3.4-beta.1+build.456')).toBe('2.3');
    });

    it('should return default version for invalid input', () => {
      expect(sanitizeVersion('')).toBe('1.0');
      expect(sanitizeVersion('invalid')).toBe('1.0');
      expect(sanitizeVersion('v1.0.0')).toBe('1.0'); // handles v prefix
    });

    it('should not expose detailed version information (SEC-001 mitigation)', () => {
      const fullVersion = '1.0.0-beta.2+build.123';
      const sanitized = sanitizeVersion(fullVersion);
      expect(sanitized).not.toContain('beta');
      expect(sanitized).not.toContain('build');
      expect(sanitized).not.toContain('123');
      expect(sanitized).toBe('1.0');
    });
  });

  describe('getAppVersion', () => {
    it('should return sanitized version', () => {
      const version = getAppVersion();
      expect(version).toMatch(/^\d+\.\d+$/);
    });

    it('should return default version when __APP_VERSION__ is undefined', () => {
      // In test environment, __APP_VERSION__ is likely undefined
      const version = getAppVersion();
      expect(version).toBe('1.0');
    });
  });
});