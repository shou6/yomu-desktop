/**
 * 設定を settings.json に保存する形（実装計画 2.2 節のキーの入れ子）と、画面で使う形の間で変換する（純粋関数）。
 * 読む時は normalizeSettings を通し、範囲外や壊れた値を既定値に丸める。
 */
import { normalizeSettings, type RawSettings, type ReaderSettings } from './readerSettings';

export interface StoredSettings {
  theme: string;
  layout: { maxWidth: number; align: string; padding: number };
  font: { family: string; codeFamily: string; size: number; lineHeight: number };
  code: { foldLines: number };
  frontMatter: string;
  focusMode: boolean;
  customCss: string;
  editor: { command: string };
  language: string;
}

export function settingsToStore(settings: ReaderSettings): StoredSettings {
  return {
    theme: settings.theme,
    layout: { maxWidth: settings.maxWidth, align: settings.align, padding: settings.padding },
    font: {
      family: settings.fontFamily,
      codeFamily: settings.codeFontFamily,
      size: settings.fontSize,
      lineHeight: settings.lineHeight,
    },
    code: { foldLines: settings.foldLines },
    frontMatter: settings.frontMatter,
    focusMode: settings.focusMode,
    customCss: settings.customCss,
    editor: { command: settings.editorCommand },
    language: settings.language,
  };
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function settingsFromStore(stored: unknown): ReaderSettings {
  const root = record(stored);
  const layout = record(root.layout);
  const font = record(root.font);
  const code = record(root.code);
  const editor = record(root.editor);
  const raw: RawSettings = {
    theme: root.theme,
    maxWidth: layout.maxWidth,
    align: layout.align,
    padding: layout.padding,
    fontFamily: font.family,
    codeFontFamily: font.codeFamily,
    fontSize: font.size,
    lineHeight: font.lineHeight,
    foldLines: code.foldLines,
    frontMatter: root.frontMatter,
    focusMode: root.focusMode,
    customCss: root.customCss,
    editorCommand: editor.command,
    language: root.language,
  };
  return normalizeSettings(raw);
}
