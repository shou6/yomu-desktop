// アプリのコマンドを列挙し、capabilities で許可したものだけをフロントから呼べるようにする
const COMMANDS: &[&str] = &["take_pending_file", "read_markdown_file"];

fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)),
    )
    .expect("failed to run tauri-build");
}
