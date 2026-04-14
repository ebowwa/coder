/**
 * Lobby Page - Browse/create rooms, matchmaking
 */

import { router } from "./router";
import { LoadingOverlay } from "./loading-overlay";

const API = "";

export function renderLobbyPage(container: HTMLDivElement): void {
  const user = JSON.parse(localStorage.getItem("hm_user") || "{}");
  const token = localStorage.getItem("hm_token");

  container.innerHTML = `
    <div style="padding: 30px; max-width: 1000px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h2 style="color: #fff; margin: 0; font-size: 1.4em;">Game Lobby</h2>
        <button id="create-room-btn" style="
          padding: 12px 24px; border: none; border-radius: 10px;
          background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
          color: #fff; font-weight: bold; cursor: pointer;
          box-shadow: 0 4px 15px rgba(78,205,196,0.3);
        ">+ Create Room</button>
      </div>

      <!-- Filters -->
      <div style="
        display: flex; gap: 12px; margin-bottom: 20px;
        flex-wrap: wrap;
      ">
        <select id="filter-category" style="
          padding: 8px 14px; border: 2px solid #333; border-radius: 8px;
          background: #0f0f1a; color: #fff; font-size: 0.9em;
        ">
          <option value="any">All Categories</option>
          <option value="animals">Animals</option>
          <option value="food">Food</option>
          <option value="science">Science</option>
          <option value="sports">Sports</option>
          <option value="countries">Countries</option>
        </select>
        <select id="filter-difficulty" style="
          padding: 8px 14px; border: 2px solid #333; border-radius: 8px;
          background: #0f0f1a; color: #fff; font-size: 0.9em;
        ">
          <option value="any">All Difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      <!-- Rooms List -->
      <div id="rooms-list" style="
        display: grid; gap: 12px;
      ">
        <div style="color: #666; text-align: center; padding: 40px;">Loading rooms...</div>
      </div>

      <!-- Create Room Modal -->
      <div id="create-modal" style="
        display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); z-index: 2000;
        justify-content: center; align-items: center;
      ">
        <div style="
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 16px; padding: 30px; max-width: 480px; width: 90%;
          border: 1px solid rgba(255,255,255,0.1);
        ">
          <h3 style="color: #fff; margin: 0 0 20px;">Create New Room</h3>
          <div style="margin-bottom: 14px;">
            <label style="display: block; color: #aaa; margin-bottom: 6px; font-size: 0.85em;">Room Name</label>
            <input type="text" id="room-name" placeholder="My awesome game" style="
              width: 100%; padding: 10px; border: 2px solid #333;
              border-radius: 8px; background: #0f0f1a; color: #fff;
              font-size: 1em; box-sizing: border-box;
            ">
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
            <div>
              <label style="display: block; color: #aaa; margin-bottom: 6px; font-size: 0.85em;">Visibility</label>
              <select id="room-visibility" style="
                width: 100%; padding: 10px; border: 2px solid #333;
                border-radius: 8px; background: #0f0f1a; color: #fff;
              ">
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div>
              <label style="display: block; color: #aaa; margin-bottom: 6px; font-size: 0.85em;">Category</label>
              <select id="room-category" style="
                width: 100%; padding: 10px; border: 2px solid #333;
                border-radius: 8px; background: #0f0f1a; color: #fff;
              ">
                <option value="any">Any</option>
                <option value="animals">Animals</option>
                <option value="food">Food</option>
                <option value="science">Science</option>
                <option value="sports">Sports</option>
                <option value="countries">Countries</option>
              </select>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px;">
            <div>
              <label style="display: block; color: #aaa; margin-bottom: 6px; font-size: 0.85em;">Difficulty</label>
              <select id="room-difficulty" style="
                width: 100%; padding: 10px; border: 2px solid #333;
                border-radius: 8px; background: #0f0f1a; color: #fff;
              ">
                <option value="any">Any</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label style="display: block; color: #aaa; margin-bottom: 6px; font-size: 0.85em;">Max Players</label>
              <select id="room-max-players" style="
                width: 100%; padding: 10px; border: 2px solid #333;
                border-radius: 8px; background: #0f0f1a; color: #fff;
              ">
                <option value="2">2</option>
                <option value="4">4</option>
                <option value="6">6</option>
                <option value="8" selected>8</option>
              </select>
            </div>
            <div>
              <label style="display: block; color: #aaa; margin-bottom: 6px; font-size: 0.85em;">Rounds</label>
              <select id="room-max-rounds" style="
                width: 100%; padding: 10px; border: 2px solid #333;
                border-radius: 8px; background: #0f0f1a; color: #fff;
              ">
                <option value="1">1</option>
                <option value="3">3</option>
                <option value="5" selected>5</option>
                <option value="10">10</option>
              </select>
            </div>
          </div>
          <div style="display: flex; gap: 10px;">
            <button id="create-submit" style="
              flex: 1; padding: 12px; border: none; border-radius: 8px;
              background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
              color: #fff; font-weight: bold; cursor: pointer;
            ">Create</button>
            <button id="create-cancel" style="
              flex: 1; padding: 12px; border: 2px solid #666; border-radius: 8px;
              background: transparent; color: #888; cursor: pointer;
            ">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load rooms
  loadRooms(container, token);

  // Wire events
  wireLobbyEvents(container, user, token);
}

async function loadRooms(container: HTMLDivElement, token: string | null): Promise<void> {
  const listEl = container.querySelector("#rooms-list");
  if (!listEl) return;

  const loader = new LoadingOverlay(listEl as HTMLElement, {
    message: 'Loading rooms\u2026',
    fullscreen: false,
    showDelay: 200,
  });

  try {
    loader.show();
    const res = await fetch(`${API}/api/lobby/rooms`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    loader.hide();

    if (!res.ok) {
      loader.showError('Failed to load rooms. Check your connection.', () => loadRooms(container, token));
      return;
    }
    const rooms = await res.json();

    if (!rooms || rooms.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <div style="font-size: 2em; margin-bottom: 10px;">🏠</div>
          <div style="color: #666;">No public rooms available.</div>
          <div style="color: #888; font-size: 0.9em; margin-top: 4px;">Create one to get started!</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = rooms.map((room: any) => `
      <div style="
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 12px; padding: 18px;
        border: 1px solid rgba(255,255,255,0.08);
        display: flex; justify-content: space-between; align-items: center;
      ">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span style="color: #fff; font-weight: bold; font-size: 1em;">${room.name}</span>
            <span style="
              padding: 2px 8px; border-radius: 4px; font-size: 0.7em;
              background: ${room.visibility === "private" ? "rgba(170,150,218,0.2)" : "rgba(78,205,196,0.2)"};
              color: ${room.visibility === "private" ? "#aa96da" : "#4ecdc4"};
            ">${room.visibility}</span>
          </div>
          <div style="display: flex; gap: 12px; color: #666; font-size: 0.8em;">
            <span>Host: ${room.hostName}</span>
            <span>Category: ${room.category}</span>
            <span>Difficulty: ${room.difficulty}</span>
          </div>
        </div>
        <div style="text-align: center; margin: 0 16px;">
          <div style="color: #4ecdc4; font-size: 1.2em; font-weight: bold;">${room.players.length}/${room.maxPlayers}</div>
          <div style="color: #666; font-size: 0.75em;">Players</div>
        </div>
        <button data-code="${room.code}" class="join-room-btn" style="
          padding: 10px 20px; border: none; border-radius: 8px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff; font-weight: bold; cursor: pointer; font-size: 0.9em;
        ">Join</button>
      </div>
    `).join("");

    // Wire join buttons
    listEl.querySelectorAll(".join-room-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const code = (btn as HTMLElement).dataset.code;
        try {
          const res = await fetch(`${API}/api/lobby/rooms/${code}/join`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            router.navigate("game");
          }
        } catch {}
      });
    });
  } catch {
    loader.hide();
    loader.showError('Connection error. Please try again.', () => loadRooms(container, token));
  }
}

function wireLobbyEvents(container: HTMLDivElement, user: any, token: string | null): void {
  const modal = container.querySelector("#create-modal") as HTMLDivElement;

  container.querySelector("#create-room-btn")?.addEventListener("click", () => {
    if (modal) modal.style.display = "flex";
  });

  container.querySelector("#create-cancel")?.addEventListener("click", () => {
    if (modal) modal.style.display = "none";
  });

  container.querySelector("#create-submit")?.addEventListener("click", async () => {
    const name = (container.querySelector("#room-name") as HTMLInputElement)?.value.trim() || `${user.username}'s Game`;
    const visibility = (container.querySelector("#room-visibility") as HTMLSelectElement)?.value;
    const category = (container.querySelector("#room-category") as HTMLSelectElement)?.value;
    const difficulty = (container.querySelector("#room-difficulty") as HTMLSelectElement)?.value;
    const maxPlayers = parseInt((container.querySelector("#room-max-players") as HTMLSelectElement)?.value || "8");
    const maxRounds = parseInt((container.querySelector("#room-max-rounds") as HTMLSelectElement)?.value || "5");

    try {
      const res = await fetch(`${API}/api/lobby/rooms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, visibility, category, difficulty, maxPlayers, maxRounds }),
      });
      if (res.ok) {
        if (modal) modal.style.display = "none";
        loadRooms(container, token);
      }
    } catch {}
  });
}
