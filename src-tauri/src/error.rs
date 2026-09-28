use serde::Serialize;

/// フロントへ返すエラーの種類。文はフロントで種類から翻訳する
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorKind {
    UnsupportedType,
    NotFound,
    TooLarge,
    NotUtf8,
    Io,
    #[allow(dead_code)] // エディタで開く（F-12）で使う
    EditorFailed,
}

/// コマンドのエラー。`{ kind, path }` の形でフロントに届く
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct AppError {
    pub kind: ErrorKind,
    pub path: String,
}

impl AppError {
    pub fn new(kind: ErrorKind, path: impl Into<String>) -> Self {
        Self {
            kind,
            path: path.into(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_kind_in_snake_case_with_path() {
        let error = AppError::new(ErrorKind::UnsupportedType, r"C:\docs\a.txt");
        let json = serde_json::to_value(&error).unwrap();
        assert_eq!(
            json,
            serde_json::json!({ "kind": "unsupported_type", "path": r"C:\docs\a.txt" })
        );
    }

    #[test]
    fn all_kinds_have_expected_names() {
        let names: Vec<String> = [
            ErrorKind::UnsupportedType,
            ErrorKind::NotFound,
            ErrorKind::TooLarge,
            ErrorKind::NotUtf8,
            ErrorKind::Io,
            ErrorKind::EditorFailed,
        ]
        .into_iter()
        .map(|kind| {
            serde_json::to_value(kind)
                .unwrap()
                .as_str()
                .unwrap()
                .to_owned()
        })
        .collect();
        assert_eq!(
            names,
            [
                "unsupported_type",
                "not_found",
                "too_large",
                "not_utf8",
                "io",
                "editor_failed"
            ]
        );
    }
}
