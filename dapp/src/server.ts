import index from '../index.html';
// todo: openapi spec
const server = Bun.serve({
  port: process.env.PORT ?? 3001,
  routes: {
    '/': index,
    '/api/health': {
      GET: () => Response.json({ status: 'ok', timestamp: new Date().toISOString() }),
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`\u{1F680} Server running at http://localhost:${server.port}`);
