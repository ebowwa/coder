//! Native TUI implementation using ratatui
//!
//! Provides a complete terminal UI without React/Ink dependency.
//! Handles message display, input field with history, and status bar.

use crossterm::{
    event::{self, Event, KeyCode, KeyModifiers, KeyEventKind},
    terminal::{self, EnterAlternateScreen, LeaveAlternateScreen},
    ExecutableCommand,
};
use napi::bindgen_prelude::*;
use ratatui::{
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span, Text},
    widgets::{Block, Borders, Paragraph, Wrap},
    Frame, Terminal,
};
use std::io::{self, Stdout};
use std::sync::{Arc, Mutex};

/// Message type for display
#[napi(object)]
pub struct TuiMessage {
    pub id: String,
    pub role: String, // "user", "assistant", "system"
    pub content: String,
    pub timestamp: Option<f64>,
    pub sub_type: Option<String>,
    pub tool_name: Option<String>,
    pub is_error: Option<bool>,
}

/// TUI state for rendering
#[napi(object)]
pub struct TuiState {
    pub messages: Vec<TuiMessage>,
    pub input_value: String,
    pub cursor_pos: u32,
    pub is_loading: bool,
    pub spinner_frame: u32,
    pub model: String,
    pub tokens_used: u32,
    pub permission_mode: String,
    pub streaming_text: String,
    pub scroll_offset: u32,
    pub context_warning: Option<String>,
}

/// Result of handling input
#[napi(object)]
pub struct InputResult {
    /// Whether input was submitted (Enter pressed)
    pub submitted: bool,
    /// The submitted text (if submitted)
    pub text: Option<String>,
    /// Whether user requested exit (Ctrl+C)
    pub exit_requested: bool,
    /// Command to execute (if starts with /)
    pub command: Option<String>,
    /// Whether scroll up was requested
    pub scroll_up: bool,
    /// Whether scroll down was requested
    pub scroll_down: bool,
    /// Updated input value
    pub input_value: String,
    /// Updated cursor position
    pub cursor_pos: u32,
    /// Whether history navigation occurred
    pub history_navigated: bool,
    /// Direction of history navigation (1 = up/older, -1 = down/newer, 0 = none)
    pub history_direction: i32,
}

/// Native TUI handle
pub struct NativeTui {
    terminal: Option<Terminal<CrosstermBackend<Stdout>>>,
    input_history: Vec<String>,
    history_index: i32,
    saved_input: String,
    /// Track if we need to cleanup on drop
    needs_cleanup: bool,
}

/// Spinner frames for loading animation
const SPINNER_FRAMES: &[&str] = &["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/// Factory function to create TUI
#[napi]
pub fn create_tui() -> Result<NativeTuiHandle> {
    NativeTuiHandle::new()
}

/// Thread-safe handle for TUI
#[napi]
pub struct NativeTuiHandle {
    inner: Arc<Mutex<NativeTui>>,
}

#[napi]
impl NativeTuiHandle {
    #[napi(constructor)]
    pub fn new() -> Result<Self> {
        Ok(Self {
            inner: Arc::new(Mutex::new(NativeTui {
                terminal: None,
                input_history: Vec::new(),
                history_index: -1,
                saved_input: String::new(),
                needs_cleanup: false,
            })),
        })
    }

    /// Initialize terminal (enter raw mode, alternate screen)
    #[napi]
    pub fn init(&mut self) -> Result<()> {
        let mut tui = self.inner.lock().map_err(|e| Error::from_reason(e.to_string()))?;

        // Setup terminal
        io::stdout()
            .execute(EnterAlternateScreen)
            .map_err(|e| Error::from_reason(e.to_string()))?;

        terminal::enable_raw_mode()
            .map_err(|e| Error::from_reason(format!("Failed to enable raw mode: {}", e)))?;

        let backend = CrosstermBackend::new(io::stdout());
        let terminal = Terminal::new(backend)
            .map_err(|e| Error::from_reason(e.to_string()))?;

        tui.terminal = Some(terminal);
        tui.needs_cleanup = true;
        Ok(())
    }

    /// Cleanup terminal (exit raw mode, alternate screen)
    #[napi]
    pub fn cleanup(&mut self) -> Result<()> {
        let mut tui = self.inner.lock().map_err(|e| Error::from_reason(e.to_string()))?;

        // Restore terminal
        terminal::disable_raw_mode()
            .map_err(|e| Error::from_reason(e.to_string()))?;

        io::stdout()
            .execute(LeaveAlternateScreen)
            .map_err(|e| Error::from_reason(e.to_string()))?;

        tui.terminal = None;
        Ok(())
    }

    /// Render the TUI with current state
    #[napi]
    pub fn render(&mut self, state: TuiState) -> Result<()> {
        let mut tui = self.inner.lock().map_err(|e| Error::from_reason(e.to_string()))?;

        let terminal = tui.terminal.as_mut()
            .ok_or_else(|| Error::from_reason("TUI not initialized".to_string()))?;

        terminal.draw(|f| {
            let chunks = Layout::default()
                .direction(Direction::Vertical)
                .margin(0)
                .constraints([
                    Constraint::Min(3),      // Messages area
                    Constraint::Length(2),   // Status bar
                    Constraint::Length(3),   // Input field
                ])
                .split(f.area());

            // Render messages
            render_messages(f, chunks[0], &state);

            // Render status bar
            render_status_bar(f, chunks[1], &state);

            // Render input field
            render_input_field(f, chunks[2], &state);
        }).map_err(|e| Error::from_reason(e.to_string()))?;

        Ok(())
    }

    /// Poll for input event
    #[napi]
    pub fn poll_input(&mut self, state: TuiState, timeout_ms: Option<u32>) -> Result<InputResult> {
        let tui = self.inner.lock().map_err(|e| Error::from_reason(e.to_string()))?;

        let timeout = std::time::Duration::from_millis(timeout_ms.unwrap_or(16) as u64);

        if !event::poll(timeout).map_err(|e| Error::from_reason(e.to_string()))? {
            return Ok(InputResult {
                submitted: false,
                text: None,
                exit_requested: false,
                command: None,
                scroll_up: false,
                scroll_down: false,
                input_value: state.input_value,
                cursor_pos: state.cursor_pos,
                history_navigated: false,
                history_direction: 0,
            });
        }

        let ev = event::read().map_err(|e| Error::from_reason(e.to_string()))?;

        // Drop the lock before we potentially need to modify history
        drop(tui);

        handle_input_event(ev, state, &self.inner)
    }

    /// Add input to history
    #[napi]
    pub fn add_to_history(&mut self, input: String) -> Result<()> {
        let mut tui = self.inner.lock().map_err(|e| Error::from_reason(e.to_string()))?;

        // Don't add duplicates or commands
        if !input.starts_with('/') && tui.input_history.first() != Some(&input) {
            tui.input_history.insert(0, input);
            // Keep last 100 entries
            if tui.input_history.len() > 100 {
                tui.input_history.truncate(100);
            }
        }
        tui.history_index = -1;
        tui.saved_input.clear();

        Ok(())
    }
}

/// Handle input event
fn handle_input_event(
    ev: Event,
    state: TuiState,
    inner: &Arc<Mutex<NativeTui>>,
) -> Result<InputResult> {
    let mut input_value = state.input_value;
    let mut cursor_pos = state.cursor_pos as usize;
    let mut history_navigated = false;
    let mut history_direction = 0;

    if let Event::Key(key) = ev {
        if key.kind != KeyEventKind::Press {
            return Ok(InputResult {
                submitted: false,
                text: None,
                exit_requested: false,
                command: None,
                scroll_up: false,
                scroll_down: false,
                input_value,
                cursor_pos: cursor_pos as u32,
                history_navigated: false,
                history_direction: 0,
            });
        }

        match key.code {
            // Exit on Ctrl+C
            KeyCode::Char('c') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                return Ok(InputResult {
                    submitted: false,
                    text: None,
                    exit_requested: true,
                    command: None,
                    scroll_up: false,
                    scroll_down: false,
                    input_value,
                    cursor_pos: cursor_pos as u32,
                    history_navigated: false,
                    history_direction: 0,
                });
            }

            // Submit on Enter
            KeyCode::Enter => {
                if !input_value.trim().is_empty() {
                    let text = input_value.clone();
                    let is_command = text.starts_with('/');

                    // Add to history (not commands)
                    if !is_command {
                        let mut tui = inner.lock().map_err(|e| Error::from_reason(e.to_string()))?;
                        if tui.input_history.first() != Some(&text) {
                            tui.input_history.insert(0, text.clone());
                            if tui.input_history.len() > 100 {
                                tui.input_history.truncate(100);
                            }
                        }
                        tui.history_index = -1;
                        tui.saved_input.clear();
                    }

                    return Ok(InputResult {
                        submitted: true,
                        text: Some(text.clone()),
                        exit_requested: false,
                        command: if is_command { Some(text[1..].to_string()) } else { None },
                        scroll_up: false,
                        scroll_down: false,
                        input_value: String::new(),
                        cursor_pos: 0,
                        history_navigated: false,
                        history_direction: 0,
                    });
                }
            }

            // Up arrow - navigate history
            KeyCode::Up => {
                let mut tui = inner.lock().map_err(|e| Error::from_reason(e.to_string()))?;

                if !tui.input_history.is_empty() {
                    // Save current input if starting navigation
                    if tui.history_index == -1 {
                        tui.saved_input = input_value.clone();
                    }
                    let new_index = std::cmp::min(tui.history_index + 1, tui.input_history.len() as i32 - 1);
                    if let Some(history_item) = tui.input_history.get(new_index as usize) {
                        input_value = history_item.clone();
                        cursor_pos = input_value.len();
                        history_navigated = true;
                        history_direction = 1;
                        tui.history_index = new_index;
                    }
                }
            }

            // Down arrow - navigate history forward
            KeyCode::Down => {
                let mut tui = inner.lock().map_err(|e| Error::from_reason(e.to_string()))?;

                if tui.history_index > 0 {
                    let new_index = tui.history_index - 1;
                    if let Some(history_item) = tui.input_history.get(new_index as usize) {
                        input_value = history_item.clone();
                        cursor_pos = input_value.len();
                        history_navigated = true;
                        history_direction = -1;
                        tui.history_index = new_index;
                    }
                } else if tui.history_index == 0 {
                    // Restore saved input
                    input_value = tui.saved_input.clone();
                    cursor_pos = input_value.len();
                    history_navigated = true;
                    history_direction = -1;
                    tui.history_index = -1;
                }
            }

            // Page Up - scroll messages up
            KeyCode::PageUp => {
                return Ok(InputResult {
                    submitted: false,
                    text: None,
                    exit_requested: false,
                    command: None,
                    scroll_up: true,
                    scroll_down: false,
                    input_value,
                    cursor_pos: cursor_pos as u32,
                    history_navigated: false,
                    history_direction: 0,
                });
            }

            // Page Down - scroll messages down
            KeyCode::PageDown => {
                return Ok(InputResult {
                    submitted: false,
                    text: None,
                    exit_requested: false,
                    command: None,
                    scroll_up: false,
                    scroll_down: true,
                    input_value,
                    cursor_pos: cursor_pos as u32,
                    history_navigated: false,
                    history_direction: 0,
                });
            }

            // Backspace
            KeyCode::Backspace => {
                if cursor_pos > 0 {
                    input_value.remove(cursor_pos - 1);
                    cursor_pos -= 1;
                }
            }

            // Delete
            KeyCode::Delete => {
                if cursor_pos < input_value.len() {
                    input_value.remove(cursor_pos);
                }
            }

            // Left arrow
            KeyCode::Left => {
                cursor_pos = cursor_pos.saturating_sub(1);
            }

            // Right arrow
            KeyCode::Right => {
                cursor_pos = std::cmp::min(cursor_pos + 1, input_value.len());
            }

            // Home / Ctrl+A
            KeyCode::Home | KeyCode::Char('a') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                cursor_pos = 0;
            }

            // End / Ctrl+E
            KeyCode::End | KeyCode::Char('e') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                cursor_pos = input_value.len();
            }

            // Regular character
            KeyCode::Char(c) if !key.modifiers.contains(KeyModifiers::CONTROL) => {
                // Reset history navigation when typing
                {
                    let mut tui = inner.lock().map_err(|e| Error::from_reason(e.to_string()))?;
                    if tui.history_index != -1 {
                        tui.history_index = -1;
                        tui.saved_input.clear();
                    }
                }

                input_value.insert(cursor_pos, c);
                cursor_pos += 1;
            }

            _ => {}
        }
    }

    Ok(InputResult {
        submitted: false,
        text: None,
        exit_requested: false,
        command: None,
        scroll_up: false,
        scroll_down: false,
        input_value,
        cursor_pos: cursor_pos as u32,
        history_navigated,
        history_direction,
    })
}

/// Render messages area
fn render_messages(f: &mut Frame, area: Rect, state: &TuiState) {
    let mut lines: Vec<Line> = Vec::new();

    // Add messages (in reverse order for bottom-up scrolling)
    let total_messages = state.messages.len() as u32;
    let scroll_offset = state.scroll_offset.min(total_messages);

    // Calculate visible messages
    let max_visible = area.height.saturating_sub(2) as usize;
    let start_idx = if total_messages > max_visible as u32 {
        (total_messages - max_visible as u32).saturating_sub(scroll_offset) as usize
    } else {
        0
    };

    for msg in state.messages.iter().skip(start_idx).take(max_visible) {
        let role_style = match msg.role.as_str() {
            "user" => Style::default().fg(Color::Cyan),
            "assistant" => Style::default().fg(Color::Green),
            "system" => Style::default().fg(Color::Yellow),
            _ => Style::default(),
        };

        let prefix = match msg.role.as_str() {
            "user" => "You",
            "assistant" => "Coder",
            "system" => "System",
            _ => "Unknown",
        };

        lines.push(Line::from(vec![
            Span::styled(format!("{}: ", prefix), role_style.add_modifier(Modifier::BOLD)),
            Span::raw(&msg.content),
        ]));
    }

    // Add streaming text if loading
    if !state.streaming_text.is_empty() {
        lines.push(Line::from(vec![
            Span::styled("Coder: ", Style::default().fg(Color::Green).add_modifier(Modifier::BOLD)),
            Span::raw(&state.streaming_text),
        ]));
    }

    // Add loading indicator
    if state.is_loading {
        let frame = SPINNER_FRAMES[(state.spinner_frame as usize) % SPINNER_FRAMES.len()];
        lines.push(Line::from(vec![
            Span::styled(frame, Style::default().fg(Color::Yellow)),
            Span::raw(" Thinking..."),
        ]));
    }

    // Add context warning if present
    if let Some(ref warning) = state.context_warning {
        lines.push(Line::from(Span::styled(
            warning,
            Style::default().fg(Color::Red).add_modifier(Modifier::BOLD),
        )));
    }

    let messages_widget = Paragraph::new(Text::from(lines))
        .block(Block::default().borders(Borders::NONE))
        .wrap(Wrap { trim: false });

    f.render_widget(messages_widget, area);
}

/// Render status bar
fn render_status_bar(f: &mut Frame, area: Rect, state: &TuiState) {
    let status_text = format!(
        " {} | {} | Tokens: {} | {}",
        state.model,
        state.permission_mode,
        state.tokens_used,
        if state.is_loading {
            SPINNER_FRAMES[(state.spinner_frame as usize) % SPINNER_FRAMES.len()]
        } else {
            "Ready"
        }
    );

    let status = Paragraph::new(status_text)
        .style(Style::default().fg(Color::White).bg(Color::DarkGray));

    f.render_widget(status, area);
}

/// Render input field
fn render_input_field(f: &mut Frame, area: Rect, state: &TuiState) {
    let placeholder = if state.is_loading {
        "Processing..."
    } else {
        "Type your message... (/help for commands)"
    };

    let display_text = if state.input_value.is_empty() && !state.is_loading {
        placeholder.to_string()
    } else {
        state.input_value.clone()
    };

    let style = if state.input_value.is_empty() && !state.is_loading {
        Style::default().fg(Color::DarkGray)
    } else {
        Style::default()
    };

    let input = Paragraph::new(display_text)
        .style(style)
        .block(
            Block::default()
                .borders(Borders::TOP)
                .title(" Input ")
        );

    f.render_widget(input, area);

    // Show cursor position (visual cursor)
    let cursor_offset = (state.cursor_pos as u16).min(area.width.saturating_sub(2));
    let cursor_x = area.x + cursor_offset;
    let cursor_y = area.y + 1;
    f.set_cursor_position((cursor_x, cursor_y));
}
