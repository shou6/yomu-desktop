import { describe, expect, it } from 'vitest';
import { createTranslator, resolveLanguage, setLanguage, t } from './t';

describe('resolveLanguage', () => {
  it('auto では OS の言語が日本語なら ja、それ以外は en', () => {
    expect(resolveLanguage('auto', 'ja')).toBe('ja');
    expect(resolveLanguage('auto', 'ja-JP')).toBe('ja');
    expect(resolveLanguage('auto', 'en-US')).toBe('en');
    expect(resolveLanguage('auto', 'fr')).toBe('en');
    expect(resolveLanguage('auto', '')).toBe('en');
  });

  it('en と ja は OS の言語に関わらずそのまま使う', () => {
    expect(resolveLanguage('en', 'ja-JP')).toBe('en');
    expect(resolveLanguage('ja', 'en-US')).toBe('ja');
  });
});

describe('createTranslator', () => {
  const bundle = { 'Open File': 'ファイルを開く', 'Opened {0} of {1}': '{1} 件中 {0} 件を開いた' };

  it('英語の文を鍵にして訳を返す', () => {
    expect(createTranslator(bundle)('Open File')).toBe('ファイルを開く');
  });

  it('訳が無い文と、英語の時は元の文を返す', () => {
    expect(createTranslator(bundle)('Settings')).toBe('Settings');
    expect(createTranslator(undefined)('Open File')).toBe('Open File');
  });

  it('{0} などを引数で置き換える', () => {
    expect(createTranslator(bundle)('Opened {0} of {1}', 3, 12)).toBe('12 件中 3 件を開いた');
    expect(createTranslator(undefined)('Opened {0} of {1}', 'a', 'b')).toBe('Opened a of b');
  });

  it('対応する引数が無い差し込み位置は残す', () => {
    expect(createTranslator(undefined)('Opened {0} of {1}', 3)).toBe('Opened 3 of {1}');
  });
});

describe('setLanguage', () => {
  it('t の言語を、再起動せずに切り替える', () => {
    setLanguage('ja');
    expect(t('Front matter')).toBe('フロントマター');
    setLanguage('en');
    expect(t('Front matter')).toBe('Front matter');
  });
});
