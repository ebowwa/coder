/**
 * GitHubAuth Component
 *
 * Handles GitHub CLI authentication for remote nodes.
 * Shows auth status and provides login flow with URL + code.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";

interface GitHubAuthProps {
  environmentId: string;
  host: string;
}

interface GitHubStatus {
  authenticated: boolean;
  username?: string;
  host?: string;
  scopes?: string[];
}

interface GitHubLoginInfo {
  authUrl: string;
  authCode: string;
  status: string;
  message?: string;
}

export function GitHubAuth({ environmentId, host }: GitHubAuthProps) {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [loginInfo, setLoginInfo] = useState<GitHubLoginInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Fetch GitHub status
  const fetchStatus = useCallback(async (showLoading = false) => {
    if (showLoading) setChecking(true);
    try {
      const response = await fetch("/api/github/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, environmentId }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus(data.data);
        setError(null);
        // Clear login info if now authenticated
        if (data.data.authenticated) {
          setLoginInfo(null);
          // Stop polling if authenticated
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } else {
        setError(data.error || "Failed to check GitHub status");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }, [host, environmentId]);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Start login flow
  const handleLogin = async () => {
    setLoginLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/github/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, environmentId }),
      });

      const data = await response.json();

      if (data.success) {
        setLoginInfo(data.data);
        // Start polling for auth completion
        startPolling();
      } else {
        setError(data.error || "Failed to start GitHub login");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoginLoading(false);
    }
  };

  // Start polling for authentication completion
  const startPolling = useCallback(() => {
    // Clear any existing polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch("/api/github/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ host, environmentId }),
        });

        const data = await response.json();

        if (data.success && data.data.authenticated) {
          setStatus(data.data);
          setLoginInfo(null);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      } catch {
        // Ignore polling errors
      }
    }, 3000); // Poll every 3 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }, 300000);
  }, [host, environmentId]);

  // Copy auth code to clipboard
  const handleCopyCode = async () => {
    if (loginInfo?.authCode) {
      await navigator.clipboard.writeText(loginInfo.authCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Open auth URL in new tab
  const handleOpenUrl = () => {
    if (loginInfo?.authUrl) {
      window.open(loginInfo.authUrl, "_blank");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="github-auth">
        <div className="github-loading">Checking GitHub status...</div>
      </div>
    );
  }

  return (
    <div className="github-auth">
      {/* Status Display */}
      <div className="github-status">
        <div className={`status-indicator ${status?.authenticated ? "authenticated" : "not-authenticated"}`}>
          <span className="status-dot" />
          <span className="status-text">
            {status?.authenticated ? "Authenticated" : "Not Authenticated"}
          </span>
        </div>
        {status?.username && (
          <span className="github-badge username">@{status.username}</span>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="github-error">
          <span className="error-icon">!</span>
          <span>{error}</span>
        </div>
      )}

      {/* Login Flow */}
      {!status?.authenticated && !loginInfo && (
        <button
          className="github-login-btn"
          onClick={handleLogin}
          disabled={loginLoading}
        >
          {loginLoading ? "Starting login..." : "Login to GitHub"}
        </button>
      )}

      {/* Auth URL + Code Display */}
      {loginInfo && (
        <div className="github-login-flow">
          <p className="login-instruction">
            Complete authentication in your browser:
          </p>

          <div className="auth-url-container">
            <button className="open-url-btn" onClick={handleOpenUrl}>
              Open GitHub Device Login
            </button>
          </div>

          <div className="auth-code-container">
            <span className="code-label">Enter this code:</span>
            <div className="auth-code">
              <code>{loginInfo.authCode}</code>
              <button
                className="copy-btn"
                onClick={handleCopyCode}
                title="Copy code"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <p className="login-status">
            Waiting for authentication...
          </p>

          <button
            className="refresh-status-btn"
            onClick={() => fetchStatus(true)}
            disabled={checking}
          >
            {checking ? "Checking..." : "Check Status"}
          </button>
        </div>
      )}

      {/* Authenticated State */}
      {status?.authenticated && (
        <div className="github-authenticated">
          <span className="success-icon">&#10003;</span>
          <span>GitHub CLI authenticated{status.username ? ` as @${status.username}` : ""}</span>
        </div>
      )}
    </div>
  );
}
