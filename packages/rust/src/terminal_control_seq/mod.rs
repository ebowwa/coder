//! Terminal Control Sequences - Modular TUI Rendering
//!
//! This module provides a thin rendering layer for TUI applications.
//! TypeScript controls logic, Rust only renders.
//!
//! ## Architecture
//!
//! ```text
//! terminal_control_seq/
//! ├── mod.rs       # NativeRenderer (main entry point)
//! ├── types.rs     # NAPI object types for TS interop
//! ├── terminal.rs  # Terminal setup/teardown (raw mode, alternate screen)
//! ├── input.rs     # Input event polling and key conversion
//! ├── keys.rs      # Key code and modifier string conversions
//! ├── layout.rs    # Layout helpers (centered_rect)
//! └── widgets.rs   # Widget rendering functions
//! ```

mod types;
mod terminal;
pub mod input;
mod keys;
mod layout;
mod widgets;

// Re-export types for convenience
pub use types::{RenderMessage, RenderState, SearchResult, InputEvent};
pub use terminal::TerminalControl;
pub use keys::{key_code_to_string, modifiers_to_string};
pub use layout::centered_rect;

use std::io::{self, Stdout};
use crossterm::event::{self, Event, KeyEventKind};
use napi::bindgen_prelude::*;
use ratatui::{
    backend::CrosstermBackend,
    Terminal,
};

/// Native TUI renderer - TypeScript controls state, Rust renders
///
/// ## Usage from TypeScript
///
/// ```typescript
/// const renderer = new NativeRenderer();
/// await renderer.init();
///
/// while (running) {
///   const event = renderer.pollInput(16); // ~60fps
///   if (event.event_type === 'key') {
///     // Handle key in TypeScript
///   }
///
///   renderer.render({
///     messages: [...],
///     input_value: "...",
///     cursor_pos: 0,
///     // ... other state
///   });
/// }
///
/// renderer.cleanup();
/// ```
#[napi]
pub struct NativeRenderer {
    terminal: Option<Terminal<CrosstermBackend<Stdout>>>,
    terminal_ctrl: terminal::TerminalControl,
}

#[napi]
impl NativeRenderer {
    #[napi(constructor)]
    pub fn new() -> Result<Self> {
        Ok(Self {
            terminal: None,
            terminal_ctrl: terminal::TerminalControl::new(),
        })
    }

    /// Initialize terminal for TUI mode
    ///
    /// - Enters alternate screen buffer
    /// - Enables raw mode (character-by-character input)
    /// - Creates ratatui terminal backend
    #[napi]
    pub fn init(&mut self) -> Result<()> {
        self.terminal_ctrl.enter_raw_mode()?;
        self.terminal_ctrl.enter_alternate_screen()?;

        let backend = CrosstermBackend::new(io::stdout());
        let terminal = Terminal::new(backend)
            .map_err(|e| Error::from_reason(format!("Failed to create terminal: {}", e)))?;

        self.terminal = Some(terminal);
        Ok(())
    }

    /// Cleanup terminal state
    ///
    /// - Leaves alternate screen buffer
    /// - Disables raw mode
    /// - Drops terminal handle
    #[napi]
    pub fn cleanup(&mut self) -> Result<()> {
        if self.terminal.is_none() {
            return Ok(());
        }

        self.terminal = None;
        self.terminal_ctrl.leave_alternate_screen()?;
        self.terminal_ctrl.leave_raw_mode()?;
        Ok(())
    }

    /// Poll for input event (non-blocking)
    ///
    /// Returns immediately with event info:
    /// - `event_type: "key"` - Keyboard input
    /// - `event_type: "resize"` - Terminal resize
    /// - `event_type: "none"` - No event in timeout window
    #[napi]
    pub fn poll_input(&self, timeout_ms: u32) -> Result<InputEvent> {
        let duration = std::time::Duration::from_millis(timeout_ms as u64);

        if event::poll(duration).map_err(|e| Error::from_reason(e.to_string()))? {
            match event::read().map_err(|e| Error::from_reason(e.to_string()))? {
                Event::Key(key) => {
                    if key.kind == KeyEventKind::Press {
                        return Ok(InputEvent {
                            event_type: "key".to_string(),
                            key: Some(keys::key_code_to_string(key.code)),
                            modifiers: Some(keys::modifiers_to_string(key.modifiers)),
                            new_width: None,
                            new_height: None,
                        });
                    }
                }
                Event::Resize(w, h) => {
                    return Ok(InputEvent {
                        event_type: "resize".to_string(),
                        key: None,
                        modifiers: None,
                        new_width: Some(w as u32),
                        new_height: Some(h as u32),
                    });
                }
                _ => {}
            }
        }

        Ok(InputEvent {
            event_type: "none".to_string(),
            key: None,
            modifiers: None,
            new_width: None,
            new_height: None,
        })
    }

    /// Render the current state
    ///
    /// Dispatches to appropriate render mode based on state:
    /// - `show_help` → Help overlay
    /// - `search_mode` → Search interface
    /// - Default → Chat interface (messages + input + status)
    #[napi]
    pub fn render(&mut self, state: RenderState) -> Result<()> {
        let terminal = self.terminal.as_mut()
            .ok_or_else(|| Error::from_reason("Terminal not initialized"))?;

        terminal.draw(|f| {
            let area = f.area();

            if state.show_help {
                widgets::render_help(f, area, &state.help_text);
                return;
            }

            if state.search_mode {
                widgets::render_search(f, area, &state);
                return;
            }

            // Normal chat view
            widgets::render_chat(f, area, &state);
        }).map_err(|e| Error::from_reason(e.to_string()))?;

        Ok(())
    }
}

impl Drop for NativeRenderer {
    fn drop(&mut self) {
        let _ = self.cleanup();
    }
}

impl Default for NativeRenderer {
    fn default() -> Self {
        Self::new().expect("Failed to create default NativeRenderer")
    }
}
