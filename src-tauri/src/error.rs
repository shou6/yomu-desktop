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
