//! Box primitives - Borders and containers

use napi_derive::napi;
use super::style::{TuiColor, TuiRgb, TuiStyle};

/// Border types
#[napi]
pub enum TuiBorderType {
    Plain,
    Rounded,
    Double,
    Thick,
}

/// Which sides to render borders on
#[napi(object)]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct TuiBorders {
    pub top: bool,
    pub right: bool,
    pub bottom: bool,
    pub left: bool,
}

/// Box padding
#[napi(object)]
#[derive(Debug, Clone, Copy, Default)]
pub struct TuiPadding {
    pub left: u16,
    pub right: u16,
    pub top: u16,
    pub bottom: u16,
}

// Common border presets

#[napi]
pub fn tui_borders_all() -> TuiBorders {
    TuiBorders { top: true, right: true, bottom: true, left: true }
}

#[napi]
pub fn tui_borders_none() -> TuiBorders {
    TuiBorders::default()
}

#[napi]
pub fn tui_borders_horizontal() -> TuiBorders {
    TuiBorders { top: true, bottom: true, ..Default::default() }
}

#[napi]
pub fn tui_borders_vertical() -> TuiBorders {
    TuiBorders { left: true, right: true, ..Default::default() }
}

#[napi]
pub fn tui_borders_top() -> TuiBorders {
    TuiBorders { top: true, ..Default::default() }
}

#[napi]
pub fn tui_borders_bottom() -> TuiBorders {
    TuiBorders { bottom: true, ..Default::default() }
}

// Common padding presets

#[napi]
pub fn tui_padding_uniform(value: u16) -> TuiPadding {
    TuiPadding { left: value, right: value, top: value, bottom: value }
}

#[napi]
pub fn tui_padding_horizontal(value: u16) -> TuiPadding {
    TuiPadding { left: value, right: value, ..Default::default() }
}

#[napi]
pub fn tui_padding_vertical(value: u16) -> TuiPadding {
    TuiPadding { top: value, bottom: value, ..Default::default() }
}

/// Draw a horizontal line with given width and optional style
#[napi]
pub fn tui_draw_horizontal_line(width: u32, style: Option<TuiStyle>) -> String {
    let style_ansi = style.map(|s| style_to_ansi(&s)).unwrap_or_default();
    format!("{}{}\x1b[0m", style_ansi, "─".repeat(width as usize))
}

/// Draw a vertical line (single character, use tui_move_cursor for positioning)
#[napi]
pub fn tui_draw_vertical_line(height: u32, style: Option<TuiStyle>) -> String {
    let style_ansi = style.map(|s| style_to_ansi(&s)).unwrap_or_default();
    (0..height).map(|_| format!("{}│\x1b[0m", style_ansi)).collect::<Vec<_>>().join("\n")
}

/// Draw a box border (just the border, no content)
#[napi]
pub fn tui_draw_box_border(width: u32, height: u32, title: Option<String>, style: Option<TuiStyle>) -> String {
    let width = width as usize;
    let height = height as usize;
    let style_ansi = style.map(|s| style_to_ansi(&s)).unwrap_or_default();

    let mut lines = Vec::new();

    // Top border
    let title_str = title.unwrap_or_default();
    let inner_width = width.saturating_sub(2);
    let title_display = if title_str.is_empty() {
        "─".repeat(inner_width)
    } else {
        let title_len = title_str.chars().count() + 2;
        let dashes = inner_width.saturating_sub(title_len);
        let left_dashes = dashes / 2;
        let right_dashes = dashes - left_dashes;
        format!("{} {} {}", "─".repeat(left_dashes), title_str, "─".repeat(right_dashes))
    };
    lines.push(format!("{}┌{}┐\x1b[0m", style_ansi, title_display));

    // Middle rows
    for _ in 1..height.saturating_sub(1) {
        lines.push(format!("{}│{}│\x1b[0m", style_ansi, " ".repeat(inner_width)));
    }

    // Bottom border
    if height > 1 {
        lines.push(format!("{}└{}┘\x1b[0m", style_ansi, "─".repeat(inner_width)));
    }

    lines.join("\n")
}

/// Draw a box with content inside
#[napi]
pub fn tui_draw_box(width: u32, height: u32, title: Option<String>, content: String, style: Option<TuiStyle>) -> String {
    let width = width as usize;
    let height = height as usize;
    let style_ansi = style.map(|s| style_to_ansi(&s)).unwrap_or_default();

    let mut lines = Vec::new();

    // Top border
    let title_str = title.unwrap_or_default();
    let inner_width = width.saturating_sub(2);
    let title_display = if title_str.is_empty() {
        "─".repeat(inner_width)
    } else {
        let title_len = title_str.chars().count() + 2;
        let dashes = inner_width.saturating_sub(title_len);
        let left_dashes = dashes / 2;
        let right_dashes = dashes - left_dashes;
        format!("{} {} {}", "─".repeat(left_dashes), title_str, "─".repeat(right_dashes))
    };
    lines.push(format!("{}┌{}┐\x1b[0m", style_ansi, title_display));

    // Content rows
    let content_lines: Vec<&str> = content.lines().collect();
    let content_height = height.saturating_sub(2);

    for i in 0..content_height {
        let line_content = content_lines.get(i).unwrap_or(&"");
        let padded = format!("{:width$}", line_content, width = inner_width);
        // Truncate if too long
        let truncated: String = padded.chars().take(inner_width).collect();
        lines.push(format!("{}│{}│\x1b[0m", style_ansi, truncated));
    }

    // Bottom border
    if height > 1 {
        lines.push(format!("{}└{}┘\x1b[0m", style_ansi, "─".repeat(inner_width)));
    }

    lines.join("\n")
}

/// Draw a separator line
#[napi]
pub fn tui_draw_separator(width: u32, style: Option<TuiStyle>) -> String {
    let style_ansi = style.map(|s| style_to_ansi(&s)).unwrap_or_default();
    format!("{}{}\x1b[0m", style_ansi, "─".repeat(width as usize))
}

/// Draw a double separator line
#[napi]
pub fn tui_draw_double_separator(width: u32, style: Option<TuiStyle>) -> String {
    let style_ansi = style.map(|s| style_to_ansi(&s)).unwrap_or_default();
    format!("{}{}\x1b[0m", style_ansi, "═".repeat(width as usize))
}

// === Internal helpers ===

fn style_to_ansi(style: &TuiStyle) -> String {
    let mut codes: Vec<String> = Vec::new();

    // Modifiers
    if let Some(mods) = &style.modifiers {
        if mods.bold { codes.push("1".to_string()); }
        if mods.dim { codes.push("2".to_string()); }
        if mods.italic { codes.push("3".to_string()); }
        if mods.underline { codes.push("4".to_string()); }
        if mods.reverse { codes.push("7".to_string()); }
        if mods.strikethrough { codes.push("9".to_string()); }
    }

    // Foreground
    if let Some(fg) = style.fg {
        codes.extend(color_to_ansi_codes(fg, style.fg_rgb.as_ref(), style.fg_index, false));
    }

    // Background
    if let Some(bg) = style.bg {
        codes.extend(color_to_ansi_codes(bg, style.bg_rgb.as_ref(), style.bg_index, true));
    }

    if codes.is_empty() {
        "\x1b[0m".to_string()
    } else {
        format!("\x1b[{}m", codes.join(";"))
    }
}

fn color_to_ansi_codes(color: TuiColor, rgb: Option<&TuiRgb>, index: Option<u8>, is_bg: bool) -> Vec<String> {
    let prefix = if is_bg { 4 } else { 3 };
    let bright_prefix = if is_bg { 10 } else { 9 };

    match color {
        TuiColor::Reset => vec![],
        TuiColor::Black => vec![format!("{}0", prefix)],
        TuiColor::Red => vec![format!("{}1", prefix)],
        TuiColor::Green => vec![format!("{}2", prefix)],
        TuiColor::Yellow => vec![format!("{}3", prefix)],
        TuiColor::Blue => vec![format!("{}4", prefix)],
        TuiColor::Magenta => vec![format!("{}5", prefix)],
        TuiColor::Cyan => vec![format!("{}6", prefix)],
        TuiColor::White => vec![format!("{}7", prefix)],
        TuiColor::BrightBlack => vec![format!("{}0", bright_prefix)],
        TuiColor::BrightRed => vec![format!("{}1", bright_prefix)],
        TuiColor::BrightGreen => vec![format!("{}2", bright_prefix)],
        TuiColor::BrightYellow => vec![format!("{}3", bright_prefix)],
        TuiColor::BrightBlue => vec![format!("{}4", bright_prefix)],
        TuiColor::BrightMagenta => vec![format!("{}5", bright_prefix)],
        TuiColor::BrightCyan => vec![format!("{}6", bright_prefix)],
        TuiColor::BrightWhite => vec![],
        TuiColor::Rgb => {
            if let Some(rgb) = rgb {
                vec![format!("{}8;2;{};{};{}", prefix, rgb.r, rgb.g, rgb.b)]
            } else {
                vec![]
            }
        },
        TuiColor::Indexed => {
            if let Some(idx) = index {
                vec![format!("{}8;5;{}", prefix, idx)]
            } else {
                vec![]
            }
        },
    }
}
