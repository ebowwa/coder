/**
 * Client-side SPA Router
 * Handles page navigation, auth state, and view rendering
 */

export type PageName = "auth" | "dashboard" | "lobby" | "profile" | "friends" | "game";

interface RouteState {
  currentPage: PageName;
  params: Record<string, string>;
}

class Router {
  private container: HTMLDivElement;
  private currentPage: PageName = "auth";
  private pages: Map<PageName, { render: () => void; cleanup?: () => void }> = new Map();
  private navBar: HTMLDivElement | null = null;

  constructor() {
    this.container = document.createElement("div");
    this.container.id = "app-pages";
    this.container.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 1000; display: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    document.body.appendChild(this.container);
  }

  registerPage(name: PageName, page: { render: (container: HTMLDivElement) => void; cleanup?: () => void }): void {
    this.pages.set(name, {
      render: () => page.render(this.container),
      cleanup: page.cleanup,
    });
  }

  navigate(page: PageName, params: Record<string, string> = {}): void {
    // Cleanup current page
    const current = this.pages.get(this.currentPage);
    current?.cleanup?.();

    this.currentPage = page;

    // Show/hide game canvas
    const canvas = document.querySelector("canvas");
    if (canvas) canvas.style.display = page === "game" ? "block" : "none";

    // Hide hint button on non-game pages
    const hintBtn = document.getElementById("hint-button");
    if (hintBtn) hintBtn.style.display = "none";

    // Show page container (hide for game)
    this.container.style.display = page === "game" ? "none" : "block";
    this.container.innerHTML = "";

    if (page !== "game") {
      this.renderNavBar();
    }

    const target = this.pages.get(page);
    if (target) {
      target.render();
    }
  }

  private renderNavBar(): void {
    const token = localStorage.getItem("hm_token");
    if (!token) return;

    const user = JSON.parse(localStorage.getItem("hm_user") || "{}");
    const currentPage = this.currentPage;

    this.container.innerHTML = `
      <nav style="
        display: flex; align-items: center; justify-content: space-between;
        padding: 12px 24px;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-bottom: 1px solid rgba(255,255,255,0.1);
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      ">
        <div style="display: flex; align-items: center; gap: 8px; cursor: pointer;" id="nav-logo">
          <span style="font-size: 1.5em;">🎯</span>
          <span style="color: #4ecdc4; font-weight: bold; font-size: 1.2em;">Hangman Pro</span>
          ${user.tier === "pro" ? '<span style="background: linear-gradient(135deg, #f5af19, #f12711); color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 0.7em; font-weight: bold;">PRO</span>' : ""}
        </div>
        <div style="display: flex; gap: 4px;" id="nav-links">
          <button data-page="dashboard" style="
            padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer;
            font-size: 0.9em; font-weight: 500;
            background: ${currentPage === "dashboard" ? "rgba(78,205,196,0.2)" : "transparent"};
            color: ${currentPage === "dashboard" ? "#4ecdc4" : "#aaa"};
            transition: all 0.2s;
          ">Dashboard</button>
          <button data-page="lobby" style="
            padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer;
            font-size: 0.9em; font-weight: 500;
            background: ${currentPage === "lobby" ? "rgba(78,205,196,0.2)" : "transparent"};
            color: ${currentPage === "lobby" ? "#4ecdc4" : "#aaa"};
            transition: all 0.2s;
          ">Lobby</button>
          <button data-page="friends" style="
            padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer;
            font-size: 0.9em; font-weight: 500;
            background: ${currentPage === "friends" ? "rgba(78,205,196,0.2)" : "transparent"};
            color: ${currentPage === "friends" ? "#4ecdc4" : "#aaa"};
            transition: all 0.2s;
          ">Friends</button>
          <button data-page="profile" style="
            padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer;
            font-size: 0.9em; font-weight: 500;
            background: ${currentPage === "profile" ? "rgba(78,205,196,0.2)" : "transparent"};
            color: ${currentPage === "profile" ? "#4ecdc4" : "#aaa"};
            transition: all 0.2s;
          ">Profile</button>
          <button data-page="game" style="
            padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer;
            font-size: 0.9em; font-weight: 500;
            background: ${currentPage === "game" ? "rgba(78,205,196,0.2)" : "transparent"};
            color: ${currentPage === "game" ? "#4ecdc4" : "#aaa"};
            transition: all 0.2s;
          ">Play</button>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="
            width: 32px; height: 32px; border-radius: 50%;
            background: ${user.avatar || "#4ecdc4"};
            display: flex; align-items: center; justify-content: center;
            color: #fff; font-weight: bold; font-size: 0.8em;
            cursor: pointer;
          " id="nav-avatar">${(user.displayName || user.username || "?").charAt(0).toUpperCase()}</div>
          <button id="nav-logout" style="
            padding: 6px 12px; background: transparent; border: 1px solid #666;
            border-radius: 6px; color: #888; cursor: pointer; font-size: 0.8em;
          ">Logout</button>
        </div>
      </nav>
      <div id="page-content" style="
        height: calc(100% - 56px); overflow-y: auto;
        background: #0a0a1a;
      "></div>
    `;

    // Wire up nav clicks
    this.container.querySelectorAll("[data-page]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const page = (btn as HTMLElement).dataset.page as PageName;
        this.navigate(page);
      });
    });

    this.container.querySelector("#nav-logo")?.addEventListener("click", () => {
      this.navigate("dashboard");
    });

    this.container.querySelector("#nav-avatar")?.addEventListener("click", () => {
      this.navigate("profile");
    });

    this.container.querySelector("#nav-logout")?.addEventListener("click", () => {
      localStorage.removeItem("hm_token");
      localStorage.removeItem("hm_user");
      this.navigate("auth");
    });
  }

  getPageContainer(): HTMLDivElement | null {
    return this.container.querySelector("#page-content");
  }

  getCurrentPage(): PageName {
    return this.currentPage;
  }
}

export const router = new Router();
