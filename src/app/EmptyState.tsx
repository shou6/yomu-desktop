import { t } from '../l10n/t';

interface EmptyStateProps {
  /** 最近の文書（新しい順） */
  recent: { path: string; title: string }[];
  onOpenFile: () => void;
  onOpenRecent: (path: string) => void;
}

/** 空の画面に並べる最近の文書の数（要件定義 3.2 節） */
const RECENT_LIMIT = 10;

/** 文書が無い時の画面 */
function EmptyState({ recent, onOpenFile, onOpenRecent }: EmptyStateProps) {
  return (
    <div className="empty">
      <div className="empty-body">
        <button type="button" className="primary-button" onClick={onOpenFile}>
          {t('Open File')}
        </button>
        <p>{t('Drop a Markdown file here')}</p>
        {recent.length > 0 && (
          <section className="empty-recent">
            <h2>{t('Recent Documents')}</h2>
            <ul>
              {recent.slice(0, RECENT_LIMIT).map((item) => (
                <li key={item.path}>
                  <button type="button" title={item.path} onClick={() => onOpenRecent(item.path)}>
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

export default EmptyState;
