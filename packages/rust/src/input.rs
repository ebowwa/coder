//! Native terminal input handling using crossterm
//!
//! Provides raw mode management and key event polling for terminal keyboard input.
//! This replaces Ink's useInput hook with a native Rust implementation for better
//! performance and more control over key parsing.

use crossterm::{
    event::{self, Event, KeyCode, KeyModifiers, KeyEventKind},
    terminal,
};
use napi::bindgen_prelude::*;

/// Key event returned from native input polling
#[napi(object)]
pub struct NativeKeyEvent {
    /// The key code (character or special key name)
    pub code: String,
    /// Whether this is a special key (arrow, function, etc.)
    pub is_special: bool,
    /// Ctrl modifier
    pub ctrl: bool,
    /// Alt/Meta modifier
    pub alt: bool,
    /// Shift modifier
    pub shift: bool,
    /// Event kind: "press", "release", "repeat"
    pub kind: String,
}

/// Terminal handle for raw mode management
///
/// This struct provides raw mode terminal input handling with
/// non-blocking event polling for use in interactive TUI applications.
#[napi]
pub struct TerminalHandle {
    /// Whether the terminal is currently in raw mode
    in_raw_mode: bool,
}

/// Factory function to create terminal handle
/// Defined before impl block to help rust-analyzer
#[napi]
pub fn create_terminal() -> TerminalHandle {
    TerminalHandle::new()
}

#[napi]
impl TerminalHandle {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self { in_raw_mode: false }
    }

    /// Enter raw terminal mode
    #[napi]
    pub fn enter_raw_mode(&mut self) -> Result<()> {
        if self.in_raw_mode {
            return Ok(());
        }
        terminal::enable_raw_mode()
            .map_err(|e| Error::from_reason(format!("Failed to enter raw mode: {}", e)))?;
        self.in_raw_mode = true;
        Ok(())
    }

    /// Exit raw terminal mode
    #[napi]
    pub fn exit_raw_mode(&mut self) -> Result<()> {
        if !self.in_raw_mode {
            return Ok(());
        }
        terminal::disable_raw_mode()
            .map_err(|e| Error::from_reason(format!("Failed to exit raw mode: {}", e)))?;
        self.in_raw_mode = false;
        Ok(())
    }

    /// Check if terminal is in raw mode
    #[napi(getter)]
    pub fn is_raw_mode(&self) -> bool {
        self.in_raw_mode
    }

    /// Poll for a key event (non-blocking)
    /// Returns null if no event available
    ///
    /// NOTE: This assumes the terminal is already in raw mode.
    /// The caller (e.g., Ink) is responsible for managing raw mode.
    /// Do NOT enable raw mode here - it will conflict with the caller's terminal management.
    #[napi]
    pub fn poll_event(&mut self, timeout_ms: Option<u32>) -> Result<Option<NativeKeyEvent>> {
        let timeout = std::time::Duration::from_millis(timeout_ms.unwrap_or(0) as u64);

        if event::poll(timeout)
            .map_err(|e| Error::from_reason(format!("Poll error: {}", e)))?
        {
            let ev = event::read()
                .map_err(|e| Error::from_reason(format!("Read error: {}", e)))?;

            if let Event::Key(key) = ev {
                // Only return press events (ignore release/repeat)
                if key.kind == KeyEventKind::Press {
                    return Ok(Some(key_event_to_native(key)));
                }
            }
        }
        Ok(None)
    }

    /// Read next key event (blocking)
    #[napi]
    pub async fn read_event(&self) -> Result<NativeKeyEvent> {
        // Use tokio for async
        tokio::task::spawn_blocking(|| {
            loop {
                let ev = event::read()
                    .map_err(|e| Error::from_reason(format!("Read error: {}", e)))?;

                if let Event::Key(key) = ev {
                    // Only return on press events (ignore release)
                    if key.kind == KeyEventKind::Press {
                        return Ok(key_event_to_native(key));
                    }
                }
            }
        })
        .await
        .map_err(|e| Error::from_reason(format!("Join error: {}", e)))?
    }
}

impl Drop for TerminalHandle {
    fn drop(&mut self) {
        if self.in_raw_mode {
            let _ = terminal::disable_raw_mode();
        }
    }
}

/// Convert crossterm KeyEvent to our NativeKeyEvent
fn key_event_to_native(key: event::KeyEvent) -> NativeKeyEvent {
    let (code, is_special) = match key.code {
        KeyCode::Char(c) => (c.to_string(), false),
        KeyCode::Enter => ("enter".to_string(), true),
        KeyCode::Backspace => ("backspace".to_string(), true),
        KeyCode::Delete => ("delete".to_string(), true),
        KeyCode::Left => ("left".to_string(), true),
        KeyCode::Right => ("right".to_string(), true),
        KeyCode::Up => ("up".to_string(), true),
        KeyCode::Down => ("down".to_string(), true),
        KeyCode::Home => ("home".to_string(), true),
        KeyCode::End => ("end".to_string(), true),
        KeyCode::PageUp => ("pageup".to_string(), true),
        KeyCode::PageDown => ("pagedown".to_string(), true),
        KeyCode::Tab => ("tab".to_string(), true),
        KeyCode::BackTab => ("backtab".to_string(), true),
        KeyCode::Insert => ("insert".to_string(), true),
        KeyCode::F(n) => (format!("f{}", n), true),
        KeyCode::Null => ("null".to_string(), true),
        KeyCode::Esc => ("escape".to_string(), true),
        KeyCode::CapsLock => ("capslock".to_string(), true),
        KeyCode::ScrollLock => ("scrolllock".to_string(), true),
        KeyCode::NumLock => ("numlock".to_string(), true),
        KeyCode::PrintScreen => ("printscreen".to_string(), true),
        KeyCode::Pause => ("pause".to_string(), true),
        KeyCode::Menu => ("menu".to_string(), true),
        KeyCode::KeypadBegin => ("keypadbegin".to_string(), true),
        KeyCode::Media(m) => (format!("media:{:?}", m), true),
        KeyCode::Modifier(m) => (format!("modifier:{:?}", m), true),
    };

    NativeKeyEvent {
        code,
        is_special,
        ctrl: key.modifiers.contains(KeyModifiers::CONTROL),
        alt: key.modifiers.contains(KeyModifiers::ALT),
        shift: key.modifiers.contains(KeyModifiers::SHIFT),
        kind: match key.kind {
            KeyEventKind::Press => "press".to_string(),
            KeyEventKind::Release => "release".to_string(),
            KeyEventKind::Repeat => "repeat".to_string(),
        },
    }
}
