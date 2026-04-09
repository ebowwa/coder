/**
 * Friends Page - Friends list, online status, add friends, challenge
 */

import { router } from "./router";

const API = "";

export function renderFriendsPage(container: HTMLDivElement): void {
  const user = JSON.parse(localStorage.getItem("hm_user") || "{}");
  const token = localStorage.getItem("hm_token");

  container.innerHTML = `
    <div style="padding: 30px; max-width: 900px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
        <h2 style="color: #fff; margin: 0; font-size: 1.4em;">Friends</h2>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="add-friend-input" placeholder="Add by username..." style="
            padding: 10px 14px; border: 2px solid #333; border-radius: 8px;
            background: #0f0f1a; color: #fff; font-size: 0.9em; width: 220px;
          ">
          <button id="add-friend-btn" style="
            padding: 10px 16px; border: none; border-radius: 8px;
            background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
            color: #fff; font-weight: bold; cursor: pointer; font-size: 0.9em;
          ">Add</button>
        </div>
      </div>

      <!-- Pending Requests -->
      <div id="pending-section" style="display: none; margin-bottom: 20px;">
        <h3 style="color: #ffe66d; margin: 0 0 12px; font-size: 1em;">Pending Requests</h3>
        <div id="pending-list"></div>
      </div>

      <!-- Friends List -->
      <div style="
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 16px; padding: 24px;
        border: 1px solid rgba(255,255,255,0.08);
      ">
        <h3 style="color: #fff; margin: 0 0 16px; font-size: 1em;">Your Friends</h3>
        <div id="friends-list">
          <div style="color: #666; text-align: center; padding: 30px;">Loading friends...</div>
        </div>
      </div>
    </div>
  `;

  loadFriends(container, token);

  // Add friend
  container.querySelector("#add-friend-btn")?.addEventListener("click", () => {
    addFriend(container, token);
  });
  container.querySelector("#add-friend-input")?.addEventListener("keypress", (e) => {
    if ((e as KeyboardEvent).key === "Enter") addFriend(container, token);
  });
}

async function loadFriends(container: HTMLDivElement, token: string | null): Promise<void> {
  try {
    const res = await fetch(`${API}/api/friends`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();

    // Render pending
    const pendingSection = container.querySelector("#pending-section") as HTMLDivElement;
    const pendingList = container.querySelector("#pending-list");
    if (data.pending && data.pending.length > 0) {
      pendingSection.style.display = "block";
      pendingList!.innerHTML = data.pending.map((p: any) => `
        <div style="
          display: flex; align-items: center; padding: 10px;
          background: rgba(255,230,109,0.05); border-radius: 8px; margin-bottom: 6px;
        ">
          <div style="
            width: 36px; height: 36px; border-radius: 50%;
            background: ${p.avatar || "#666"}; display: flex; align-items: center;
            justify-content: center; color: #fff; font-weight: bold; font-size: 0.8em;
            margin-right: 12px;
          ">${(p.displayName || "?").charAt(0).toUpperCase()}</div>
          <div style="flex: 1;">
            <div style="color: #fff; font-size: 0.9em;">${p.displayName}</div>
            <div style="color: #666; font-size: 0.8em;">@${p.username}</div>
          </div>
          <button data-username="${p.username}" class="accept-btn" style="
            padding: 6px 14px; border: none; border-radius: 6px;
            background: #4caf50; color: #fff; cursor: pointer; font-size: 0.8em;
            margin-right: 6px;
          ">Accept</button>
          <button data-username="${p.username}" class="decline-btn" style="
            padding: 6px 14px; border: none; border-radius: 6px;
            background: transparent; border: 1px solid #f38181; color: #f38181;
            cursor: pointer; font-size: 0.8em;
          ">Decline</button>
        </div>
      `).join("");

      // Wire accept/decline
      pendingList!.querySelectorAll(".accept-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const username = (btn as HTMLElement).dataset.username;
          await fetch(`${API}/api/friends/accept`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ friendUsername: username }),
          });
          loadFriends(container, token);
        });
      });
      pendingList!.querySelectorAll(".decline-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const username = (btn as HTMLElement).dataset.username;
          await fetch(`${API}/api/friends/remove`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ friendUsername: username }),
          });
          loadFriends(container, token);
        });
      });
    } else {
      pendingSection.style.display = "none";
    }

    // Render friends
    const friendsList = container.querySelector("#friends-list");
    if (!friendsList) return;

    if (!data.friends || data.friends.length === 0) {
      friendsList.innerHTML = `
        <div style="text-align: center; padding: 30px;">
          <div style="font-size: 2em; margin-bottom: 10px;">👥</div>
          <div style="color: #666;">No friends yet.</div>
          <div style="color: #888; font-size: 0.9em; margin-top: 4px;">Add someone by their username!</div>
        </div>
      `;
      return;
    }

    friendsList.innerHTML = data.friends.map((f: any) => `
      <div style="
        display: flex; align-items: center; padding: 12px;
        background: rgba(255,255,255,0.03); border-radius: 10px; margin-bottom: 8px;
      ">
        <div style="position: relative; margin-right: 12px;">
          <div style="
            width: 40px; height: 40px; border-radius: 50%;
            background: ${f.avatar || "#666"}; display: flex; align-items: center;
            justify-content: center; color: #fff; font-weight: bold; font-size: 0.9em;
          ">${(f.displayName || "?").charAt(0).toUpperCase()}</div>
          <div style="
            position: absolute; bottom: 0; right: 0;
            width: 10px; height: 10px; border-radius: 50%;
            background: ${f.online ? "#4caf50" : "#666"};
            border: 2px solid #1a1a2e;
          "></div>
        </div>
        <div style="flex: 1;">
          <div style="color: #fff; font-size: 0.95em;">${f.displayName} <span style="color: ${f.online ? "#4caf50" : "#666"}; font-size: 0.8em;">${f.online ? "Online" : "Offline"}</span></div>
          <div style="color: #666; font-size: 0.8em;">@${f.username}</div>
        </div>
        <button data-username="${f.username}" class="challenge-btn" style="
          padding: 8px 16px; border: none; border-radius: 8px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #fff; font-weight: bold; cursor: pointer; font-size: 0.85em;
          ${!f.online ? "opacity: 0.4; cursor: not-allowed;" : ""}
        " ${!f.online ? "disabled" : ""}>Challenge</button>
        <button data-username="${f.username}" class="remove-btn" style="
          padding: 8px 12px; border: 1px solid #f38181; border-radius: 8px;
          background: transparent; color: #f38181; cursor: pointer;
          font-size: 0.8em; margin-left: 6px;
        ">Remove</button>
      </div>
    `).join("");

    // Wire challenge buttons
    friendsList.querySelectorAll(".challenge-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const username = (btn as HTMLElement).dataset.username;
        try {
          const res = await fetch(`${API}/api/challenge`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ friendUsername: username }),
          });
          if (res.ok) {
            const data = await res.json();
            alert(`Challenge sent to ${data.challenged}! Room code: ${data.room.code}`);
            router.navigate("lobby");
          }
        } catch {}
      });
    });

    // Wire remove buttons
    friendsList.querySelectorAll(".remove-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const username = (btn as HTMLElement).dataset.username;
        if (!confirm(`Remove ${username} from friends?`)) return;
        await fetch(`${API}/api/friends/remove`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ friendUsername: username }),
        });
        loadFriends(container, token);
      });
    });
  } catch {
    const list = container.querySelector("#friends-list");
    if (list) list.innerHTML = '<div style="color: #f38181; text-align: center;">Connection error</div>';
  }
}

async function addFriend(container: HTMLDivElement, token: string | null): Promise<void> {
  const input = container.querySelector("#add-friend-input") as HTMLInputElement;
  const username = input?.value.trim();
  if (!username) return;

  try {
    const res = await fetch(`${API}/api/friends/add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ friendUsername: username }),
    });
    const data = await res.json();
    if (res.ok) {
      input.value = "";
      alert("Friend request sent!");
    } else {
      alert(data.error || "Failed to add friend");
    }
  } catch {
    alert("Connection error");
  }
}
