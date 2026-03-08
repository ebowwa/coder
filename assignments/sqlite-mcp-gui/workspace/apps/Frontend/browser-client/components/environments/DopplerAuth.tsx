/**
 * DopplerAuth Component
 *
 * Handles Doppler CLI authentication for remote nodes.
 * Shows auth status and provides login flow with URL + code.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";

interface DopplerAuthProps {
  environmentId: string;
  host: string;
}

interface DopplerStatus {
  authenticated: boolean;
  configured: boolean;
  hasToken: boolean;
  installed?: boolean;
}

interface DopplerLoginInfo {
  authUrl: string;
  authCode: string;
  status: string;
  message?: string;
}

export function DopplerAuth({ environmentId, host }: DopplerAuthProps) {
  const [status, setStatus] = useState<DopplerStatus | null>(null);
  const [loginInfo, setLoginInfo] = useState<DopplerLoginInfo | null>(null);
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

  // Fetch Doppler status
  const fetchStatus = useCallback(async (showLoading = false) => {
    if (showLoading) setChecking(true);
    try {
      const response = await fetch("/api/doppler/status", {
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
        setError(data.error || "Failed to check Doppler status");
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
      const response = await fetch("/api/doppler/login", {
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
        setError(data.error || "Failed to start Doppler login");
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
        const response = await fetch("/api/doppler/status", {
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
      <div className="doppler-auth">
        <div className="doppler-loading">Checking Doppler status...</div>
      </div>
    );
  }

  return (
    <div className="doppler-auth">
      {/* Status Display */}
      <div className="doppler-status">
        <div className={`status-indicator ${status?.authenticated ? "authenticated" : "not-authenticated"}`}>
          <span className="status-dot" />
          <span className="status-text">
            {status?.authenticated ? "Authenticated" : "Not Authenticated"}
          </span>
        </div>
        {status?.configured && (
          <span className="doppler-badge configured">Configured</span>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="doppler-error">
          <span className="error-icon">!</span>
          <span>{error}</span>
        </div>
      )}

      {/* Login Flow */}
      {!status?.authenticated && !loginInfo && (
        <button
          className="doppler-login-btn"
          onClick={handleLogin}
          disabled={loginLoading}
        >
          {loginLoading ? "Starting login..." : "Login to Doppler"}
        </button>
      )}

      {/* Auth URL + Code Display */}
      {loginInfo && (
        <div className="doppler-login-flow">
          <p className="login-instruction">
            Complete authentication in your browser:
          </p>

          <div className="auth-url-container">
            <button className="open-url-btn" onClick={handleOpenUrl}>
              Open Doppler Login
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
        <div className="doppler-authenticated">
          <span className="success-icon">&#10003;</span>
          <span>Doppler secrets available on this node</span>
        </div>
      )}
    </div>
  );
}
