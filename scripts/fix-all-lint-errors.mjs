#!/usr/bin/env node
/**
 * Comprehensive lint error fixing script
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Files to process
const filesToProcess = [
  // Components
  'src/components/game/animations/PowerUpAnimations.tsx',
  'src/components/game/animations/PowerUpEffects.tsx',
  'src/components/menu/Settings.tsx',
  
  // Game core
  'src/game/bridges/StateBridge.ts',
  'src/game/core/EventBus.ts',
  'src/game/debug/CollisionDebugger.ts',
  'src/game/debug/DevTools.ts',
  
  // Entities
  'src/game/entities/Block.ts',
  'src/game/entities/Entity.ts',
  'src/game/entities/Particle.ts',
  'src/game/entities/PowerUp.ts',
  
  // Plugins
  'src/game/plugins/PluginManager.ts',
  'src/game/plugins/PowerUpPlugin.ts',
  'src/game/plugins/powerups/BallSpeedPowerUp.ts',
  'src/game/plugins/powerups/MultiBallPowerUp.ts',
  'src/game/plugins/powerups/PaddleSizePowerUp.ts',
  'src/game/plugins/powerups/PowerUpRegistry.ts',
  
  // Rendering
  'src/game/rendering/ParticleBatchRenderer.ts',
  'src/game/rendering/RenderUtils.ts',
  
  // Test files
  'src/game/core/GameState.test.ts',
  'src/game/debug/DevTools.test.ts',
  'src/game/entities/__tests__/Paddle.test.ts',
  'src/game/entities/__tests__/PowerUp.test.ts',
  'src/game/plugins/__tests__/PluginManager.test.ts',
  'src/game/plugins/powerups/__tests__/BallSpeedPowerUp.test.ts',
  'src/game/plugins/powerups/__tests__/MultiBallPowerUp.test.ts',
  'src/game/plugins/powerups/__tests__/PaddleSizePowerUp.test.ts',
  'src/game/rendering/ParticleBatchRenderer.test.ts',
  'src/game/rendering/Renderer.test.ts',
  'src/game/rendering/__tests__/Renderer.test.ts',
];

// Fix patterns
const fixes = [
  // Replace 'as any' with 'as unknown'
  {
    pattern: /(\s+as\s+)any(\s|;|,|\)|$)/g,
    replacement: '$1unknown$2',
    description: 'Replace "as any" with "as unknown"'
  },
  
  // Replace function parameter ': any' with ': unknown'
  {
    pattern: /(\w+):\s*any(\s*[,\)])/g,
    replacement: '$1: unknown$2',
    description: 'Replace parameter ": any" with ": unknown"'
  },
  
  // Replace array type 'any[]' with 'unknown[]'
  {
    pattern: /:\s*any\[\]/g,
    replacement: ': unknown[]',
    description: 'Replace "any[]" with "unknown[]"'
  },
  
  // Replace generic 'any' with 'unknown'
  {
    pattern: /<any>/g,
    replacement: '<unknown>',
    description: 'Replace "<any>" with "<unknown>"'
  },
  
  // Remove unused imports (simple cases)
  {
    pattern: /^import\s+{\s*([^}]*?)\s*}\s+from\s+['"][^'"]+['"];?\s*\/\/\s*@ts-expect-error.*$/gm,
    replacement: '',
    description: 'Remove commented out imports'
  },
];

// Special case fixes for specific patterns
const specialFixes = {
  // Fix Window interface extensions
  'src/game/': (content) => {
    // Add Window interface declaration if missing
    if (content.includes('Window.') && !content.includes('declare global')) {
      const importSection = content.match(/^(import[\s\S]*?)\n\n/m);
      if (importSection) {
        const insertion = `
declare global {
  interface Window {
    gameStateManager?: any;
    gameEngine?: any;
  }
}
`;
        content = content.replace(importSection[0], importSection[0] + insertion + '\n');
      }
    }
    return content;
  },
  
  // Fix test file specific patterns
  '.test.': (content) => {
    // Remove unused fireEvent imports
    content = content.replace(/^import\s+{\s*fireEvent\s*}\s+from\s+['"]@testing-library\/react['"];?\s*$/gm, '');
    
    // Fix vi imports
    if (content.includes('vi.') && !content.includes('import { vi }')) {
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
    }
    
    return content;
  },
  
  // Fix specific file issues
  'PowerUpAnimations.tsx': (content) => {
    // Remove unused PowerUpType import if not used
    const powerUpTypeUsageCount = (content.match(/PowerUpType\./g) || []).length;
    const powerUpTypeImportCount = (content.match(/PowerUpType/g) || []).length;
    if (powerUpTypeImportCount === 1 && powerUpTypeUsageCount === 0) {
      content = content.replace(/^import\s+{\s*PowerUpType\s*}\s+from\s+.*$/gm, '');
    }
    return content;
  },
  
  'Settings.tsx': (content) => {
    // Remove unused previousScreen variable
    content = content.replace(/^\s*const\s+previousScreen\s*=.*$/gm, '// previousScreen removed - unused');
    return content;
  },
};

// Process a single file
function processFile(filePath) {
  const fullPath = path.resolve(rootDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⏩ Skipping ${filePath} (file not found)`);
    return { skipped: 1 };
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;
  let changeCount = 0;
  
  // Apply general fixes
  for (const fix of fixes) {
    const matches = content.match(fix.pattern);
    if (matches) {
      content = content.replace(fix.pattern, fix.replacement);
      changeCount += matches.length;
      console.log(`  ✓ ${fix.description} (${matches.length} occurrences)`);
    }
  }
  
  // Apply special fixes
  for (const [pattern, fixFn] of Object.entries(specialFixes)) {
    if (filePath.includes(pattern)) {
      const newContent = fixFn(content);
      if (newContent !== content) {
        content = newContent;
        changeCount++;
        console.log(`  ✓ Applied special fix for ${pattern}`);
      }
    }
  }
  
  // Write back if changed
  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Fixed ${filePath} (${changeCount} changes)`);
    return { fixed: 1, changes: changeCount };
  } else {
    console.log(`⏩ No changes needed for ${filePath}`);
    return { unchanged: 1 };
  }
}

// Main execution
console.log('🔧 Starting comprehensive lint error fixing...\n');

let totalStats = {
  fixed: 0,
  unchanged: 0,
  skipped: 0,
  changes: 0
};

for (const file of filesToProcess) {
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
console.log('\n✨ Lint fixing complete!');