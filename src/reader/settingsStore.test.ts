import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './readerSettings';
import { settingsFromStore, settingsToStore } from './settingsStore';

describe('settingsToStore と settingsFromStore', () => {
  it('設定を実装計画 2.2 節のキー（layout.maxWidth など）の入れ子で保存する', () => {
    const stored = settingsToStore({ ...DEFAULT_SETTINGS, maxWidth: 700, editorCommand: 'code' });
    expect(stored).toEqual({
      theme: 'auto',
      layout: { maxWidth: 700, align: 'center', padding: 32 },
      font: {
        family: DEFAULT_SETTINGS.fontFamily,
        codeFamily: '',
        size: 16,
        lineHeight: 1.8,
      },
      code: { foldLines: 20 },
      frontMatter: 'collapsed',
      focusMode: false,
      customCss: '',
      editor: { command: 'code' },
      language: 'auto',
    });
  });

  it('保存した形から読み直すと元に戻る', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      theme: 'nord' as const,
      fontSize: 18,
      language: 'ja' as const,
    };
    expect(settingsFromStore(settingsToStore(settings))).toEqual(settings);
  });

  it('無い値や壊れた値は既定値に丸める', () => {
    expect(settingsFromStore(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(settingsFromStore('text')).toEqual(DEFAULT_SETTINGS);
    expect(settingsFromStore({ layout: 'wide', font: { size: 999 } })).toEqual(DEFAULT_SETTINGS);
  });
});
