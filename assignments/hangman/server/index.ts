/**
 * Bun HTTP server for Hangman game
 * Serves static files and provides word list API
 */

import { serve } from "bun";
import { getRandomWord } from "../src/words";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

serve({
  port: PORT,

  async fetch(req) {
    const url = new URL(req.url);

    // API endpoint: GET /api/word?difficulty=N
    if (url.pathname === "/api/word") {
      const difficultyParam = url.searchParams.get("difficulty");
      const difficulty = difficultyParam ? parseInt(difficultyParam, 10) : 1;
      
      const wordEntry = getRandomWord(difficulty);
      
      return new Response(JSON.stringify(wordEntry), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Serve static files from /dist
    if (url.pathname.startsWith("/dist/")) {
      const filePath = url.pathname.slice(1); // Remove leading /
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        return new Response(file);
      }
      
      return new Response("Not Found", { status: 404 });
    }

    // Serve static files from /public
    if (url.pathname.startsWith("/public/")) {
      const filePath = url.pathname.slice(1); // Remove leading /
      const file = Bun.file(filePath);
      
      if (await file.exists()) {
        return new Response(file);
      }
      
      return new Response("Not Found", { status: 404 });
    }

    // Serve index.html for root
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const file = Bun.file("public/index.html");
      
      if (await file.exists()) {
        return new Response(file);
      }
      
      return new Response("index.html not found", { status: 404 });
    }

    // Serve dist/main.js as fallback for game
    if (url.pathname === "/main.js" || url.pathname === "/dist/main.js") {
      const file = Bun.file("dist/main.js");
      
      if (await file.exists()) {
        return new Response(file, {
          headers: {
            "Content-Type": "application/javascript",
          },
        });
      }
      
      return new Response("main.js not found - run build first", { status: 404 });
    }

    return new Response("Not Found", { status: 404 });
  },

  error(error) {
    return new Response(`Server Error: ${error.message}`, { status: 500 });
  },
});

console.log(`🎮 Hangman server running at http://localhost:${PORT}`);
console.log(`📝 API: GET /api/word?difficulty=1-5`);
