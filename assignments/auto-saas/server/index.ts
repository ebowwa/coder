import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/bun'
import { Database } from 'bun:sqlite'
import { nanoid } from 'nanoid'
import { z } from 'zod'

const app = new Hono()
const db = new Database('snipurl.db')

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    short_code TEXT UNIQUE NOT NULL,
    original_url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    clicks INTEGER DEFAULT 0
  )
`)

// API Routes
app.use('/api/*', cors())

// Create short URL
const createSchema = z.object({
  url: z.string().url()
})

app.post('/api/shorten', async (c) => {
  try {
    const body = await c.req.json()
    const { url } = createSchema.parse(body)
    
    const shortCode = nanoid(7)
    
    const stmt = db.prepare('INSERT INTO urls (short_code, original_url) VALUES (?, ?)')
    stmt.run(shortCode, url)
    
    return c.json({
      shortCode,
      shortUrl: `${new URL(c.req.url).origin}/${shortCode}`,
      originalUrl: url
    })
  } catch (error) {
    return c.json({ error: 'Invalid URL' }, 400)
  }
})

// Get URL stats
app.get('/api/stats/:code', (c) => {
  const code = c.req.param('code')
  const stmt = db.prepare('SELECT * FROM urls WHERE short_code = ?')
  const url = stmt.get(code)
  
  if (!url) {
    return c.json({ error: 'URL not found' }, 404)
  }
  
  return c.json(url)
})

// List all URLs
app.get('/api/urls', (c) => {
  const stmt = db.prepare('SELECT * FROM urls ORDER BY created_at DESC')
  const urls = stmt.all()
  return c.json(urls)
})

// Redirect short URL
app.get('/:code', (c) => {
  const code = c.req.param('code')
  
  // Skip API routes
  if (code === 'api') return c.notFound()
  
  const stmt = db.prepare('SELECT * FROM urls WHERE short_code = ?')
  const url = stmt.get(code) as any
  
  if (!url) {
    return c.html('<h1>404 - URL not found</h1>', 404)
  }
  
  // Increment click count
  const updateStmt = db.prepare('UPDATE urls SET clicks = clicks + 1 WHERE id = ?')
  updateStmt.run(url.id)
  
  return c.redirect(url.original_url)
})

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use('/*', serveStatic({ root: './client/dist' }))
}

const port = Number(process.env.PORT) || 3001

Bun.serve({
  port,
  fetch: app.fetch
})

console.log(`🚀 SnipURL server running on http://localhost:${port}`)
