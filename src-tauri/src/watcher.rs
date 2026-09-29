//! 開いている文書の保存と削除を監視する（F-8）。
//! エディタは一時ファイルに書いてから名前を変えることが多く、ファイルそのものを監視すると外れてしまう。
//! そのため文書のフォルダを監視し、その文書のファイル名を含むイベントだけを拾う。

use notify::RecursiveMode;
use notify_debouncer_full::{DebounceEventResult, Debouncer, RecommendedCache, new_debouncer};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

/// 保存の後、描き直すまで待つ時間（F-8 の 200ms 程度）
const DEBOUNCE: Duration = Duration::from_millis(200);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ChangeKind {
    Modified,
    Removed,
}

/// フロントに送る `file-changed` イベントの中身
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct FileChanged {
    pub path: String,
    pub kind: ChangeKind,
}

/// イベントのパスに、監視している文書が含まれるか
pub fn touches(paths: &[PathBuf], target: &Path) -> bool {
    paths.iter().any(|path| path == target)
}

pub fn change_kind(target: &Path) -> ChangeKind {
    if target.is_file() {
        ChangeKind::Modified
    } else {
        ChangeKind::Removed
    }
}

type FolderDebouncer = Debouncer<notify::RecommendedWatcher, RecommendedCache>;

/// 1 つのファイルだけを監視する。別のファイルを監視したら張り替える
#[derive(Default)]
pub struct FileWatcher(Mutex<Option<FolderDebouncer>>);

/// 開いている文書の監視。変化を `file-changed` で送る
#[derive(Default)]
pub struct DocumentWatcher(pub FileWatcher);

/// カスタム CSS の監視（F-17）。変化を `custom-css-changed` で送る
#[derive(Default)]
pub struct CssWatcher(pub FileWatcher);

impl FileWatcher {
    /// 監視をやめる
    pub fn stop(&self) {
        if let Ok(mut guard) = self.0.lock() {
            *guard = None;
        }
    }

    pub fn watch(&self, app: &AppHandle, path: &str, event: &'static str) {
        let Ok(mut guard) = self.0.lock() else {
            return;
        };
        // 前の文書の監視をやめる
        *guard = None;
        let target = PathBuf::from(path);
        let Some(folder) = target.parent().map(Path::to_path_buf) else {
            return;
        };
        let app = app.clone();
        let reported = path.to_owned();
        let handler = move |result: DebounceEventResult| {
            let Ok(events) = result else {
                return;
            };
            if events.iter().any(|event| touches(&event.paths, &target)) {
                let _ = app.emit(
                    event,
                    FileChanged {
                        path: reported.clone(),
                        kind: change_kind(&target),
                    },
                );
            }
        };
        let Ok(mut debouncer) = new_debouncer(DEBOUNCE, None, handler) else {
            return;
        };
        if debouncer
            .watch(&folder, RecursiveMode::NonRecursive)
            .is_ok()
        {
            *guard = Some(debouncer);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_events_for_the_watched_file() {
        let target = PathBuf::from(r"C:\docs\a.md");
        assert!(touches(&[PathBuf::from(r"C:\docs\a.md")], &target));
        // 一時ファイルに書いてから名前を変えるエディタでは、変更後の名前が含まれる
        assert!(touches(
            &[
                PathBuf::from(r"C:\docs\a.md.tmp"),
                PathBuf::from(r"C:\docs\a.md")
            ],
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
