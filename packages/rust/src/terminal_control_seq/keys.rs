//! Key Code Conversions
//!
//! Convert crossterm key codes to strings for TypeScript.

use crossterm::event::{KeyCode, KeyModifiers};

/// Convert KeyCode to string representation
///
/// # Examples
///
/// ```
/// use crossterm::event::KeyCode;
/// assert_eq!(key_code_to_string(KeyCode::Char('a')), "a");
/// assert_eq!(key_code_to_string(KeyCode::Enter), "enter");
/// assert_eq!(key_code_to_string(KeyCode::F(1)), "f1");
/// ```
pub fn key_code_to_string(code: KeyCode) -> String {
    match code {
        // Character keys
        KeyCode::Char(c) => c.to_string(),

        // Navigation keys
        KeyCode::Left => "left".to_string(),
        KeyCode::Right => "right".to_string(),
        KeyCode::Up => "up".to_string(),
        KeyCode::Down => "down".to_string(),
        KeyCode::Home => "home".to_string(),
        KeyCode::End => "end".to_string(),
        KeyCode::PageUp => "pageup".to_string(),
        KeyCode::PageDown => "pagedown".to_string(),

        // Editing keys
        KeyCode::Enter => "enter".to_string(),
        KeyCode::Backspace => "backspace".to_string(),
        KeyCode::Delete => "delete".to_string(),
        KeyCode::Tab => "tab".to_string(),
        KeyCode::Esc => "escape".to_string(),

        // Function keys
        KeyCode::F(n) => format!("f{}", n),

        // Unknown/null
        KeyCode::Null => "null".to_string(),
        _ => "unknown".to_string(),
    }
}

/// Convert KeyModifiers to string representation
///
/// # Examples
///
/// ```
/// use crossterm::event::KeyModifiers;
/// // Ctrl only
/// assert_eq!(modifiers_to_string(KeyModifiers::CONTROL), "ctrl");
/// // Multiple modifiers
/// let mods = KeyModifiers::CONTROL | KeyModifiers::SHIFT;
/// assert_eq!(modifiers_to_string(mods), "ctrl+shift");
/// // No modifiers
/// assert_eq!(modifiers_to_string(KeyModifiers::empty()), "");
/// ```
pub fn modifiers_to_string(mods: KeyModifiers) -> String {
    let mut parts = Vec::new();

    if mods.contains(KeyModifiers::CONTROL) {
        parts.push("ctrl");
    }
    if mods.contains(KeyModifiers::ALT) {
        parts.push("alt");
    }
    if mods.contains(KeyModifiers::SHIFT) {
        parts.push("shift");
    }
    // SUPER (Cmd/Win) rarely used but include for completeness
    if mods.contains(KeyModifiers::SUPER) {
        parts.push("super");
    }

    parts.join("+")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_char_keys() {
        assert_eq!(key_code_to_string(KeyCode::Char('a')), "a");
        assert_eq!(key_code_to_string(KeyCode::Char('Z')), "Z");
        assert_eq!(key_code_to_string(KeyCode::Char('1')), "1");
    }

    #[test]
    fn test_special_keys() {
        assert_eq!(key_code_to_string(KeyCode::Enter), "enter");
        assert_eq!(key_code_to_string(KeyCode::Esc), "escape");
        assert_eq!(key_code_to_string(KeyCode::Tab), "tab");
    }

    #[test]
    fn test_arrow_keys() {
        assert_eq!(key_code_to_string(KeyCode::Up), "up");
        assert_eq!(key_code_to_string(KeyCode::Down), "down");
        assert_eq!(key_code_to_string(KeyCode::Left), "left");
        assert_eq!(key_code_to_string(KeyCode::Right), "right");
    }

    #[test]
    fn test_function_keys() {
        assert_eq!(key_code_to_string(KeyCode::F(1)), "f1");
        assert_eq!(key_code_to_string(KeyCode::F(12)), "f12");
    }

    #[test]
    fn test_single_modifiers() {
        assert_eq!(modifiers_to_string(KeyModifiers::CONTROL), "ctrl");
        assert_eq!(modifiers_to_string(KeyModifiers::ALT), "alt");
        assert_eq!(modifiers_to_string(KeyModifiers::SHIFT), "shift");
    }

    #[test]
    fn test_multiple_modifiers() {
        let ctrl_shift = KeyModifiers::CONTROL | KeyModifiers::SHIFT;
        assert_eq!(modifiers_to_string(ctrl_shift), "ctrl+shift");

        let ctrl_alt = KeyModifiers::CONTROL | KeyModifiers::ALT;
        assert_eq!(modifiers_to_string(ctrl_alt), "ctrl+alt");
    }

    #[test]
    fn test_no_modifiers() {
        assert_eq!(modifiers_to_string(KeyModifiers::empty()), "");
    }
}
