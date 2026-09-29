import * as assert from 'node:assert';
import { describe, it } from 'vitest';
import { countLines, shouldFold } from './fold';

describe('countLines', () => {
  it('末尾の改行は数えない', () => {
    assert.strictEqual(countLines('a\nb\n'), 2);
    assert.strictEqual(countLines('a\nb'), 2);
    assert.strictEqual(countLines('a'), 1);
  });

  it('空なら 0', () => {
    assert.strictEqual(countLines(''), 0);
    assert.strictEqual(countLines('\n'), 1);
  });

  it('Windows の改行も 1 行と数える', () => {
    assert.strictEqual(countLines('a\r\nb\r\n'), 2);
  });
});

describe('shouldFold', () => {
  it('設定の行数より長い時だけ畳む', () => {
    assert.strictEqual(shouldFold(21, 20), true);
    assert.strictEqual(shouldFold(20, 20), false);
    assert.strictEqual(shouldFold(3, 20), false);
  });

  it('設定が 0 なら畳まない', () => {
    assert.strictEqual(shouldFold(1000, 0), false);
  });
});
