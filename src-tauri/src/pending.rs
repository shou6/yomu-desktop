use std::sync::Mutex;

/// 起動時の引数で渡されたファイル。
/// 起動直後にイベントを送るとフロントの購読より先に届いて失われるため、State に保存し、
/// フロントの準備後に `take_pending_file` で取り出す。
#[derive(Default)]
pub struct PendingFile(Mutex<Option<String>>);

impl PendingFile {
    pub fn set(&self, path: String) {
        if let Ok(mut guard) = self.0.lock() {
            *guard = Some(path);
        }
    }

    pub fn take(&self) -> Option<String> {
        self.0.lock().ok().and_then(|mut guard| guard.take())
    }
}

/// 実行ファイルの次の引数をファイルのパスとして返す。空やオプション（`-` で始まる）は除く
pub fn path_from_args(args: impl IntoIterator<Item = String>) -> Option<String> {
    args.into_iter()
        .nth(1)
        .filter(|arg| !arg.is_empty() && !arg.starts_with('-'))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn args(values: &[&str]) -> Vec<String> {
        values.iter().map(|value| (*value).to_owned()).collect()
    }

    #[test]
    fn takes_the_first_argument_after_the_executable() {
        assert_eq!(
            path_from_args(args(&["yomu.exe", r"C:\docs\a.md"])),
            Some(r"C:\docs\a.md".to_owned())
        );
    }

    #[test]
    fn returns_none_without_arguments_or_with_an_option() {
        assert_eq!(path_from_args(args(&["yomu.exe"])), None);
        assert_eq!(path_from_args(args(&["yomu.exe", "--flag"])), None);
        assert_eq!(path_from_args(args(&["yomu.exe", ""])), None);
    }

    #[test]
    fn pending_file_is_taken_only_once() {
        let pending = PendingFile::default();
        pending.set(r"C:\docs\a.md".to_owned());
        assert_eq!(pending.take(), Some(r"C:\docs\a.md".to_owned()));
        assert_eq!(pending.take(), None);
    }
}
