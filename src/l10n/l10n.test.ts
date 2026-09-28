import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractL10nStrings, findUntranslatableCalls } from '../test/l10nStrings';

const ROOT = path.resolve(import.meta.dirname, '../..');

/** 画面のソース。テストとテストの補助は除く */
function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === 'test' ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

function readBundle(): Record<string, unknown> {
  const text = fs.readFileSync(path.join(ROOT, 'src/l10n/ja.json'), 'utf8');
  return JSON.parse(text) as Record<string, unknown>;
}

describe('extractL10nStrings', () => {
  it('翻訳関数 t に渡した文字列リテラルを取り出す', () => {
    const source = [
      "t('Open File')",
      't(\n  "Continue and Don\'t Ask Again"\n)',
      "label: t('It\\'s fine'),",
      "t('Opened {0} of {1}', count, total)",
    ].join('\n');
    expect(extractL10nStrings(source)).toEqual([
      'Open File',
      "Continue and Don't Ask Again",
      "It's fine",
      'Opened {0} of {1}',
    ]);
  });

  it('t で終わる別の関数や、プロパティの呼び出し、t 自体の定義は拾わない', () => {
    const source =
      "format('x'); assert('y'); obj.emit('z'); result.split('w'); obj.t('v'); export function t(text: string) {}";
    expect(extractL10nStrings(source)).toEqual([]);
    expect(findUntranslatableCalls(source)).toEqual([]);
  });

  it('重複は 1 つにまとめる', () => {
    expect(extractL10nStrings("t('A'); t('A'); t('B')")).toEqual(['A', 'B']);
  });
});

describe('findUntranslatableCalls', () => {
  it('文字列を + でつないだものや、テンプレートリテラルを渡している呼び出しを見つける', () => {
    expect(findUntranslatableCalls("t('Opened ' + count); t('ok'); t(`template`);")).toHaveLength(
      2
    );
  });

  it('単一の文字列リテラルだけなら空', () => {
    expect(findUntranslatableCalls("t('a', x); t(\n'b'\n)")).toEqual([]);
  });
});

describe('日本語の翻訳', () => {
  const files = sourceFiles(path.join(ROOT, 'src'));
  const sources = files.map((file) => fs.readFileSync(file, 'utf8'));

  it('翻訳関数には単一の文字列リテラルだけを渡している', () => {
    const bad = files.flatMap((file, i) =>
      findUntranslatableCalls(sources[i]).map((call) => `${path.basename(file)}: ${call}`)
    );
    expect(bad).toEqual([]);
  });

  it('ソース中の翻訳対象の文字列すべてに、日本語訳がある', () => {
    const bundle = readBundle();
    const strings = [...new Set(sources.flatMap(extractL10nStrings))];
    expect(strings.length, '翻訳対象の文字列を 1 つも抽出できない').toBeGreaterThan(0);
    expect(strings.filter((s) => typeof bundle[s] !== 'string' || bundle[s] === '')).toEqual([]);
  });

  it('翻訳ファイルに、もう使われていない文字列が残っていない', () => {
    const bundle = readBundle();
    const strings = new Set(sources.flatMap(extractL10nStrings));
    expect(Object.keys(bundle).filter((key) => !strings.has(key))).toEqual([]);
  });

  it('翻訳しても {0} などの差し込み位置が失われていない', () => {
    const placeholders = (text: string): string[] => (text.match(/\{\d+\}/g) ?? []).sort();
    for (const [english, japanese] of Object.entries(readBundle())) {
      expect(placeholders(String(japanese)), english).toEqual(placeholders(english));
    }
  });
});
