#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn detects_events_for_the_watched_file() {
        let target = PathBuf::from(r"C:\docs\a.md");
        assert!(touches(&[PathBuf::from(r"C:\docs\a.md")], &target));
        // 一時ファイルに書いてから名前を変えるエディタでは、変更後の名前が含まれる
        assert!(touches(
            &[PathBuf::from(r"C:\docs\a.md.tmp"), PathBuf::from(r"C:\docs\a.md")],
            &target
        ));
    }

    #[test]
    fn ignores_events_for_other_files_in_the_folder() {
        let target = PathBuf::from(r"C:\docs\a.md");
        assert!(!touches(&[PathBuf::from(r"C:\docs\b.md")], &target));
        assert!(!touches(&[], &target));
    }

    #[test]
    fn change_kind_depends_on_whether_the_file_still_exists() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.md");
        assert_eq!(change_kind(&path), ChangeKind::Removed);
        std::fs::write(&path, b"x").unwrap();
        assert_eq!(change_kind(&path), ChangeKind::Modified);
    }

    #[test]
    fn serializes_the_event_for_the_frontend() {
        let change = FileChanged {
            path: "C:/docs/a.md".to_owned(),
            kind: ChangeKind::Removed,
        };
        assert_eq!(
            serde_json::to_value(change).unwrap(),
            serde_json::json!({ "path": "C:/docs/a.md", "kind": "removed" })
        );
    }
}
