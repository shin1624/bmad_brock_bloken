/**
 * Sanitizes version string to prevent exposure of detailed version info
 * Security measure to mitigate SEC-001 risk
 * @param fullVersion - Full version string (e.g., "1.0.0-beta.2")
 * @returns Sanitized version (e.g., "1.0")
 */
export function sanitizeVersion(fullVersion: string): string {
  // Extract only major.minor version
  const match = fullVersion.match(/^(\d+\.\d+)/);
  return match ? match[1] : '1.0';
}

/**
 * Gets the sanitized app version from build-time injection
 * @returns Sanitized version string
 */
export function getAppVersion(): string {
  // Use build-time injected version, already sanitized
  return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0';
}