import { afterEach, describe, expect, it } from 'vitest';
import { setFocusMode, updateFocus } from './focus';

afterEach(() => {
  setFocusMode(document.createElement('div'), document.createElement('div'), false);
  document.body.innerHTML = '';
});

describe('集中モード', () => {
  it('オンにすると body に印を付け、読んでいるブロックを濃くする。リストは項目ごと', () => {
    const scroller = document.createElement('div');
    const root = document.createElement('div');
    root.innerHTML = '<p>a</p><ul><li>b</li><li>c</li></ul>';
    scroller.appendChild(root);
    document.body.appendChild(scroller);
    setFocusMode(scroller, root, true);
    expect(document.body.classList.contains('yomu-focus-mode')).toBe(true);
    updateFocus(scroller, root);
    // jsdom では要素の位置がすべて 0 なので、帯に一番近い 1 つ以上に印が付く
    expect(root.querySelectorAll('.yomu-focused').length).toBeGreaterThan(0);
  });

  it('オフにすると印を外す', () => {
    const scroller = document.createElement('div');
    const root = document.createElement('div');
    root.innerHTML = '<p>a</p>';
    setFocusMode(scroller, root, true);
    setFocusMode(scroller, root, false);
    expect(document.body.classList.contains('yomu-focus-mode')).toBe(false);
    expect(root.querySelector('.yomu-focused')).toBeNull();
  });
});
