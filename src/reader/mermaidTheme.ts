/**
 * Yomu のテーマに合わせて mermaid のテーマを選ぶ（純粋関数）。
 */
import type { ResolvedTheme } from './readerSettings';

/** mermaid が持つテーマのうち、使うもの */
export type MermaidTheme = 'default' | 'neutral' | 'dark';

/** @param theme 適用している Yomu のテーマ（auto は解決済み） */
export function mermaidTheme(theme: ResolvedTheme): MermaidTheme {
  switch (theme) {
    case 'sepia':
      return 'neutral';
    case 'dark':
    case 'solarized-dark':
    case 'github-dark':
    case 'nord':
    case 'catppuccin-mocha':
      return 'dark';
    default:
      return 'default';
  }
}

/** mermaid.initialize に渡す設定のうち、Yomu が決めるもの */
export interface MermaidConfig {
  startOnLoad: false;
  /** 図の中のクリック処理と HTML を無効にする */
  securityLevel: 'strict';
  theme: MermaidTheme;
  gantt: {
    /** 描く幅（px）。undefined なら mermaid が枠の幅を読む */
    useWidth: number | undefined;
    fontSize: number;
    sectionFontSize: number;
    barHeight: number;
  };
}

/**
 * @param theme 適用している Yomu のテーマ（auto は解決済み）
 * @param width 図を置く枠の幅（px）。mermaid は画面の外の仮の枠で描くので、そのままでは幅が取れず 1200px で描いてしまう
 */
export function mermaidConfig(theme: ResolvedTheme, width: number): MermaidConfig {
  return {
    startOnLoad: false,
    securityLevel: 'strict',
    theme: mermaidTheme(theme),
    // ガントチャートは既定の文字が 11px と小さい。本文の幅ちょうどで描き、縮めずに表示できるようにする
    gantt: {
      useWidth: width > 0 ? Math.round(width) : undefined,
      fontSize: 14,
      sectionFontSize: 14,
      barHeight: 24,
    },
  };
}
