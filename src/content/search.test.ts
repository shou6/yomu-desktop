import { afterEach, describe, expect, it } from 'vitest';
import { clearSearch, highlightMatches, revealMatch } from './search';

function content(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('highlightMatches', () => {
  it('本文の一致箇所をすべて強調し、件数を返す。大文字と小文字は区別しない', () => {
    const root = content('<p>Yomu reads <strong>yomu</strong>.</p><pre><code>YOMU</code></pre>');
    const matches = highlightMatches(root, 'yomu');
    expect(matches).toHaveLength(3);
    // CSS Custom Highlight API の無い環境（jsdom）では mark で包む
    expect(root.querySelectorAll('mark.yomu-search-match')).toHaveLength(3);
  });

  it('Mermaid の図の中は探さない', () => {
    const root = content(
      '<p>graph</p><div class="yomu-mermaid"><svg><text>graph</text></svg></div>'
    );
    expect(highlightMatches(root, 'graph')).toHaveLength(1);
  });

  it('消すと元の文字に戻る', () => {
    const root = content('<p>abc abc</p>');
    const before = root.innerHTML;
    highlightMatches(root, 'b');
    clearSearch(root);
    expect(root.innerHTML).toBe(before);
    expect(root.querySelector('mark')).toBeNull();
  });

  it('探し直すと、前の強調を消してから付け直す', () => {
    const root = content('<p>abc abc</p>');
    highlightMatches(root, 'abc');
    expect(highlightMatches(root, 'c')).toHaveLength(2);
    expect(root.querySelectorAll('mark')).toHaveLength(2);
  });
});

describe('revealMatch', () => {
  it('今の一致に印を付け、閉じた details の中なら開く', () => {
    const root = content('<p>x</p><details><summary>s</summary><p>x</p></details>');
    const matches = highlightMatches(root, 'x');
    revealMatch(matches, 1);
    expect(root.querySelector('details')?.open).toBe(true);
    expect(root.querySelectorAll('mark.yomu-search-current')).toHaveLength(1);
    revealMatch(matches, 0);
    expect(root.querySelectorAll('mark.yomu-search-current')).toHaveLength(1);
    expect(root.querySelector('p mark')?.classList.contains('yomu-search-current')).toBe(true);
  });
});
