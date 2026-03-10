//! Layout Helpers
//!
//! Utilities for calculating widget positions and sizes.

use ratatui::layout::{Constraint, Direction, Layout, Rect};

/// Calculate a centered rectangle within another rectangle
///
/// Useful for popups, dialogs, and overlays.
///
/// # Arguments
///
/// * `percent_x` - Width as percentage of parent (0-100)
/// * `percent_y` - Height as percentage of parent (0-100)
/// * `r` - Parent rectangle
///
/// # Example
///
/// ```text
/// Parent: 80x24
/// centered_rect(60, 50, parent):
///
/// ┌──────────────────────────────────────────────────────────┐
/// │                      (12 lines)                           │
/// ├──────────────────────────────────────────────────────────┤
/// │            ┌────────────────────────┐                     │
/// │            │                        │ (12 lines)          │
/// │            │   Centered Content     │                     │
/// │            │        60% x 50%       │                     │
/// │            │                        │                     │
/// │            └────────────────────────┘                     │
/// │                      (12 lines)                           │
/// └──────────────────────────────────────────────────────────┘
/// ```
pub fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    // Ensure percentages are valid
    let percent_x = percent_x.min(100);
    let percent_y = percent_y.min(100);

    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(r);

    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(popup_layout[1])[1]
}

/// Split rectangle vertically with given constraints
///
/// # Example
///
/// ```text
/// split_vertical([Min(10), Length(3), Length(1)], area):
///
/// ┌──────────────────┐
/// │                  │ Min(10) - flexible
/// │                  │
/// ├──────────────────┤
/// │ Input            │ Length(3) - fixed
/// ├──────────────────┤
/// │ Status           │ Length(1) - fixed
/// └──────────────────┘
/// ```
pub fn split_vertical(constraints: Vec<Constraint>, r: Rect) -> Vec<Rect> {
    Layout::default()
        .direction(Direction::Vertical)
        .constraints(constraints)
        .split(r)
        .to_vec()
}

/// Split rectangle horizontally with given constraints
pub fn split_horizontal(constraints: Vec<Constraint>, r: Rect) -> Vec<Rect> {
    Layout::default()
        .direction(Direction::Horizontal)
        .constraints(constraints)
        .split(r)
        .to_vec()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_centered_rect() {
        let parent = Rect::new(0, 0, 100, 50);

        // 50% x 50% centered
        let centered = centered_rect(50, 50, parent);

        // Should be centered
        assert!(centered.x > 0);
        assert!(centered.y > 0);
        assert!(centered.width < parent.width);
        assert!(centered.height < parent.height);
    }

    #[test]
    fn test_split_vertical() {
        let area = Rect::new(0, 0, 80, 24);
        let chunks = split_vertical(
            vec![Constraint::Length(10), Constraint::Min(1)],
            area,
        );

        assert_eq!(chunks.len(), 2);
        assert_eq!(chunks[0].height, 10);
        assert_eq!(chunks[1].height, 14); // 24 - 10
    }
}
