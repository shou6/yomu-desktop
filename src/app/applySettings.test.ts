import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../reader/readerSettings';
import { applySettings } from './applySettings';

afterEach(() => {
  delete document.body.dataset.theme;
  document.documentElement.removeAttribute('style');
});

describe('applySettings', () => {
  it('テーマを body の data-theme に付ける。auto は OS の明暗で決める', () => {
    applySettings(DEFAULT_SETTINGS, false);
    expect(document.body.dataset.theme).toBe('paper');
    applySettings(DEFAULT_SETTINGS, true);
    expect(document.body.dataset.theme).toBe('dark');
    applySettings({ ...DEFAULT_SETTINGS, theme: 'nord' }, false);
    expect(document.body.dataset.theme).toBe('nord');
  });

  it('幅や文字の設定を :root の CSS 変数にする', () => {
    applySettings({ ...DEFAULT_SETTINGS, maxWidth: 700, fontSize: 18 }, false);
    const style = document.documentElement.style;
    expect(style.getPropertyValue('--yomu-max-width')).toBe('700px');
    expect(style.getPropertyValue('--yomu-font-size')).toBe('18px');
    expect(style.getPropertyValue('--yomu-margin-left')).toBe('auto');
  });
});
