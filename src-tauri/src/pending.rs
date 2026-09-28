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
