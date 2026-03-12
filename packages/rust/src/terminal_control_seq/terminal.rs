//! Terminal Control - Raw Mode and Alternate Screen
//!
//! Low-level terminal control for TUI applications.
//!
//! ## Terminal Modes
//!
//! | Mode | CLI (Default) | TUI |
//! |------|---------------|-----|
//! | Input | Line-buffered | Character-buffered |
//! | Echo | On | Off |
//! | Screen | Primary | Alternate |
//!
//! ## Alternate Screen Buffer
//!
//! The alternate screen buffer preserves the shell history:
//! ```text
//! Before TUI:              During TUI:              After TUI:
//! ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
//! │ $ ls            │      │ [TUI App]       │      │ $ ls            │
//! │ file1 file2     │      │ Interactive     │      │ file1 file2     │
//! │ $ vim file1     │      │ Interface       │      │ $ vim file1     │
//! │ $ _             │      │                 │      │ $ _             │
//! └─────────────────┘      └─────────────────┘      └─────────────────┘
//!   (primary)               (alternate)              (primary restored)
//! ```

use crossterm::{
    terminal::{self, EnterAlternateScreen, LeaveAlternateScreen},
    ExecutableCommand,
};
use napi::bindgen_prelude::*;
use std::io;

/// Terminal control state tracker
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct TerminalControl {
    in_raw_mode: bool,
    in_alternate_screen: bool,
}

impl TerminalControl {
    /// Create new terminal control with default state
    pub fn new() -> Self {
        Self {
            in_raw_mode: false,
            in_alternate_screen: false,
        }
    }

    /// Enter raw mode (character-by-character input)
    ///
    /// Raw mode disables:
    /// - Line buffering (read each char, not each line)
    /// - Echo (typed chars not displayed)
    /// - Signal processing (Ctrl+C doesn't send SIGINT)
    pub fn enter_raw_mode(&mut self) -> Result<()> {
        if self.in_raw_mode {
            return Ok(());
        }

        terminal::enable_raw_mode()
            .map_err(|e| Error::from_reason(format!("Failed to enable raw mode: {}", e)))?;

        self.in_raw_mode = true;
        Ok(())
    }

    /// Leave raw mode (restore line buffering)
    pub fn leave_raw_mode(&mut self) -> Result<()> {
        if !self.in_raw_mode {
            return Ok(());
        }

        terminal::disable_raw_mode()
            .map_err(|e| Error::from_reason(format!("Failed to disable raw mode: {}", e)))?;

        self.in_raw_mode = false;
        Ok(())
    }

    /// Enter alternate screen buffer
    ///
    /// Preserves shell history when TUI exits.
    pub fn enter_alternate_screen(&mut self) -> Result<()> {
        if self.in_alternate_screen {
            return Ok(());
        }

        io::stdout()
            .execute(EnterAlternateScreen)
            .map_err(|e| Error::from_reason(format!("Failed to enter alternate screen: {}", e)))?;

        self.in_alternate_screen = true;
        Ok(())
    }

    /// Leave alternate screen buffer
    ///
    /// Restores primary screen with shell history.
    pub fn leave_alternate_screen(&mut self) -> Result<()> {
        if !self.in_alternate_screen {
            return Ok(());
        }

        io::stdout()
            .execute(LeaveAlternateScreen)
            .map_err(|e| Error::from_reason(format!("Failed to leave alternate screen: {}", e)))?;

        self.in_alternate_screen = false;
        Ok(())
    }

    /// Check if in raw mode
    pub fn is_raw_mode(&self) -> bool {
        self.in_raw_mode
    }

    /// Check if in alternate screen
    pub fn is_alternate_screen(&self) -> bool {
        self.in_alternate_screen
    }
}

impl Drop for TerminalControl {
    fn drop(&mut self) {
        // Clean up on drop (ignore errors)
        let _ = self.leave_alternate_screen();
        let _ = self.leave_raw_mode();
    }
}
