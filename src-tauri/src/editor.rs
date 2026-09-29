//! 表示中の文書をエディタで開く（F-12）。
//! 設定 editor.command を引数に分けてから {file} と {line} を置き換える。パスに空白や記号があっても
//! 1 つの引数のまま渡るので、シェルを通さずに起動できる。

use std::ffi::OsStr;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Os {
    Windows,
    Mac,
    Linux,
}

impl Os {
    pub fn current() -> Self {
        if cfg!(target_os = "windows") {
            Self::Windows
        } else if cfg!(target_os = "macos") {
            Self::Mac
        } else {
            Self::Linux
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Invocation {
    pub program: String,
    pub args: Vec<String>,
}

/// 空白で引数に分ける。" で囲んだ部分は空白を含めて 1 つの引数にする。" が閉じていなければ None
fn split_args(template: &str) -> Option<Vec<String>> {
    let mut args = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut has_arg = false;
    for ch in template.chars() {
        match ch {
            '"' => {
                in_quotes = !in_quotes;
                has_arg = true;
            }
            c if c.is_whitespace() && !in_quotes => {
                if has_arg {
                    args.push(std::mem::take(&mut current));
                    has_arg = false;
                }
            }
            c => {
                current.push(c);
                has_arg = true;
            }
        }
    }
    if in_quotes {
        return None;
    }
    if has_arg {
        args.push(current);
    }
    Some(args)
}

/// エディタを起動するプログラムと引数。テンプレートが空なら OS の標準のテキストエディタ
pub fn editor_invocation(template: &str, file: &str, line: u32, os: Os) -> Option<Invocation> {
    if template.trim().is_empty() {
        let (program, mut args) = match os {
            Os::Windows => ("notepad.exe", vec![]),
            Os::Mac => ("open", vec!["-e".to_owned()]),
            Os::Linux => ("xdg-open", vec![]),
        };
        args.push(file.to_owned());
        return Some(Invocation {
            program: program.to_owned(),
            args,
        });
    }
    let mut parts = split_args(template)?.into_iter();
    let program = parts.next()?;
    let line = line.to_string();
    let mut has_file = false;
    let mut args: Vec<String> = parts
        .map(|arg| {
            has_file |= arg.contains("{file}");
            arg.replace("{file}", file).replace("{line}", &line)
        })
        .collect();
    if !has_file {
        args.push(file.to_owned());
    }
    Some(Invocation { program, args })
}

/// PATH からプログラムを探す。Windows の PATHEXT（.CMD など）も試す。
/// Rust の Command は .exe しか補わないため、code.cmd のようなエディタは見つからない
pub fn find_in_path(name: &str, path_var: &OsStr, pathext: &str) -> Option<PathBuf> {
    let candidates: Vec<String> = std::iter::once(String::new())
        .chain(
            pathext
                .split(';')
                .filter(|ext| !ext.is_empty())
                .map(str::to_owned),
        )
        .collect();
    for dir in std::env::split_paths(path_var) {
        for ext in &candidates {
            let candidate = dir.join(format!("{name}{ext}"));
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }
    None
}

fn resolve_program(program: &str) -> PathBuf {
    let path = Path::new(program);
    if path.components().count() > 1 || path.is_absolute() {
        return path.to_path_buf();
    }
    let path_var = std::env::var_os("PATH").unwrap_or_default();
    let pathext = if cfg!(target_os = "windows") {
        std::env::var("PATHEXT").unwrap_or_else(|_| ".COM;.EXE;.BAT;.CMD".to_owned())
    } else {
        String::new()
    };
    find_in_path(program, &path_var, &pathext).unwrap_or_else(|| path.to_path_buf())
}

/// エディタを起動する。起動できなければ Err
pub fn open_in_editor(template: &str, file: &str, line: u32) -> Result<(), ()> {
    let invocation = editor_invocation(template, file, line, Os::current()).ok_or(())?;
    Command::new(resolve_program(&invocation.program))
        .args(&invocation.args)
        .spawn()
        .map(|_| ())
        .map_err(|_| ())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn strings(values: &[&str]) -> Vec<String> {
        values.iter().map(|value| (*value).to_owned()).collect()
    }

    #[test]
    fn replaces_file_and_line_in_each_argument() {
        let invocation =
            editor_invocation("code -g {file}:{line}", r"C:\my docs\a.md", 12, Os::Windows);
        assert_eq!(
            invocation,
            Some(Invocation {
                program: "code".to_owned(),
                args: strings(&["-g", r"C:\my docs\a.md:12"]),
            })
        );
    }

    #[test]
    fn keeps_quoted_parts_together() {
        let invocation = editor_invocation(
            r#""C:\Program Files\Editor\editor.exe" --line {line} "{file}""#,
            r"C:\docs\a.md",
            3,
            Os::Windows,
        );
        assert_eq!(
            invocation,
            Some(Invocation {
                program: r"C:\Program Files\Editor\editor.exe".to_owned(),
                args: strings(&["--line", "3", r"C:\docs\a.md"]),
            })
        );
    }

    #[test]
    fn appends_the_file_when_the_template_has_no_placeholder() {
        let invocation = editor_invocation("subl", "/docs/a.md", 1, Os::Linux);
        assert_eq!(
            invocation,
            Some(Invocation {
                program: "subl".to_owned(),
                args: strings(&["/docs/a.md"]),
            })
        );
    }

    #[test]
    fn empty_template_uses_the_os_text_editor() {
        assert_eq!(
            editor_invocation("  ", r"C:\a.md", 5, Os::Windows),
            Some(Invocation {
                program: "notepad.exe".to_owned(),
                args: strings(&[r"C:\a.md"]),
            })
        );
        assert_eq!(
            editor_invocation("", "/a.md", 5, Os::Mac),
            Some(Invocation {
                program: "open".to_owned(),
                args: strings(&["-e", "/a.md"]),
            })
        );
        assert_eq!(
            editor_invocation("", "/a.md", 5, Os::Linux),
            Some(Invocation {
                program: "xdg-open".to_owned(),
                args: strings(&["/a.md"]),
            })
        );
    }

    #[test]
    fn unterminated_quote_is_rejected() {
        assert_eq!(
            editor_invocation(r#""code {file}"#, "/a.md", 1, Os::Linux),
            None
        );
    }

    #[test]
    fn finds_batch_files_on_the_path_with_pathext() {
        let dir = tempfile::tempdir().unwrap();
        let cmd = dir.path().join("code.cmd");
        std::fs::write(&cmd, b"@echo off").unwrap();
        let path_var = std::env::join_paths([dir.path()]).unwrap();
        // Windows のファイル名は大文字と小文字を区別しないので、PATHEXT の綴り（.CMD）で見つかってもよい
        let found = find_in_path("code", &path_var, ".COM;.EXE;.BAT;.CMD").unwrap();
        assert!(
            found
                .to_string_lossy()
                .eq_ignore_ascii_case(&cmd.to_string_lossy()),
            "{found:?}"
        );
        assert_eq!(find_in_path("missing", &path_var, ".EXE;.CMD"), None);
    }
}
