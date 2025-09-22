#!/usr/bin/env node
/**
 * Script to fix remaining any type errors with more specific type replacements
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Files that still have any type errors
const filesWithAnyErrors = [
  'src/components/game/animations/PowerUpEffects.tsx',
  'src/game/bridges/StateBridge.ts',
  'src/game/core/EventBus.ts',
  'src/game/debug/DevTools.ts',
  'src/game/entities/Block.ts',
  'src/game/plugins/PowerUpPlugin.ts',
  'src/game/rendering/Renderer.ts',
  'src/game/systems/ParticleSystem.ts',
  'src/game/systems/PowerUpConflictResolver.ts',
  'src/game/systems/PowerUpOptimization.ts',
  'src/game/systems/PowerUpValidator.ts',
  'src/game/systems/__tests__/AudioSystem.test.ts',
  'src/game/systems/__tests__/BlockDestruction.integration.test.ts',
  'src/game/systems/__tests__/BlockManager.test.ts',
  'src/game/systems/__tests__/InputManager.test.ts',
  'src/game/systems/__tests__/MemoryIntegration.test.ts',
  'src/game/systems/__tests__/ParticleSystemEdgeCases.test.ts',
  'src/game/systems/__tests__/ParticleTestHelpers.ts',
  'src/game/systems/__tests__/PowerUpEdgeCaseIntegration.test.ts',
  'src/game/systems/__tests__/PowerUpSpawner.test.ts',
  'src/game/systems/__tests__/PowerUpStateManager.test.ts',
  'src/game/systems/__tests__/PowerUpSystem.test.ts',
  'src/game/utils/ParticlePool.ts',
  'src/hooks/__tests__/useGameEngine.test.ts',
  'src/hooks/__tests__/useGameInput.test.ts',
  'src/hooks/__tests__/useGameStateIntegration.test.ts',
  'src/services/__tests__/AudioService.test.ts',
  'src/stores/uiStore.test.ts',
];

// More specific type replacements
const typeReplacements = [
  // DOM-related any types
  {
    pattern: /style:\s*any/g,
    replacement: 'style: React.CSSProperties',
    description: 'Replace style: any with React.CSSProperties'
  },
  {
    pattern: /\(e:\s*any\)/g,
    replacement: '(e: Event)',
    description: 'Replace (e: any) with (e: Event)'
  },
  {
    pattern: /\(event:\s*any\)/g,
    replacement: '(event: Event)',
    description: 'Replace (event: any) with (event: Event)'
  },
  
  // Promise and async patterns
  {
    pattern: /Promise<any>/g,
    replacement: 'Promise<unknown>',
    description: 'Replace Promise<any> with Promise<unknown>'
  },
  {
    pattern: /:\s*any\s*=>/g,
    replacement: ': unknown =>',
    description: 'Replace : any => with : unknown =>'
  },
  
  // Array patterns
  {
    pattern: /:\s*any\[\]/g,
    replacement: ': unknown[]',
    description: 'Replace : any[] with : unknown[]'
  },
  {
    pattern: /Array<any>/g,
    replacement: 'Array<unknown>',
    description: 'Replace Array<any> with Array<unknown>'
  },
  
  // Object patterns
  {
    pattern: /:\s*{\s*\[key:\s*string\]:\s*any\s*}/g,
    replacement: ': Record<string, unknown>',
    description: 'Replace object index signature with Record<string, unknown>'
  },
  {
    pattern: /\[key:\s*string\]:\s*any/g,
    replacement: '[key: string]: unknown',
    description: 'Replace index signature any with unknown'
  },
  
  // Function parameters
  {
    pattern: /\(([^):]+):\s*any\)/g,
    replacement: '($1: unknown)',
    description: 'Replace function parameter any with unknown'
  },
  {
    pattern: /\(([^):]+):\s*any,/g,
    replacement: '($1: unknown,',
    description: 'Replace function parameter any with unknown (with comma)'
  },
  
  // Generic any remaining
  {
    pattern: /:\s*any(\s|$|;|,|\)|})/g,
    replacement: ': unknown$1',
    description: 'Replace remaining : any with : unknown'
  },
  
  // Cast patterns
  {
    pattern: /\s+as\s+any(\s|;|,|\)|$)/g,
    replacement: ' as unknown$1',
    description: 'Replace as any with as unknown'
  },
  
  // Test-specific patterns
  {
    pattern: /vi\.fn\(\)\.mockReturnValue\(([^)]+)\)\s+as\s+any/g,
    replacement: 'vi.fn().mockReturnValue($1) as unknown',
    description: 'Fix vi.fn mock return value types'
  },
  {
    pattern: /vi\.fn\(\)\.mockResolvedValue\(([^)]+)\)\s+as\s+any/g,
    replacement: 'vi.fn().mockResolvedValue($1) as unknown',
    description: 'Fix vi.fn mock resolved value types'
  },
];

function processFile(filePath) {
  const fullPath = path.resolve(rootDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⏩ Skipping ${filePath} (file not found)`);
    return { skipped: 1 };
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  let changeCount = 0;
  
  // Apply type replacements
  for (const replacement of typeReplacements) {
    const matches = content.match(replacement.pattern);
    if (matches) {
      content = content.replace(replacement.pattern, replacement.replacement);
      changeCount += matches.length;
      console.log(`  ✓ ${replacement.description} (${matches.length} occurrences)`);
    }
  }
  
  // Add React import for CSSProperties if needed
  if (content.includes('React.CSSProperties') && !content.includes('import React') && !content.includes('import * as React')) {
    content = `import React from 'react';\n` + content;
    console.log('  ✓ Added React import for CSSProperties');
    changeCount++;
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed ${filePath} (${changeCount} changes)\n`);
    return { fixed: 1, changes: changeCount };
  } else {
    console.log(`⏩ No changes needed for ${filePath}\n`);
    return { unchanged: 1 };
  }
}

// Main execution
console.log('🔧 Fixing remaining any type errors...\n');

let totalStats = {
  fixed: 0,
  unchanged: 0,
  skipped: 0,
  changes: 0
};

for (const file of filesWithAnyErrors) {
  const stats = processFile(file);
  totalStats.fixed += stats.fixed || 0;
  totalStats.unchanged += stats.unchanged || 0;
  totalStats.skipped += stats.skipped || 0;
  totalStats.changes += stats.changes || 0;
}

console.log('\n📊 Summary:');
console.log(`  Files fixed: ${totalStats.fixed}`);
console.log(`  Files unchanged: ${totalStats.unchanged}`);
console.log(`  Files skipped: ${totalStats.skipped}`);
console.log(`  Total changes: ${totalStats.changes}`);
console.log('\n✨ Any type fixing complete!');