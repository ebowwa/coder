// Native module loader for claude-code-native
// Loads the appropriate .node file based on platform

const { platform, arch } = process;

let nativeBinding;

try {
  switch (`${platform}-${arch}`) {
    case 'darwin-x64':
      nativeBinding = require('./claude_code_native.darwin-x64.node');
      break;
    case 'darwin-arm64':
      nativeBinding = require('./index.darwin-arm64.node');
      break;
    case 'linux-x64':
      nativeBinding = require('./index.linux-x64-gnu.node');
      break;
    case 'win32-x64':
      nativeBinding = require('./claude_code_native.win32-x64-msvc.node');
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}-${arch}`);
  }
} catch (e) {
  throw new Error(`Failed to load native module: ${e.message}`);
}

module.exports = nativeBinding;
