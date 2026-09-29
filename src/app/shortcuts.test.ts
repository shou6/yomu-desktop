import { describe, expect, it } from 'vitest';
import { isBlockedBrowserKey, shortcutAction } from './shortcuts';

function key(
  key: string,
  mods: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey', boolean>> = {}
) {
  return { key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods };
}

describe('shortcutAction', () => {
  it('Windows と Linux は Ctrl で操作する（要件定義 3.3 節）', () => {
    expect(shortcutAction(key('o', { ctrlKey: true }), false)).toBe('open');
    expect(shortcutAction(key('b', { ctrlKey: true }), false)).toBe('toggleSidePanel');
    expect(shortcutAction(key('e', { ctrlKey: true }), false)).toBe('openInEditor');
    expect(shortcutAction(key(',', { ctrlKey: true }), false)).toBe('settings');
    expect(shortcutAction(key('O', { ctrlKey: true, shiftKey: false }), false)).toBe('open');
  });

  it('macOS は Cmd で操作し、Ctrl では反応しない', () => {
    expect(shortcutAction(key('o', { metaKey: true }), true)).toBe('open');
    expect(shortcutAction(key('o', { ctrlKey: true }), true)).toBeUndefined();
  });

  it('Alt+← と Alt+→ で戻る・進む', () => {
    expect(shortcutAction(key('ArrowLeft', { altKey: true }), false)).toBe('back');
    expect(shortcutAction(key('ArrowRight', { altKey: true }), false)).toBe('forward');
    expect(shortcutAction(key('ArrowLeft', { altKey: true }), true)).toBe('back');
  });

  it('修飾キーが無いか、余計な修飾キーがあれば何もしない', () => {
    expect(shortcutAction(key('o'), false)).toBeUndefined();
    expect(shortcutAction(key('o', { ctrlKey: true, altKey: true }), false)).toBeUndefined();
    expect(shortcutAction(key('ArrowLeft'), false)).toBeUndefined();
  });
});

describe('shortcutAction: 読む機能', () => {
  it('Ctrl+P で印刷、Ctrl+F で検索、Ctrl+Shift+F で集中モード', () => {
    expect(shortcutAction(key('p', { ctrlKey: true }), false)).toBe('print');
    expect(shortcutAction(key('f', { ctrlKey: true }), false)).toBe('search');
    expect(shortcutAction(key('F', { ctrlKey: true, shiftKey: true }), false)).toBe('toggleFocus');
    expect(shortcutAction(key('f', { metaKey: true, shiftKey: true }), true)).toBe('toggleFocus');
  });
});

describe('isBlockedBrowserKey', () => {
  it('再読み込みと開発者ツールのキーを止める（要件定義 3.3 節）', () => {
    expect(isBlockedBrowserKey(key('F5'))).toBe(true);
    expect(isBlockedBrowserKey(key('r', { ctrlKey: true }))).toBe(true);
    expect(isBlockedBrowserKey(key('R', { ctrlKey: true, shiftKey: true }))).toBe(true);
    expect(isBlockedBrowserKey(key('r', { metaKey: true }))).toBe(true);
    expect(isBlockedBrowserKey(key('F12'))).toBe(true);
    expect(isBlockedBrowserKey(key('I', { ctrlKey: true, shiftKey: true }))).toBe(true);
  });

  it('ほかのキーは止めない', () => {
    expect(isBlockedBrowserKey(key('r'))).toBe(false);
    expect(isBlockedBrowserKey(key('c', { ctrlKey: true }))).toBe(false);
    expect(isBlockedBrowserKey(key('F3'))).toBe(false);
  });
});
