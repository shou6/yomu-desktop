import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as ipc from '../lib/ipc';
import { DEFAULT_SETTINGS } from '../reader/readerSettings';
import Reader from './Reader';

vi.mock('../lib/ipc', () => ({
  allowImages: vi.fn(),
  fileUrl: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(ipc.allowImages).mockResolvedValue(undefined);
  vi.mocked(ipc.fileUrl).mockImplementation((path: string) => `asset://${path}`);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function file(content: string) {
  return { path: 'C:\\docs\\a.md', content, baseDir: 'C:\\docs' };
}

describe('Reader: 画像', () => {
  it('ローカルの画像は、そのファイルだけを許可してから、asset の URL で出す', async () => {
    const { container } = render(
      <Reader
        file={file('![a](./img/a.png)\n\n![b](../b.png)\n\n![w](https://example.com/w.png)\n')}
        settings={DEFAULT_SETTINGS}
      />
    );
    await waitFor(() => expect(container.querySelectorAll('#content img')).toHaveLength(3));
    expect(ipc.allowImages).toHaveBeenCalledWith(['C:\\docs\\img\\a.png', 'C:\\b.png']);
    const srcs = [...container.querySelectorAll('#content img')].map((img) =>
      img.getAttribute('src')
    );
    expect(srcs).toEqual([
      'asset://C:\\docs\\img\\a.png',
      'asset://C:\\b.png',
      'https://example.com/w.png',
    ]);
  });

  it('画像の許可に失敗しても、本文は出す', async () => {
    vi.mocked(ipc.allowImages).mockRejectedValue(new Error('denied'));
    render(<Reader file={file('# 見出し\n\n![a](a.png)\n')} settings={DEFAULT_SETTINGS} />);
    expect(await screen.findByRole('heading', { name: '見出し' })).toBeTruthy();
  });

  it('ローカルの画像が無ければ、許可を求めずにすぐ出す', () => {
    render(<Reader file={file('# 見出し\n')} settings={DEFAULT_SETTINGS} />);
    expect(screen.getByRole('heading', { name: '見出し' })).toBeTruthy();
    expect(ipc.allowImages).not.toHaveBeenCalled();
  });
});

describe('Reader', () => {
  it('Markdown を HTML にして #content に出す。見出しには GitHub と同じ規則の ID を付ける', () => {
    const { container } = render(
      <Reader file={file('# はじめに\n\n本文')} settings={DEFAULT_SETTINGS} />
    );
    const heading = screen.getByRole('heading', { level: 1, name: 'はじめに' });
    expect(heading.id).toBe('はじめに');
    expect(container.querySelector('#content p')?.textContent).toBe('本文');
  });

  it('front matter は設定の見せ方と、翻訳した見出しの文言で出す', () => {
    const content = '---\ntitle: 設計\ntags: [a, b]\n---\n\n# 本文\n';
    const { container, rerender } = render(
      <Reader file={file(content)} settings={DEFAULT_SETTINGS} />
    );
    const details = container.querySelector('details.yomu-front-matter');
    expect(details?.hasAttribute('open')).toBe(false);
    expect(details?.querySelector('summary')?.textContent).toBe('Front matter (2)');

    rerender(
      <Reader file={file(content)} settings={{ ...DEFAULT_SETTINGS, frontMatter: 'hidden' }} />
    );
    expect(container.querySelector('details.yomu-front-matter')).toBeNull();
  });

  it('生の HTML は決めたタグだけを通し、スクリプトは文字として出す', () => {
    const { container } = render(
      <Reader
        file={file('<details><summary>開く</summary>中身</details>\n\n<script>alert(1)</script>\n')}
        settings={DEFAULT_SETTINGS}
      />
    );
    expect(container.querySelector('#content details summary')?.textContent).toBe('開く');
    expect(container.querySelector('#content script')).toBeNull();
    expect(container.querySelector('#content')?.textContent).toContain('<script>alert(1)</script>');
  });
});
