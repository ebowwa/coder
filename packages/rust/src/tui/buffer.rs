//! Buffer primitives - Render to ANSI strings

use napi_derive::napi;
use ratatui::{
    buffer::Buffer,
    layout::Rect,
    prelude::Widget,
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::Paragraph,
};

use super::style::{TuiColor, TuiRgb, TuiStyle};
use super::text::{TuiTextBlock, TuiTextLine, TuiTextSegment};

/// Render text line to ANSI string
#[napi]
pub fn tui_render_line(line: TuiTextLine, width: Option<u32>) -> String {
    let width = width.unwrap_or(80) as u16;

    // Convert to ratatui Line
    let spans: Vec<Span> = line.segments.iter().map(|seg| {
        let style = convert_style(&seg.style);
        Span::styled(&seg.content, style)
    }).collect();
    let ratatui_line = Line::from(spans);

    // Create buffer and render
    let area = Rect::new(0, 0, width, 1);
    let mut buffer = Buffer::empty(area);
    Paragraph::new(ratatui_line).render(area, &mut buffer);
    buffer_to_ansi(&buffer)
}

/// Render text block to ANSI string
#[napi]
pub fn tui_render_block(block: TuiTextBlock, width: Option<u32>) -> String {
    let width = width.unwrap_or(80) as u16;

    // Convert to ratatui Lines
    let lines: Vec<Line> = block.lines.iter().map(|line| {
        let spans: Vec<Span> = line.segments.iter().map(|seg| {
            let style = convert_style(&seg.style);
            Span::styled(&seg.content, style)
        }).collect();
        Line::from(spans)
    }).collect();

    // Calculate required height by estimating line count after wrapping
    // Each line can wrap to multiple lines based on width
    let mut estimated_height = 0u16;
    for line in &lines {
        let line_width: usize = line.spans.iter().map(|s| s.content.chars().count()).sum();
        let wrapped_lines = if width > 0 {
            ((line_width as u16 + width - 1) / width).max(1)
        } else {
            1
        };
        estimated_height += wrapped_lines;
    }

    // Create paragraph with word wrap
    let paragraph = Paragraph::new(lines).wrap(ratatui::widgets::Wrap { trim: false });

    // Create buffer with estimated height (add buffer for safety)
    let height = estimated_height.max(block.lines.len() as u16).max(1);
    let area = Rect::new(0, 0, width, height);
    let mut buffer = Buffer::empty(area);
    paragraph.render(area, &mut buffer);
    buffer_to_ansi(&buffer)
}

/// Render a simple message with prefix (like "You: hello")
#[napi]
pub fn tui_render_message(prefix: String, content: String, prefix_style: Option<TuiStyle>, width: Option<u32>) -> String {
    let width = width.unwrap_or(80) as u16;

    // Handle empty content - still show prefix
    if content.is_empty() {
        let line = TuiTextLine {
            segments: vec![
                TuiTextSegment { content: prefix.clone(), style: prefix_style.as_ref().cloned() },
            ],
        };
        let block = TuiTextBlock { lines: vec![line] };
        return tui_render_block(block, Some(width as u32));
    }

    // Split content into lines for proper wrapping
    let lines: Vec<TuiTextLine> = content.lines()
        .map(|line| {
            TuiTextLine {
                segments: vec![
                    TuiTextSegment { content: prefix.clone(), style: prefix_style.as_ref().cloned() },
                    TuiTextSegment { content: line.to_string(), style: None },
                ],
            }
        })
        .collect();

    let block = TuiTextBlock { lines };
    tui_render_block(block, Some(width as u32))
}

/// Render a status bar line
#[napi]
pub fn tui_render_status_bar(left: String, right: String, style: Option<TuiStyle>, width: Option<u32>) -> String {
    let width = width.unwrap_or(80) as usize;
    let left_len = left.chars().count();
    let right_len = right.chars().count();
    let padding = width.saturating_sub(left_len + right_len);

    let content = format!("{}{}{}", left, " ".repeat(padding), right);

    let line = TuiTextLine {
        segments: vec![TuiTextSegment { content, style }],
    };
    tui_render_line(line, Some(width as u32))
}

/// Clear screen and move cursor to top-left
#[napi]
pub fn tui_clear_screen() -> String {
    "\x1b[2J\x1b[H".to_string()
}

/// Hide cursor
#[napi]
pub fn tui_hide_cursor() -> String {
    "\x1b[?25l".to_string()
}

/// Show cursor
#[napi]
pub fn tui_show_cursor() -> String {
    "\x1b[?25h".to_string()
}

/// Move cursor to position (1-based)
#[napi]
pub fn tui_move_cursor(row: u32, col: u32) -> String {
    format!("\x1b[{};{}H", row, col)
}

/// Enter alternate screen buffer
#[napi]
pub fn tui_enter_alt_screen() -> String {
    "\x1b[?1049h".to_string()
}

/// Exit alternate screen buffer
#[napi]
pub fn tui_exit_alt_screen() -> String {
    "\x1b[?1049l".to_string()
}

/// Reset all styles
#[napi]
pub fn tui_reset_style() -> String {
    "\x1b[0m".to_string()
}

/// Get styled text (applies style to content and resets after)
#[napi]
pub fn tui_styled_text(content: String, style: TuiStyle) -> String {
    let ansi_style = style_to_ansi(convert_style(&Some(style)));
    format!("{}{}\x1b[0m", ansi_style, content)
}

// === Internal helpers ===

fn convert_style(style: &Option<TuiStyle>) -> Style {
    match style {
        Some(s) => {
            let mut ratatui_style = Style::default();

            // Foreground
            if let Some(fg) = s.fg {
                ratatui_style = ratatui_style.fg(convert_color(fg, s.fg_rgb.as_ref(), s.fg_index));
            }

            // Background
            if let Some(bg) = s.bg {
                ratatui_style = ratatui_style.bg(convert_color(bg, s.bg_rgb.as_ref(), s.bg_index));
            }

            // Modifiers
            if let Some(mods) = &s.modifiers {
                let mut modifier = Modifier::empty();
                if mods.bold { modifier |= Modifier::BOLD; }
                if mods.dim { modifier |= Modifier::DIM; }
                if mods.italic { modifier |= Modifier::ITALIC; }
                if mods.underline { modifier |= Modifier::UNDERLINED; }
                if mods.strikethrough { modifier |= Modifier::CROSSED_OUT; }
                if mods.reverse { modifier |= Modifier::REVERSED; }
                ratatui_style = ratatui_style.add_modifier(modifier);
            }

            ratatui_style
        }
        None => Style::default(),
    }
}

fn convert_color(color: TuiColor, rgb: Option<&TuiRgb>, index: Option<u8>) -> Color {
    match color {
        TuiColor::Reset => Color::Reset,
        TuiColor::Black => Color::Black,
        TuiColor::Red => Color::Red,
        TuiColor::Green => Color::Green,
        TuiColor::Yellow => Color::Yellow,
        TuiColor::Blue => Color::Blue,
        TuiColor::Magenta => Color::Magenta,
        TuiColor::Cyan => Color::Cyan,
        TuiColor::White => Color::White,
        TuiColor::BrightBlack => Color::Gray,
        TuiColor::BrightRed => Color::LightRed,
        TuiColor::BrightGreen => Color::LightGreen,
        TuiColor::BrightYellow => Color::LightYellow,
        TuiColor::BrightBlue => Color::LightBlue,
        TuiColor::BrightMagenta => Color::LightMagenta,
        TuiColor::BrightCyan => Color::LightCyan,
        TuiColor::BrightWhite => Color::Reset,
        TuiColor::Rgb => {
            if let Some(rgb) = rgb {
                Color::Rgb(rgb.r, rgb.g, rgb.b)
            } else {
                Color::Reset
            }
        },
        TuiColor::Indexed => {
            if let Some(idx) = index {
                Color::Indexed(idx)
            } else {
                Color::Reset
            }
        },
    }
}

/// Convert a ratatui Buffer to ANSI escape sequence string
fn buffer_to_ansi(buffer: &Buffer) -> String {
    let mut output = String::new();
    let area = buffer.area;
    let mut current_style: Option<Style> = None;
    let mut current_symbols = String::new();

    for y in 0..area.height {
        // Move to start of line
        if y > 0 {
            output.push('\n');
        }

        for x in 0..area.width {
            let cell = &buffer[(x, y)];
            let cell_style = cell.style();
            let symbol = cell.symbol();

            // If style changed, flush accumulated symbols and update style
            if current_style != Some(cell_style) {
                // Flush any accumulated symbols first
                if !current_symbols.is_empty() {
                    output.push_str(&current_symbols);
                    current_symbols.clear();
                }
                // Then update style
                output.push_str(&style_to_ansi(cell_style));
                current_style = Some(cell_style);
            }

            // Accumulate symbols (use space if empty)
            if symbol.is_empty() {
                current_symbols.push(' ');
            } else {
                current_symbols.push_str(symbol);
            }
        }

        // Flush remaining symbols
        if !current_symbols.is_empty() {
            output.push_str(&current_symbols);
            current_symbols.clear();  // BUG FIX: Clear after flushing to prevent duplicate on next line
        }

        // Reset style at end of line
        if current_style.is_some() {
            output.push_str("\x1b[0m");
            current_style = None;
        }
    }

    output
}

fn style_to_ansi(style: Style) -> String {
    let mut codes: Vec<String> = Vec::new();

    // Modifiers
    if style.add_modifier.contains(Modifier::BOLD) { codes.push("1".to_string()); }
    if style.add_modifier.contains(Modifier::DIM) { codes.push("2".to_string()); }
    if style.add_modifier.contains(Modifier::ITALIC) { codes.push("3".to_string()); }
    if style.add_modifier.contains(Modifier::UNDERLINED) { codes.push("4".to_string()); }
    if style.add_modifier.contains(Modifier::REVERSED) { codes.push("7".to_string()); }
    if style.add_modifier.contains(Modifier::CROSSED_OUT) { codes.push("9".to_string()); }

    // Foreground
    if let Some(fg) = style.fg {
        codes.extend(color_to_ansi_codes(fg, false));
    }

    // Background
    if let Some(bg) = style.bg {
        codes.extend(color_to_ansi_codes(bg, true));
    }

    if codes.is_empty() {
        "\x1b[0m".to_string()
    } else {
        format!("\x1b[{}m", codes.join(";"))
    }
}

fn color_to_ansi_codes(color: Color, is_bg: bool) -> Vec<String> {
    let prefix = if is_bg { 4 } else { 3 };
    let bright_prefix = if is_bg { 10 } else { 9 };

    match color {
        Color::Reset => vec![],
        Color::Black => vec![format!("{}0", prefix)],
        Color::Red => vec![format!("{}1", prefix)],
        Color::Green => vec![format!("{}2", prefix)],
        Color::Yellow => vec![format!("{}3", prefix)],
        Color::Blue => vec![format!("{}4", prefix)],
        Color::Magenta => vec![format!("{}5", prefix)],
        Color::Cyan => vec![format!("{}6", prefix)],
        Color::White => vec![format!("{}7", prefix)],
        Color::Gray => vec![format!("{}0", bright_prefix)],
        Color::DarkGray => vec![format!("{}0", bright_prefix)],
        Color::LightRed => vec![format!("{}1", bright_prefix)],
        Color::LightGreen => vec![format!("{}2", bright_prefix)],
        Color::LightYellow => vec![format!("{}3", bright_prefix)],
        Color::LightBlue => vec![format!("{}4", bright_prefix)],
        Color::LightMagenta => vec![format!("{}5", bright_prefix)],
        Color::LightCyan => vec![format!("{}6", bright_prefix)],
        Color::Rgb(r, g, b) => vec![format!("{}8;2;{};{};{}", prefix, r, g, b)],
        Color::Indexed(i) => vec![format!("{}8;5;{}", prefix, i)],
    }
}
