mod editor;
mod error;
mod file;
mod image;
mod open;
mod pending;
mod store;
mod watcher;

use error::{AppError, ErrorKind};
use file::MarkdownFile;
use pending::PendingFile;
use std::path::{Path, PathBuf};
use store::{StoreName, StoreRead};
use tauri::{Emitter, Manager};
use tauri_plugin_opener::OpenerExt;
use watcher::{CssWatcher, DocumentWatcher};

#[tauri::command]
fn take_pending_file(state: tauri::State<'_, PendingFile>) -> Option<String> {
    state.take()
}

/// 文書を読み、その文書の保存と削除の監視に張り替える（F-8）
#[tauri::command]
fn read_markdown_file(
    app: tauri::AppHandle,
    watcher: tauri::State<'_, DocumentWatcher>,
    path: String,
) -> Result<MarkdownFile, AppError> {
    let file = file::read_markdown(&path)?;
    watcher.0.watch(&app, &path, "file-changed");
    Ok(file)
}

/// カスタム CSS を読み、保存したらすぐに反映できるよう監視する（F-17）
#[tauri::command]
fn read_custom_css(
    app: tauri::AppHandle,
    watcher: tauri::State<'_, CssWatcher>,
    path: String,
) -> Result<String, AppError> {
    watcher.0.watch(&app, &path, "custom-css-changed");
    file::read_css(&path)
}

/// カスタム CSS の設定を空にした時に、監視をやめる
#[tauri::command]
fn stop_custom_css(watcher: tauri::State<'_, CssWatcher>) {
    watcher.0.stop();
}

/// 本文の画像を asset プロトコルで読めるようにする。画像でないものと無いファイルは無視する
#[tauri::command]
fn allow_images(app: tauri::AppHandle, paths: Vec<String>) {
    let scope = app.asset_protocol_scope();
    for path in image::allowed_images(&paths) {
        let _ = scope.allow_file(path);
    }
}

fn config_dir(app: &tauri::AppHandle) -> Result<PathBuf, AppError> {
    app.path()
        .app_config_dir()
        .map_err(|_| AppError::new(ErrorKind::Io, ""))
}

fn store_name(name: &str) -> Result<StoreName, AppError> {
    StoreName::parse(name).ok_or_else(|| AppError::new(ErrorKind::Io, name))
}

/// 設定（settings）、画面の状態（ui）、読書の記録（history）を読む
#[tauri::command]
fn load_store(app: tauri::AppHandle, name: String) -> Result<StoreRead, AppError> {
    Ok(store::read_store(&config_dir(&app)?, store_name(&name)?))
}

#[tauri::command]
fn save_store(
    app: tauri::AppHandle,
    name: String,
    value: serde_json::Value,
) -> Result<(), AppError> {
    let name = store_name(&name)?;
    store::write_store(&config_dir(&app)?, name, &value)
        .map_err(|_| AppError::new(ErrorKind::Io, name.file_name()))
}

/// 読書の記録のうち、ファイルが今もあるか
#[tauri::command]
fn paths_exist(paths: Vec<String>) -> Vec<bool> {
    paths.iter().map(|path| Path::new(path).is_file()).collect()
}

/// リンクの先のファイルを OS の既定のアプリで開く。プログラムやスクリプトは開かない
#[tauri::command]
fn open_path(app: tauri::AppHandle, path: String) -> Result<(), AppError> {
    let target = Path::new(&path);
    if !open::is_safe_to_open(target) {
        return Err(AppError::new(ErrorKind::Blocked, path));
    }
    if !target.exists() {
        return Err(AppError::new(ErrorKind::NotFound, path));
    }
    app.opener()
        .open_path(&path, None::<&str>)
        .map_err(|_| AppError::new(ErrorKind::OpenFailed, path))
}

/// http(s) と mailto のリンクを、既定のブラウザやメーラーで開く
#[tauri::command]
fn open_url(app: tauri::AppHandle, url: String) -> Result<(), AppError> {
    if !open::is_openable_url(&url) {
        return Err(AppError::new(ErrorKind::Blocked, url));
    }
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|_| AppError::new(ErrorKind::OpenFailed, url))
}

/// 表示中の文書をエディタで開く。command が空なら OS の標準のテキストエディタ（F-12）
#[tauri::command]
fn open_in_editor(path: String, line: u32, command: String) -> Result<(), AppError> {
    editor::open_in_editor(&command, &path, line)
        .map_err(|_| AppError::new(ErrorKind::EditorFailed, path))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(PendingFile::default())
        .manage(DocumentWatcher::default())
        .manage(CssWatcher::default())
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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        // ウィンドウの位置、大きさ、最大化を次の起動で戻す（F-19）
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            if let Some(path) = pending::path_from_args(std::env::args()) {
                app.state::<PendingFile>().set(path);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            take_pending_file,
            read_markdown_file,
            read_custom_css,
            stop_custom_css,
            allow_images,
            load_store,
            save_store,
            paths_exist,
            open_path,
            open_url,
            open_in_editor
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app, _event| {
        // macOS は Finder から開いたファイルを、引数ではなく OS のイベントで渡す（F-1、実装計画 1.1 節の 7）。
        // 画面の準備より前に届くこともあるので、State に置いた上でフロントへも送る
        #[cfg(target_os = "macos")]
        if let tauri::RunEvent::Opened { urls } = _event {
            let path = urls
                .iter()
                .find_map(|url| url.to_file_path().ok())
                .map(|path| path.to_string_lossy().into_owned());
            if let Some(path) = path {
                _app.state::<PendingFile>().set(path.clone());
                let _ = _app.emit("open-file", path);
            }
        }
    });
}
