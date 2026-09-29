#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::fs;

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
