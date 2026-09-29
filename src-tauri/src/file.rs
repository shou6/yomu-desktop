use crate::error::{AppError, ErrorKind};
use serde::Serialize;
use std::fs;
use std::io::ErrorKind as IoErrorKind;
use std::path::Path;

/// 開ける Markdown の上限（10 MiB）
pub const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024;

/// カスタム CSS の上限（1 MiB）
pub const MAX_CSS_SIZE: u64 = 1024 * 1024;

const MARKDOWN_EXTENSIONS: [&str; 2] = ["md", "markdown"];
const UTF8_BOM: char = '\u{feff}';

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarkdownFile {
    pub path: String,
    pub content: String,
    /// 文書のフォルダ。相対パスの画像やリンクの基準にする
    pub base_dir: String,
}

/// Markdown を読む。拡張子、存在、サイズ、UTF-8 の順に検査し、BOM を取り除く
pub fn read_markdown(path: &str) -> Result<MarkdownFile, AppError> {
    let error = |kind| AppError::new(kind, path);
    let file_path = Path::new(path);

    let is_markdown = file_path
        .extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| {
            MARKDOWN_EXTENSIONS
                .iter()
                .any(|allowed| ext.eq_ignore_ascii_case(allowed))
        });
    if !is_markdown {
        return Err(error(ErrorKind::UnsupportedType));
    }

    let metadata = fs::metadata(file_path).map_err(|e| error(io_kind(&e)))?;
    if !metadata.is_file() {
        return Err(error(ErrorKind::NotFound));
    }
    if metadata.len() > MAX_FILE_SIZE {
        return Err(error(ErrorKind::TooLarge));
    }

    let bytes = fs::read(file_path).map_err(|e| error(io_kind(&e)))?;
    let content = String::from_utf8(bytes).map_err(|_| error(ErrorKind::NotUtf8))?;
    let content = if content.starts_with(UTF8_BOM) {
        content[UTF8_BOM.len_utf8()..].to_owned()
    } else {
        content
    };

    let base_dir = file_path
        .parent()
        .map(|dir| dir.to_string_lossy().into_owned())
        .unwrap_or_default();

    Ok(MarkdownFile {
        path: path.to_owned(),
        content,
        base_dir,
    })
}

/// カスタム CSS を読む（F-17）。拡張子が .css で、1 MiB 以下の UTF-8 のファイルだけ
pub fn read_css(path: &str) -> Result<String, AppError> {
    let error = |kind| AppError::new(kind, path);
    let file_path = Path::new(path);
    let is_css = file_path
        .extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| ext.eq_ignore_ascii_case("css"));
    if !is_css {
        return Err(error(ErrorKind::UnsupportedType));
    }
    let metadata = fs::metadata(file_path).map_err(|e| error(io_kind(&e)))?;
    if !metadata.is_file() {
        return Err(error(ErrorKind::NotFound));
    }
    if metadata.len() > MAX_CSS_SIZE {
        return Err(error(ErrorKind::TooLarge));
    }
    let bytes = fs::read(file_path).map_err(|e| error(io_kind(&e)))?;
    let text = String::from_utf8(bytes).map_err(|_| error(ErrorKind::NotUtf8))?;
    Ok(match text.strip_prefix(UTF8_BOM) {
        Some(rest) => rest.to_owned(),
        None => text,
    })
}

fn io_kind(error: &std::io::Error) -> ErrorKind {
    match error.kind() {
        IoErrorKind::NotFound => ErrorKind::NotFound,
        _ => ErrorKind::Io,
    }
}

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

    #[test]
    fn reads_custom_css_and_strips_the_bom() {
        let dir = tempfile::tempdir().unwrap();
        let path = write(dir.path(), "my.CSS", b"\xEF\xBB\xBFbody { color: red; }");
        assert_eq!(read_css(&path).unwrap(), "body { color: red; }");
    }

    #[test]
    fn custom_css_must_be_a_css_file_under_1_mib() {
        let dir = tempfile::tempdir().unwrap();
        let text = write(dir.path(), "a.txt", b"x");
        assert_eq!(
            read_css(&text).unwrap_err().kind,
            ErrorKind::UnsupportedType
        );
        let missing = dir.path().join("missing.css");
        assert_eq!(
            read_css(&missing.to_string_lossy()).unwrap_err().kind,
            ErrorKind::NotFound
        );
        let large = dir.path().join("large.css");
        fs::File::create(&large)
            .unwrap()
            .set_len(MAX_CSS_SIZE + 1)
            .unwrap();
        assert_eq!(
            read_css(&large.to_string_lossy()).unwrap_err().kind,
            ErrorKind::TooLarge
        );
    }
}
