//! Style primitives - Colors and text modifiers

use napi_derive::napi;

/// RGB color components
#[napi(object)]
#[derive(Debug, Clone)]
pub struct TuiRgb {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

/// Color value - can be a named color, RGB, or indexed
#[napi]
#[derive(Debug)]
pub enum TuiColor {
    Reset,
    Black,
    Red,
    Green,
    Yellow,
    Blue,
    Magenta,
    Cyan,
    White,
    BrightBlack,
    BrightRed,
    BrightGreen,
    BrightYellow,
    BrightBlue,
    BrightMagenta,
    BrightCyan,
    BrightWhite,
    /// RGB color - use fg_rgb/bg_rgb fields in TuiStyle
    Rgb,
    /// 256-color palette - use fg_index/bg_index fields in TuiStyle
    Indexed,
}

/// Text modifiers
#[napi(object)]
#[derive(Debug, Clone)]
pub struct TuiModifiers {
    pub bold: bool,
    pub dim: bool,
    pub italic: bool,
    pub underline: bool,
    pub strikethrough: bool,
    pub reverse: bool,
    pub hidden: bool,
}

impl Default for TuiModifiers {
    fn default() -> Self {
        Self {
            bold: false,
            dim: false,
            italic: false,
            underline: false,
            strikethrough: false,
            reverse: false,
            hidden: false,
        }
    }
}

/// Complete style (fg, bg, modifiers)
#[napi(object)]
#[derive(Debug, Clone)]
pub struct TuiStyle {
    pub fg: Option<TuiColor>,
    pub bg: Option<TuiColor>,
    pub modifiers: Option<TuiModifiers>,
    /// RGB values when fg is TuiColor::Rgb
    pub fg_rgb: Option<TuiRgb>,
    /// RGB values when bg is TuiColor::Rgb
    pub bg_rgb: Option<TuiRgb>,
    /// Index when fg is TuiColor::Indexed
    pub fg_index: Option<u8>,
    /// Index when bg is TuiColor::Indexed
    pub bg_index: Option<u8>,
}

impl Default for TuiStyle {
    fn default() -> Self {
        Self {
            fg: None,
            bg: None,
            modifiers: None,
            fg_rgb: None,
            bg_rgb: None,
            fg_index: None,
            bg_index: None,
        }
    }
}

// Helper functions for common styles

#[napi]
pub fn tui_style_default() -> TuiStyle {
    TuiStyle::default()
}

#[napi]
pub fn tui_style_fg(color: TuiColor) -> TuiStyle {
    TuiStyle { fg: Some(color), ..Default::default() }
}

#[napi]
pub fn tui_style_bg(color: TuiColor) -> TuiStyle {
    TuiStyle { bg: Some(color), ..Default::default() }
}

#[napi]
pub fn tui_style_rgb_fg(r: u8, g: u8, b: u8) -> TuiStyle {
    TuiStyle {
        fg: Some(TuiColor::Rgb),
        fg_rgb: Some(TuiRgb { r, g, b }),
        ..Default::default()
    }
}

#[napi]
pub fn tui_style_rgb_bg(r: u8, g: u8, b: u8) -> TuiStyle {
    TuiStyle {
        bg: Some(TuiColor::Rgb),
        bg_rgb: Some(TuiRgb { r, g, b }),
        ..Default::default()
    }
}

#[napi]
pub fn tui_style_bold() -> TuiStyle {
    TuiStyle {
        modifiers: Some(TuiModifiers { bold: true, ..Default::default() }),
        ..Default::default()
    }
}

#[napi]
pub fn tui_style_dim() -> TuiStyle {
    TuiStyle {
        modifiers: Some(TuiModifiers { dim: true, ..Default::default() }),
        ..Default::default()
    }
}

#[napi]
pub fn tui_style_user() -> TuiStyle {
    TuiStyle {
        fg: Some(TuiColor::Cyan),
        modifiers: Some(TuiModifiers { bold: true, ..Default::default() }),
        ..Default::default()
    }
}

#[napi]
pub fn tui_style_assistant() -> TuiStyle {
    TuiStyle {
        fg: Some(TuiColor::Magenta),
        modifiers: Some(TuiModifiers { bold: true, ..Default::default() }),
        ..Default::default()
    }
}

#[napi]
pub fn tui_style_system() -> TuiStyle {
    TuiStyle {
        fg: Some(TuiColor::Yellow),
        modifiers: Some(TuiModifiers { bold: true, ..Default::default() }),
        ..Default::default()
    }
}

#[napi]
pub fn tui_style_error() -> TuiStyle {
    TuiStyle {
        fg: Some(TuiColor::Red),
        ..Default::default()
    }
}

#[napi]
pub fn tui_style_success() -> TuiStyle {
    TuiStyle {
        fg: Some(TuiColor::Green),
        ..Default::default()
    }
}

#[napi]
pub fn tui_style_tool() -> TuiStyle {
    TuiStyle {
        fg: Some(TuiColor::Yellow),
        ..Default::default()
    }
}

#[napi]
pub fn tui_style_highlight() -> TuiStyle {
    TuiStyle {
        fg: Some(TuiColor::BrightCyan),
        modifiers: Some(TuiModifiers { bold: true, ..Default::default() }),
        ..Default::default()
    }
}

#[napi]
pub fn tui_style_muted() -> TuiStyle {
    TuiStyle {
        fg: Some(TuiColor::BrightBlack),
        ..Default::default()
    }
}
