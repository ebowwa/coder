import { useState, useEffect } from 'react'

interface UrlItem { id: number; short_code: string; original_url: string; clicks: number; created_at: string }
interface ShortenResponse { shortUrl: string; originalUrl: string; shortCode: string }
interface ErrorResponse { error: string }

export default function App() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<{ shortUrl: string; originalUrl: string } | null>(null)
  const [error, setError] = useState('')
  const [urls, setUrls] = useState<UrlItem[]>([])

  const fetchUrls = async () => {
    try {
      const res = await fetch('/api/urls')
      const data = await res.json() as UrlItem[]
      setUrls(data)
    } catch {}
  }

  useEffect(() => { fetchUrls() }, [])

  const shorten = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setResult(null)
    try {
      const res = await fetch('/api/shorten', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url })
      })
      const data = await res.json() as ShortenResponse | ErrorResponse
      if (!res.ok) throw new Error((data as ErrorResponse).error)
      setResult(data as ShortenResponse); setUrl(''); fetchUrls()
    } catch (err: any) { setError(err.message) }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>🔗 SnipURL</h1>
        <form onSubmit={shorten}>
          <div className="input-group">
            <input type="url" value={url} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)} placeholder="Enter URL to shorten..." required />
            <button type="submit">Shorten</button>
          </div>
        </form>
        {error && <div className="error">{error}</div>}
        {result && <div className="result"><strong>Short URL:</strong> <a href={result.shortUrl} target="_blank">{result.shortUrl}</a><br/><small>Original: {result.originalUrl}</small></div>}
        {urls.length > 0 && <div className="urls"><h3>Recent URLs</h3>{urls.slice(0, 10).map(u => <div key={u.id} className="url-item"><a href={`/${u.short_code}`} target="_blank">/{u.short_code}</a><small>{u.clicks} clicks</small></div>)}</div>}
      </div>
    </div>
  )
}
