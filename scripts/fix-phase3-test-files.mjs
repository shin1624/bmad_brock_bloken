#!/usr/bin/env node
/**
 * Phase 3: Fix all remaining test file lint errors
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Test files to process
const testFiles = [
  'src/game/systems/__tests__/PaddleController.test.ts',
  'src/game/systems/__tests__/BlockManager.test.ts',
  'src/game/systems/__tests__/PowerUpConflictResolver.test.ts',
  'src/game/systems/__tests__/PowerUpOptimization.test.ts',
  'src/game/systems/__tests__/PowerUpValidator.test.ts',
  'src/game/systems/__tests__/ParticleSystemStable.test.ts',
  'src/game/systems/__tests__/PowerUpSpawner.test.ts',
  'src/game/systems/__tests__/PowerUpSystem.test.ts',
  'src/game/systems/__tests__/BlockDestruction.integration.test.ts',
  'src/game/systems/__tests__/AudioSystem.test.ts',
  'src/game/systems/__tests__/InputManager.test.ts',
  'src/game/systems/__tests__/MemoryIntegration.test.ts',
  'src/game/systems/__tests__/ParticleSystemEdgeCases.test.ts',
  'src/game/systems/__tests__/PowerUpEdgeCaseIntegration.test.ts',
  'src/game/systems/__tests__/PowerUpStateManager.test.ts',
  'src/game/systems/__tests__/ParticleTestHelpers.ts',
  // Other test files
  'src/game/entities/__tests__/Paddle.test.ts',
  'src/game/entities/__tests__/PowerUp.test.ts',
  'src/game/plugins/__tests__/PluginManager.test.ts',
  'src/game/rendering/__tests__/Renderer.test.ts',
  'src/hooks/__tests__/useGameEngine.test.ts',
  'src/hooks/__tests__/useGameInput.test.ts',
  'src/hooks/__tests__/useGameStateIntegration.test.ts',
  'src/services/__tests__/AudioService.test.ts',
  'src/stores/uiStore.test.ts',
];

// Common fixes for test files
const commonFixes = [
  // Fix any types
  {
    pattern: /(\s+as\s+)any(\s|;|,|\)|$)/g,
    replacement: '$1unknown$2',
  },
  {
    pattern: /:\s*any(\s|$|;|,|\)|})/g,
    replacement: ': unknown$1',
  },
  {
    pattern: /<any>/g,
    replacement: '<unknown>',
  },
  
  // Fix mock types
  {
    pattern: /vi\.fn\(\)\s+as\s+any/g,
    replacement: 'vi.fn() as unknown',
  },
  {
    pattern: /vi\.spyOn\(([^)]+)\)\s+as\s+any/g,
    replacement: 'vi.spyOn($1) as unknown',
  },
  
  // Remove unused imports
  {
    pattern: /^import\s+{\s*fireEvent\s*}\s+from\s+['"]@testing-library\/react['"];?\s*$/gm,
    replacement: '',
  },
];

// Specific file fixes
const specificFixes = {
  'PaddleController.test.ts': (content) => {
    // Remove unused Ball and BallConfiguration imports
    content = content.replace(/import\s+{\s*Ball\s*}\s+from[^;]+;/g, '');
    content = content.replace(/import\s+{\s*BallConfiguration\s*}\s+from[^;]+;/g, '');
    return content;
  },
  
  'BlockManager.test.ts': (content) => {
    // Fix any type assertions
    content = content.replace(/mockBlockTypes\s+as\s+any/g, 'mockBlockTypes as unknown');
    return content;
  },
  
  'AudioSystem.test.ts': (content) => {
    // Fix HTMLAudioElement mocks
    content = content.replace(/HTMLAudioElement\s+as\s+any/g, 'HTMLAudioElement as unknown');
    return content;
  },
  
  'InputManager.test.ts': (content) => {
    // Fix event mocks
    content = content.replace(/new\s+KeyboardEvent\([^)]+\)\s+as\s+any/g, 
                             'new KeyboardEvent($1) as KeyboardEvent');
    return content;
  },
  
  'PowerUpSpawner.test.ts': (content) => {
    // Fix unused particle parameter
    content = content.replace(/\(_particle:/g, '(__particle:');
    return content;
  },
  
  'PowerUpSystem.test.ts': (content) => {
    // Fix unused _conflictingPowerUps
    content = content.replace(/const\s+_conflictingPowerUps/g, 'const __conflictingPowerUps');
    return content;
  },
  
  'PowerUpValidator.test.ts': (content) => {
    // Fix catch error parameters
    content = content.replace(/catch\s*\(\s*_error\s*\)/g, 'catch (__error)');
    return content;
  },
  
  'useGameEngine.test.ts': (content) => {
    // Fix unused powerUp parameter
    content = content.replace(/\(powerUp,\s*_context\)/g, '(_powerUp, __context)');
    return content;
  },
  
  'useGameInput.test.ts': (content) => {
    // Fix unused context parameters
    content = content.replace(/,\s*_context\)/g, ', __context)');
    return content;
  },
  
  'Paddle.test.ts': (content) => {
    // Remove unused mockCanvas
    content = content.replace(/const\s+mockCanvas\s*=\s*[^;]+;\s*\n/g, '');
    return content;
  },
  
  'PluginManager.test.ts': (content) => {
    // Remove unused result assignments
    content = content.replace(/const\s+result\s*=\s+(.+);/g, '$1;');
    // Fix originalState parameter
    content = content.replace(/\(originalState,/g, '(_originalState,');
    return content;
  },
  
  'ParticleSystemEdgeCases.test.ts': (content) => {
    // Fix catch error blocks
    content = content.replace(/catch\s*\(\s*error\s*\)/g, 'catch (_error)');
    return content;
  },
  
  'PowerUpOptimization.test.ts': (content) => {
    // Remove unused Entity import
    content = content.replace(/import\s+{\s*Entity\s*}\s+from[^;]+;/g, '');
    return content;
  },
};

function processFile(filePath) {
  const fullPath = path.resolve(rootDir, filePath);
  const fileName = path.basename(filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⏩ Skipping ${fileName} (not found)`);
    return { skipped: 1 };
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  let changeCount = 0;
  
  // Apply common fixes
  for (const fix of commonFixes) {
    const matches = content.match(fix.pattern);
    if (matches) {
      content = content.replace(fix.pattern, fix.replacement);
      changeCount += matches.length;
    }
  }
  
  // Apply specific fixes if available
  const baseName = fileName.replace('.ts', '').replace('.tsx', '');
  if (specificFixes[baseName]) {
    const newContent = specificFixes[baseName](content);
    if (newContent !== content) {
      content = newContent;
      changeCount++;
    }
  }
  
  // Add vi import if missing but used
  if (content.includes('vi.') && !content.includes('import { vi')) {
    content = content.replace(
      /^import\s+{([^}]+)}\s+from\s+['"]vitest['"];?/m,
      (match, imports) => {
        const importList = imports.split(',').map(s => s.trim());
        if (!importList.includes('vi')) {
          importList.push('vi');
        }
        return `import { ${importList.join(', ')} } from 'vitest';`;
      }
    );
    
    // If no vitest import exists at all
    if (!content.includes('from \'vitest\'') && !content.includes('from "vitest"')) {
      content = `import { vi } from 'vitest';\n` + content;
    }
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed ${fileName} (${changeCount} changes)`);
    return { fixed: 1, changes: changeCount };
  } else {
    console.log(`⏩ No changes for ${fileName}`);
    return { unchanged: 1 };
  }
}

// Main execution
console.log('🔧 Phase 3: Fixing test file lint errors...\n');

let stats = {
  fixed: 0,
  unchanged: 0,
  skipped: 0,
  changes: 0
};

for (const file of testFiles) {
  const result = processFile(file);
  stats.fixed += result.fixed || 0;
  stats.unchanged += result.unchanged || 0;
  stats.skipped += result.skipped || 0;
  stats.changes += result.changes || 0;
}

console.log('\n📊 Summary:');
console.log(`  Files fixed: ${stats.fixed}`);
console.log(`  Files unchanged: ${stats.unchanged}`);
console.log(`  Files skipped: ${stats.skipped}`);
console.log(`  Total changes: ${stats.changes}`);
console.log('\n✨ Phase 3 complete!');