import pako from 'pako';
import { Level } from '../types/editor.types';

/**
 * Level Code System for sharing levels
 * Provides compression and encoding for level data
 */

/**
 * Calculate a simple checksum for data integrity
 */
function calculateChecksum(data: string): number {
  let checksum = 0;
  for (let i = 0; i < data.length; i++) {
    checksum = ((checksum << 5) - checksum) + data.charCodeAt(i);
    checksum = checksum & checksum; // Convert to 32-bit integer
  }
  return Math.abs(checksum);
}

/**
 * Convert standard base64 to URL-safe base64
 */
function toUrlSafeBase64(base64: string): string {
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Convert URL-safe base64 back to standard base64
 */
function fromUrlSafeBase64(urlSafeBase64: string): string {
  let base64 = urlSafeBase64
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  // Add padding if necessary
  while (base64.length % 4) {
    base64 += '=';
  }
  
  return base64;
}

/**
 * Compress and encode a level into a shareable code
 */
export function generateLevelCode(level: Level): string {
  try {
    // Convert level to JSON string
    const json = JSON.stringify(level);
    
    // Compress using pako
    const compressed = pako.deflate(json);
    
    // Convert to base64
    const base64 = btoa(String.fromCharCode(...compressed));
    
    // Calculate checksum from original JSON
    const checksum = calculateChecksum(json);
    
    // Create final code with checksum prefix
    const code = `${checksum.toString(36)}.${toUrlSafeBase64(base64)}`;
    
    return code;
  } catch (error) {
    throw new Error(`Failed to generate level code: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decode and decompress a level code back into a Level object
 */
export function decodeLevelCode(code: string): Level {
  try {
    // Split checksum and data
    const parts = code.split('.');
    if (parts.length !== 2) {
      throw new Error('Invalid level code format');
    }
    
    const [checksumStr, encodedData] = parts;
    const expectedChecksum = parseInt(checksumStr, 36);
    
    // Convert from URL-safe base64
    const base64 = fromUrlSafeBase64(encodedData);
    
    // Decode base64
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Decompress using pako
    const decompressed = pako.inflate(bytes, { to: 'string' });
    
    // Verify checksum
    const actualChecksum = calculateChecksum(decompressed);
    if (actualChecksum !== expectedChecksum) {
      throw new Error('Level code checksum mismatch - data may be corrupted');
    }
    
    // Parse JSON
    const level = JSON.parse(decompressed) as Level;
    
    // Basic validation
    if (!level.id || !level.name || !level.grid) {
      throw new Error('Invalid level data structure');
    }
    
    return level;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to decode level code: ${error}`);
  }
}

/**
 * Get the approximate size of a level code in bytes
 */
export function getLevelCodeSize(code: string): number {
  return new Blob([code]).size;
}

/**
 * Check if a level code is within reasonable size limits for URL sharing
 */
export function isLevelCodeShareable(code: string): boolean {
  const MAX_URL_SIZE = 2000; // Safe limit for most systems
  return getLevelCodeSize(code) <= MAX_URL_SIZE;
}

/**
 * Create a minimal version of the level for more efficient sharing
 */
export function createMinimalLevel(level: Level): Level {
  return {
    id: level.id,
    name: level.name,
    author: level.author,
    createdAt: level.createdAt,
    updatedAt: level.updatedAt,
    version: level.version,
    metadata: {
      difficulty: level.metadata.difficulty,
      // Exclude tags and description to save space
    },
    grid: {
      width: level.grid.width,
      height: level.grid.height,
      blocks: level.grid.blocks.map(block => ({
        x: block.x,
        y: block.y,
        type: block.type,
        // Only include health if different from default
        ...(block.health && block.health !== 1 ? { health: block.health } : {}),
        // Only include powerUp if present
        ...(block.powerUp ? { powerUp: block.powerUp } : {}),
      })),
    },
    // Exclude settings for minimal version
  };
}