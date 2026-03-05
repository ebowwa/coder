/**
 * HTTP Routes
 * Handles static file serving and API proxying
 */

import apiServer from "../../src/index.ts";
import index from "../../../index.html";

// Load index.html once for SPA fallback
const indexHtml = Bun.file(new URL("../../../index.html", import.meta.url).pathname);

export async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // API routes - proxy to Hono
  if (url.pathname.startsWith("/api")) {
    return apiServer.fetch(req);
  }

  // Serve root path as index.html
  if (url.pathname === "/") {
    return new Response(indexHtml);
  }

  // Check if it's a TypeScript/JSX file that needs Bun's transpilation
  // These MUST be served through the routes object to get HMR/transpilation
  if (url.pathname.endsWith('.tsx') || url.pathname.endsWith('.ts') || url.pathname.endsWith('.jsx')) {
    // Return empty response - these will be handled by the routes object
    return new Response("Not Found", { status: 404 });
  }

  // Serve CSS files with correct content type
  if (url.pathname.endsWith('.css')) {
    const projectRoot = new URL("../../..", import.meta.url).pathname;
    const filePath = `${projectRoot}${url.pathname}`;
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return new Response(file, {
        headers: { "Content-Type": "text/css; charset=utf-8" },
      });
    }
  }

  // Serve other static files
  const projectRoot = new URL("../../..", import.meta.url).pathname;
  const filePath = `${projectRoot}${url.pathname}`;
  const file = Bun.file(filePath);
  const fileExists = await file.exists();

  if (fileExists) {
    const contentType = getStaticContentType(filePath);
    return new Response(file, {
      headers: { "Content-Type": contentType },
    });
  }

  // SPA fallback - return index.html for all non-API, non-static routes
  // This enables client-side routing (React Router, etc.)
  return new Response(indexHtml);
}

function getStaticContentType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'svg': 'image/svg+xml',
    'ico': 'image/x-icon',
    'woff': 'font/woff',
    'woff2': 'font/woff2',
    'ttf': 'font/ttf',
    'eot': 'application/vnd.ms-fontobject',
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
  };
  return types[ext || ''] || 'application/octet-stream';
}

// Export routes for TypeScript/JSX files that need Bun's transpilation
// These will be automatically transpiled by Bun's HMR
export const routes = {
  "/": index,
  // TypeScript and JSX files will be automatically handled by Bun's HMR
  // when accessed through the routes object
};
