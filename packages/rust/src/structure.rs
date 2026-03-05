use tree_sitter::{Parser, Node};
use std::path::Path;
use super::{StructureResult, StructureItem, StructureOptions};

pub fn parse_structure(
    content: &str,
    file_path: &str,
    options: Option<StructureOptions>,
) -> anyhow::Result<StructureResult> {
    let path = Path::new(file_path);
    let extension = path
        .extension()
        .and_then(|e| e.to_str())
        .ok_or_else(|| anyhow::anyhow!("No file extension"))?;

    let language = get_language(extension)?;
    let mut parser = Parser::new();
    parser.set_language(language)?;

    let tree = parser.parse(content, None).ok_or_else(|| anyhow::anyhow!("Failed to parse"))?;
    let root_node = tree.root_node();

    let items = extract_nodes(root_node, content, &options)?;

    Ok(StructureResult {
        items,
        language: extension.to_string(),
    })
}

fn get_language(extension: &str) -> anyhow::Result<tree_sitter::Language> {
    match extension {
        "ts" | "tsx" => Ok(tree_sitter_typescript::language_typescript()),
        "js" | "jsx" => Ok(tree_sitter_javascript::language()),
        "py" => Ok(tree_sitter_python::language()),
        "rs" => Ok(tree_sitter_rust::language()),
        "go" => Ok(tree_sitter_go::language()),
        "c" | "h" => Ok(tree_sitter_c::language()),
        "cpp" | "cc" | "hpp" => Ok(tree_sitter_cpp::language()),
        "java" => Ok(tree_sitter_java::language()),
        "rb" => Ok(tree_sitter_ruby::language()),
        "php" => Ok(tree_sitter_php::language()),
        _ => Err(anyhow::anyhow!("Unsupported language: {}", extension)),
    }
}

fn extract_nodes(
    node: Node,
    source: &str,
    options: &Option<StructureOptions>,
) -> anyhow::Result<Vec<StructureItem>> {
    let mut items = Vec::new();

    let opts = options.as_ref().unwrap_or(&StructureOptions {
        include_comments: Some(false),
        max_depth: Some(10),
    });

    if is_named_node(&node, opts.include_comments.unwrap_or(false)) {
        let item = StructureItem {
            kind: node.kind().to_string(),
            name: extract_name(&node, source),
            line: node.start_position().row as u32,
            column: node.start_position().column as u32,
            end_line: Some(node.end_position().row as u32),
            end_column: Some(node.end_position().column as u32),
            children: Vec::new(),
        };
        items.push(item);
    }

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        items.extend(extract_nodes(child, source, options)?);
    }

    Ok(items)
}

fn is_named_node(node: &Node, include_comments: bool) -> bool {
    if !node.is_named() {
        return false;
    }

    if !include_comments {
        let kind = node.kind();
        if kind.contains("comment") {
            return false;
        }
    }

    true
}

fn extract_name(node: &Node, source: &str) -> String {
    // Try to find identifier child
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if child.kind().contains("identifier") || child.kind() == "name" {
            return source[child.byte_range()].to_string();
        }
    }

    // Fallback to first named child
    for child in node.children(&mut cursor) {
        if child.is_named() {
            return source[child.byte_range()].to_string();
        }
    }

    String::new()
}
