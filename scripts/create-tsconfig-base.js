const fs = require('fs');
const path = require('path');

const basePath = path.join(process.cwd(), 'node_modules', 'expo-module-scripts');
const source = path.join(basePath, 'tsconfig.base.json');
const target = path.join(basePath, 'tsconfig.base');

try {
  if (!fs.existsSync(source)) {
    console.warn('Source tsconfig.base.json not found; cannot create tsconfig.base');
    process.exit(0);
  }
  if (fs.existsSync(target)) {
    return;
  }
  fs.copyFileSync(source, target);
  console.log('Created tsconfig.base shim for expo-module-scripts.');
} catch (error) {
  console.error('Failed to create tsconfig.base shim:', error);
  process.exit(1);
}
