#!/usr/bin/env node
/**
 * Phase 4: Fix remaining unused variables and parsing errors
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Get current lint errors
console.log('📊 Analyzing current lint errors...');
const lintOutput = execSync('npm run lint 2>&1 || true', { 
  cwd: rootDir, 
  encoding: 'utf8',
  maxBuffer: 1024 * 1024 * 10 
});

// Parse errors by file
const errorsByFile = new Map();
const lines = lintOutput.split('\n');

let currentFile = null;
for (const line of lines) {
  if (line.startsWith('/')) {
    currentFile = line.trim();
    if (!errorsByFile.has(currentFile)) {
      errorsByFile.set(currentFile, []);
    }
  } else if (currentFile && line.includes('error')) {
    errorsByFile.get(currentFile).push(line);
  }
}

console.log(`Found errors in ${errorsByFile.size} files\n`);

// Fix function for each problematic file
const fixes = {
  'PowerUpEffects.tsx': (content, errors) => {
    // Fix parsing error - ensure style jsx is properly formatted
    if (errors.some(e => e.includes('Parsing error'))) {
      // Ensure the style tag is properly closed
      content = content.replace(/<style>\{`([^`]*)`\}<\/style>/g, '<style jsx>{`$1`}</style>');
    }
    return content;
  },

  'Settings.tsx': (content, errors) => {
    // Remove previousScreen variable
    if (errors.some(e => e.includes('previousScreen'))) {
      content = content.replace(/^\s*const\s+previousScreen\s*=.*?;\s*$/gm, '');
    }
    return content;
  },

  'GameState.test.ts': (content, errors) => {
    // Remove unused GameState and GameStateSubscriber imports
    if (errors.some(e => e.includes('GameState') || e.includes('GameStateSubscriber'))) {
      // Find the import line and remove the unused items
      content = content.replace(
        /import\s*\{[^}]*\}\s*from\s*['"]\.\.\/GameState['"];?/gm,
        (match) => {
          // Extract imported items
          const items = match.match(/\{([^}]*)\}/)?.[1] || '';
          const importList = items.split(',').map(s => s.trim())
            .filter(s => !['GameState', 'GameStateSubscriber'].includes(s));
          
          if (importList.length === 0) {
            return ''; // Remove entire import if empty
          }
          return `import { ${importList.join(', ')} } from '../GameState';`;
        }
      );
    }
    return content;
  },

  'DevTools.ts': (content, errors) => {
    // Fix unused _ parameter
    if (errors.some(e => e.includes("'_' is defined but never used"))) {
      content = content.replace(/\(([^,)]+),\s*_\)/g, '($1, _value)');
    }
    return content;
  },

  'Entity.ts': (content, errors) => {
    // Prefix unused deltaTime
    if (errors.some(e => e.includes('deltaTime'))) {
      content = content.replace(/update\(deltaTime:/g, 'update(_deltaTime:');
    }
    return content;
  },

  'Particle.ts': (content, errors) => {
    // Remove unused Size import
    if (errors.some(e => e.includes('Size'))) {
      content = content.replace(/,\s*Size(?=[,\s}])/g, '');
      content = content.replace(/Size,\s*/g, '');
    }
    return content;
  },

  'PowerUp.ts': (content, errors) => {
    // Remove unused Vector2D import
    if (errors.some(e => e.includes('Vector2D'))) {
      content = content.replace(/^import\s*\{\s*Vector2D\s*\}\s*from.*$/gm, '');
    }
    return content;
  },

  'Paddle.test.ts': (content, errors) => {
    // Remove mockCanvas variable
    if (errors.some(e => e.includes('mockCanvas'))) {
      content = content.replace(/^\s*const\s+mockCanvas\s*=.*?;\s*$/gm, '');
    }
    return content;
  },

  'PluginManager.test.ts': (content, errors) => {
    // Remove result variable by executing directly
    if (errors.some(e => e.includes('result'))) {
      content = content.replace(/const\s+result\s*=\s*([^;]+);/g, '$1;');
    }
    // Fix originalState parameter
    if (errors.some(e => e.includes('originalState'))) {
      content = content.replace(/\(originalState([,)])/g, '(_originalState$1');
    }
    return content;
  },

  'ParticleBatchRenderer.ts': (content, errors) => {
    // Fix context parameters
    if (errors.some(e => e.includes('context'))) {
      content = content.replace(/(\w+)\(context:/g, '$1(_context:');
      content = content.replace(/,\s*context:/g, ', _context:');
    }
    // Fix _context if already prefixed
    if (errors.some(e => e.includes('_context'))) {
      content = content.replace(/_context:/g, '__context:');
    }
    return content;
  },

  'RenderUtils.ts': (content, errors) => {
    // Fix _context parameter
    if (errors.some(e => e.includes('_context'))) {
      content = content.replace(/_context:/g, '__context:');
    }
    return content;
  },

  'MultiBallPowerUp.test.ts': (content, errors) => {
    // Remove originalSpeeds variable
    if (errors.some(e => e.includes('originalSpeeds'))) {
      content = content.replace(/^\s*const\s+originalSpeeds\s*=.*?;\s*$/gm, '');
    }
    return content;
  },

  'PaddleController.test.ts': (content, errors) => {
    // Remove unused Ball import
    if (errors.some(e => e.includes('Ball'))) {
      content = content.replace(/^import\s*\{\s*Ball\s*\}\s*from.*$/gm, '');
    }
    // Remove unused BallConfiguration import
    if (errors.some(e => e.includes('BallConfiguration'))) {
      content = content.replace(/^import\s*\{\s*BallConfiguration\s*\}\s*from.*$/gm, '');
    }
    return content;
  }
};

// Process files with errors
let fixedCount = 0;
let failedCount = 0;

for (const [filePath, fileErrors] of errorsByFile) {
  const fileName = path.basename(filePath);
  const fixKey = Object.keys(fixes).find(key => fileName.includes(key));
  
  if (!fixKey) {
    continue; // No fix available for this file
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fixedContent = fixes[fixKey](content, fileErrors);
    
    if (fixedContent !== content) {
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      console.log(`✅ Fixed ${fileName}`);
      fixedCount++;
    }
  } catch (error) {
    console.error(`❌ Failed to fix ${fileName}: ${error.message}`);
    failedCount++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`  Files fixed: ${fixedCount}`);
console.log(`  Files failed: ${failedCount}`);
console.log('\n✨ Phase 4 remaining fixes complete!');