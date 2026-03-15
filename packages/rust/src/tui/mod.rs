//! TUI Primitives - Low-level terminal UI building blocks
//!
//! These are raw rendering primitives exposed via NAPI for TypeScript to compose.
//! No event loop, no app state - just drawing primitives.

pub mod style;
pub mod text;
pub mod box_primitive;
pub mod buffer;

// Re-export public types
pub use style::{TuiColor, TuiRgb, TuiModifiers, TuiStyle};
pub use text::{TuiTextSegment, TuiTextLine, TuiTextBlock};
pub use box_primitive::{TuiBorderType, TuiBorders, TuiPadding};
