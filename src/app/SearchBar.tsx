import { useEffect, useRef } from 'react';
import { t } from '../l10n/t';
import { Icon } from './icons';

export interface SearchBarProps {
  query: string;
  /** 一致の件数 */
  count: number;
  /** 今の一致の番号（0 始まり）。一致が無ければ -1 */
  current: number;
  onQuery: (query: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onClose: () => void;
}

/** ページ内検索のバー（F-18）。本文の右上に重ねて出す */
function SearchBar({
  query,
  count,
  current,
  onQuery,
  onNext,
  onPrevious,
  onClose,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div className="search-bar">
      <input
        ref={inputRef}
        type="search"
        aria-label={t('Find')}
        placeholder={t('Find')}
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) {
              onPrevious();
            } else {
              onNext();
            }
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
      />
      <span className="search-count" aria-live="polite">
        {query.trim() === '' ? '' : count === 0 ? t('No results') : `${current + 1}/${count}`}
      </span>
      <button
        type="button"
        className="tool-button"
        aria-label={t('Close')}
        title={t('Close')}
        onClick={onClose}
      >
        <Icon name="close" />
      </button>
    </div>
  );
}

export default SearchBar;
