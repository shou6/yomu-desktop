import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-dialog';

/** Tauri の invoke とイベントの薄い包み。テストではこのモジュールを差し替える */

export interface MarkdownFile {
  path: string;
  content: string;
  /** 文書のフォルダ */
  baseDir: string;
}

export type ErrorKind =
  | 'unsupported_type'
  | 'not_found'
  | 'too_large'
  | 'not_utf8'
  | 'io'
  | 'editor_failed'
  | 'blocked'
  | 'open_failed';

/** Rust のコマンドが返すエラー */
export interface AppError {
  kind: ErrorKind;
  path: string;
}

export type DragDropEvent =
  | { type: 'enter'; paths: string[] }
  | { type: 'over' }
  | { type: 'drop'; paths: string[] }
  | { type: 'leave' };

export type Unlisten = () => void;

/** 開いている文書の保存（modified）と削除（removed）。Rust の監視から届く */
export interface FileChange {
  path: string;
  kind: 'modified' | 'removed';
}

/** 保存する場所。settings.json、ui.json、history.json */
export type StoreName = 'settings' | 'ui' | 'history';

export interface StoreRead {
  /** 読めた値。ファイルが無いか壊れていれば null */
  value: unknown;
  /** ファイルはあるが JSON として読めない */
  corrupt: boolean;
}

/** 起動時の引数で渡されたファイルを 1 度だけ取り出す */
export function takePendingFile(): Promise<string | null> {
  return invoke<string | null>('take_pending_file');
}

/** Markdown を読む。失敗した時は AppError で reject する */
export function readMarkdownFile(path: string): Promise<MarkdownFile> {
  return invoke<MarkdownFile>('read_markdown_file', { path });
}

/** 本文の画像のファイルだけを asset プロトコルで読めるようにする。画像でないものや無いファイルは Rust が無視する */
export function allowImages(paths: string[]): Promise<void> {
  return invoke<void>('allow_images', { paths });
}

/** ローカルのファイルを、本文から読める asset プロトコルの URL にする */
export function fileUrl(path: string): string {
  return convertFileSrc(path);
}

export function loadStore(name: StoreName): Promise<StoreRead> {
  return invoke<StoreRead>('load_store', { name });
}

export function saveStore(name: StoreName, value: unknown): Promise<void> {
  return invoke<void>('save_store', { name, value });
}

/** ファイルが今もあるか。読書の記録で、無くなった文書を見分ける */
export function pathsExist(paths: string[]): Promise<boolean[]> {
  return invoke<boolean[]>('paths_exist', { paths });
}

/** ファイルを選ぶダイアログ。文言は翻訳してから渡す。選ばなければ null */
export async function openFileDialog(labels: {
  title: string;
  filterName: string;
}): Promise<string | null> {
  const selected = await open({
    title: labels.title,
    multiple: false,
    directory: false,
    filters: [{ name: labels.filterName, extensions: ['md', 'markdown'] }],
  });
  return typeof selected === 'string' ? selected : null;
}

/** リンクの先のファイルを OS の既定のアプリで開く。プログラムやスクリプトは Rust が断る */
export function openPath(path: string): Promise<void> {
  return invoke<void>('open_path', { path });
}

/** http(s) と mailto のリンクを既定のブラウザやメーラーで開く */
export function openUrl(url: string): Promise<void> {
  return invoke<void>('open_url', { url });
}

/** 文書をエディタで開く。command が空なら OS の標準のテキストエディタ */
export function openInEditor(path: string, line: number, command: string): Promise<void> {
  return invoke<void>('open_in_editor', { path, line, command });
}

export function setWindowTitle(title: string): Promise<void> {
  return getCurrentWindow().setTitle(title);
}

/** macOS か。ショートカットの Ctrl を Cmd に読み替える */
export function isMac(): boolean {
  return /Mac/i.test(navigator.platform) || /Mac OS X/.test(navigator.userAgent);
}

/** カスタム CSS を読み、保存したら custom-css-changed で知らせるよう監視する（F-17） */
export function readCustomCss(path: string): Promise<string> {
  return invoke<string>('read_custom_css', { path });
}

/** カスタム CSS の監視をやめる */
export function stopCustomCss(): Promise<void> {
  return invoke<void>('stop_custom_css');
}

export function onCustomCssChanged(handler: (change: FileChange) => void): Promise<Unlisten> {
  return listen<FileChange>('custom-css-changed', (event) => handler(event.payload));
}

/** CSS ファイルを選ぶダイアログ。選ばなければ null */
export async function chooseCssFile(labels: {
  title: string;
  filterName: string;
}): Promise<string | null> {
  const selected = await open({
    title: labels.title,
    multiple: false,
    directory: false,
    filters: [{ name: labels.filterName, extensions: ['css'] }],
  });
  return typeof selected === 'string' ? selected : null;
}

/** 開いている文書の保存と削除を受け取る */
export function onFileChanged(handler: (change: FileChange) => void): Promise<Unlisten> {
  return listen<FileChange>('file-changed', (event) => handler(event.payload));
}

/** 二重起動で転送されたファイルを受け取る */
export function onOpenFile(handler: (path: string) => void): Promise<Unlisten> {
  return listen<string>('open-file', (event) => handler(event.payload));
}

/** ウィンドウへのファイルのドラッグ&ドロップを受け取る */
export function onDragDrop(handler: (event: DragDropEvent) => void): Promise<Unlisten> {
  return getCurrentWebview().onDragDropEvent((event) => {
    const payload = event.payload;
    switch (payload.type) {
      case 'enter':
        handler({ type: 'enter', paths: payload.paths });
        break;
      case 'over':
        handler({ type: 'over' });
        break;
      case 'drop':
        handler({ type: 'drop', paths: payload.paths });
        break;
      case 'leave':
        handler({ type: 'leave' });
        break;
    }
  });
}

export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { kind?: unknown }).kind === 'string' &&
    typeof (value as { path?: unknown }).path === 'string'
  );
}
