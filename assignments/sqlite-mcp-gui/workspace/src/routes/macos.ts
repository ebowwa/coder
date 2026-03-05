import { Hono } from "hono";
import { runAppleScript } from "./utils";

/**
 * Register all macOS-related routes
 */
export function registerMacOSRoutes(app: Hono) {
  /**
   * POST /api/screenshot - Take a screenshot
   */
  app.post("/api/screenshot", async (c) => {
    const timestamp = Date.now();
    const screenshotPath = `/tmp/screenshot-${timestamp}.png`;

    const script = `
    do shell script "screencapture -x " & quoted form of "${screenshotPath}"
  `;

    try {
      await runAppleScript(script);
      return c.json({ success: true, path: screenshotPath });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });

  /**
   * GET /api/macos/window/focused - Get focused window info with screenshot
   */
  app.get("/api/macos/window/focused", async (c) => {
    const timestamp = Date.now();
    const screenshotPath = `/tmp/screenshot-${timestamp}.png`;

    const script = `
      tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
        set frontWindow to missing value
        try
          set frontWindow to name of front window of application process frontApp
        end try
        return frontApp & "||" & frontWindow
      end tell
    `;

    const screenshotScript = `do shell script "screencapture -x " & quoted form of "${screenshotPath}"`;

    try {
      // Get window info
      const result = await runAppleScript(script);
      const [app, title] = result.split("||");

      // Take screenshot
      await runAppleScript(screenshotScript);

      // Read screenshot and convert to base64
      const screenshotFile = Bun.file(screenshotPath);
      const screenshotBuffer = await screenshotFile.arrayBuffer();
      const base64 = Buffer.from(screenshotBuffer).toString("base64");
      const dataUrl = `data:image/png;base64,${base64}`;

      // Clean up temp file
      Bun.$`rm "${screenshotPath}"`.quiet();

      return c.json({
        success: true,
        app,
        title: title || "",
        screenshot: dataUrl,
      });
    } catch (error) {
      return c.json({ success: false, error: String(error) }, 500);
    }
  });
}
