use syntect::{
    easy::HighlightLines,
    highlighting::ThemeSet,
    parsing::SyntaxSet,
    util::{as_24_bit_terminal_escaped, LinesWithEndings},
};
use super::HighlightResult;

/// Reset ANSI formatting
const ANSI_RESET: &str = "\x1b[0m";

/// Map common language aliases to syntax names that syntect understands
fn normalize_language(language: &str) -> &str {
    match language.to_lowercase().as_str() {
        // TypeScript uses JS syntax (syntect default doesn't include TS)
        "typescript" | "ts" => "javascript",
        "javascript" | "js" => "javascript",
        "python" | "py" => "python",
        "rust" | "rs" => "rust",
        "go" | "golang" => "go",
        "ruby" | "rb" => "ruby",
        "java" => "java",
        "c" => "c",
        "cpp" | "c++" | "cxx" => "cpp",
        "csharp" | "cs" | "c#" => "csharp",
        "php" => "php",
        "swift" => "swift",
        "kotlin" | "kt" => "kotlin",
        "scala" => "scala",
        "shell" | "sh" | "bash" | "zsh" => "bash",
        "json" => "json",
        "yaml" | "yml" => "yaml",
        "toml" => "toml",
        "markdown" | "md" => "markdown",
        "html" => "html",
        "css" => "css",
        "sql" => "sql",
        "xml" => "xml",
        _ => language,
    }
}

/// Highlight code with ANSI escape codes for terminal display
pub fn highlight_code(code: &str, language: &str) -> anyhow::Result<HighlightResult> {
    let syntax_set = SyntaxSet::load_defaults_newlines();
    let theme_set = ThemeSet::load_defaults();

    let normalized = normalize_language(language);

    let syntax = syntax_set
        .find_syntax_by_token(normalized)
        .or_else(|| syntax_set.find_syntax_by_extension(normalized))
        .ok_or_else(|| anyhow::anyhow!("Unknown language: {}", language))?;

    let theme = &theme_set.themes["base16-ocean.dark"];
    let mut highlighter = HighlightLines::new(syntax, theme);

    let mut ansi_output = String::new();

    for line in LinesWithEndings::from(code) {
        // Use syntect's built-in 24-bit terminal escaped output
        let ranges: Vec<_> = highlighter.highlight_line(line, &syntax_set)?;
        let escaped = as_24_bit_terminal_escaped(&ranges[..], false);
        ansi_output.push_str(&escaped);
    }

    // Ensure we reset at the end
    ansi_output.push_str(ANSI_RESET);

    Ok(HighlightResult {
        html: ansi_output, // Return ANSI-colored text for CLI display
        theme: "base16-ocean.dark".to_string(),
    })
}

/// Highlight markdown with nested code block syntax highlighting
pub fn highlight_markdown(markdown: &str) -> anyhow::Result<HighlightResult> {
    let syntax_set = SyntaxSet::load_defaults_newlines();
    let theme_set = ThemeSet::load_defaults();
    let theme = &theme_set.themes["base16-ocean.dark"];

    // Get markdown syntax
    let md_syntax = syntax_set
        .find_syntax_by_token("markdown")
        .or_else(|| syntax_set.find_syntax_by_extension("md"))
        .ok_or_else(|| anyhow::anyhow!("Markdown syntax not found"))?;

    let mut output = String::new();
    let mut in_code_block = false;
    let mut code_block_lang: Option<String> = None;
    let mut code_block_content = String::new();

    let lines: Vec<&str> = markdown.lines().collect();

    for (line_idx, line) in lines.iter().enumerate() {
        let line_with_newline = if line_idx < lines.len() - 1 {
            format!("{}\n", line)
        } else {
            line.to_string()
        };

        // Check for code fence start/end
        if line.trim_start().starts_with("```") {
            if !in_code_block {
                // Start of code block
                in_code_block = true;

                // Extract language
                let fence_content = line.trim_start().trim_start_matches('`').trim();
                code_block_lang = if fence_content.is_empty() {
                    None
                } else {
                    // Handle "typescript" or "typescript extra stuff"
                    Some(fence_content.split_whitespace().next().unwrap_or("").to_string())
                };
                code_block_content.clear();

                // Highlight the fence line itself with markdown syntax
                let mut md_highlighter = HighlightLines::new(md_syntax, theme);
                let ranges: Vec<_> = md_highlighter.highlight_line(&line_with_newline, &syntax_set)?;
                output.push_str(&as_24_bit_terminal_escaped(&ranges[..], false));
            } else {
                // End of code block - highlight the accumulated code
                in_code_block = false;

                // Highlight the code content with its language
                if let Some(ref lang) = code_block_lang {
                    let normalized = normalize_language(lang);
                    if let Some(code_syntax) = syntax_set
                        .find_syntax_by_token(normalized)
                        .or_else(|| syntax_set.find_syntax_by_extension(normalized))
                    {
                        let mut code_highlighter = HighlightLines::new(code_syntax, theme);
                        for code_line in code_block_content.lines() {
                            let code_line_with_nl = format!("{}\n", code_line);
                            let ranges: Vec<_> = code_highlighter.highlight_line(&code_line_with_nl, &syntax_set)?;
                            output.push_str(&as_24_bit_terminal_escaped(&ranges[..], false));
                        }
                    } else {
                        // Unknown language, output as-is
                        output.push_str(&code_block_content);
                    }
                } else {
                    // No language specified, output as-is
                    output.push_str(&code_block_content);
                }

                code_block_lang = None;
                code_block_content.clear();

                // Highlight the closing fence with markdown syntax
                let mut md_highlighter = HighlightLines::new(md_syntax, theme);
                let ranges: Vec<_> = md_highlighter.highlight_line(&line_with_newline, &syntax_set)?;
                output.push_str(&as_24_bit_terminal_escaped(&ranges[..], false));
            }
        } else if in_code_block {
            // Accumulate code block content
            code_block_content.push_str(&line_with_newline);
        } else {
            // Regular markdown line - highlight with markdown syntax
            let mut md_highlighter = HighlightLines::new(md_syntax, theme);
            let ranges: Vec<_> = md_highlighter.highlight_line(&line_with_newline, &syntax_set)?;
            output.push_str(&as_24_bit_terminal_escaped(&ranges[..], false));
        }
    }

    // Handle unclosed code block
    if in_code_block && !code_block_content.is_empty() {
        output.push_str(&code_block_content);
    }

    output.push_str(ANSI_RESET);

    Ok(HighlightResult {
        html: output,
        theme: "base16-ocean.dark".to_string(),
    })
}
