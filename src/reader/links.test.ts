import * as assert from 'node:assert';
import { describe, it } from 'vitest';
import { classifyLink, isMarkdownPath } from './links';

describe('classifyLink', () => {
  it('# で始まるリンクは文書内。ID はデコードする', () => {
    assert.deepStrictEqual(classifyLink('#%E3%81%AF%E3%81%98%E3%82%81%E3%81%AB'), {
      kind: 'fragment',
      id: 'はじめに',
    });
    assert.deepStrictEqual(classifyLink('#getting-started'), {
      kind: 'fragment',
      id: 'getting-started',
    });
  });

  it('http(s) と mailto は外部', () => {
    assert.deepStrictEqual(classifyLink('https://example.com/a?b=1'), {
      kind: 'external',
      href: 'https://example.com/a?b=1',
    });
    assert.deepStrictEqual(classifyLink('http://example.com'), {
      kind: 'external',
      href: 'http://example.com',
    });
    assert.deepStrictEqual(classifyLink('mailto:a@example.com'), {
      kind: 'external',
      href: 'mailto:a@example.com',
    });
  });

  it('相対パスの .md と .markdown は文書。パスとフラグメントに分け、パスはデコードする', () => {
    assert.deepStrictEqual(classifyLink('./other.md'), {
      kind: 'document',
      path: './other.md',
      fragment: undefined,
    });
    assert.deepStrictEqual(classifyLink('../docs/%E8%A8%AD%E8%A8%88.md#%E6%A6%82%E8%A6%81'), {
      kind: 'document',
      path: '../docs/設計.md',
      fragment: '概要',
    });
    assert.deepStrictEqual(classifyLink('notes.MARKDOWN'), {
      kind: 'document',
      path: 'notes.MARKDOWN',
      fragment: undefined,
    });
  });

  it('相対パスのそれ以外のファイルは、OS の既定のアプリで開くファイル。フラグメントは落とす', () => {
    assert.deepStrictEqual(classifyLink('./spec.pdf'), { kind: 'file', path: './spec.pdf' });
    assert.deepStrictEqual(classifyLink('../%E5%9B%B3/a.png#x'), {
      kind: 'file',
      path: '../図/a.png',
    });
    assert.deepStrictEqual(classifyLink('images/'), { kind: 'file', path: 'images/' });
  });

  it('それ以外のスキーム（javascript:、file:、vscode: など）は無視する', () => {
    assert.deepStrictEqual(classifyLink('javascript:alert(1)'), { kind: 'ignore' });
    assert.deepStrictEqual(classifyLink('file:///etc/passwd'), { kind: 'ignore' });
    assert.deepStrictEqual(classifyLink('vscode://settings'), { kind: 'ignore' });
    assert.deepStrictEqual(classifyLink('//example.com/a'), { kind: 'ignore' });
  });

  it('壊れたパーセントエンコードはそのまま使う', () => {
    assert.deepStrictEqual(classifyLink('#100%'), { kind: 'fragment', id: '100%' });
  });
});

describe('isMarkdownPath', () => {
  it('.md と .markdown は Markdown。大文字小文字は問わない', () => {
    assert.strictEqual(isMarkdownPath('./other.md'), true);
    assert.strictEqual(isMarkdownPath('../docs/README.MD'), true);
    assert.strictEqual(isMarkdownPath('notes.markdown'), true);
  });

  it('それ以外は Markdown でない', () => {
    assert.strictEqual(isMarkdownPath('./plain.txt'), false);
    assert.strictEqual(isMarkdownPath('./image.png'), false);
    assert.strictEqual(isMarkdownPath('./md'), false);
  });
});
