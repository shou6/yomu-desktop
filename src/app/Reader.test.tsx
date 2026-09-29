import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../reader/readerSettings';
import Reader from './Reader';

afterEach(cleanup);

function file(content: string) {
  return { path: 'C:/docs/a.md', content, baseDir: 'C:/docs' };
}

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
