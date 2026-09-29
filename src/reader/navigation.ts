/**
 * 文書の間の戻る・進むの履歴（純粋関数、F-10）。
 * 戻った時は、離れた時のスクロールの位置に戻すため、位置も一緒に覚える。
 */

export interface NavigationEntry {
  path: string;
  /** その文書を離れた時のスクロールの位置（px） */
  scrollTop: number;
}

export interface Navigation {
  back: NavigationEntry[];
  current: NavigationEntry | null;
  forward: NavigationEntry[];
}

export const EMPTY_NAVIGATION: Navigation = { back: [], current: null, forward: [] };

/**
 * 別の文書を開く。今の文書は離れた時の位置と一緒に戻る先へ積み、進む先は捨てる。
 * 今の文書を開き直した時は履歴を変えない
 */
export function navigate(nav: Navigation, path: string, currentScrollTop: number): Navigation {
  if (nav.current?.path === path) {
    return nav;
  }
  const back = nav.current
    ? [...nav.back, { path: nav.current.path, scrollTop: currentScrollTop }]
    : nav.back;
  return { back, current: { path, scrollTop: 0 }, forward: [] };
}

export function canGoBack(nav: Navigation): boolean {
  return nav.back.length > 0;
}

export function canGoForward(nav: Navigation): boolean {
  return nav.forward.length > 0;
}

/** 1 つ戻る。戻る先が無ければ undefined */
export function goBack(nav: Navigation, currentScrollTop: number): Navigation | undefined {
  const target = nav.back[nav.back.length - 1];
  if (target === undefined || nav.current === null) {
    return undefined;
  }
  return {
    back: nav.back.slice(0, -1),
    current: target,
    forward: [{ path: nav.current.path, scrollTop: currentScrollTop }, ...nav.forward],
  };
}

/** 1 つ進む。進む先が無ければ undefined */
export function goForward(nav: Navigation, currentScrollTop: number): Navigation | undefined {
  const [target, ...rest] = nav.forward;
  if (target === undefined || nav.current === null) {
    return undefined;
  }
  return {
    back: [...nav.back, { path: nav.current.path, scrollTop: currentScrollTop }],
    current: target,
    forward: rest,
  };
}
