import { describe, expect, it } from 'vitest';
import { cycleIndex, findMatches } from './search';

describe('findMatches', () => {
  it('一致する位置をすべて返す。大文字と小文字は区別しない', () => {
    expect(findMatches('Yomu reads yomu. YOMU!', 'yomu')).toEqual([
      { start: 0, end: 4 },
      { start: 11, end: 15 },
      { start: 17, end: 21 },
    ]);
  });

  it('日本語も探せる。重なる一致は数えない', () => {
    expect(findMatches('設計の設計書', '設計')).toEqual([
      { start: 0, end: 2 },
      { start: 3, end: 5 },
    ]);
    expect(findMatches('aaaa', 'aa')).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 4 },
    ]);
  });

  it('空の検索語や、前後の空白だけの検索語では何も返さない', () => {
    expect(findMatches('text', '')).toEqual([]);
    expect(findMatches('text', '   ')).toEqual([]);
  });

  it('正規表現の記号もそのまま文字として探す', () => {
    expect(findMatches('a.b a*b (x)', '(x)')).toEqual([{ start: 8, end: 11 }]);
    expect(findMatches('a.b axb', 'a.b')).toEqual([{ start: 0, end: 3 }]);
  });
});

describe('cycleIndex', () => {
  it('次と前へ移り、端では反対の端へ回る', () => {
    expect(cycleIndex(0, 3, 1)).toBe(1);
    expect(cycleIndex(2, 3, 1)).toBe(0);
    expect(cycleIndex(0, 3, -1)).toBe(2);
    expect(cycleIndex(-1, 3, 1)).toBe(0);
  });

  it('一致が無ければ -1', () => {
    expect(cycleIndex(0, 0, 1)).toBe(-1);
  });
});
