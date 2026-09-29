import { beforeEach, describe, expect, it } from 'vitest';
import { applyFolding, resetFolding, revealFolded } from './fold';

const labels = { expand: 'Show all {0} lines', collapse: 'Collapse' };

function content(): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = [
    '<div class="yomu-code" data-lang="ts"><pre><code>1\n2\n3\n4\n5\n</code></pre></div>',
    '<pre><code>short\n</code></pre>',
    '<div class="yomu-mermaid"><pre class="yomu-mermaid-source">a\nb\nc\nd\ne</pre></div>',
  ].join('');
  return root;
}

beforeEach(() => resetFolding());

describe('applyFolding', () => {
  it('設定の行数より長いコードを畳み、「全 N 行を表示」のボタンを出す。Mermaid のソースは畳まない', () => {
    const root = content();
    applyFolding(root, { foldLines: 3, labels });
    const frames = root.querySelectorAll('.yomu-folded');
    expect(frames).toHaveLength(1);
    expect(frames[0].classList.contains('yomu-code')).toBe(true);
    expect(root.querySelector('.yomu-fold-button')?.textContent).toBe('Show all 5 lines');
  });

  it('ボタンで開き、「折りたたむ」で戻す', () => {
    const root = content();
    applyFolding(root, { foldLines: 3, labels });
    const button = root.querySelector<HTMLButtonElement>('.yomu-fold-button');
    button?.click();
    expect(root.querySelector('.yomu-folded')).toBeNull();
    expect(button?.textContent).toBe('Collapse');
    button?.click();
    expect(root.querySelector('.yomu-folded')).not.toBeNull();
  });

  it('0 にすると畳まない', () => {
    const root = content();
    applyFolding(root, { foldLines: 0, labels });
    expect(root.querySelector('.yomu-fold-button')).toBeNull();
  });

  it('再読込で付け直しても、開いたコードは開いたまま。別の文書を開いたら忘れる', () => {
    const root = content();
    applyFolding(root, { foldLines: 3, labels });
    root.querySelector<HTMLButtonElement>('.yomu-fold-button')?.click();
    const reloaded = content();
    applyFolding(reloaded, { foldLines: 3, labels });
    expect(reloaded.querySelector('.yomu-folded')).toBeNull();
    resetFolding();
    const other = content();
    applyFolding(other, { foldLines: 3, labels });
    expect(other.querySelector('.yomu-folded')).not.toBeNull();
  });
});

describe('revealFolded', () => {
  it('畳んだコードの中の要素を見せる時は、そのコードを開く', () => {
    const root = content();
    applyFolding(root, { foldLines: 3, labels });
    const code = root.querySelector('code');
    revealFolded(code);
    expect(root.querySelector('.yomu-folded')).toBeNull();
    expect(root.querySelector('.yomu-fold-button')?.textContent).toBe('Collapse');
  });
});
