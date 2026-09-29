import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useOsDark } from './useOsDark';

/** prefers-color-scheme: dark の結果を切り替えられる matchMedia の代わり */
function mockMatchMedia(initial: boolean) {
  let listener: ((event: MediaQueryListEvent) => void) | undefined;
  const query = {
    matches: initial,
    addEventListener: (_: string, handler: (event: MediaQueryListEvent) => void) => {
      listener = handler;
    },
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query)
  );
  return {
    change(matches: boolean) {
      query.matches = matches;
      listener?.({ matches } as MediaQueryListEvent);
    },
    query,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useOsDark', () => {
  it('OS の明暗を返し、起動中に変わったら追従する', () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useOsDark());
    expect(result.current).toBe(false);
    act(() => media.change(true));
    expect(result.current).toBe(true);
  });

  it('外れる時に購読をやめる', () => {
    const media = mockMatchMedia(true);
    const { result, unmount } = renderHook(() => useOsDark());
    expect(result.current).toBe(true);
    unmount();
    expect(media.query.removeEventListener).toHaveBeenCalled();
  });

  it('matchMedia が無い環境ではライトとみなす', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useOsDark());
    expect(result.current).toBe(false);
  });
});
