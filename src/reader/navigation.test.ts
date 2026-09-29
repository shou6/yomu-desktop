import { describe, expect, it } from 'vitest';
import {
  EMPTY_NAVIGATION,
  canGoBack,
  canGoForward,
  goBack,
  goForward,
  navigate,
} from './navigation';

describe('navigation', () => {
  it('最初に開いた文書には戻る先も進む先も無い', () => {
    const nav = navigate(EMPTY_NAVIGATION, 'a.md', 0);
    expect(nav.current).toEqual({ path: 'a.md', scrollTop: 0 });
    expect(canGoBack(nav)).toBe(false);
    expect(canGoForward(nav)).toBe(false);
  });

  it('別の文書を開くと、離れた時のスクロールの位置を覚えて戻れる', () => {
    let nav = navigate(EMPTY_NAVIGATION, 'a.md', 0);
    nav = navigate(nav, 'b.md', 120);
    expect(canGoBack(nav)).toBe(true);
    const back = goBack(nav, 40);
    expect(back?.current).toEqual({ path: 'a.md', scrollTop: 120 });
    expect(back && canGoForward(back)).toBe(true);
    const forward = back && goForward(back, 10);
    expect(forward?.current).toEqual({ path: 'b.md', scrollTop: 40 });
  });

  it('戻った後に別の文書を開くと、進む先は捨てる', () => {
    let nav = navigate(EMPTY_NAVIGATION, 'a.md', 0);
    nav = navigate(nav, 'b.md', 0);
    nav = goBack(nav, 0) ?? nav;
    nav = navigate(nav, 'c.md', 0);
    expect(canGoForward(nav)).toBe(false);
    expect(nav.back.map((entry) => entry.path)).toEqual(['a.md']);
  });

  it('今の文書を開き直しても、履歴は増やさない', () => {
    let nav = navigate(EMPTY_NAVIGATION, 'a.md', 0);
    nav = navigate(nav, 'a.md', 50);
    expect(canGoBack(nav)).toBe(false);
  });

  it('戻る先や進む先が無ければ undefined', () => {
    const nav = navigate(EMPTY_NAVIGATION, 'a.md', 0);
    expect(goBack(nav, 0)).toBeUndefined();
    expect(goForward(nav, 0)).toBeUndefined();
  });
});
