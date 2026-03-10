// Native module loader for claude-code-native
// Loads the appropriate .node file based on platform

const { platform, arch } = process;
const fs = require('fs');
const path = require('path');

// List all .node files in the native directory
const nativeDir = __dirname;
const nodeFiles = fs.readdirSync(nativeDir).filter(f => f.endsWith('.node'));

// Find the matching file for current platform
let nativeBinding = null;

// Try to find a file matching our platform
for (const file of nodeFiles) {
  // Check for darwin-arm64
  if (platform === 'darwin' && arch === 'arm64' && file.includes('darwin') && file.includes('arm64')) {
    nativeBinding = require(path.join(nativeDir, file));
    break;
  }
  // Check for darwin-x64
  if (platform === 'darwin' && arch === 'x64' && file.includes('darwin') && (file.includes('x64') && !file.includes('arm64'))) {
    nativeBinding = require(path.join(nativeDir, file));
    break;
  }
  // Check for linux-x64
  if (platform === 'linux' && arch === 'x64' && file.includes('linux') && file.includes('x64')) {
    nativeBinding = require(path.join(nativeDir, file));
    break;
  }
  // Check for win32-x64
  if (platform === 'win32' && arch === 'x64' && file.includes('win32') && file.includes('x64')) {
    nativeBinding = require(path.join(nativeDir, file));
    break;
  }
}

if (!nativeBinding) {
  throw new Error(`Unsupported platform: ${platform}-${arch}. Available files: ${nodeFiles.join(', ')}`);
}

module.exports = nativeBinding;
