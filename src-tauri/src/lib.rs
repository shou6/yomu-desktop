mod error;
mod file;
mod image;
mod pending;

use error::AppError;
use file::MarkdownFile;
use pending::PendingFile;
use tauri::{Emitter, Manager};

#[tauri::command]
fn take_pending_file(state: tauri::State<'_, PendingFile>) -> Option<String> {
    state.take()
}

#[tauri::command]
fn read_markdown_file(path: String) -> Result<MarkdownFile, AppError> {
    file::read_markdown(&path)
}

/// 本文の画像を asset プロトコルで読めるようにする。画像でないものと無いファイルは無視する
#[tauri::command]
fn allow_images(app: tauri::AppHandle, paths: Vec<String>) {
    let scope = app.asset_protocol_scope();
    for path in image::allowed_images(&paths) {
        let _ = scope.allow_file(path);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(PendingFile::default())
        // 二重起動の時は、起動中のウィンドウを前面に出し、新しい引数のファイルを転送する。
        // single-instance は最初に登録する必要がある
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
                if let Some(path) = pending::path_from_args(args) {
                    let _ = window.emit("open-file", path);
                }
            }
        }))
        .setup(|app| {
            if let Some(path) = pending::path_from_args(std::env::args()) {
                app.state::<PendingFile>().set(path);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            take_pending_file,
            read_markdown_file,
            allow_images
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
