/**
 * AppleScript utilities for macOS automation
 * Focus: Screenshot capture and system interactions
 */

/**
 * Execute an AppleScript command
 */
async function runAppleScript(script: string): Promise<string> {
  // In browser context, we'll need a backend service
  // For now, this is a placeholder that shows the structure
  throw new Error('AppleScript requires backend service - not available in browser')
}

/**
 * Take a screenshot and save to a temporary location
 * Returns the path to the saved screenshot
 */
export async function takeScreenshot(): Promise<string> {
  const script = `
    tell application "System Events"
      set screenshotPath to "/tmp/screenshot-" & (do shell script "date +%s") & ".png"
      do shell script "screencapture -x " & quoted form of screenshotPath
      return screenshotPath
    end tell
  `

  try {
    const result = await runAppleScript(script)
    return result.trim()
  } catch (error) {
    throw new Error(`Screenshot failed: ${error}`)
  }
}

/**
 * Get focused window information
 */
export async function getFocusedWindow(): Promise<{ app: string; title: string }> {
  const script = `
    tell application "System Events"
      set frontApp to name of first application process whose frontmost is true
      set frontWindow to missing value
      try
        set frontWindow to name of front window of application process frontApp
      end try
      return frontApp & "||" & frontWindow
    end tell
  `

  try {
    const result = await runAppleScript(script)
    const [app, title] = result.split('||')
    return { app, title: title || '' }
  } catch (error) {
    throw new Error(`Get focused window failed: ${error}`)
  }
}

/**
 * Open a URL in the default browser
 */
export async function openUrl(url: string): Promise<void> {
  const script = `
    tell application "System Events"
      do shell script "open " & quoted form of "${url}"
    end tell
  `

  await runAppleScript(script)
}
