#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn keeps_existing_files_with_image_extensions() {
        let dir = tempfile::tempdir().unwrap();
        let mut paths = Vec::new();
        for name in [
            "a.png", "b.JPG", "c.jpeg", "d.gif", "e.webp", "f.svg", "g.bmp", "h.avif", "i.ico",
        ] {
            let path = dir.path().join(name);
            fs::write(&path, b"x").unwrap();
            paths.push(path.to_string_lossy().into_owned());
        }
        assert_eq!(allowed_images(&paths).len(), paths.len());
    }

    #[test]
    fn drops_other_extensions_missing_files_and_folders() {
        let dir = tempfile::tempdir().unwrap();
        let text = dir.path().join("secret.txt");
        fs::write(&text, b"x").unwrap();
        let folder = dir.path().join("folder.png");
        fs::create_dir(&folder).unwrap();
        let missing = dir.path().join("missing.png");
        let paths = [&text, &folder, &missing].map(|p| p.to_string_lossy().into_owned());
        assert!(allowed_images(&paths).is_empty());
    }

    #[test]
    fn removes_duplicates() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.png");
        fs::write(&path, b"x").unwrap();
        let path = path.to_string_lossy().into_owned();
        assert_eq!(allowed_images(&[path.clone(), path]).len(), 1);
    }
}
