import { describe, expect, it } from 'vitest';
import { shortcutAction } from './shortcuts';

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
