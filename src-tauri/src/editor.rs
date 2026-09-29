#[cfg(test)]
mod tests {
    use super::*;

    fn strings(values: &[&str]) -> Vec<String> {
        values.iter().map(|value| (*value).to_owned()).collect()
    }

    #[test]
    fn replaces_file_and_line_in_each_argument() {
        let invocation =
            editor_invocation("code -g {file}:{line}", r"C:\my docs\a.md", 12, Os::Windows);
        assert_eq!(
            invocation,
            Some(Invocation {
                program: "code".to_owned(),
                args: strings(&["-g", r"C:\my docs\a.md:12"]),
            })
        );
    }

    #[test]
    fn keeps_quoted_parts_together() {
        let invocation = editor_invocation(
            r#""C:\Program Files\Editor\editor.exe" --line {line} "{file}""#,
            r"C:\docs\a.md",
            3,
            Os::Windows,
        );
        assert_eq!(
            invocation,
            Some(Invocation {
                program: r"C:\Program Files\Editor\editor.exe".to_owned(),
                args: strings(&["--line", "3", r"C:\docs\a.md"]),
            })
        );
    }

    #[test]
    fn appends_the_file_when_the_template_has_no_placeholder() {
        let invocation = editor_invocation("subl", "/docs/a.md", 1, Os::Linux);
        assert_eq!(
            invocation,
            Some(Invocation {
                program: "subl".to_owned(),
                args: strings(&["/docs/a.md"]),
            })
        );
    }

    #[test]
    fn empty_template_uses_the_os_text_editor() {
        assert_eq!(
            editor_invocation("  ", r"C:\a.md", 5, Os::Windows),
            Some(Invocation {
                program: "notepad.exe".to_owned(),
                args: strings(&[r"C:\a.md"]),
            })
        );
        assert_eq!(
            editor_invocation("", "/a.md", 5, Os::MacOs),
            Some(Invocation {
                program: "open".to_owned(),
                args: strings(&["-e", "/a.md"]),
            })
        );
        assert_eq!(
            editor_invocation("", "/a.md", 5, Os::Linux),
            Some(Invocation {
                program: "xdg-open".to_owned(),
                args: strings(&["/a.md"]),
            })
        );
    }

    #[test]
    fn unterminated_quote_is_rejected() {
        assert_eq!(
            editor_invocation(r#""code {file}"#, "/a.md", 1, Os::Linux),
            None
        );
    }

    #[test]
    fn finds_batch_files_on_the_path_with_pathext() {
        let dir = tempfile::tempdir().unwrap();
        let cmd = dir.path().join("code.cmd");
        std::fs::write(&cmd, b"@echo off").unwrap();
        let path_var = std::env::join_paths([dir.path()]).unwrap();
        assert_eq!(
            find_in_path("code", &path_var, ".COM;.EXE;.BAT;.CMD"),
            Some(cmd)
        );
        assert_eq!(find_in_path("missing", &path_var, ".EXE;.CMD"), None);
    }
}
