pub fn chunk_markdown(content: &str, _max_tokens: usize) -> Vec<String> {
    let mut chunks = Vec::new();
    let mut current_chunk = String::new();
    
    for line in content.lines() {
        if line.starts_with("# ") || line.starts_with("## ") || line.starts_with("### ") {
            if !current_chunk.trim().is_empty() {
                chunks.push(current_chunk.trim().to_string());
                current_chunk.clear();
            }
        }
        current_chunk.push_str(line);
        current_chunk.push('\n');
    }
    
    if !current_chunk.trim().is_empty() {
        chunks.push(current_chunk.trim().to_string());
    }
    
    chunks
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_chunk_markdown() {
        let md = "# Heading 1\nSome text.\n## Heading 2\nMore text.\n### Heading 3";
        let chunks = chunk_markdown(md, 500);
        
        assert_eq!(chunks.len(), 3);
        assert_eq!(chunks[0], "# Heading 1\nSome text.");
        assert_eq!(chunks[1], "## Heading 2\nMore text.");
        assert_eq!(chunks[2], "### Heading 3");
    }
}
