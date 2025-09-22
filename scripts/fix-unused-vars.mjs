#!/usr/bin/env node
/**
 * Script to fix unused variable errors
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Specific fixes for each file
const fileFixes = {
  'src/components/menu/Settings.tsx': (content) => {
    // Remove unused previousScreen
    content = content.replace(/^\s*const\s+previousScreen\s*=.*?;\s*$/gm, '');
    return content;
  },
  
  'src/game/core/GameState.test.ts': (content) => {
    // Remove unused imports
    content = content.replace(/^import\s+{\s*GameState,\s*GameStateSubscriber\s*}\s+from/, 'import {') || content;
    // If the import becomes empty, remove it
    content = content.replace(/^import\s+{\s*}\s+from\s+.*$/gm, '');
    return content;
  },
  
  'src/game/debug/CollisionDebugger.ts': (content) => {
    // Remove unused CollisionInfo import
    content = content.replace(/,\s*CollisionInfo/, '');
    content = content.replace(/CollisionInfo,\s*/, '');
    return content;
  },
  
  'src/game/debug/DevTools.ts': (content) => {
    // Remove unused GameEventType import
    content = content.replace(/,\s*GameEventType/, '');
    content = content.replace(/GameEventType,\s*/, '');
    // Replace _ with _value for unused parameters
    content = content.replace(/\((\w+),\s*_\)/g, '($1, _value)');
    return content;
  },
  
  'src/game/entities/Entity.ts': (content) => {
    // Prefix deltaTime with underscore
    content = content.replace(/update\(deltaTime:/g, 'update(_deltaTime:');
    return content;
  },
  
  'src/game/entities/Particle.ts': (content) => {
    // Remove unused Size and ParticleConfig imports
    content = content.replace(/,\s*Size/, '');
    content = content.replace(/Size,\s*/, '');
    content = content.replace(/,\s*ParticleConfig/, '');
    content = content.replace(/ParticleConfig,\s*/, '');
    return content;
  },
  
  'src/game/entities/PowerUp.ts': (content) => {
    // Remove unused Vector2D import
    content = content.replace(/^import\s+{\s*Vector2D\s*}\s+from\s+.*$/gm, '');
    return content;
  },
  
  'src/game/entities/__tests__/Paddle.test.ts': (content) => {
    // Remove unused mockCanvas
    content = content.replace(/^\s*const\s+mockCanvas\s*=.*?;\s*$/gm, '');
    return content;
  },
  
  'src/game/plugins/PluginManager.ts': (content) => {
    // Fix generic type T not used
    content = content.replace(/<T>\(/g, '(');
    return content;
  },
  
  'src/game/plugins/__tests__/PluginManager.test.ts': (content) => {
    // Remove unused result assignment
    content = content.replace(/^\s*const\s+result\s*=\s*(.+);/gm, '$1;');
    // Prefix originalState with underscore
    content = content.replace(/\(originalState,/g, '(_originalState,');
    return content;
  },
  
  'src/game/rendering/ParticleBatchRenderer.ts': (content) => {
    // Prefix unused context parameters with underscore
    content = content.replace(/drawParticleBatch\(context:/g, 'drawParticleBatch(_context:');
    content = content.replace(/clear\(context:/g, 'clear(_context:');
    return content;
  },
  
  'src/game/rendering/RenderUtils.ts': (content) => {
    // Prefix unused _context parameter
    content = content.replace(/\(_context:/g, '(__context:');
    return content;
  },
  
  'src/game/plugins/powerups/__tests__/MultiBallPowerUp.test.ts': (content) => {
    // Remove unused originalSpeeds
    content = content.replace(/^\s*const\s+originalSpeeds\s*=.*?;\s*$/gm, '');
    return content;
  },
  
  'src/game/systems/__tests__/PaddleController.test.ts': (content) => {
    // Remove unused imports
    content = content.replace(/^import\s+{\s*Ball\s*}\s+from/, 'import {') || content;
    content = content.replace(/^import\s+{\s*BallConfiguration\s*}\s+from/, 'import {') || content;
    // Clean up empty imports
    content = content.replace(/^import\s+{\s*}\s+from\s+.*$/gm, '');
    return content;
  },
  
  'src/game/systems/__tests__/ParticleSystemEdgeCases.test.ts': (content) => {
    // Prefix error with underscore in catch blocks
    content = content.replace(/catch\s*\(\s*error\s*\)/g, 'catch (_error)');
    return content;
  },
  
  'src/game/systems/__tests__/PowerUpOptimization.test.ts': (content) => {
    // Remove unused Entity import
    content = content.replace(/^import\s+{\s*Entity\s*}\s+from/, 'import {') || content;
    content = content.replace(/^import\s+{\s*}\s+from\s+.*$/gm, '');
    return content;
  },
  
  'src/game/systems/__tests__/PowerUpSpawner.test.ts': (content) => {
    // Prefix _particle with double underscore
    content = content.replace(/\(_particle:/g, '(__particle:');
    return content;
  },
  
  'src/game/systems/__tests__/PowerUpSystem.test.ts': (content) => {
    // Prefix _conflictingPowerUps with double underscore
    content = content.replace(/const\s+_conflictingPowerUps\s*=/g, 'const __conflictingPowerUps =');
    return content;
  },
  
  'src/game/systems/__tests__/PowerUpValidator.test.ts': (content) => {
    // Prefix _error with double underscore
    content = content.replace(/catch\s*\(\s*_error\s*\)/g, 'catch (__error)');
    return content;
  },
  
  'src/hooks/__tests__/useGameEngine.test.ts': (content) => {
    // Prefix unused parameters with underscore
    content = content.replace(/\(powerUp,\s*_context\)/g, '(_powerUp, _context)');
    return content;
  },
  
  'src/hooks/__tests__/useGameInput.test.ts': (content) => {
    // Prefix unused _context parameters
    content = content.replace(/,\s*_context\)/g, ', __context)');
    return content;
  },
};

// Process each file
console.log('🔧 Fixing unused variable errors...\n');

let fixedCount = 0;
let unchangedCount = 0;

for (const [relPath, fixFn] of Object.entries(fileFixes)) {
  const fullPath = path.resolve(rootDir, relPath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⏩ Skipping ${relPath} (file not found)`);
    continue;
  }
  
  const originalContent = fs.readFileSync(fullPath, 'utf8');
  const fixedContent = fixFn(originalContent);
  
  if (fixedContent !== originalContent) {
    fs.writeFileSync(fullPath, fixedContent, 'utf8');
    console.log(`✅ Fixed ${relPath}`);
    fixedCount++;
  } else {
    console.log(`⏩ No changes for ${relPath}`);
    unchangedCount++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`  Files fixed: ${fixedCount}`);
console.log(`  Files unchanged: ${unchangedCount}`);
console.log('\n✨ Unused variable fixing complete!');