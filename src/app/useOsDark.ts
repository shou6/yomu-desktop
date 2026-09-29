import { useEffect, useState } from 'react';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function query(): MediaQueryList | undefined {
  return typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : undefined;
}

/** OS がダークモードか。起動中に切り替わったら追従する。判定できない環境ではライトとみなす */
export function useOsDark(): boolean {
  const [dark, setDark] = useState(() => query()?.matches ?? false);

  useEffect(() => {
    const media = query();
    if (media === undefined) {
      return;
    }
    const onChange = (event: MediaQueryListEvent) => setDark(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  return dark;
}
