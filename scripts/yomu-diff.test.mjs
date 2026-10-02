import { describe, expect, it } from 'vitest';
import { buildReport, mapToDesktop } from './yomu-diff.mjs';

/** 渡したパスだけがあることにする */
const existsIn = (...paths) => {
  const set = new Set(paths);
  return (path) => set.has(path);
};

describe('mapToDesktop', () => {
  it('src/reader のファイルは src/reader か src/content の同名のファイルに対応させる', () => {
    const exists = existsIn('src/reader/render.ts', 'src/content/search.ts');
    expect(mapToDesktop('src/reader/render.ts', exists)).toBe('src/reader/render.ts');
    expect(mapToDesktop('src/reader/search.ts', exists)).toBe('src/content/search.ts');
  });

  it('単体テストは、同名のテストがあるディレクトリに対応させる', () => {
    const exists = existsIn(
      'src/reader/render.test.ts',
      'src/content/zoom.test.ts',
      'src/styles/styles.test.ts',
      'src/l10n/l10n.test.ts'
    );
    expect(mapToDesktop('src/test/unit/render.test.ts', exists)).toBe('src/reader/render.test.ts');
    expect(mapToDesktop('src/test/unit/zoom.test.ts', exists)).toBe('src/content/zoom.test.ts');
    expect(mapToDesktop('src/test/unit/styles.test.ts', exists)).toBe('src/styles/styles.test.ts');
    expect(mapToDesktop('src/test/unit/l10n.test.ts', exists)).toBe('src/l10n/l10n.test.ts');
  });

  it('media の CSS とテーマは src/styles に対応させる', () => {
    const exists = existsIn('src/styles/reader.css', 'src/styles/themes/nord.css');
    expect(mapToDesktop('media/reader.css', exists)).toBe('src/styles/reader.css');
    expect(mapToDesktop('media/themes/nord.css', exists)).toBe('src/styles/themes/nord.css');
  });

  it('日本語訳とフォントを対応させる', () => {
    const exists = existsIn('src/l10n/ja.json', 'src/assets/fonts/NotoSansJP-VF.woff2');
    expect(mapToDesktop('l10n/bundle.l10n.ja.json', exists)).toBe('src/l10n/ja.json');
    expect(mapToDesktop('fonts/NotoSansJP-VF.woff2', exists)).toBe(
      'src/assets/fonts/NotoSansJP-VF.woff2'
    );
  });

  it('対応するファイルが無ければ undefined', () => {
    const exists = existsIn('src/reader/render.ts');
    expect(mapToDesktop('src/reader/readerProvider.ts', exists)).toBeUndefined();
    expect(mapToDesktop('media/themes/vscode.css', exists)).toBeUndefined();
    expect(mapToDesktop('src/extension.ts', exists)).toBeUndefined();
    expect(mapToDesktop('package.json', exists)).toBeUndefined();
  });
});

describe('buildReport', () => {
  const exists = existsIn('src/reader/htmlAllowlist.ts', 'src/reader/render.test.ts');

  it('共有しているファイルを、対応するこちらのパスと並べる', () => {
    const report = buildReport({
      base: 'v0.3.1',
      head: 'v0.4.0',
      files: [
        { filename: 'CHANGELOG.md', status: 'modified', additions: 6, deletions: 0 },
        {
          filename: 'src/reader/htmlAllowlist.ts',
          status: 'modified',
          additions: 92,
          deletions: 12,
        },
        {
          filename: 'src/test/unit/render.test.ts',
          status: 'modified',
          additions: 68,
          deletions: 4,
        },
      ],
      exists,
    });
    expect(report).toBe(
      [
        'Yomu v0.3.1 -> v0.4.0',
        'https://github.com/shou6/yomu/compare/v0.3.1...v0.4.0',
        '',
        'Shared files:',
        '  modified  src/reader/htmlAllowlist.ts (+92 -12) -> src/reader/htmlAllowlist.ts',
        '  modified  src/test/unit/render.test.ts (+68 -4) -> src/reader/render.test.ts',
      ].join('\n')
    );
  });

  it('共有する範囲に新しく足されたファイルは、対応先なしとして別に並べる', () => {
    const report = buildReport({
      base: 'v0.4.0',
      head: 'v0.5.0',
      files: [
        { filename: 'src/reader/table.ts', status: 'added', additions: 10, deletions: 0 },
        { filename: 'src/test/unit/table.test.ts', status: 'added', additions: 5, deletions: 0 },
        { filename: 'media/table.css', status: 'added', additions: 3, deletions: 0 },
        {
          filename: 'src/reader/readerProvider.ts',
          status: 'modified',
          additions: 1,
          deletions: 1,
        },
        { filename: 'src/extension.ts', status: 'added', additions: 1, deletions: 0 },
      ],
      exists,
    });
    expect(report).toBe(
      [
        'Yomu v0.4.0 -> v0.5.0',
        'https://github.com/shou6/yomu/compare/v0.4.0...v0.5.0',
        '',
        'Shared files:',
        '  (none)',
        '',
        'New upstream files without a counterpart:',
        '  added     src/reader/table.ts (+10 -0)',
        '  added     src/test/unit/table.test.ts (+5 -0)',
        '  added     media/table.css (+3 -0)',
      ].join('\n')
    );
  });
});
