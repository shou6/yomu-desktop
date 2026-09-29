import ja from './ja.json';

/** 設定 `language` の値 */
export const LANGUAGE_SETTINGS = ['auto', 'en', 'ja'] as const;
export type LanguageSetting = (typeof LANGUAGE_SETTINGS)[number];
export type Language = 'en' | 'ja';
export type Translator = (text: string, ...args: (string | number)[]) => string;

/** `auto` は OS の言語（`navigator.language`）が日本語なら ja、それ以外は en にする */
export function resolveLanguage(setting: LanguageSetting, osLanguage: string): Language {
  if (setting !== 'auto') {
    return setting;
  }
  return /^ja\b/i.test(osLanguage) ? 'ja' : 'en';
}

/**
 * 英語の文を鍵にした翻訳関数を作る。訳が無ければ英語の文をそのまま使う。
 * `{0}` などは引数で置き換え、対応する引数が無ければ残す。
 */
export function createTranslator(bundle: Record<string, string> | undefined): Translator {
  return (text, ...args) => {
    const translated = bundle?.[text] || text;
    return translated.replace(/\{(\d+)\}/g, (placeholder, index: string) => {
      const arg = args[Number(index)];
      return arg === undefined ? placeholder : String(arg);
    });
  };
}

const bundles: Record<Language, Record<string, string> | undefined> = { en: undefined, ja };

const current = createTranslator(bundles[resolveLanguage('auto', navigator.language)]);

/** 画面の文字列を訳す。第 1 引数は単一の文字列リテラルにする（訳の抜けをテストで検出するため） */
export function t(text: string, ...args: (string | number)[]): string {
  return current(text, ...args);
}
