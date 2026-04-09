/**
 * Auth Page - Login/Register UI
 */

import { router } from "./router";

const API = "";

export function renderAuthPage(container: HTMLDivElement): void {
  let isLogin = true;

  function render(): void {
    container.innerHTML = `
      <div style="
        display: flex; justify-content: center; align-items: center;
        height: 100%; padding: 20px;
      ">
        <div style="
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          border-radius: 20px; padding: 40px; max-width: 440px; width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          border: 1px solid rgba(255,255,255,0.1);
        ">
          <h1 style="
            color: #fff; text-align: center; margin: 0 0 8px; font-size: 2.2em;
            text-shadow: 0 0 20px rgba(78,205,196,0.5);
          ">Hangman Pro</h1>
          <p style="
            color: #4ecdc4; text-align: center; margin: 0 0 30px; font-size: 1em;
          ">${isLogin ? "Welcome back!" : "Create your account"}</p>

          <div id="auth-error" style="
            display: none; background: rgba(243,129,129,0.15); border: 1px solid #f38181;
            color: #f38181; padding: 10px 16px; border-radius: 8px; margin-bottom: 16px;
            font-size: 0.9em; text-align: center;
          "></div>

          ${!isLogin ? `
            <div style="margin-bottom: 16px;">
              <label style="display: block; color: #aaa; margin-bottom: 6px; font-size: 0.85em;">Display Name</label>
              <input type="text" id="auth-display" placeholder="Your display name" style="
                width: 100%; padding: 12px 14px; border: 2px solid #333;
                border-radius: 10px; background: #0f0f1a; color: #fff;
                font-size: 1em; box-sizing: border-box;
              ">
            </div>
          ` : ""}

          <div style="margin-bottom: 16px;">
            <label style="display: block; color: #aaa; margin-bottom: 6px; font-size: 0.85em;">Username</label>
            <input type="text" id="auth-username" placeholder="Username" style="
              width: 100%; padding: 12px 14px; border: 2px solid #333;
              border-radius: 10px; background: #0f0f1a; color: #fff;
              font-size: 1em; box-sizing: border-box;
            ">
          </div>

          <div style="margin-bottom: 24px;">
            <label style="display: block; color: #aaa; margin-bottom: 6px; font-size: 0.85em;">Password</label>
            <input type="password" id="auth-password" placeholder="Password" style="
              width: 100%; padding: 12px 14px; border: 2px solid #333;
              border-radius: 10px; background: #0f0f1a; color: #fff;
              font-size: 1em; box-sizing: border-box;
            ">
          </div>

          <button id="auth-submit" style="
            width: 100%; padding: 14px; border: none; border-radius: 10px;
            background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
            color: #fff; font-size: 1.1em; font-weight: bold; cursor: pointer;
            transition: transform 0.2s;
          ">${isLogin ? "Sign In" : "Create Account"}</button>

          <div style="text-align: center; margin-top: 20px;">
            <span style="color: #666; font-size: 0.9em;">
              ${isLogin ? "Don't have an account?" : "Already have an account?"}
            </span>
            <button id="auth-toggle" style="
              background: none; border: none; color: #4ecdc4;
              cursor: pointer; font-size: 0.9em; font-weight: bold;
            ">${isLogin ? "Sign Up" : "Sign In"}</button>
          </div>

          <div style="
            display: flex; align-items: center; margin: 20px 0;
          ">
            <div style="flex: 1; height: 1px; background: #333;"></div>
            <span style="color: #666; padding: 0 12px; font-size: 0.85em;">OR</span>
            <div style="flex: 1; height: 1px; background: #333;"></div>
          </div>

          <button id="auth-guest" style="
            width: 100%; padding: 12px; background: transparent;
            border: 2px solid #444; border-radius: 10px; color: #888;
            font-size: 0.95em; cursor: pointer;
          ">Play as Guest</button>
        </div>
      </div>
    `;

    wireEvents();
  }

  function showError(msg: string): void {
    const el = container.querySelector("#auth-error") as HTMLDivElement;
    if (el) {
      el.textContent = msg;
      el.style.display = "block";
    }
  }

  async function handleSubmit(): Promise<void> {
    const username = (container.querySelector("#auth-username") as HTMLInputElement)?.value.trim();
    const password = (container.querySelector("#auth-password") as HTMLInputElement)?.value;
    const display = (container.querySelector("#auth-display") as HTMLInputElement)?.value.trim();

    if (!username || !password) {
      showError("Please fill in all fields");
      return;
    }

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
    const body: any = { username, password };
    if (!isLogin && display) body.displayName = display;

    try {
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        showError(data.error || "Authentication failed");
        return;
      }

      localStorage.setItem("hm_token", data.token);
      localStorage.setItem("hm_user", JSON.stringify(data.user));
      router.navigate("dashboard");
    } catch (err) {
      showError("Server connection failed");
    }
  }

  function wireEvents(): void {
    container.querySelector("#auth-submit")?.addEventListener("click", handleSubmit);
    container.querySelector("#auth-password")?.addEventListener("keypress", (e) => {
      if ((e as KeyboardEvent).key === "Enter") handleSubmit();
    });
    container.querySelector("#auth-toggle")?.addEventListener("click", () => {
      isLogin = !isLogin;
      render();
    });
    container.querySelector("#auth-guest")?.addEventListener("click", () => {
      router.navigate("game");
    });
  }

  render();
}
