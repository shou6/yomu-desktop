import * as assert from 'node:assert';
import { describe, expect, it } from 'vitest';
import {
  HISTORY_LIMIT,
  formatProgress,
  progressFromScroll,
  recentRecords,
  resumeScrollY,
  updateRecord,
  type ReadingRecords,
  removeRecord,
} from './reading';

describe('progressFromScroll', () => {
  it('一番上で 0、一番下で 1、途中は割合', () => {
    assert.strictEqual(progressFromScroll(0, 2000, 800), 0);
    assert.strictEqual(progressFromScroll(1200, 2000, 800), 1);
    assert.strictEqual(progressFromScroll(600, 2000, 800), 0.5);
  });

  it('本文が画面に収まる時は、全部見えているので 1', () => {
    assert.strictEqual(progressFromScroll(0, 500, 800), 1);
  });

  it('0〜1 の外には出ない', () => {
    assert.strictEqual(progressFromScroll(-10, 2000, 800), 0);
    assert.strictEqual(progressFromScroll(5000, 2000, 800), 1);
  });
});

describe('resumeScrollY', () => {
  it('割合から、スクロールする位置を求める', () => {
    assert.strictEqual(resumeScrollY(0.5, 2000, 800), 600);
    assert.strictEqual(resumeScrollY(0, 2000, 800), 0);
    assert.strictEqual(resumeScrollY(1, 2000, 800), 1200);
  });

  it('本文が画面に収まる時は 0', () => {
    assert.strictEqual(resumeScrollY(0.7, 500, 800), 0);
  });
});

describe('formatProgress', () => {
  it('整数の百分率にする', () => {
    assert.strictEqual(formatProgress(0), '0%');
    assert.strictEqual(formatProgress(0.424), '42%');
    assert.strictEqual(formatProgress(0.996), '100%');
  });
});

describe('updateRecord', () => {
  it('文書の記録を足す。既にあれば上書きする', () => {
    let records: ReadingRecords = {};
    records = updateRecord(records, 'file:///a.md', 'a.md', 0.3, 1000);
    assert.deepStrictEqual(records['file:///a.md'], {
      title: 'a.md',
      progress: 0.3,
      lastRead: 1000,
    });
    records = updateRecord(records, 'file:///a.md', 'a.md', 0.6, 2000);
    assert.deepStrictEqual(records['file:///a.md'], {
      title: 'a.md',
      progress: 0.6,
      lastRead: 2000,
    });
  });

  it('元の記録は書き換えない', () => {
    const records: ReadingRecords = {};
    updateRecord(records, 'file:///a.md', 'a.md', 0.3, 1000);
    assert.deepStrictEqual(records, {});
  });

  it('割合は小数 3 桁に丸め、0〜1 に収める', () => {
    const records = updateRecord({}, 'u', 't', 0.123456, 1);
    assert.strictEqual(records.u.progress, 0.123);
    assert.strictEqual(updateRecord({}, 'u', 't', 1.5, 1).u.progress, 1);
  });

  it(`${HISTORY_LIMIT} 件を超えたら、最後に読んだのが古いものから消す`, () => {
    let records: ReadingRecords = {};
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      records = updateRecord(records, 'file:///' + i, String(i), 0, i);
    }
    const uris = Object.keys(records);
    assert.strictEqual(uris.length, HISTORY_LIMIT);
    assert.ok(!uris.includes('file:///0'));
    assert.ok(uris.includes('file:///' + (HISTORY_LIMIT + 4)));
  });
});

describe('recentRecords', () => {
  it('最後に読んだのが新しい順に並べる', () => {
    const records: ReadingRecords = {
      a: { title: 'a', progress: 0, lastRead: 10 },
      b: { title: 'b', progress: 0, lastRead: 30 },
      c: { title: 'c', progress: 0, lastRead: 20 },
    };
    assert.deepStrictEqual(
      recentRecords(records).map((r) => r.uri),
      ['b', 'c', 'a']
    );
  });
});

describe('removeRecord', () => {
  it('指定した文書の記録だけを消した新しい記録を返す', () => {
    const records = {
      'C:/a.md': { title: 'a.md', progress: 0.5, lastRead: 1 },
      'C:/b.md': { title: 'b.md', progress: 1, lastRead: 2 },
    };
    expect(removeRecord(records, 'C:/a.md')).toEqual({
      'C:/b.md': { title: 'b.md', progress: 1, lastRead: 2 },
    });
    expect(Object.keys(records)).toHaveLength(2);
  });
});
