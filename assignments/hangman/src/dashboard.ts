/**
 * Dashboard / Home Page
 * Shows: active games, recent history, global leaderboard, Quick Play
 *
 * UI polish: skeleton loading animations, responsive two-column layout,
 * error states with retry buttons, and smooth fade-in on data arrival.
 */

import { router } from "./router";
import { escapeHtml } from "./escape-html";

const API = "";

// Inject dashboard-specific CSS (idempotent)
let dashboardStylesInjected = false;
function injectDashboardStyles(): void {
  if (dashboardStylesInjected) return;
  dashboardStylesInjected = true;
  const style = document.createElement("style");
  style.id = "dashboard-styles";
  style.textContent = `
    @keyframes dash-shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position:  400px 0; }
    }
    .dash-skeleton {
      background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
      background-size: 400px 100%;
      animation: dash-shimmer 1.6s ease-in-out infinite;
      border-radius: 6px;
    }
    .dash-skeleton-inline {
      display: inline-block;
      width: 48px;
      height: 32px;
      vertical-align: middle;
    }
    .dash-skeleton-bar {
      height: 14px;
      margin-bottom: 10px;
      border-radius: 4px;
    }
    .dash-skeleton-bar:last-child { width: 70%; margin-bottom: 0; }
    .dash-error-box {
      text-align: center; padding: 20px;
    }
    .dash-error-box .dash-error-msg {
      color: #f38181; font-size: 0.9em; margin-bottom: 12px;
    }
    .dash-error-box button {
      padding: 8px 20px; border: 2px solid #4ecdc4; border-radius: 8px;
      background: transparent; color: #4ecdc4; font-weight: bold;
      cursor: pointer; transition: background 0.2s;
    }
    .dash-error-box button:hover {
      background: rgba(78,205,196,0.15);
    }
    @media (max-width: 640px) {
      .dash-two-col { grid-template-columns: 1fr !important; }
      .dash-banner  { flex-direction: column; text-align: center; gap: 16px; }
    }
  `;
  document.head.appendChild(style);
}

/** HTML for a stat card skeleton placeholder */
function skeletonStatCard(id: string, color: string, label: string): string {
  return `
    <div class="stat-card" style="
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 12px; padding: 20px; text-align: center;
      border: 1px solid rgba(255,255,255,0.08);
    ">
      <div id="${id}" class="dash-skeleton dash-skeleton-inline" style="color: ${color}; font-size: 2em; font-weight: bold;"></div>
      <div style="color: #888; font-size: 0.85em; margin-top: 4px;">${label}</div>
    </div>`;
}

/** HTML for a 3-bar skeleton (used in active games / leaderboard panels) */
function skeletonBars(n = 3): string {
  return Array.from({ length: n }, () =>
    `<div class="dash-skeleton dash-skeleton-bar" style="width: 100%;"></div>`
  ).join("");
}

export function renderDashboard(container: HTMLDivElement): void {
  injectDashboardStyles();
  const user = JSON.parse(localStorage.getItem("hm_user") || "{}");
  const token = localStorage.getItem("hm_token");

  container.innerHTML = `
    <div style="padding: 30px; max-width: 1100px; margin: 0 auto;">
      <!-- Welcome Banner -->
      <div class="dash-banner" style="
        background: linear-gradient(135deg, #1a1a3e 0%, #2d1b69 100%);
        border-radius: 16px; padding: 30px; margin-bottom: 24px;
        border: 1px solid rgba(78,205,196,0.2);
        display: flex; justify-content: space-between; align-items: center;
      ">
        <div>
          <h2 style="color: #fff; margin: 0 0 6px; font-size: 1.6em;">
            Welcome back, ${escapeHtml(user.displayName || user.username || "Player")}!
          </h2>
          <p style="color: #888; margin: 0; font-size: 0.95em;" id="dash-stats-line">
            <span class="dash-skeleton" style="display: inline-block; width: 260px; height: 16px; border-radius: 4px;"></span>
          </p>
        </div>
        <button id="quick-play-btn" style="
          padding: 14px 32px; border: none; border-radius: 12px;
          background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
          color: #fff; font-size: 1.1em; font-weight: bold;
          cursor: pointer; box-shadow: 0 4px 20px rgba(78,205,196,0.4);
          transition: transform 0.2s;
        ">Quick Play</button>
      </div>

      <!-- Stats Grid (skeleton while loading) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 24px;" id="stats-grid">
        ${skeletonStatCard("stat-games",   "#4ecdc4", "Games")}
        ${skeletonStatCard("stat-wins",    "#4caf50", "Wins")}
        ${skeletonStatCard("stat-winrate", "#ffe66d", "Win Rate")}
        ${skeletonStatCard("stat-streak",  "#ff6b6b", "Best Streak")}
        ${skeletonStatCard("stat-rank",    "#aa96da", "Rank")}
      </div>

      <!-- Two column layout (responsive via .dash-two-col) -->
      <div class="dash-two-col" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <!-- Active Games -->
        <div style="
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px; padding: 24px;
          border: 1px solid rgba(255,255,255,0.08);
        ">
          <h3 style="color: #fff; margin: 0 0 16px; font-size: 1.1em;">Active Games</h3>
          <div id="active-games" style="color: #666; font-size: 0.9em;">${skeletonBars(4)}</div>
        </div>

        <!-- Leaderboard -->
        <div style="
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px; padding: 24px;
          border: 1px solid rgba(255,255,255,0.08);
        ">
          <h3 style="color: #fff; margin: 0 0 16px; font-size: 1.1em;">Global Leaderboard</h3>
          <div id="leaderboard-list">${skeletonBars(5)}</div>
        </div>
      </div>
    </div>
  `;

  // Load dashboard data
  loadDashboard(container, token);

  // Quick Play
  container.querySelector("#quick-play-btn")?.addEventListener("click", async () => {
    const btn = container.querySelector("#quick-play-btn") as HTMLButtonElement | null;
    if (btn) { btn.disabled = true; btn.textContent = "Starting..."; }
    try {
      const res = await fetch(`${API}/api/quickplay`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        router.navigate("lobby");
      } else {
        router.navigate("game");
      }
    } catch {
      router.navigate("game");
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Quick Play"; }
    }
  });
}

/** Render an error state with a retry button inside an element */
function renderError(el: Element | null, message: string, retry: () => void): void {
  if (!el) return;
  el.innerHTML = `
    <div class="dash-error-box">
      <div class="dash-error-msg">${escapeHtml(message)}</div>
      <button type="button">Try Again</button>
    </div>`;
  el.querySelector("button")?.addEventListener("click", retry);
}

async function loadDashboard(container: HTMLDivElement, token: string | null): Promise<void> {
  const retry = () => loadDashboard(container, token);
  try {
    const res = await fetch(`${API}/api/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const errLine = container.querySelector("#dash-stats-line");
      if (errLine) errLine.textContent = "Could not load stats";
      renderError(container.querySelector("#active-games"), "Failed to load games.", retry);
      renderError(container.querySelector("#leaderboard-list"), "Failed to load leaderboard.", retry);
      return;
    }

    const data = await res.json();
    const stats = data.stats || {};

    // Update stats line
    const line = container.querySelector("#dash-stats-line");
    if (line) {
      line.textContent = `Rank #${stats.rank || "?"} | ${stats.totalGames || 0} games played | ${stats.wins || 0} wins`;
    }

    // Update stat cards — replace skeleton with actual values
    const setStat = (id: string, val: string) => {
      const el = container.querySelector(`#${id}`);
      if (el) {
        el.classList.remove("dash-skeleton", "dash-skeleton-inline");
        el.textContent = val;
      }
    };
    setStat("stat-games", String(stats.totalGames || 0));
    setStat("stat-wins", String(stats.wins || 0));
    setStat("stat-winrate", `${Math.round((stats.winRate || 0) * 100)}%`);
    setStat("stat-streak", String(stats.bestStreak || 0));
    setStat("stat-rank", stats.rank ? `#${stats.rank}` : "--");

    // Active games
    const activeEl = container.querySelector("#active-games");
    if (activeEl) {
      const games = data.activeGames || [];
      if (games.length === 0) {
        activeEl.innerHTML = '<div style="color: #666;">No active games. Hit Quick Play to start!</div>';
      } else {
        activeEl.innerHTML = games.map((g: any) => `
          <div style="
            display: flex; justify-content: space-between; align-items: center;
            padding: 10px; margin-bottom: 8px;
            background: rgba(255,255,255,0.03); border-radius: 8px;
            cursor: pointer;
          " data-room="${escapeHtml(g.code)}">
            <div>
              <div style="color: #fff; font-size: 0.9em;">${escapeHtml(g.name)}</div>
              <div style="color: #666; font-size: 0.8em;">${g.players?.length || 0}/${g.maxPlayers} players</div>
            </div>
            <span style="
              padding: 4px 10px; border-radius: 6px; font-size: 0.8em;
              background: ${g.status === "playing" ? "rgba(78,205,196,0.2)" : "rgba(255,230,109,0.2)"};
              color: ${g.status === "playing" ? "#4ecdc4" : "#ffe66d"};
            ">${escapeHtml(g.status)}</span>
          </div>
        `).join("");
      }
    }

    // Leaderboard
    const lbEl = container.querySelector("#leaderboard-list");
    if (lbEl) {
      const entries = data.leaderboard || [];
      if (entries.length === 0) {
        lbEl.innerHTML = '<div style="color: #666;">No entries yet. Be the first!</div>';
      } else {
        lbEl.innerHTML = entries.map((e: any, i: number) => `
          <div style="
            display: flex; align-items: center; padding: 8px 10px; margin-bottom: 4px;
            background: ${i < 3 ? "rgba(78,205,196,0.05)" : "transparent"};
            border-radius: 6px;
          ">
            <span style="
              width: 24px; color: ${i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#666"};
              font-weight: bold; font-size: 0.9em;
            ">${i + 1}</span>
            <span style="flex: 1; color: #fff; font-size: 0.9em;">${escapeHtml(e.playerName)}</span>
            <span style="color: #4ecdc4; font-size: 0.85em; font-weight: bold;">${e.score}</span>
          </div>
        `).join("");
      }
    }
  } catch (err) {
    console.error("Dashboard load error:", err);
    const errLine = container.querySelector("#dash-stats-line");
    if (errLine) errLine.textContent = "Connection error";
    renderError(container.querySelector("#active-games"), "Unable to reach server.", retry);
    renderError(container.querySelector("#leaderboard-list"), "Unable to reach server.", retry);
  }
}
