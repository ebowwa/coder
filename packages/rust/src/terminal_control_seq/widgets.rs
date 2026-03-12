//! Widget Renderers
//!
//! Individual rendering functions for TUI components.
//! Each function is pure - takes state and frame, renders to area.

use ratatui::{
    layout::{Constraint, Direction, Layout, Rect, Alignment},
    style::{Color, Modifier, Style},
    text::{Line, Span, Text},
    widgets::{Block, Borders, Paragraph, Wrap, Clear, List, ListItem, ListState},
    Frame,
};

use super::types::RenderState;

/// Render the main chat interface
///
/// Layout:
/// ```text
/// ┌──────────────────────────┐
/// │                          │
/// │     Messages             │ Min(5) - flexible
/// │                          │
/// ├──────────────────────────┤
/// │ Input                    │ Length(3) - fixed
/// ├──────────────────────────┤
/// │ Status                   │ Length(1) - fixed
/// └──────────────────────────┘
/// ```
pub fn render_chat(f: &mut Frame, area: Rect, state: &RenderState) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Min(5),      // Messages
            Constraint::Length(3),   // Input
            Constraint::Length(1),   // Status
        ])
        .split(area);

    render_messages(f, chunks[0], state);
    render_input(f, chunks[1], state);
    render_status(f, chunks[2], state);
}

/// Render chat messages
pub fn render_messages(f: &mut Frame, area: Rect, state: &RenderState) {
    let mut lines = Vec::new();

    // Calculate visible range based on scroll
    let total_lines_estimate: usize = state.messages.iter()
        .map(|m| m.content.lines().count() + 2) // +2 for header and spacing
        .sum();

    let visible_height = area.height.saturating_sub(3) as usize; // Reserve for status
    let max_visible = if visible_height > 5 { visible_height - 5 } else { visible_height.saturating_sub(1) };

    // Calculate which messages to show based on scroll_offset
    // scroll_offset = 0 means show latest (bottom)
    // scroll_offset > 0 means scroll up (show older messages)
    let total_messages = state.messages.len();

    // Simple approach: skip oldest messages based on scroll_offset
    let skip_count = (state.scroll_offset as usize).min(total_messages.saturating_sub(1));
    let take_count = max_visible.min(total_messages.saturating_sub(skip_count));

    // Render visible messages
    let start_idx = total_messages.saturating_sub(skip_count + take_count);
    let start_idx = start_idx.max(0);
    let end_idx = total_messages.min(start_idx + take_count);

    for idx in start_idx..end_idx {
        let msg = &state.messages[idx];
        let (color, name) = match msg.role.as_str() {
            "user" => (Color::Cyan, "You"),
            "assistant" => (Color::Green, "Claude"),
            "system" => (Color::Yellow, "System"),
            "tool" => (Color::Magenta, "Tool"),
            _ => (Color::White, "?"),
        };

        // Role header
        lines.push(Line::from(vec![
            Span::styled(
                format!("{}: ", name),
                Style::default().fg(color).add_modifier(Modifier::BOLD)
            ),
        ]));

        // Message content
        for line in msg.content.lines() {
            lines.push(Line::from(Span::styled(
                line,
                Style::default().fg(Color::White)
            )));
        }

        lines.push(Line::from("")); // Spacing
    }

    // Show scroll indicator if there are more messages
    if total_messages > take_count {
        let older_count = skip_count;
        let newer_count = total_messages.saturating_sub(start_idx + take_count);
        let scroll_info = format!(
            "📊 {}/{} messages | ↑PgUp older({}) | ↓PgDn newer({})",
            end_idx - start_idx,
            total_messages,
            older_count,
            newer_count
        );
        lines.push(Line::from(Span::styled(
            scroll_info,
            Style::default().fg(Color::DarkGray)
        )));
    } else if total_messages > 0 {
        lines.push(Line::from(Span::styled(
            "📊 PgUp/PgDn: scroll | Home: bottom | Alt+↑↓: line scroll",
            Style::default().fg(Color::DarkGray)
        )));
    }

    // Streaming response
    if state.is_loading && !state.streaming_text.is_empty() {
        lines.push(Line::from(vec![
            Span::styled(
                "Claude: ",
                Style::default().fg(Color::Green).add_modifier(Modifier::BOLD)
            ),
        ]));
        for line in state.streaming_text.lines() {
            lines.push(Line::from(Span::raw(line)));
        }
    } else if state.is_loading {
        lines.push(Line::from(Span::styled(
            "⠋ Thinking...",
            Style::default().fg(Color::Yellow)
        )));
    }

    let widget = Paragraph::new(Text::from(lines))
        .wrap(Wrap { trim: false });
    f.render_widget(widget, area);
}

/// Render input box with cursor
pub fn render_input(f: &mut Frame, area: Rect, state: &RenderState) {
    let input = Paragraph::new(state.input_value.as_str())
        .style(Style::default().fg(Color::White))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(format!(" Input ({}) ", state.model))
                .border_style(Style::default().fg(Color::Cyan))
        );

    f.render_widget(input, area);

    // Position cursor
    let cursor_x = area.x + 1 + state.cursor_pos.min(state.input_value.len() as u32) as u16;
    let cursor_y = area.y + 1;
    f.set_cursor_position((cursor_x, cursor_y));
}

/// Render status bar
pub fn render_status(f: &mut Frame, area: Rect, state: &RenderState) {
    let status = Paragraph::new(state.status_text.as_str())
        .style(Style::default().fg(Color::White).bg(Color::DarkGray));
    f.render_widget(status, area);
}

/// Render help overlay
///
/// Centered popup with help content.
pub fn render_help(f: &mut Frame, area: Rect, help_text: &str) {
    use super::layout::centered_rect;

    let help_area = centered_rect(80, 80, area);
    f.render_widget(Clear, help_area);

    let help = Paragraph::new(help_text)
        .style(Style::default().fg(Color::White))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" Help (Esc to close) ")
                .border_style(Style::default().fg(Color::Cyan))
        )
        .alignment(Alignment::Left);

    f.render_widget(help, help_area);
}

/// Render search interface
///
/// Layout:
/// ```text
/// ┌──────────────────────────┐
/// │ Search Query             │ Length(3)
/// ├──────────────────────────┤
/// │                          │
/// │ Results                  │ Min(5)
/// │                          │
/// ├──────────────────────────┤
/// │ Status                   │ Length(1)
/// └──────────────────────────┘
/// ```
pub fn render_search(f: &mut Frame, area: Rect, state: &RenderState) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3),
            Constraint::Min(5),
            Constraint::Length(1),
        ])
        .split(area);

    // Search input
    let search_input = Paragraph::new(state.search_query.as_str())
        .style(Style::default().fg(Color::White))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" Search ")
                .border_style(Style::default().fg(Color::Yellow))
        );
    f.render_widget(search_input, chunks[0]);

    // Cursor position
    let cursor_x = chunks[0].x + 1 + state.search_query.len() as u16;
    let cursor_y = chunks[0].y + 1;
    f.set_cursor_position((cursor_x, cursor_y));

    // Results list
    let results: Vec<ListItem> = state.search_results.iter()
        .map(|r| {
            let path = if r.file_path.len() > 40 {
                format!("...{}", &r.file_path[r.file_path.len()-37..])
            } else {
                r.file_path.clone()
            };
            ListItem::new(Line::from(vec![
                Span::styled(
                    format!("{:>4}: ", r.line_number),
                    Style::default().fg(Color::DarkGray)
                ),
                Span::styled(path, Style::default().fg(Color::Blue)),
                Span::raw(" "),
                Span::styled(&r.content, Style::default().fg(Color::Gray)),
            ]))
        })
        .collect();

    let mut list_state = ListState::default();
    if state.search_selected >= 0 && (state.search_selected as usize) < results.len() {
        list_state.select(Some(state.search_selected as usize));
    }

    let list = List::new(results)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(format!(" Results ({}) ", state.search_results.len()))
                .border_style(Style::default().fg(Color::Green))
        )
        .highlight_style(
            Style::default()
                .bg(Color::DarkGray)
                .add_modifier(Modifier::BOLD)
        )
        .highlight_symbol("> ");

    f.render_stateful_widget(list, chunks[1], &mut list_state);

    // Status
    let status = Paragraph::new("Enter: Open | Esc: Close | ↑↓: Navigate")
        .style(Style::default().fg(Color::White).bg(Color::DarkGray));
    f.render_widget(status, chunks[2]);
}
