/**
 * Input validation utilities for security and data integrity
 */

export interface ValidationResult {
  isValid: boolean;
  sanitized: string;
  errors: string[];
}

/**
 * Sanitizes user input to prevent XSS attacks
 */
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol  
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/script/gi, '') // Remove script references
    .replace(/\//g, '') // Remove forward slashes
    .trim();
};

/**
 * Validates player name input
 */
export const validatePlayerName = (name: string): ValidationResult => {
  const errors: string[] = [];
  const sanitized = sanitizeInput(name);
  
  // Length validation
  if (sanitized.length === 0) {
    errors.push('Player name cannot be empty');
  }
  
  if (sanitized.length > 20) {
    errors.push('Player name cannot exceed 20 characters');
  }
  
  // Character validation
  const validPattern = /^[a-zA-Z0-9\s\-_]+$/;
  if (!validPattern.test(sanitized)) {
    errors.push('Player name can only contain letters, numbers, spaces, hyphens, and underscores');
  }
  
  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
};

/**
 * Validates level name input
 */
export const validateLevelName = (name: string): ValidationResult => {
  const errors: string[] = [];
  const sanitized = sanitizeInput(name);
  
  if (sanitized.length === 0) {
    errors.push('Level name cannot be empty');
  }
  
  if (sanitized.length > 50) {
    errors.push('Level name cannot exceed 50 characters');
  }
  
  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
};

/**
 * Validates numeric input for scores
 */
export const validateScore = (score: unknown): number | null => {
  if (typeof score === 'number' && !isNaN(score) && score >= 0) {
    return Math.floor(score);
  }
  
  if (typeof score === 'string') {
    const parsed = parseInt(score, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  
  return null;
};