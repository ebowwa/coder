/**
 * AI Resource Insights - AI-powered analysis for individual environments
 */

import React, { useState } from 'react'
import { RefreshButton } from '../shared/RefreshButton'

const API_BASE = ''

interface AIResourceInsightsProps {
  environmentId: string
  environmentName: string
  resources?: {
    cpu?: number
    memory?: number
    disk?: number
    cpuPercent?: number
    memoryPercent?: number
    diskPercent?: number
  }
  onRefresh?: () => void
}

interface Insight {
  id: string
  type: 'health' | 'warning' | 'recommendation' | 'info'
  title: string
  content: string
  timestamp: Date
  latency?: number
}

export function AIResourceInsights({ environmentId, environmentName, resources, onRefresh }: AIResourceInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const fetchInsights = async () => {
    if (!resources || loading) return

    setLoading(true)
    const startTime = performance.now()

    try {
      // Use current resources for analysis
      const response = await fetch(`${API_BASE}/api/ai/analyze/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cpu: resources.cpuPercent || resources.cpu || 0,
          memory: resources.memoryPercent || resources.memory || 0,
          disk: resources.diskPercent || resources.disk || 0
        })
      })

      const latency = performance.now() - startTime
      const data = await response.json()

      if (data.success && data.analysis) {
        // Parse the AI response to extract insights
        const analysis = data.analysis.toLowerCase()
        let type: Insight['type'] = 'info'
        let title = 'Analysis'

        if (analysis.includes('critical') || analysis.includes('danger')) {
          type = 'warning'
          title = 'Critical Issue'
        } else if (analysis.includes('healthy') || analysis.includes('good')) {
          type = 'health'
          title = 'Healthy Status'
        } else if (analysis.includes('recommend') || analysis.includes('should')) {
          type = 'recommendation'
          title = 'Recommendation'
        }

        const insight: Insight = {
          id: Date.now().toString(),
          type,
          title,
          content: data.analysis,
          timestamp: new Date(),
          latency
        }

        setInsights([insight])
        setShowDetails(true)
      }
    } catch (err) {
      console.error('Failed to fetch AI insights:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistoricalAnalysis = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/ai/analyze/historical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environmentId,
          hours: 24
        })
      })

      const data = await response.json()

      if (data.success && data.analysis) {
        const insight: Insight = {
          id: Date.now().toString(),
          type: 'info',
          title: '24h Analysis',
          content: data.analysis,
          timestamp: new Date()
        }

        setInsights([insight])
        setShowDetails(true)
      }
    } catch (err) {
      console.error('Failed to fetch historical analysis:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSuggestions = async () => {
    if (!resources) return

    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/api/ai/suggest/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'running',
          age: '1 day'
        })
      })

      const data = await response.json()

      if (data.success && data.suggestions) {
        const insight: Insight = {
          id: Date.now().toString(),
          type: 'recommendation',
          title: 'Suggested Actions',
          content: data.suggestions,
          timestamp: new Date()
        }

        setInsights(prev => [...prev, insight])
        setShowDetails(true)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!resources) {
    return null
  }

  const getHealthColor = (type: Insight['type']) => {
    switch (type) {
      case 'health': return '#34d399'
      case 'warning': return '#ef4444'
      case 'recommendation': return '#f59e0b'
      default: return '#6366f1'
    }
  }

  return (
    <div className="ai-insights">
      <div className="ai-insights-header">
        <span className="ai-insights-title">🤖 AI Insights</span>
        <div className="ai-insights-actions">
          <RefreshButton onRefresh={fetchInsights} loading={loading} size="small" />
          <button
            onClick={() => {
              setShowDetails(!showDetails)
              if (insights.length === 0) fetchInsights()
            }}
            className="toggle-insights-btn"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showDetails ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>
              <path d="m6 9 6 6 6-6"></path>
            </svg>
          </button>
        </div>
      </div>

      {showDetails && insights.length > 0 && (
        <div className="ai-insights-list">
          {insights.map(insight => (
            <div key={insight.id} className="ai-insight-item" style={{ borderLeftColor: getHealthColor(insight.type) }}>
              <div className="insight-header">
                <span className="insight-type" style={{ color: getHealthColor(insight.type) }}>
                  {insight.type === 'health' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                  )}
                  {insight.type === 'warning' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                  )}
                  {insight.type === 'recommendation' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18h6"></path>
                      <path d="M10 22h4"></path>
                      <path d="M12 2v1"></path>
                      <path d="M12 7a5 5 0 0 1 5 5c0 2.05-.94 3.96-2.58 5.21"></path>
                      <path d="M12 18a3 3 0 0 0 3-3c0-1.3-.84-2.4-2-2.83"></path>
                    </svg>
                  )}
                  {insight.type === 'info' && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="16" x2="12" y2="12"></line>
                      <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                  )}
                </span>
                <span className="insight-title">{insight.title}</span>
                {insight.latency && (
                  <span className="insight-latency">{insight.latency.toFixed(0)}ms</span>
                )}
              </div>
              <div className="insight-content">{insight.content}</div>
            </div>
          ))}

          <div className="ai-insights-actions">
            <button
              onClick={fetchHistoricalAnalysis}
              disabled={loading}
              className="insight-action-btn"
              title="Analyze 24h trends"
            >
              📈 24h Trends
            </button>
            <button
              onClick={getSuggestions}
              disabled={loading}
              className="insight-action-btn"
              title="Get action suggestions"
            >
              ⚡ Actions
            </button>
          </div>
        </div>
      )}

      {showDetails && insights.length === 0 && !loading && (
        <div className="ai-insights-empty">
          <p>No insights available. Click refresh to analyze.</p>
        </div>
      )}
    </div>
  )
}
