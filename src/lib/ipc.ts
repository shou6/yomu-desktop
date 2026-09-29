import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebview } from '@tauri-apps/api/webview';

/** Tauri の invoke とイベントの薄い包み。テストではこのモジュールを差し替える */

export interface MarkdownFile {
  path: string;
  content: string;
  /** 文書のフォルダ */
  baseDir: string;
}

export type ErrorKind =
  'unsupported_type' | 'not_found' | 'too_large' | 'not_utf8' | 'io' | 'editor_failed';

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
