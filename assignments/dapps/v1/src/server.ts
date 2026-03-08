const PROJECT_ROOT = import.meta.dir.replace('/src', '');

const htmlContent = await Bun.file(`${PROJECT_ROOT}/index.html`).text();
const DIST_DIR = `${PROJECT_ROOT}/dist`;

const server = Bun.serve({
  port: process.env.PORT ?? 3001,
  async fetch(req) {
    const url = new URL(req.url);

    // API health check
    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Serve main.js from dist
    if (url.pathname === '/dist/main.js') {
      const file = Bun.file(`${DIST_DIR}/main.js`);
      const exists = await file.exists();
      if (exists) {
        return new Response(file, {
          headers: { 'Content-Type': 'application/javascript; charset=utf-8' },
        });
      }
    }

    // Serve main.css from dist
    if (url.pathname === '/dist/main.css') {
      const file = Bun.file(`${DIST_DIR}/main.css`);
      const exists = await file.exists();
      if (exists) {
        return new Response(file, {
          headers: { 'Content-Type': 'text/css; charset=utf-8' },
        });
      }
    }

    // Serve CSS files
    if (url.pathname.endsWith('.css')) {
      const cssPath = `${PROJECT_ROOT}${url.pathname}`;
      const cssFile = Bun.file(cssPath);
      const cssExists = await cssFile.exists();
      if (cssExists) {
        return new Response(cssFile, {
          headers: { 'Content-Type': 'text/css; charset=utf-8' },
        });
      }
    }

    // Serve src files (tsx, ts) with source maps
    if (url.pathname.startsWith('/src/')) {
      const srcPath = `${PROJECT_ROOT}${url.pathname}`;
      const srcFile = Bun.file(srcPath);
      const srcExists = await srcFile.exists();
      if (srcExists) {
        const ext = url.pathname.split('.').pop();
        const contentType = ext === 'tsx' || ext === 'ts'
          ? 'text/typescript; charset=utf-8'
          : ext === 'css'
          ? 'text/css; charset=utf-8'
          : 'text/javascript; charset=utf-8';
        return new Response(srcFile, {
          headers: { 'Content-Type': contentType },
        });
      }
    }

    // Serve index.html for root
    return new Response(htmlContent, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at http://localhost:${server.port}`);
console.log(`📁 Serving files from ${PROJECT_ROOT}`);
