/**
 * ページ内検索の強調（F-18）。一致の位置は reader/search.ts（単体テスト済み）で求める。
 * CSS Custom Highlight API（CSS.highlights）がある WebView では、本文の DOM を変えずに色を付ける。
 * 無い WebView（と jsdom）では一致箇所を mark で包み、消す時に元に戻す（実装計画 5 節の 4）。
 */
import { findMatches } from '../reader/search';
import { revealFolded } from './fold';

const MATCH = 'yomu-search-match';
const CURRENT = 'yomu-search-current';

interface HighlightRegistry {
  set(name: string, highlight: unknown): void;
  delete(name: string): void;
}

type HighlightConstructor = new (...ranges: Range[]) => unknown;

function highlightApi():
  { registry: HighlightRegistry; Highlight: HighlightConstructor } | undefined {
  const registry = (globalThis.CSS as { highlights?: HighlightRegistry } | undefined)?.highlights;
  const Highlight = (globalThis as { Highlight?: HighlightConstructor }).Highlight;
  return registry && Highlight ? { registry, Highlight } : undefined;
}

/** 一致の 1 つ。Highlight API の時は Range、mark で包んだ時はその mark */
export type SearchMatch = Range | HTMLElement;

/** 探す対象の文字。Mermaid の図と、折りたたみのボタンは除く */
function textNodes(root: HTMLElement): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest('.yomu-mermaid, .yomu-fold-button, script, style')
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  const nodes: Text[] = [];
  while (walker.nextNode()) {
    nodes.push(walker.currentNode as Text);
  }
  return nodes;
}

/** 前の強調を消す。mark で包んだ時は、元の文字に戻す */
export function clearSearch(root: HTMLElement): void {
  const api = highlightApi();
  api?.registry.delete(MATCH);
  api?.registry.delete(CURRENT);
  root.querySelectorAll(`mark.${MATCH}`).forEach((mark) => {
    mark.replaceWith(document.createTextNode(mark.textContent ?? ''));
  });
  root.normalize();
}

/** 本文の一致箇所をすべて強調し、上から順に返す */
export function highlightMatches(root: HTMLElement, query: string): SearchMatch[] {
  clearSearch(root);
  const api = highlightApi();
  const matches: SearchMatch[] = [];
  for (const node of textNodes(root)) {
    const found = findMatches(node.data, query);
    if (found.length === 0) {
      continue;
    }
    if (api) {
      for (const { start, end } of found) {
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, end);
        matches.push(range);
      }
      continue;
    }
    // 後ろから包むと、前の一致の位置がずれない
    const marks: HTMLElement[] = [];
    for (const { start, end } of [...found].reverse()) {
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, end);
      const mark = document.createElement('mark');
      mark.className = MATCH;
      range.surroundContents(mark);
      marks.unshift(mark);
    }
    matches.push(...marks);
  }
  if (api && matches.length > 0) {
    api.registry.set(MATCH, new api.Highlight(...(matches as Range[])));
  }
  return matches;
}

/**
 * index 番目の一致を今の一致として示す。閉じた details や畳んだコードの中なら開いて見せる。
 * @returns 一致の位置（画面の座標）。スクロールに使う
 */
export function revealMatch(matches: SearchMatch[], index: number): DOMRect | undefined {
  const match = matches[index];
  if (match === undefined) {
    return undefined;
  }
  const node = match instanceof Range ? match.startContainer : match;
  const element = node instanceof Element ? node : node.parentElement;
  for (
    let details = element?.closest('details');
    details;
    details = details.parentElement?.closest('details')
  ) {
    details.open = true;
  }
  revealFolded(node);

  const api = highlightApi();
  if (api && match instanceof Range) {
    api.registry.set(CURRENT, new api.Highlight(match));
    return match.getBoundingClientRect();
  }
  matches.forEach((other) => {
    if (other instanceof HTMLElement) {
      other.classList.toggle(CURRENT, other === match);
    }
  });
  return match instanceof HTMLElement ? match.getBoundingClientRect() : undefined;
}
