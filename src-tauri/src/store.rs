//! 設定、画面の状態、読書の記録を、アプリの設定フォルダの JSON ファイルに保存する。
//! 壊れて読めないファイルを見分けてフロントに伝えるため、プラグインを使わずに読み書きする。

use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::io;
use std::path::Path;

/// 保存する場所。フロントからは名前だけを受け取り、任意のパスには書かせない
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StoreName {
    Settings,
    Ui,
    History,
}

impl StoreName {
    pub fn parse(name: &str) -> Option<Self> {
        match name {
            "settings" => Some(Self::Settings),
            "ui" => Some(Self::Ui),
            "history" => Some(Self::History),
            _ => None,
        }
    }

    pub fn file_name(self) -> &'static str {
        match self {
            Self::Settings => "settings.json",
            Self::Ui => "ui.json",
            Self::History => "history.json",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct StoreRead {
    /// 読めた値。ファイルが無いか壊れていれば None
    pub value: Option<Value>,
    /// ファイルはあるが JSON として読めない
    pub corrupt: bool,
}

pub fn read_store(dir: &Path, name: StoreName) -> StoreRead {
    let Ok(text) = fs::read_to_string(dir.join(name.file_name())) else {
        return StoreRead {
            value: None,
            corrupt: false,
        };
    };
    match serde_json::from_str(&text) {
        Ok(value) => StoreRead {
            value: Some(value),
            corrupt: false,
        },
        Err(_) => StoreRead {
            value: None,
            corrupt: true,
        },
    }
}

/// 一時ファイルに書いてから名前を変え、書きかけのファイルが残らないようにする
pub fn write_store(dir: &Path, name: StoreName, value: &Value) -> io::Result<()> {
    fs::create_dir_all(dir)?;
    let target = dir.join(name.file_name());
    let temp = dir.join(format!("{}.tmp", name.file_name()));
    let text = serde_json::to_string_pretty(value).map_err(io::Error::other)?;
    fs::write(&temp, text)?;
    fs::rename(&temp, &target)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn store_names_map_to_fixed_files() {
        assert_eq!(StoreName::parse("settings"), Some(StoreName::Settings));
        assert_eq!(StoreName::parse("ui"), Some(StoreName::Ui));
        assert_eq!(StoreName::parse("history"), Some(StoreName::History));
        assert_eq!(StoreName::parse("../secret"), None);
        assert_eq!(StoreName::Settings.file_name(), "settings.json");
        assert_eq!(StoreName::Ui.file_name(), "ui.json");
        assert_eq!(StoreName::History.file_name(), "history.json");
    }

    #[test]
    fn missing_file_is_empty_and_not_corrupt() {
        let dir = tempfile::tempdir().unwrap();
        let read = read_store(dir.path(), StoreName::Settings);
        assert_eq!(
            read,
            StoreRead {
                value: None,
                corrupt: false
            }
        );
    }

    #[test]
    fn writes_and_reads_back() {
        let dir = tempfile::tempdir().unwrap();
        let nested = dir.path().join("config");
        write_store(&nested, StoreName::Ui, &json!({ "sidePanel": true })).unwrap();
        let read = read_store(&nested, StoreName::Ui);
        assert_eq!(read.value, Some(json!({ "sidePanel": true })));
        assert!(!read.corrupt);
    }

    #[test]
    fn broken_json_is_reported_as_corrupt() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("settings.json"), b"{ \"theme\": ").unwrap();
        let read = read_store(dir.path(), StoreName::Settings);
        assert_eq!(
            read,
            StoreRead {
                value: None,
                corrupt: true
            }
        );
    }

    #[test]
    fn serializes_for_the_frontend() {
        let read = StoreRead {
            value: Some(json!(1)),
            corrupt: false,
        };
        assert_eq!(
            serde_json::to_value(read).unwrap(),
            json!({ "value": 1, "corrupt": false })
        );
    }
}
