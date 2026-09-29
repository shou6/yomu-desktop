// アプリのコマンドを列挙し、capabilities で許可したものだけをフロントから呼べるようにする
const COMMANDS: &[&str] = &[
    "take_pending_file",
    "read_markdown_file",
    "read_custom_css",
    "stop_custom_css",
    "allow_images",
    "load_store",
    "save_store",
    "paths_exist",
    "open_path",
    "open_url",
    "open_in_editor",
];

fn main() {
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)),
    )
    .expect("failed to run tauri-build");
}
