/**
 * AI Assistant Panel - Interactive AI chat and quick actions
 */

import React, { useState, useRef, useEffect } from "react";
import { Sheet } from "../shared/Sheet";

const API_BASE = "";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  latency?: number;
}

interface AIAssistantProps {
  environments: Array<{
    id: string;
    name: string;
    status: string;
    resources?: any;
  }>;
  onClose: () => void;
}

export function AIAssistant({ environments, onClose }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedQuickAction, setSelectedQuickAction] = useState<string | null>(
    null,
  );
  const [aiAvailable, setAiAvailable] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check AI availability on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/ai/capabilities`)
      .then((res) => res.json())
      .then((data) => setAiAvailable(data.available))
      .catch(() => setAiAvailable(false));
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    const startTime = performance.now();

    try {
      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "You are a helpful DevOps assistant for managing Hetzner servers. Be concise and practical.",
            },
            { role: "user", content: content.trim() },
          ],
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const latency = performance.now() - startTime;

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
          latency,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Error: ${data.error || "Failed to get response"}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Error: Failed to connect to AI service",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    setSelectedQuickAction(action);
    let prompt = "";

    switch (action) {
      case "analyze-all":
        prompt = `Analyze all ${environments.length} environments and provide a summary of their health, recommendations for optimization, and cost-saving opportunities.`;
        break;
      case "name-suggestions":
        prompt =
          "Generate 5 creative server names for a new environment. Mix of tech-themed and memorable names.";
        break;
      case "troubleshoot":
        const runningEnvs = environments
          .filter((e) => e.status === "running")
          .map((e) => e.name)
          .join(", ");
        prompt = `I have these running environments: ${runningEnvs || "none"}. What common issues should I watch out for?`;
        break;
      case "cost-optimization":
        prompt =
          "Review my server usage patterns and suggest cost optimization strategies. I want to reduce costs without impacting performance significantly.";
        break;
      default:
        prompt = action;
    }

    await sendMessage(prompt);
    setSelectedQuickAction(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <Sheet
      isOpen={true}
      onClose={onClose}
      title="🤖 AI Assistant"
      size="md"
      side="right"
      closeOnEscape
      closeOnBackdropClick
      className="ai-assistant-sheet"
    >
      <div className="ai-status-bar">
        <span
          className={`ai-status ${aiAvailable ? "available" : "unavailable"}`}
        >
          {aiAvailable ? "● Online" : "○ Offline"}
        </span>
      </div>

      {/* Quick Actions */}
      <div className="ai-quick-actions">
        <h3>Quick Actions</h3>
        <div className="quick-actions-grid">
          <button
            onClick={() => handleQuickAction("analyze-all")}
            disabled={loading || !aiAvailable}
            className="quick-action-btn"
          >
            📊 Analyze All
          </button>
          <button
            onClick={() => handleQuickAction("name-suggestions")}
            disabled={loading || !aiAvailable}
            className="quick-action-btn"
          >
            ✨ Name Ideas
          </button>
          <button
            onClick={() => handleQuickAction("troubleshoot")}
            disabled={loading || !aiAvailable}
            className="quick-action-btn"
          >
            🔧 Troubleshoot
          </button>
          <button
            onClick={() => handleQuickAction("cost-optimization")}
            disabled={loading || !aiAvailable}
            className="quick-action-btn"
          >
            💰 Cost Tips
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="ai-messages">
        {messages.length === 0 ? (
          <div className="ai-empty-state">
            <p>👋 Ask me anything about your servers!</p>
            <ul>
              <li>"Analyze my server health"</li>
              <li>"Suggest cost optimizations"</li>
              <li>"Help troubleshoot SSH issues"</li>
              <li>"Generate server name ideas"</li>
            </ul>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`ai-message ${message.role}`}>
              <div className="message-header">
                <span className="message-role">
                  {message.role === "user" ? "👤 You" : "🤖 AI"}
                </span>
                <span className="message-time">
                  {message.timestamp.toLocaleTimeString()}
                  {message.latency && ` · ${message.latency.toFixed(0)}ms`}
                </span>
              </div>
              <div className="message-content">{message.content}</div>
            </div>
          ))
        )}
        {loading && (
          <div className="ai-message assistant">
            <div className="message-header">
              <span className="message-role">🤖 AI</span>
              <span className="message-time">Thinking...</span>
            </div>
            <div className="message-content loading">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="ai-input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask anything about your servers... (Enter to send, Shift+Enter for new line)"
          disabled={loading || !aiAvailable}
          rows={2}
          className="ai-input"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !aiAvailable || !input.trim()}
          className="send-btn"
        >
          {loading ? "..." : "Send"}
        </button>
      </div>

      {!aiAvailable && (
        <div className="ai-unavailable">
          <p>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ verticalAlign: "text-bottom", marginRight: "8px" }}
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            AI service is unavailable. Please configure your API key in
            settings.
          </p>
        </div>
      )}
    </Sheet>
  );
}
