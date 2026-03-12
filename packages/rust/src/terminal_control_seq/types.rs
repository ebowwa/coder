//! NAPI Types for TypeScript Interop
//!
//! These types are serialized across the FFI boundary.
//! TypeScript controls state, Rust only renders.

/// Message for display in chat interface
#[napi(object)]
#[derive(Debug, Clone)]
pub struct RenderMessage {
    /// Role: "user", "assistant", "system", "tool"
    pub role: String,
    /// Message content (may contain newlines)
    pub content: String,
}

/// Complete render state - TypeScript controls this
#[napi(object)]
#[derive(Debug, Clone)]
pub struct RenderState {
    // === Chat Messages ===
    /// Chat history to display
    pub messages: Vec<RenderMessage>,
    /// Scroll offset for chat history (0 = bottom/latest)
    pub scroll_offset: u32,

    // === Input State ===
    /// Current input buffer content
    pub input_value: String,
    /// Cursor position in input (0 = start)
    pub cursor_pos: u32,

    // === Status ===
    /// Status bar text
    pub status_text: String,
    /// Show loading indicator
    pub is_loading: bool,
    /// Streaming response text (partial)
    pub streaming_text: String,
    /// Current model name
    pub model: String,

    // === Help Overlay ===
    /// Show help overlay
    pub show_help: bool,
    /// Help text content
    pub help_text: String,

    // === Search Mode ===
    /// Active search mode
    pub search_mode: bool,
    /// Search query text
    pub search_query: String,
    /// Search results
    pub search_results: Vec<SearchResult>,
    /// Selected result index (-1 = none)
    pub search_selected: i32,
}

/// Search result item
#[napi(object)]
#[derive(Debug, Clone)]
pub struct SearchResult {
    /// File path
    pub file_path: String,
    /// Line number (1-based)
    pub line_number: u32,
    /// Matching content
    pub content: String,
}

/// Input event returned to TypeScript
#[napi(object)]
#[derive(Debug, Clone)]
pub struct InputEvent {
    /// Event type: "key", "resize", "none"
    pub event_type: String,
    /// Key name for key events (e.g., "enter", "a", "up")
    pub key: Option<String>,
    /// Modifiers string (e.g., "ctrl", "ctrl+shift", "")
    pub modifiers: Option<String>,
    /// New width for resize events
    pub new_width: Option<u32>,
    /// New height for resize events
    pub new_height: Option<u32>,
}

impl Default for RenderState {
    fn default() -> Self {
        Self {
            messages: Vec::new(),
            scroll_offset: 0,
            input_value: String::new(),
            cursor_pos: 0,
            status_text: String::new(),
            is_loading: false,
            streaming_text: String::new(),
            model: "claude".to_string(),
            show_help: false,
            help_text: String::new(),
            search_mode: false,
            search_query: String::new(),
            search_results: Vec::new(),
            search_selected: -1,
        }
    }
}

impl Default for InputEvent {
    fn default() -> Self {
        Self {
            event_type: "none".to_string(),
            key: None,
            modifiers: None,
            new_width: None,
            new_height: None,
        }
    }
}
