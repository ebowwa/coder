/**
 * Profile Page - User stats, settings, theme, Pro upgrade
 */

import { router } from "./router";

const API = "";

export function renderProfile(container: HTMLDivElement): void {
  const user = JSON.parse(localStorage.getItem("hm_user") || "{}");
  const token = localStorage.getItem("hm_token");

  container.innerHTML = `
    <div style="padding: 30px; max-width: 900px; margin: 0 auto;">
      <!-- Profile Header -->
      <div style="
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 16px; padding: 30px; margin-bottom: 24px;
        border: 1px solid rgba(255,255,255,0.1);
        display: flex; align-items: center; gap: 24px;
      ">
        <div style="
          width: 80px; height: 80px; border-radius: 50%;
          background: ${user.avatar || "#4ecdc4"};
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 2em; font-weight: bold;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        ">${(user.displayName || user.username || "?").charAt(0).toUpperCase()}</div>
        <div style="flex: 1;">
          <h2 style="color: #fff; margin: 0 0 4px;">
            ${user.displayName || user.username || "Player"}
            ${user.tier === "pro" ? '<span style="background: linear-gradient(135deg, #f5af19, #f12711); color: #fff; padding: 2px 10px; border-radius: 10px; font-size: 0.5em; font-weight: bold; vertical-align: middle; margin-left: 8px;">PRO</span>' : ""}
          </h2>
          <p style="color: #888; margin: 0 0 12px;">@${user.username || "guest"}</p>
          <div style="display: flex; gap: 12px;">
            <div style="color: #4ecdc4; font-size: 0.85em;" id="profile-stat-games">Loading...</div>
            <div style="color: #666;">|</div>
            <div style="color: #4caf50; font-size: 0.85em;" id="profile-stat-wr">--</div>
          </div>
        </div>
        <button id="edit-profile-btn" style="
          padding: 10px 20px; background: transparent; border: 2px solid #4ecdc4;
          border-radius: 10px; color: #4ecdc4; cursor: pointer; font-size: 0.9em;
        ">Edit Profile</button>
      </div>

      <!-- Stats Cards -->
      <div style="
        display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
        gap: 12px; margin-bottom: 24px;
      " id="profile-stats-grid">
        <div style="background: #1a1a2e; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="color: #4ecdc4; font-size: 1.8em; font-weight: bold;" id="p-stat-total">--</div>
          <div style="color: #888; font-size: 0.8em;">Total Games</div>
        </div>
        <div style="background: #1a1a2e; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="color: #4caf50; font-size: 1.8em; font-weight: bold;" id="p-stat-wins">--</div>
          <div style="color: #888; font-size: 0.8em;">Wins</div>
        </div>
        <div style="background: #1a1a2e; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="color: #ff6b6b; font-size: 1.8em; font-weight: bold;" id="p-stat-losses">--</div>
          <div style="color: #888; font-size: 0.8em;">Losses</div>
        </div>
        <div style="background: #1a1a2e; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="color: #ffe66d; font-size: 1.8em; font-weight: bold;" id="p-stat-winrate">--</div>
          <div style="color: #888; font-size: 0.8em;">Win Rate</div>
        </div>
        <div style="background: #1a1a2e; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="color: #aa96da; font-size: 1.8em; font-weight: bold;" id="p-stat-streak">--</div>
          <div style="color: #888; font-size: 0.8em;">Best Streak</div>
        </div>
        <div style="background: #1a1a2e; border-radius: 12px; padding: 16px; text-align: center;">
          <div style="color: #f38181; font-size: 1.8em; font-weight: bold;" id="p-stat-rank">--</div>
          <div style="color: #888; font-size: 0.8em;">Rank</div>
        </div>
      </div>

      <!-- Theme Selection -->
      <div style="
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 16px; padding: 24px; margin-bottom: 24px;
        border: 1px solid rgba(255,255,255,0.08);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3 style="color: #fff; margin: 0; font-size: 1.1em;">Theme</h3>
          ${user.tier !== "pro" ? `
            <button id="upgrade-btn" style="
              padding: 8px 16px; border: none; border-radius: 8px;
              background: linear-gradient(135deg, #f5af19, #f12711);
              color: #fff; font-weight: bold; cursor: pointer; font-size: 0.85em;
            ">Upgrade to Pro</button>
          ` : '<span style="color: #f5af19; font-size: 0.85em;">Pro Member - All themes unlocked</span>'}
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px;" id="theme-grid">
          <div class="theme-card" data-theme="default" style="
            background: #0a0a1a; border-radius: 12px; padding: 16px; text-align: center;
            cursor: pointer; border: 2px solid ${user.theme === "default" ? "#4ecdc4" : "transparent"};
            transition: border-color 0.2s;
          ">
            <div style="font-size: 1.5em; margin-bottom: 6px;">🎨</div>
            <div style="color: #fff; font-size: 0.9em;">Default</div>
            <div style="color: #666; font-size: 0.75em;">Free</div>
          </div>
          <div class="theme-card" data-theme="dark" style="
            background: #050505; border-radius: 12px; padding: 16px; text-align: center;
            cursor: pointer; border: 2px solid ${user.theme === "dark" ? "#4ecdc4" : "transparent"};
            position: relative;
          ">
            ${user.tier !== "pro" ? '<div style="position: absolute; top: 8px; right: 8px; font-size: 0.6em;">🔒</div>' : ""}
            <div style="font-size: 1.5em; margin-bottom: 6px;">🌙</div>
            <div style="color: #fff; font-size: 0.9em;">Dark Mode</div>
            <div style="color: #f5af19; font-size: 0.75em;">Pro</div>
          </div>
          <div class="theme-card" data-theme="neon" style="
            background: linear-gradient(135deg, #0a0a1a, #1a002e);
            border-radius: 12px; padding: 16px; text-align: center;
            cursor: pointer; border: 2px solid ${user.theme === "neon" ? "#4ecdc4" : "transparent"};
            position: relative;
          ">
            ${user.tier !== "pro" ? '<div style="position: absolute; top: 8px; right: 8px; font-size: 0.6em;">🔒</div>' : ""}
            <div style="font-size: 1.5em; margin-bottom: 6px;">💡</div>
            <div style="color: #fff; font-size: 0.9em;">Neon Glow</div>
            <div style="color: #f5af19; font-size: 0.75em;">Pro</div>
          </div>
          <div class="theme-card" data-theme="classic-wood" style="
            background: linear-gradient(135deg, #1a1008, #2a1a0a);
            border-radius: 12px; padding: 16px; text-align: center;
            cursor: pointer; border: 2px solid ${user.theme === "classic-wood" ? "#4ecdc4" : "transparent"};
            position: relative;
          ">
            ${user.tier !== "pro" ? '<div style="position: absolute; top: 8px; right: 8px; font-size: 0.6em;">🔒</div>' : ""}
            <div style="font-size: 1.5em; margin-bottom: 6px;">🪵</div>
            <div style="color: #fff; font-size: 0.9em;">Classic Wood</div>
            <div style="color: #f5af19; font-size: 0.75em;">Pro</div>
          </div>
        </div>
      </div>

      <!-- Edit Profile Modal (hidden) -->
      <div id="edit-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); z-index: 2000; display: none; justify-content: center; align-items: center;">
        <div style="
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px; padding: 30px; max-width: 400px; width: 90%;
          border: 1px solid rgba(255,255,255,0.1);
        ">
          <h3 style="color: #fff; margin: 0 0 20px;">Edit Profile</h3>
          <div style="margin-bottom: 16px;">
            <label style="display: block; color: #aaa; margin-bottom: 6px; font-size: 0.85em;">Display Name</label>
            <input type="text" id="edit-display" value="${user.displayName || user.username || ""}" style="
              width: 100%; padding: 10px; border: 2px solid #333;
              border-radius: 8px; background: #0f0f1a; color: #fff;
              font-size: 1em; box-sizing: border-box;
            ">
          </div>
          <div style="margin-bottom: 20px;">
            <label style="display: block; color: #aaa; margin-bottom: 6px; font-size: 0.85em;">Avatar Color</label>
            <input type="color" id="edit-avatar-color" value="${user.avatar || "#4ecdc4"}" style="
              width: 60px; height: 40px; border: none; border-radius: 8px; cursor: pointer;
            ">
          </div>
          <div style="display: flex; gap: 10px;">
            <button id="edit-save" style="
              flex: 1; padding: 12px; border: none; border-radius: 8px;
              background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
              color: #fff; font-weight: bold; cursor: pointer;
            ">Save</button>
            <button id="edit-cancel" style="
              flex: 1; padding: 12px; border: 2px solid #666; border-radius: 8px;
              background: transparent; color: #888; cursor: pointer;
            ">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load profile stats
  loadProfileStats(container, user.username, token);

  // Wire events
  wireProfileEvents(container, user, token);
}

async function loadProfileStats(container: HTMLDivElement, username: string, token: string | null): Promise<void> {
  try {
    const res = await fetch(`${API}/api/profile/${username}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    const stats = data.stats || {};

    const set = (id: string, val: string) => {
      const el = container.querySelector(`#${id}`);
      if (el) el.textContent = val;
    };
    set("profile-stat-games", `${stats.totalGames || 0} games`);
    set("profile-stat-wr", `${Math.round((stats.winRate || 0) * 100)}% WR`);
    set("p-stat-total", String(stats.totalGames || 0));
    set("p-stat-wins", String(stats.wins || 0));
    set("p-stat-losses", String(stats.losses || 0));
    set("p-stat-winrate", `${Math.round((stats.winRate || 0) * 100)}%`);
    set("p-stat-streak", String(stats.bestStreak || 0));
    set("p-stat-rank", stats.rank ? `#${stats.rank}` : "--");
  } catch {}
}

function wireProfileEvents(container: HTMLDivElement, user: any, token: string | null): void {
  // Theme selection
  container.querySelectorAll(".theme-card").forEach((card) => {
    card.addEventListener("click", async () => {
      const theme = (card as HTMLElement).dataset.theme;
      if (!theme) return;

      try {
        const res = await fetch(`${API}/api/theme`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ theme }),
        });
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem("hm_user", JSON.stringify(data.user));
          // Re-render to update selection
          router.navigate("profile");
        } else {
          const data = await res.json();
          alert(data.error || "Theme change failed");
        }
      } catch {}
    });
  });

  // Upgrade button
  container.querySelector("#upgrade-btn")?.addEventListener("click", async () => {
    try {
      const res = await fetch(`${API}/api/upgrade`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("hm_user", JSON.stringify(data.user));
        router.navigate("profile");
      }
    } catch {}
  });

  // Edit profile
  const modal = container.querySelector("#edit-modal") as HTMLDivElement;
  container.querySelector("#edit-profile-btn")?.addEventListener("click", () => {
    if (modal) {
      modal.style.display = "flex";
    }
  });
  container.querySelector("#edit-cancel")?.addEventListener("click", () => {
    if (modal) modal.style.display = "none";
  });
  container.querySelector("#edit-save")?.addEventListener("click", async () => {
    const displayName = (container.querySelector("#edit-display") as HTMLInputElement)?.value.trim();
    const avatar = (container.querySelector("#edit-avatar-color") as HTMLInputElement)?.value;
    try {
      const res = await fetch(`${API}/api/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName, avatar }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("hm_user", JSON.stringify(data.user));
        if (modal) modal.style.display = "none";
        router.navigate("profile");
      }
    } catch {}
  });
}
