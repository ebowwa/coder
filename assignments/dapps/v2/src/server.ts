const PORT = Number(process.env.PORT ?? 3002);

// Resolve paths relative to project root (parent of src/)
const PROJECT_ROOT = import.meta.dir.replace('/src', '');
const DIST_DIR = `${PROJECT_ROOT}/dist`;
const SRC_DIR = import.meta.dir;

// Build on startup if dist doesn't exist
const distExists = await Bun.file(`${DIST_DIR}/main.js`).exists();
if (!distExists) {
  console.log('📦 Building TypeScript files...');
  const buildProcess = Bun.spawn([
    'bun', 'build', './src/main.tsx',
    '--outdir', './dist',
    '--target', 'browser',
    '--jsx-production',
    '--jsx-import-source', 'react'
  ], {
    cwd: PROJECT_ROOT,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  await buildProcess.exited;
  console.log('✅ Build complete');
}

const htmlContent = await Bun.file(`${PROJECT_ROOT}/index.html`).text();

// todo: openapi spec
const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Health check
    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
    }
    
    // Serve index.html for root
    if (url.pathname === '/') {
      return new Response(htmlContent, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
    
    // Serve static files
    let filePath: string;

    if (url.pathname.startsWith('/dist/')) {
      // Serve from dist directory
      filePath = `${PROJECT_ROOT}${url.pathname}`;
    } else if (url.pathname.startsWith('/src/')) {
      // Serve from src directory
      filePath = `${PROJECT_ROOT}${url.pathname}`;
    } else {
      // Serve from src directory (default)
      filePath = `${SRC_DIR}${url.pathname}`;
    }

    console.log(`Serving: ${url.pathname} -> ${filePath}`);
    
    const file = Bun.file(filePath);
    const exists = await file.exists();
    console.log(`  File exists: ${exists}, size: ${file.size}`);
    
    if (exists) {
      // Set proper content type based on extension
      const ext = url.pathname.split('.').pop();
      const contentType = ext === 'css' ? 'text/css; charset=utf-8' :
                         ext === 'tsx' || ext === 'ts' ? 'text/typescript; charset=utf-8' :
                         ext === 'js' ? 'text/javascript; charset=utf-8' :
                         'application/octet-stream';
      
      return new Response(file, {
        headers: { 'Content-Type': contentType },
      });
    }
    
    console.error('  File not found:', filePath);
    return new Response('Not found', { status: 404 });
  },
  development: process.env.NODE_ENV !== 'production',
});

console.log(`🚀 Server running at http://localhost:${server.port}`);
console.log(`📁 Serving files from ${import.meta.dir}`);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down server...');
  server.stop();
  process.exit(0);
});
