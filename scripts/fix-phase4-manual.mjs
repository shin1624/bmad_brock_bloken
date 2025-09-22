#!/usr/bin/env node
/**
 * Phase 4: Manual fixes for complex type definitions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Specific manual fixes for complex types
const complexTypeFixes = {
  'src/game/plugins/powerups/PowerUpRegistry.ts': (content) => {
    // Import PowerUpPlugin if not already imported
    if (!content.includes('import { PowerUpPlugin }')) {
      content = content.replace(
        'import { PowerUpType } from "../../entities/PowerUp";',
        'import { PowerUpType } from "../../entities/PowerUp";\nimport { PowerUpPlugin } from "../PowerUpPlugin";'
      );
    }
    // Fix Map<string, any> to Map<string, PowerUpPlugin>
    content = content.replace(
      /private registeredPlugins: Map<string, any> = new Map\(\);/,
      'private registeredPlugins: Map<string, PowerUpPlugin> = new Map();'
    );
    // Fix return types
    content = content.replace(
      /public getPlugin\(id: string\): any \| null \{/,
      'public getPlugin(id: string): PowerUpPlugin | null {'
    );
    content = content.replace(
      /public getPluginByType\(type: PowerUpType, variant\?: string\): any \| null \{/,
      'public getPluginByType(type: PowerUpType, variant?: string): PowerUpPlugin | null {'
    );
    // Fix parameter type
    content = content.replace(
      /private async registerPlugin\(id: string, plugin: unknown\): Promise<void> \{/,
      'private async registerPlugin(id: string, plugin: PowerUpPlugin): Promise<void> {'
    );
    return content;
  },

  'src/components/menu/Settings.tsx': (content) => {
    // Remove unused previousScreen variable
    content = content.replace(/\s*const previousScreen = [^;]+;\s*/g, '');
    return content;
  },

  'src/components/game/animations/PowerUpEffects.tsx': (content) => {
    // Fix style jsx syntax issue
    if (content.includes('<style>{`') && !content.includes('<style jsx>{`')) {
      content = content.replace(/<style>\{`/g, '<style jsx>{`');
    }
    return content;
  },

  'src/game/core/GameState.test.ts': (content) => {
    // Remove unused imports
    content = content.replace(
      /import { GameState, GameStateSubscriber }/g,
      'import {'
    );
    content = content.replace(/import { }\s+from/g, '// removed empty import');
    return content;
  },

  'src/game/debug/DevTools.ts': (content) => {
    // Rename unused _ parameter
    content = content.replace(/\((\w+), _\)/g, '($1, _unused)');
    return content;
  },

  'src/game/entities/Entity.ts': (content) => {
    // Prefix unused deltaTime
    content = content.replace(/update\(deltaTime:/g, 'update(_deltaTime:');
    return content;
  },

  'src/game/entities/Particle.ts': (content) => {
    // Remove unused imports Size and ParticleConfig
    content = content.replace(
      /import { ParticleOptions, Size, ParticleConfig }/g,
      'import { ParticleOptions }'
    );
    return content;
  },

  'src/game/entities/PowerUp.ts': (content) => {
    // Remove unused Vector2D import
    content = content.replace(/import { Vector2D } from[^;]+;\s*/g, '');
    return content;
  },

  'src/game/plugins/powerups/__tests__/BallSpeedPowerUp.test.ts': (content) => {
    // Fix any types in test mocks
    content = content.replace(/:\s*any/g, ': unknown');
    content = content.replace(/as\s+any/g, 'as unknown');
    return content;
  },

  'src/game/rendering/RenderUtils.ts': (content) => {
    // Fix _context parameter naming
    content = content.replace(/_context:/g, '__context:');
    return content;
  },

  'src/game/rendering/ParticleBatchRenderer.ts': (content) => {
    // Fix context parameter naming
    content = content.replace(/drawParticleBatch\(context:/g, 'drawParticleBatch(_context:');
    content = content.replace(/clear\(context:/g, 'clear(_context:');
    content = content.replace(/\s+context:/g, ' _context:');
    return content;
  },

  'src/hooks/useGameState.ts': (content) => {
    // Fix any types with proper GameState type
    content = content.replace(/:\s*any/g, ': unknown');
    // Add proper typing for game state
    if (content.includes('useState') && !content.includes('GameState | null')) {
      content = content.replace(
        /useState<any>/g,
        'useState<GameState | null>'
      );
    }
    return content;
  },

  'src/utils/inputValidation.test.ts': (content) => {
    // Fix any types in test
    content = content.replace(/:\s*any/g, ': unknown');
    content = content.replace(/as\s+any/g, 'as unknown');
    return content;
  },

  'src/game/entities/__tests__/Paddle.test.ts': (content) => {
    // Remove unused mockCanvas
    content = content.replace(/\s*const mockCanvas = [^;]+;\s*/g, '');
    return content;
  },

  'src/game/plugins/__tests__/PluginManager.test.ts': (content) => {
    // Remove result assignment
    content = content.replace(/\s*const result = /g, '');
    // Fix unused originalState
    content = content.replace(/\(originalState,/g, '(_originalState,');
    return content;
  },

  'src/game/plugins/powerups/__tests__/MultiBallPowerUp.test.ts': (content) => {
    // Remove unused originalSpeeds
    content = content.replace(/\s*const originalSpeeds = [^;]+;\s*/g, '');
    return content;
  },

  'src/game/systems/__tests__/PaddleController.test.ts': (content) => {
    // Remove unused imports
    content = content.replace(/import { Ball } from[^;]+;\s*/g, '');
    content = content.replace(/import { BallConfiguration } from[^;]+;\s*/g, '');
    return content;
  },

  'src/game/systems/__tests__/ParticleSystemEdgeCases.test.ts': (content) => {
    // Fix error parameter
    content = content.replace(/catch \(error\)/g, 'catch (_error)');
    return content;
  },

  'src/game/systems/__tests__/PowerUpOptimization.test.ts': (content) => {
    // Remove Entity import
    content = content.replace(/import { Entity } from[^;]+;\s*/g, '');
    return content;
  },

  'src/game/systems/__tests__/PowerUpSpawner.test.ts': (content) => {
    // Fix _particle parameter
    content = content.replace(/\(_particle:/g, '(__particle:');
    return content;
  },

  'src/game/systems/__tests__/PowerUpSystem.test.ts': (content) => {
    // Fix _conflictingPowerUps
    content = content.replace(/const _conflictingPowerUps/g, 'const __conflictingPowerUps');
    return content;
  },

  'src/game/systems/__tests__/PowerUpValidator.test.ts': (content) => {
    // Fix _error parameter
    content = content.replace(/catch \(_error\)/g, 'catch (__error)');
    return content;
  },

  'src/hooks/__tests__/useGameEngine.test.ts': (content) => {
    // Fix powerUp parameter
    content = content.replace(/\(powerUp,\s*/g, '(_powerUp, ');
    return content;
  }
};

// Process files
console.log('🔧 Phase 4: Manual fixes for complex type definitions...\n');

let fixedCount = 0;
let unchangedCount = 0;
let errorCount = 0;

for (const [filePath, fixFn] of Object.entries(complexTypeFixes)) {
  const fullPath = path.resolve(rootDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⏩ Skipping ${path.basename(filePath)} (not found)`);
    continue;
  }
  
  try {
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
  } catch (error) {
    console.error(`❌ Error fixing ${path.basename(filePath)}: ${error.message}`);
    errorCount++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`  Files fixed: ${fixedCount}`);
console.log(`  Files unchanged: ${unchangedCount}`);
console.log(`  Errors: ${errorCount}`);
console.log('\n✨ Phase 4 manual fixes complete!');