//! リンクの先を OS の既定のアプリやブラウザで開く（F-10）。
//! 文書のリンクから任意のプログラムを起動されないよう、実行できる種類のファイルは開かない。

use std::path::Path;

/// 開くと実行されるファイルの拡張子
const BLOCKED_EXTENSIONS: [&str; 24] = [
    "exe", "bat", "cmd", "com", "msi", "msp", "ps1", "psm1", "vbs", "vbe", "js", "jse", "wsf",
    "wsh", "jar", "sh", "lnk", "scr", "pif", "cpl", "app", "hta", "reg", "url",
];

pub fn is_safe_to_open(path: &Path) -> bool {
    !path
        .extension()
        .and_then(|ext| ext.to_str())
        .is_some_and(|ext| {
            BLOCKED_EXTENSIONS
                .iter()
                .any(|blocked| ext.eq_ignore_ascii_case(blocked))
        })
}

/// ブラウザやメーラーで開いてよい URL
pub fn is_openable_url(url: &str) -> bool {
    let lower = url.to_ascii_lowercase();
    lower.starts_with("https://") || lower.starts_with("http://") || lower.starts_with("mailto:")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn documents_and_images_can_be_opened() {
        for name in ["a.pdf", "b.png", "c.xlsx", "d.txt", "e.docx", "images"] {
            assert!(is_safe_to_open(Path::new(name)), "{name}");
        }
    }

    #[test]
    fn programs_and_scripts_are_blocked() {
        for name in [
            "a.exe", "b.BAT", "c.cmd", "d.com", "e.msi", "f.ps1", "g.vbs", "h.js", "i.jar", "j.sh",
            "k.lnk", "l.scr", "m.app", "n.hta", "o.reg", "p.url",
        ] {
            assert!(!is_safe_to_open(Path::new(name)), "{name}");
        }
    }

    #[test]
    fn only_web_and_mail_urls_are_opened() {
        assert!(is_openable_url("https://example.com/a"));
        assert!(is_openable_url("HTTP://example.com"));
        assert!(is_openable_url("mailto:a@example.com"));
        assert!(!is_openable_url("javascript:alert(1)"));
        assert!(!is_openable_url("file:///C:/a.exe"));
        assert!(!is_openable_url("ms-settings:"));
    }
}
