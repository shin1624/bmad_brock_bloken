#!/usr/bin/env node
/**
 * Final aggressive lint error cleanup
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Manual fixes for specific files
const manualFixes = {
  'src/components/game/animations/PowerUpEffects.tsx': (content) => {
    // Fix parsing error at line 391
    if (content.includes('{`')) {
      content = content.replace(/<style>{`/g, '<style>{`\n');
      content = content.replace(/`}<\/style>/g, '\n`}</style>');
    }
    return content;
  },
  
  'src/components/menu/Settings.tsx': (content) => {
    // Remove unused previousScreen
    content = content.replace(/\s*const\s+previousScreen\s*=\s*[^;]+;\s*/g, '');
    return content;
  },
  
  'src/game/core/GameState.test.ts': (content) => {
    // Remove unused imports
    content = content.replace(/import\s+{\s*GameState,\s*GameStateSubscriber\s*}/g, 'import {');
    content = content.replace(/import\s+{\s*}\s+from/g, '// removed empty import');
    return content;
  },
  
  'src/game/debug/DevTools.ts': (content) => {
    // Fix unused _ parameter
    content = content.replace(/\((\w+),\s*_\)/g, '($1, _unused)');
    return content;
  },
  
  'src/game/entities/Entity.ts': (content) => {
    // Prefix deltaTime with underscore
    content = content.replace(/update\(deltaTime:/g, 'update(_deltaTime:');
    return content;
  },
  
  'src/game/entities/Particle.ts': (content) => {
    // Remove unused imports
    content = content.replace(/import\s+{\s*ParticleOptions,\s*Size,\s*ParticleConfig\s*}/g, 'import { ParticleOptions');
    return content;
  },
  
  'src/game/entities/PowerUp.ts': (content) => {
    // Remove unused Vector2D
    content = content.replace(/import\s+{\s*Vector2D\s*}\s+from[^;]+;\s*/g, '');
    return content;
  },
  
  'src/game/entities/__tests__/Paddle.test.ts': (content) => {
    // Remove mockCanvas line
    content = content.replace(/\s*const\s+mockCanvas\s*=\s*[^;]+;\s*/g, '');
    return content;
  },
  
  'src/game/plugins/__tests__/PluginManager.test.ts': (content) => {
    // Remove result assignments
    content = content.replace(/\s*const\s+result\s*=\s*/g, '');
    // Prefix originalState with underscore
    content = content.replace(/\(originalState,/g, '(_originalState,');
    return content;
  },
  
  'src/game/rendering/ParticleBatchRenderer.ts': (content) => {
    // Prefix unused context parameters
    content = content.replace(/drawParticleBatch\(context:/g, 'drawParticleBatch(_context:');
    content = content.replace(/clear\(context:/g, 'clear(_context:');
    content = content.replace(/\s+context:/g, ' _context:');
    return content;
  },
  
  'src/game/rendering/RenderUtils.ts': (content) => {
    // Fix _context already prefixed
    content = content.replace(/_context:/g, '__context:');
    return content;
  },
  
  'src/game/plugins/powerups/BallSpeedPowerUp.ts': (content) => {
    // Fix any types
    content = content.replace(/:\s*any/g, ': unknown');
    return content;
  },
  
  'src/game/plugins/powerups/MultiBallPowerUp.ts': (content) => {
    // Fix any types
    content = content.replace(/:\s*any/g, ': unknown');
    // Remove originalSpeeds
    content = content.replace(/\s*const\s+originalSpeeds\s*=\s*[^;]+;\s*/g, '');
    return content;
  },
  
  'src/game/systems/__tests__/PaddleController.test.ts': (content) => {
    // Remove unused imports
    content = content.replace(/import\s+{\s*Ball\s*}\s+from[^;]+;\s*/g, '');
    content = content.replace(/import\s+{\s*BallConfiguration\s*}\s+from[^;]+;\s*/g, '');
    return content;
  },
  
  'src/game/plugins/powerups/PaddleSizePowerUp.ts': (content) => {
    // Fix any types
    content = content.replace(/:\s*any/g, ': unknown');
    return content;
  },
  
  'src/game/systems/__tests__/ParticleSystemEdgeCases.test.ts': (content) => {
    // Fix error parameter
    content = content.replace(/catch\s*\(\s*error\s*\)/g, 'catch (_error)');
    return content;
  },
  
  'src/game/rendering/Renderer.ts': (content) => {
    // Fix any types
    content = content.replace(/:\s*any/g, ': unknown');
    return content;
  },
  
  'src/game/systems/__tests__/PowerUpOptimization.test.ts': (content) => {
    // Remove Entity import
    content = content.replace(/import\s+{\s*Entity\s*}\s+from[^;]+;\s*/g, '');
    return content;
  },
  
  'src/game/systems/__tests__/PowerUpSpawner.test.ts': (content) => {
    // Fix _particle parameter
    content = content.replace(/\(_particle:/g, '(__particle:');
    return content;
  },
  
  'src/game/systems/__tests__/PowerUpSystem.test.ts': (content) => {
    // Fix _conflictingPowerUps
    content = content.replace(/const\s+_conflictingPowerUps/g, 'const __conflictingPowerUps');
    return content;
  },
  
  'src/game/systems/__tests__/PowerUpValidator.test.ts': (content) => {
    // Fix _error parameter
    content = content.replace(/catch\s*\(\s*_error\s*\)/g, 'catch (__error)');
    return content;
  },
  
  'src/hooks/__tests__/useGameEngine.test.ts': (content) => {
    // Fix powerUp parameter
    content = content.replace(/\(powerUp,\s*/g, '(_powerUp, ');
    return content;
  },
};

// Process files
console.log('🔧 Final lint error cleanup...\n');

let fixedCount = 0;
let unchangedCount = 0;

for (const [filePath, fixFn] of Object.entries(manualFixes)) {
  const fullPath = path.resolve(rootDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⏩ Skipping ${path.basename(filePath)} (not found)`);
    continue;
  }
  
  const originalContent = fs.readFileSync(fullPath, 'utf8');
  const fixedContent = fixFn(originalContent);
  
  if (fixedContent !== originalContent) {
    fs.writeFileSync(fullPath, fixedContent, 'utf8');
    console.log(`✅ Fixed ${path.basename(filePath)}`);
    fixedCount++;
  } else {
    console.log(`⏩ No changes for ${path.basename(filePath)}`);
    unchangedCount++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`  Files fixed: ${fixedCount}`);
console.log(`  Files unchanged: ${unchangedCount}`);
console.log('\n✨ Final cleanup complete!');