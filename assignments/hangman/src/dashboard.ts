/**
 * Dashboard / Home Page
 * Shows: active games, recent history, global leaderboard, Quick Play
 */

import { router } from "./router";

const API = "";

export function renderDashboard(container: HTMLDivElement): void {
  const user = JSON.parse(localStorage.getItem("hm_user") || "{}");
  const token = localStorage.getItem("hm_token");

  container.innerHTML = `
    <div style="padding: 30px; max-width: 1100px; margin: 0 auto;">
      <!-- Welcome Banner -->
      <div style="
        background: linear-gradient(135deg, #1a1a3e 0%, #2d1b69 100%);
        border-radius: 16px; padding: 30px; margin-bottom: 24px;
        border: 1px solid rgba(78,205,196,0.2);
        display: flex; justify-content: space-between; align-items: center;
      ">
        <div>
          <h2 style="color: #fff; margin: 0 0 6px; font-size: 1.6em;">
            Welcome back, ${user.displayName || user.username || "Player"}!
          </h2>
          <p style="color: #888; margin: 0; font-size: 0.95em;" id="dash-stats-line">Loading stats...</p>
        </div>
        <button id="quick-play-btn" style="
          padding: 14px 32px; border: none; border-radius: 12px;
          background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
          color: #fff; font-size: 1.1em; font-weight: bold;
          cursor: pointer; box-shadow: 0 4px 20px rgba(78,205,196,0.4);
          transition: transform 0.2s;
        ">Quick Play</button>
      </div>

      <!-- Stats Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 24px;" id="stats-grid">
        <div class="stat-card" style="
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 12px; padding: 20px; text-align: center;
          border: 1px solid rgba(255,255,255,0.08);
        ">
          <div style="color: #4ecdc4; font-size: 2em; font-weight: bold;" id="stat-games">--</div>
          <div style="color: #888; font-size: 0.85em; margin-top: 4px;">Games</div>
        </div>
        <div class="stat-card" style="
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 12px; padding: 20px; text-align: center;
          border: 1px solid rgba(255,255,255,0.08);
        ">
          <div style="color: #4caf50; font-size: 2em; font-weight: bold;" id="stat-wins">--</div>
          <div style="color: #888; font-size: 0.85em; margin-top: 4px;">Wins</div>
        </div>
        <div class="stat-card" style="
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 12px; padding: 20px; text-align: center;
          border: 1px solid rgba(255,255,255,0.08);
        ">
          <div style="color: #ffe66d; font-size: 2em; font-weight: bold;" id="stat-winrate">--</div>
          <div style="color: #888; font-size: 0.85em; margin-top: 4px;">Win Rate</div>
        </div>
        <div class="stat-card" style="
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 12px; padding: 20px; text-align: center;
          border: 1px solid rgba(255,255,255,0.08);
        ">
          <div style="color: #ff6b6b; font-size: 2em; font-weight: bold;" id="stat-streak">--</div>
          <div style="color: #888; font-size: 0.85em; margin-top: 4px;">Best Streak</div>
        </div>
        <div class="stat-card" style="
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 12px; padding: 20px; text-align: center;
          border: 1px solid rgba(255,255,255,0.08);
        ">
          <div style="color: #aa96da; font-size: 2em; font-weight: bold;" id="stat-rank">--</div>
          <div style="color: #888; font-size: 0.85em; margin-top: 4px;">Rank</div>
        </div>
      </div>

      <!-- Two column layout -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <!-- Active Games -->
        <div style="
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px; padding: 24px;
          border: 1px solid rgba(255,255,255,0.08);
        ">
          <h3 style="color: #fff; margin: 0 0 16px; font-size: 1.1em;">Active Games</h3>
          <div id="active-games" style="color: #666; font-size: 0.9em;">Loading...</div>
        </div>

        <!-- Leaderboard -->
        <div style="
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px; padding: 24px;
          border: 1px solid rgba(255,255,255,0.08);
        ">
          <h3 style="color: #fff; margin: 0 0 16px; font-size: 1.1em;">Global Leaderboard</h3>
          <div id="leaderboard-list">Loading...</div>
        </div>
      </div>
    </div>
  `;

  // Load dashboard data
  loadDashboard(container, token);

  // Quick Play
  container.querySelector("#quick-play-btn")?.addEventListener("click", async () => {
    try {
      const res = await fetch(`${API}/api/quickplay`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        router.navigate("lobby");
      }
    } catch {
      router.navigate("game");
    }
  });
}

async function loadDashboard(container: HTMLDivElement, token: string | null): Promise<void> {
  try {
    // Fetch dashboard data
    const res = await fetch(`${API}/api/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      container.querySelector("#dash-stats-line")!.textContent = "Could not load stats";
      return;
    }

    const data = await res.json();
    const stats = data.stats || {};

    // Update stats line
    const line = container.querySelector("#dash-stats-line");
    if (line) {
      line.textContent = `Rank #${stats.rank || "?"} | ${stats.totalGames || 0} games played | ${stats.wins || 0} wins`;
    }

    // Update stat cards
    const setStat = (id: string, val: string) => {
      const el = container.querySelector(`#${id}`);
      if (el) el.textContent = val;
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
          " data-room="${g.code}">
            <div>
              <div style="color: #fff; font-size: 0.9em;">${g.name}</div>
              <div style="color: #666; font-size: 0.8em;">${g.players?.length || 0}/${g.maxPlayers} players</div>
            </div>
            <span style="
              padding: 4px 10px; border-radius: 6px; font-size: 0.8em;
              background: ${g.status === "playing" ? "rgba(78,205,196,0.2)" : "rgba(255,230,109,0.2)"};
              color: ${g.status === "playing" ? "#4ecdc4" : "#ffe66d"};
            ">${g.status}</span>
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
            <span style="flex: 1; color: #fff; font-size: 0.9em;">${e.playerName}</span>
            <span style="color: #4ecdc4; font-size: 0.85em; font-weight: bold;">${e.score}</span>
          </div>
        `).join("");
      }
    }
  } catch (err) {
    console.error("Dashboard load error:", err);
  }
}
