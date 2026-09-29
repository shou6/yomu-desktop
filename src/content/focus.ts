/**
 * 集中モード（F-14、Yomu の src/webview/focus.ts を移植）。
 * 読んでいるブロック（本文の領域の上から 3 割〜5.5 割の帯に掛かるもの）以外を薄く表示する。
 * どのブロックかの判定は reader/focus.ts（単体テスト済み）。デスクトップ版は本文の領域（scroller）の中で
 * スクロールするので、帯は画面ではなく scroller の見えている範囲で決める。
 */
import { FOCUS_BAND, focusedIndices } from '../reader/focus';

let enabled = false;

/** 薄くする単位。本文の直下の要素。ただしリストは項目ごとにする */
function blocks(root: HTMLElement): HTMLElement[] {
  return [...root.children].flatMap((child) =>
    child instanceof HTMLUListElement || child instanceof HTMLOListElement
      ? [...child.children].filter((item): item is HTMLElement => item instanceof HTMLElement)
      : child instanceof HTMLElement
        ? [child]
        : []
  );
}

/** 読んでいるブロックに印を付け直す */
export function updateFocus(scroller: HTMLElement, root: HTMLElement): void {
  if (!enabled) {
    return;
  }
  const items = blocks(root);
  const view = scroller.getBoundingClientRect();
  const height = scroller.clientHeight || window.innerHeight;
  const focused = new Set(
    focusedIndices(
      items.map((item) => {
        const rect = item.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      }),
      { top: view.top + height * FOCUS_BAND.top, bottom: view.top + height * FOCUS_BAND.bottom }
    )
  );
  items.forEach((item, index) => item.classList.toggle('yomu-focused', focused.has(index)));
}

export function setFocusMode(scroller: HTMLElement, root: HTMLElement, on: boolean): void {
  enabled = on;
  document.body.classList.toggle('yomu-focus-mode', on);
  if (on) {
    updateFocus(scroller, root);
  } else {
    root
      .querySelectorAll('.yomu-focused')
      .forEach((element) => element.classList.remove('yomu-focused'));
  }
}
