#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::ErrorKind;
    use std::fs;
    use std::path::Path;

    fn write(dir: &Path, name: &str, bytes: &[u8]) -> String {
        let path = dir.join(name);
        fs::write(&path, bytes).unwrap();
        path.to_string_lossy().into_owned()
    }

    fn kind(result: Result<MarkdownFile, crate::error::AppError>) -> ErrorKind {
        result.unwrap_err().kind
    }

    #[test]
    fn reads_markdown_with_its_folder() {
        let dir = tempfile::tempdir().unwrap();
        let path = write(dir.path(), "a.md", "# 見出し\n".as_bytes());
        let file = read_markdown(&path).unwrap();
        assert_eq!(file.content, "# 見出し\n");
        assert_eq!(file.path, path);
        assert_eq!(file.base_dir, dir.path().to_string_lossy());
    }

    #[test]
    fn accepts_markdown_extensions_in_any_case() {
        let dir = tempfile::tempdir().unwrap();
        for name in ["b.markdown", "c.MD", "d.Markdown"] {
            let path = write(dir.path(), name, b"text");
            assert!(read_markdown(&path).is_ok(), "{name}");
        }
    }

    #[test]
    fn rejects_other_extensions() {
        let dir = tempfile::tempdir().unwrap();
        for name in ["a.txt", "noext", "a.md.bak"] {
            let path = write(dir.path(), name, b"text");
            assert_eq!(
                kind(read_markdown(&path)),
                ErrorKind::UnsupportedType,
                "{name}"
            );
        }
    }

    #[test]
    fn checks_the_extension_before_existence() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("missing.txt");
        assert_eq!(
            kind(read_markdown(&path.to_string_lossy())),
            ErrorKind::UnsupportedType
        );
    }

    #[test]
    fn reports_missing_files_and_folders_as_not_found() {
        let dir = tempfile::tempdir().unwrap();
        let missing = dir.path().join("missing.md");
        assert_eq!(
            kind(read_markdown(&missing.to_string_lossy())),
            ErrorKind::NotFound
        );
        let folder = dir.path().join("folder.md");
        fs::create_dir(&folder).unwrap();
        assert_eq!(
            kind(read_markdown(&folder.to_string_lossy())),
            ErrorKind::NotFound
        );
    }

    #[test]
    fn rejects_files_over_10_mib() {
        let dir = tempfile::tempdir().unwrap();
        let limit = dir.path().join("limit.md");
        fs::File::create(&limit)
            .unwrap()
            .set_len(MAX_FILE_SIZE)
            .unwrap();
        assert!(read_markdown(&limit.to_string_lossy()).is_ok());

        let large = dir.path().join("large.md");
        fs::File::create(&large)
            .unwrap()
            .set_len(MAX_FILE_SIZE + 1)
            .unwrap();
        assert_eq!(
            kind(read_markdown(&large.to_string_lossy())),
            ErrorKind::TooLarge
        );
    }

    #[test]
    fn rejects_files_that_are_not_utf8() {
        let dir = tempfile::tempdir().unwrap();
        // Shift_JIS の「日本」
        let path = write(dir.path(), "sjis.md", &[0x93, 0xfa, 0x96, 0x7b]);
        assert_eq!(kind(read_markdown(&path)), ErrorKind::NotUtf8);
    }

    #[test]
    fn strips_the_utf8_bom() {
        let dir = tempfile::tempdir().unwrap();
        let path = write(dir.path(), "bom.md", b"\xEF\xBB\xBF# Title");
        assert_eq!(read_markdown(&path).unwrap().content, "# Title");
    }

    #[test]
    fn error_carries_the_requested_path() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("missing.md").to_string_lossy().into_owned();
        assert_eq!(read_markdown(&path).unwrap_err().path, path);
    }

    #[test]
    fn serializes_base_dir_in_camel_case() {
        let file = MarkdownFile {
            path: r"C:\docs\a.md".to_owned(),
            content: "text".to_owned(),
            base_dir: r"C:\docs".to_owned(),
        };
        assert_eq!(
            serde_json::to_value(&file).unwrap(),
            serde_json::json!({ "path": r"C:\docs\a.md", "content": "text", "baseDir": r"C:\docs" })
        );
    }
}
