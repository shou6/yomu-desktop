/** キーボードのショートカット（要件定義 3.3 節）。macOS では Ctrl を Cmd に読み替える */

export type ShortcutAction =
  'open' | 'back' | 'forward' | 'toggleSidePanel' | 'openInEditor' | 'settings';

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
};

export function shortcutAction(input: KeyInput, isMac: boolean): ShortcutAction | undefined {
  const command = isMac ? input.metaKey && !input.ctrlKey : input.ctrlKey && !input.metaKey;
  if (command && !input.altKey && !input.shiftKey) {
    return COMMAND_KEYS[input.key.toLowerCase()];
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
