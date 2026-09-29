/** キーボードのショートカット（要件定義 3.3 節）。macOS では Ctrl を Cmd に読み替える */

export type ShortcutAction =
  | 'open'
  | 'back'
  | 'forward'
  | 'toggleSidePanel'
  | 'openInEditor'
  | 'settings'
  | 'print'
  | 'search'
  | 'toggleFocus';

export interface KeyInput {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

const COMMAND_KEYS: Record<string, ShortcutAction> = {
  o: 'open',
  b: 'toggleSidePanel',
  e: 'openInEditor',
  ',': 'settings',
  p: 'print',
  f: 'search',
};

export function shortcutAction(input: KeyInput, isMac: boolean): ShortcutAction | undefined {
  const command = isMac ? input.metaKey && !input.ctrlKey : input.ctrlKey && !input.metaKey;
  if (command && !input.altKey && !input.shiftKey) {
    return COMMAND_KEYS[input.key.toLowerCase()];
  }
  if (command && input.shiftKey && !input.altKey && input.key.toLowerCase() === 'f') {
    return 'toggleFocus';
  }
  if (input.altKey && !input.ctrlKey && !input.metaKey && !input.shiftKey) {
    if (input.key === 'ArrowLeft') {
      return 'back';
    }
    if (input.key === 'ArrowRight') {
      return 'forward';
    }
  }
  return undefined;
}

/** ボタンの説明に添えるショートカットの表記 */
export function shortcutLabel(keys: string, isMac: boolean): string {
  return keys.replace('Mod', isMac ? 'Cmd' : 'Ctrl');
}

/**
 * リリースビルドで止める WebView の標準のショートカット（要件定義 3.3 節）。
 * 再読み込み（F5、Ctrl+R）は開いている文書が消えてしまい、開発者ツール（F12、Ctrl+Shift+I）は利用者には要らない
 */
export function isBlockedBrowserKey(input: KeyInput): boolean {
  const key = input.key.toLowerCase();
  const command = input.ctrlKey || input.metaKey;
  if (key === 'f5' || key === 'f12') {
    return true;
  }
  if (command && !input.altKey && key === 'r') {
    return true;
  }
  return command && input.shiftKey && (key === 'i' || key === 'j' || key === 'c');
}
