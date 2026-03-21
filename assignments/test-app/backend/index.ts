import { serve } from "bun";
import { Database } from "bun:sqlite";

const db = new Database("counter.db");
db.run("CREATE TABLE IF NOT EXISTS counters (id INTEGER PRIMARY KEY, value INTEGER DEFAULT 0)");

const server = serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);
    
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/api/counter" && req.method === "GET") {
      const row = db.query("SELECT value FROM counters WHERE id = 1").get() as { value: number } | null;
      const value = row?.value ?? 0;
      if (!row) db.run("INSERT INTO counters (id, value) VALUES (1, 0)");
      return Response.json({ value }, { headers: corsHeaders });
    }

    if (url.pathname === "/api/counter/increment" && req.method === "POST") {
      db.run("UPDATE counters SET value = value + 1 WHERE id = 1");
      const row = db.query("SELECT value FROM counters WHERE id = 1").get() as { value: number };
      return Response.json({ value: row.value }, { headers: corsHeaders });
    }

    if (url.pathname === "/api/counter/decrement" && req.method === "POST") {
      db.run("UPDATE counters SET value = value - 1 WHERE id = 1");
      const row = db.query("SELECT value FROM counters WHERE id = 1").get() as { value: number };
      return Response.json({ value: row.value }, { headers: corsHeaders });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
});

console.log(`Backend running at http://localhost:${server.port}`);
