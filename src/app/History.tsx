import { t } from '../l10n/t';
import { formatProgress } from '../reader/reading';
import { Icon } from './icons';

export interface HistoryItem {
  path: string;
  title: string;
  progress: number;
  lastRead: number;
  /** ファイルが無くなった */
  missing: boolean;
}

interface HistoryProps {
  /** 新しい順 */
  items: HistoryItem[];
  onOpen: (path: string) => void;
  onRemove: (path: string) => void;
}

/** 最後まで読んだとみなす割合 */
const FINISHED = 0.995;

/** 読書の記録（F-11）。最近の文書を新しい順に、割合付きで並べる */
function History({ items, onOpen, onRemove }: HistoryProps) {
  if (items.length === 0) {
    return <p className="panel-empty">{t('No reading history yet.')}</p>;
  }
  return (
    <ul className="history">
      {items.map((item) => {
        const finished = item.progress >= FINISHED;
        const classes = ['history-item', finished && 'finished', item.missing && 'missing']
          .filter(Boolean)
          .join(' ');
        return (
          <li key={item.path} className={classes}>
            <button
              type="button"
              className="history-open"
              title={item.missing ? t('File not found: {0}', item.path) : item.path}
              disabled={item.missing}
              onClick={() => onOpen(item.path)}
            >
              <span className="history-title">{item.title}</span>
              <span className="history-progress">
                {finished ? t('Finished') : formatProgress(item.progress)}
              </span>
            </button>
            {item.missing && (
              <button
                type="button"
                className="history-remove"
                aria-label={t('Remove from history')}
                title={t('Remove from history')}
                onClick={() => onRemove(item.path)}
              >
                <Icon name="close" />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default History;
