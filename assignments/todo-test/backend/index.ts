import { Database } from "bun:sqlite";

const db = new Database("todos.db");
db.run(`CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  completed INTEGER DEFAULT 0
)`);

const server = Bun.serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    if (url.pathname === "/todos" && req.method === "GET") {
      const todos = db.query("SELECT * FROM todos ORDER BY id DESC").all();
      return Response.json(todos, { headers: corsHeaders });
    }

    if (url.pathname === "/todos" && req.method === "POST") {
      const { text } = await req.json();
      const result = db.run("INSERT INTO todos (text) VALUES (?)", [text]);
      return Response.json({ id: result.lastInsertRowid, text, completed: 0 }, { headers: corsHeaders });
    }

    if (url.pathname.startsWith("/todos/") && req.method === "DELETE") {
      const id = url.pathname.split("/")[2];
      db.run("DELETE FROM todos WHERE id = ?", [id]);
      return Response.json({ success: true }, { headers: corsHeaders });
    }

    if (url.pathname.startsWith("/todos/") && req.method === "POST") {
      const id = url.pathname.split("/")[2];
      db.run("UPDATE todos SET completed = NOT completed WHERE id = ?", [id]);
      return Response.json({ success: true }, { headers: corsHeaders });
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`Backend running at http://localhost:${server.port}`);
