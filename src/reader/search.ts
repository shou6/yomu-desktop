/** ページ内検索の一致位置（純粋関数、F-18） */

export interface TextMatch {
  start: number;
  end: number;
}

/**
 * text の中で query に一致する位置を、重ならないように前から順に返す。大文字と小文字は区別しない。
 * 検索語は正規表現ではなく、文字としてそのまま探す
 */
export function findMatches(text: string, query: string): TextMatch[] {
  if (query.trim() === '') {
    return [];
  }
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  const matches: TextMatch[] = [];
  let from = 0;
  for (;;) {
    const start = haystack.indexOf(needle, from);
    if (start === -1) {
      return matches;
    }
    matches.push({ start, end: start + needle.length });
    from = start + needle.length;
  }
}

/** 次（step = 1）か前（step = -1）の一致の番号。端では反対の端へ回る。一致が無ければ -1 */
export function cycleIndex(current: number, count: number, step: 1 | -1): number {
  if (count === 0) {
    return -1;
  }
  if (current < 0) {
    return step === 1 ? 0 : count - 1;
  }
  return (current + step + count) % count;
}
