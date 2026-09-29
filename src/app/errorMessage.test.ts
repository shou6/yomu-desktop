import { describe, expect, it } from 'vitest';
import { errorMessage } from './errorMessage';

const t = (text: string, ...args: (string | number)[]) =>
  text.replace(/\{(\d+)\}/g, (_, index: string) => String(args[Number(index)]));

describe('errorMessage', () => {
  it('エラーの種類ごとに、ファイル名を入れた文を返す', () => {
    const path = 'C:/docs/設計.md';
    expect(errorMessage({ kind: 'not_found', path }, t)).toBe('File not found: 設計.md');
    expect(errorMessage({ kind: 'too_large', path }, t)).toBe(
      'File is larger than 10 MiB: 設計.md'
    );
    expect(errorMessage({ kind: 'not_utf8', path }, t)).toBe('File is not UTF-8 text: 設計.md');
    expect(errorMessage({ kind: 'io', path }, t)).toBe('Could not read the file: 設計.md');
    expect(errorMessage({ kind: 'editor_failed', path }, t)).toBe(
      'Could not start the editor: 設計.md'
    );
  });

  it('拡張子が違う時は、開けるファイルの種類を知らせる', () => {
    expect(errorMessage({ kind: 'unsupported_type', path: 'C:\\docs\\a.txt' }, t)).toBe(
      'Only .md and .markdown files can be opened: a.txt'
    );
  });

  it('Rust のエラー以外（想定外の例外）は、読めなかった旨にまとめる', () => {
    expect(errorMessage(new Error('boom'), t)).toBe('Could not read the file: boom');
  });
});
describe('errorMessage: 開く操作', () => {
  it('プログラムやスクリプトは開かない旨を知らせる', () => {
    expect(errorMessage({ kind: 'blocked', path: 'C:/docs/setup.exe' }, t)).toBe(
      'Programs and scripts are not opened from links: setup.exe'
    );
  });

  it('OS の既定のアプリで開けなかった旨を知らせる', () => {
    expect(errorMessage({ kind: 'open_failed', path: 'C:/docs/a.pdf' }, t)).toBe(
      'Could not open the file: a.pdf'
    );
  });
});
