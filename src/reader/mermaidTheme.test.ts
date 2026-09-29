import * as assert from 'node:assert';
import { describe, it } from 'vitest';
import { mermaidConfig, mermaidTheme } from './mermaidTheme';

describe('mermaidTheme', () => {
  it('Yomu のテーマごとに mermaid のテーマを選ぶ', () => {
    assert.strictEqual(mermaidTheme('paper'), 'default');
    assert.strictEqual(mermaidTheme('sepia'), 'neutral');
    assert.strictEqual(mermaidTheme('dark'), 'dark');
  });

  it('追加のテーマは、ダーク系なら dark、ライト系なら default', () => {
    for (const theme of ['solarized-dark', 'github-dark', 'nord', 'catppuccin-mocha'] as const) {
      assert.strictEqual(mermaidTheme(theme), 'dark', theme);
    }
    for (const theme of ['solarized-light', 'github-light', 'catppuccin-latte'] as const) {
      assert.strictEqual(mermaidTheme(theme), 'default', theme);
    }
  });
});

describe('mermaidConfig', () => {
  it('スクリプトの実行を許さず、テーマを渡す', () => {
    const config = mermaidConfig('dark', 760);
    assert.strictEqual(config.startOnLoad, false);
    assert.strictEqual(config.securityLevel, 'strict');
    assert.strictEqual(config.theme, 'dark');
  });

  it('ガントチャートは本文の幅ちょうどで描き、文字を読める大きさにする', () => {
    // mermaid は描く枠の幅を読み、取れないと 1200px で描く。本文の幅に縮めて表示すると 11px の文字が 7px 前後になる
    const { gantt } = mermaidConfig('paper', 760);
    assert.strictEqual(gantt.useWidth, 760);
    assert.ok(gantt.fontSize >= 13, String(gantt.fontSize));
    assert.ok(gantt.sectionFontSize >= 13, String(gantt.sectionFontSize));
    assert.ok(gantt.barHeight >= 24, String(gantt.barHeight));
  });

  it('幅が取れない時（0 以下）は、ガントチャートの幅を指定しない', () => {
    assert.strictEqual(mermaidConfig('paper', 0).gantt.useWidth, undefined);
  });
});
