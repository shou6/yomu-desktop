use std::collections::BTreeSet;
use std::path::{Path, PathBuf};

/// 本文に出す画像として許可する拡張子
const IMAGE_EXTENSIONS: [&str; 9] = [
    "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "avif", "ico",
];

fn is_image(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| {
            IMAGE_EXTENSIONS
                .iter()
                .any(|allowed| ext.eq_ignore_ascii_case(allowed))
        })
}

/// asset プロトコルに許可してよい画像のパス。画像の拡張子で、存在するファイルだけを返す。
/// フロントが渡したパスを信用せず、画像以外のファイルを読ませないためにここで絞る
pub fn allowed_images(paths: &[String]) -> Vec<PathBuf> {
    let unique: BTreeSet<PathBuf> = paths
        .iter()
        .map(PathBuf::from)
        .filter(|path| is_image(path) && path.is_file())
        .collect();
    unique.into_iter().collect()
}

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
