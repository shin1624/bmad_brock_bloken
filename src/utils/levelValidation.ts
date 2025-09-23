import { z } from 'zod';
import DOMPurify from 'dompurify';
import { BlockType, LEVEL_FORMAT_VERSION } from '../types/editor.types';

/**
 * Level Validation System
 * Provides comprehensive validation for imported levels
 */

// Define available block types from the enum
const VALID_BLOCK_TYPES = Object.values(BlockType) as string[];

// Define available power-ups (should be extended based on game requirements)
const VALID_POWER_UPS = [
  'multiball',
  'laser',
  'sticky',
  'expand',
  'slow',
  'fast',
  'extraLife',
  'shield',
];

// Block schema with validation
const BlockSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  type: z.string().refine(
    (type) => VALID_BLOCK_TYPES.includes(type),
    { message: 'Invalid block type' }
  ),
  health: z.number().int().min(1).max(10).optional(),
  powerUp: z.string().refine(
    (powerUp) => VALID_POWER_UPS.includes(powerUp),
    { message: 'Invalid power-up type' }
  ).optional(),
});

// Grid schema with dimension constraints
const GridSchema = z.object({
  width: z.number().int().min(5).max(100),
  height: z.number().int().min(5).max(100),
  blocks: z.array(BlockSchema),
});

// Metadata schema
const MetadataSchema = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().max(500).optional(),
});

// Settings schema
const SettingsSchema = z.object({
  ballSpeed: z.number().min(0.5).max(5).optional(),
  paddleSize: z.number().min(50).max(200).optional(),
  theme: z.string().optional(),
});

// Complete Level schema
export const LevelSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  author: z.string().max(50).optional(),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
  version: z.string(),
  metadata: MetadataSchema,
  grid: GridSchema,
  settings: SettingsSchema.optional(),
});

export type ValidationError = {
  field: string;
  message: string;
};

export type ValidationResult = 
  | { success: true; data: z.infer<typeof LevelSchema> }
  | { success: false; errors: ValidationError[] };

/**
 * Sanitize text fields to prevent XSS attacks
 */
function sanitizeText(text: string): string {
  // Use DOMPurify to sanitize HTML/script content
  // For plain text fields, we'll strip all HTML
  return DOMPurify.sanitize(text, { 
    ALLOWED_TAGS: [], 
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true 
  });
}

/**
 * Sanitize an entire level object
 */
function sanitizeLevel(level: any): any {
  if (typeof level !== 'object' || level === null) {
    return level;
  }

  const sanitized = { ...level };

  // Sanitize text fields
  if (sanitized.name) {
    sanitized.name = sanitizeText(sanitized.name);
  }
  if (sanitized.author) {
    sanitized.author = sanitizeText(sanitized.author);
  }
  if (sanitized.metadata) {
    if (sanitized.metadata.description) {
      sanitized.metadata.description = sanitizeText(sanitized.metadata.description);
    }
    if (Array.isArray(sanitized.metadata.tags)) {
      sanitized.metadata.tags = sanitized.metadata.tags.map((tag: any) => 
        typeof tag === 'string' ? sanitizeText(tag) : tag
      );
    }
  }
  if (sanitized.settings?.theme) {
    sanitized.settings.theme = sanitizeText(sanitized.settings.theme);
  }

  return sanitized;
}

/**
 * Validate that blocks are within grid boundaries
 */
function validateGridBoundaries(grid: { width: number; height: number; blocks: Array<{ x: number; y: number }> }): ValidationError[] {
  const errors: ValidationError[] = [];

  grid.blocks.forEach((block, index) => {
    if (block.x < 0 || block.x >= grid.width) {
      errors.push({
        field: `grid.blocks[${index}].x`,
        message: `Block x position ${block.x} is out of bounds (0-${grid.width - 1})`,
      });
    }
    if (block.y < 0 || block.y >= grid.height) {
      errors.push({
        field: `grid.blocks[${index}].y`,
        message: `Block y position ${block.y} is out of bounds (0-${grid.height - 1})`,
      });
    }
  });

  return errors;
}

/**
 * Check version compatibility
 */
function checkVersionCompatibility(version: string): ValidationError | null {
  const [major] = version.split('.');
  const [currentMajor] = LEVEL_FORMAT_VERSION.split('.');

  if (major !== currentMajor) {
    return {
      field: 'version',
      message: `Incompatible version ${version}. Expected major version ${currentMajor}.x.x`,
    };
  }

  return null;
}

/**
 * Main validation function
 */
export function validateLevel(data: unknown): ValidationResult {
  try {
    // Sanitize input first
    const sanitized = sanitizeLevel(data);

    // Parse with Zod schema
    const parsed = LevelSchema.parse(sanitized);

    // Additional validations
    const errors: ValidationError[] = [];

    // Check version compatibility
    const versionError = checkVersionCompatibility(parsed.version);
    if (versionError) {
      errors.push(versionError);
    }

    // Validate grid boundaries
    const boundaryErrors = validateGridBoundaries(parsed.grid);
    errors.push(...boundaryErrors);

    // Check for duplicate blocks at same position
    const blockPositions = new Set<string>();
    parsed.grid.blocks.forEach((block, index) => {
      const posKey = `${block.x},${block.y}`;
      if (blockPositions.has(posKey)) {
        errors.push({
          field: `grid.blocks[${index}]`,
          message: `Duplicate block at position (${block.x}, ${block.y})`,
        });
      }
      blockPositions.add(posKey);
    });

    // Check that level has at least one block
    if (parsed.grid.blocks.length === 0) {
      errors.push({
        field: 'grid.blocks',
        message: 'Level must have at least one block',
      });
    }

    // Check that level doesn't exceed maximum blocks
    const maxBlocks = parsed.grid.width * parsed.grid.height;
    if (parsed.grid.blocks.length > maxBlocks) {
      errors.push({
        field: 'grid.blocks',
        message: `Too many blocks (${parsed.grid.blocks.length}). Maximum is ${maxBlocks}`,
      });
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    return { success: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: ValidationError[] = error.errors?.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })) || [];
      return { success: false, errors };
    }

    return {
      success: false,
      errors: [{ field: 'unknown', message: 'Invalid level data' }],
    };
  }
}

/**
 * Validate a block type against the catalog
 */
export function validateBlockType(type: string): boolean {
  return VALID_BLOCK_TYPES.includes(type);
}

/**
 * Get list of valid block types
 */
export function getValidBlockTypes(): string[] {
  return [...VALID_BLOCK_TYPES];
}

/**
 * Get list of valid power-ups
 */
export function getValidPowerUps(): string[] {
  return [...VALID_POWER_UPS];
}

/**
 * Quick validation for level code import
 * Less strict than full validation, just checks critical fields
 */
export function quickValidateLevel(data: unknown): boolean {
  try {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const level = data as any;

    // Check essential fields exist
    if (!level.id || !level.name || !level.grid) {
      return false;
    }

    // Check grid structure
    if (typeof level.grid.width !== 'number' || 
        typeof level.grid.height !== 'number' ||
        !Array.isArray(level.grid.blocks)) {
      return false;
    }

    // Basic boundary check
    if (level.grid.width < 1 || level.grid.width > 1000 ||
        level.grid.height < 1 || level.grid.height > 1000) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}