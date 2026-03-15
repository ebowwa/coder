//! Text primitives - Styled text segments

use napi_derive::napi;
use super::style::TuiStyle;

/// A styled text segment
#[napi(object)]
#[derive(Debug, Clone)]
pub struct TuiTextSegment {
    /// The text content
    pub content: String,
    /// Style to apply
    pub style: Option<TuiStyle>,
}

/// A line of styled text (multiple segments)
#[napi(object)]
#[derive(Debug, Clone, Default)]
pub struct TuiTextLine {
    /// Segments in this line
    pub segments: Vec<TuiTextSegment>,
}

/// A block of text (multiple lines)
#[napi(object)]
#[derive(Debug, Clone, Default)]
pub struct TuiTextBlock {
    /// Lines in this block
    pub lines: Vec<TuiTextLine>,
}


// Constructors

#[napi]
pub fn tui_text_segment(content: String, style: Option<TuiStyle>) -> TuiTextSegment {
    TuiTextSegment { content, style }
}

#[napi]
pub fn tui_text_line_plain(content: String) -> TuiTextLine {
    TuiTextLine {
        segments: vec![TuiTextSegment { content, style: None }],
    }
}

#[napi]
pub fn tui_text_line_styled(content: String, style: TuiStyle) -> TuiTextLine {
    TuiTextLine {
        segments: vec![TuiTextSegment { content, style: Some(style) }],
    }
}

#[napi]
pub fn tui_text_line(segments: Vec<TuiTextSegment>) -> TuiTextLine {
    TuiTextLine { segments }
}

#[napi]
pub fn tui_text_block(lines: Vec<TuiTextLine>) -> TuiTextBlock {
    TuiTextBlock { lines }
}

#[napi]
pub fn tui_text_block_plain(content: String) -> TuiTextBlock {
    let lines: Vec<TuiTextLine> = content
        .lines()
        .map(|line| tui_text_line_plain(line.to_string()))
        .collect();
    TuiTextBlock { lines }
}

// Operations

#[napi]
impl TuiTextLine {
    /// Append a segment to this line
    #[napi]
    pub fn push(&mut self, segment: TuiTextSegment) {
        self.segments.push(segment);
    }

    /// Get total character width (for layout)
    #[napi]
    pub fn width(&self) -> u32 {
        self.segments.iter().map(|s| s.content.chars().count() as u32).sum()
    }

    /// Get plain text without styling
    #[napi]
    pub fn to_plain(&self) -> String {
        self.segments.iter().map(|s| s.content.as_str()).collect()
    }
}

#[napi]
impl TuiTextBlock {
    /// Add a line to this block
    #[napi]
    pub fn push(&mut self, line: TuiTextLine) {
        self.lines.push(line);
    }

    /// Get number of lines
    #[napi]
    pub fn height(&self) -> u32 {
        self.lines.len() as u32
    }

    /// Get maximum line width
    #[napi]
    pub fn width(&self) -> u32 {
        self.lines.iter().map(|l| l.width()).max().unwrap_or(0)
    }

    /// Get plain text without styling
    #[napi]
    pub fn to_plain(&self) -> String {
        self.lines
            .iter()
            .map(|l| l.to_plain())
            .collect::<Vec<_>>()
            .join("\n")
    }
}
