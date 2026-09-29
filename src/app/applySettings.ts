import { cssVariables, resolveTheme, type ReaderSettings } from '../reader/readerSettings';

/**
 * 設定を画面に反映する。テーマは body の data-theme、幅や文字は :root の CSS 変数にする。
 * 本文は描き直さない（F-6）
 */
export function applySettings(settings: ReaderSettings, osIsDark: boolean): void {
  document.body.dataset.theme = resolveTheme(settings.theme, osIsDark);
  const style = document.documentElement.style;
  for (const [name, value] of Object.entries(cssVariables(settings))) {
    style.setProperty(name, value);
  }
}
