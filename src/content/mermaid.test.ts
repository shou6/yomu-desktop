import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderMermaid, resetMermaid, type MermaidApi } from './mermaid';

function content(...sources: string[]): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = sources
    .map(
      (source) => `<div class="yomu-mermaid"><pre class="yomu-mermaid-source">${source}</pre></div>`
    )
    .join('');
  return root;
}

function fakeMermaid(render?: (id: string, source: string) => Promise<{ svg: string }>) {
  const api: MermaidApi = {
    initialize: vi.fn(),
    render: vi.fn(
      render ?? (async (_id: string, source: string) => ({ svg: `<svg>${source}</svg>` }))
    ),
  };
  return { api, load: vi.fn(async () => api) };
}

let seq = 0;
beforeEach(() => {
  // キャッシュが効かないよう、テストごとに違うソースを使う
  seq++;
});

describe('renderMermaid', () => {
  it('枠のソースを mermaid で SVG にして差し替える。テーマと strict を渡す', async () => {
    const root = content(`graph TD; A${seq}-->B`);
    const { api, load } = fakeMermaid();
    await renderMermaid(root, { theme: 'dark', load });
    expect(root.querySelector('.yomu-mermaid')?.innerHTML).toBe(
      `<svg>graph TD; A${seq}--&gt;B</svg>`
    );
    expect(api.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'dark', securityLevel: 'strict', startOnLoad: false })
    );
  });

  it('Mermaid の枠が無ければ mermaid を読み込まない', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>text</p>';
    const { load } = fakeMermaid();
    await renderMermaid(root, { theme: 'paper', load });
    expect(load).not.toHaveBeenCalled();
  });

  it('描けない時は、エラーの内容と元のソースを出す', async () => {
    const root = content(`bad${seq}`);
    const { load } = fakeMermaid(async () => {
      throw new Error('Parse error');
    });
    await renderMermaid(root, { theme: 'paper', load });
    const block = root.querySelector('.yomu-mermaid');
    expect(block?.querySelector('.yomu-mermaid-error')?.textContent).toBe('Mermaid: Parse error');
    expect(block?.querySelector('.yomu-mermaid-source')?.textContent).toBe(`bad${seq}`);
  });

  it('読み込みに失敗した時も、エラーとソースを出す', async () => {
    const root = content(`graph${seq}`);
    const load = vi.fn(async (): Promise<MermaidApi> => {
      throw new Error('failed to load');
    });
    await renderMermaid(root, { theme: 'paper', load });
    expect(root.querySelector('.yomu-mermaid-error')?.textContent).toBe('Mermaid: failed to load');
  });

  it('同じソースとテーマの図は、2 回目は描かずに覚えた SVG を使う', async () => {
    const { api, load } = fakeMermaid();
    await renderMermaid(content(`same${seq}`), { theme: 'paper', load });
    const again = content(`same${seq}`);
    await renderMermaid(again, { theme: 'paper', load });
    expect(api.render).toHaveBeenCalledTimes(1);
    expect(again.querySelector('svg')).not.toBeNull();
  });
});

describe('resetMermaid', () => {
  it('描いた図を元のソースに戻す（テーマを変えて描き直すため）', async () => {
    const root = content(`graph${seq}`);
    const { load } = fakeMermaid();
    await renderMermaid(root, { theme: 'paper', load });
    resetMermaid(root);
    expect(root.querySelector('svg')).toBeNull();
    expect(root.querySelector('.yomu-mermaid-source')?.textContent).toBe(`graph${seq}`);
  });
});
