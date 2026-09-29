#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

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
