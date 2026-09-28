import { useCallback, useEffect, useState } from 'react';
import { t } from '../l10n/t';
import {
  onDragDrop,
  onOpenFile,
  readMarkdownFile,
  takePendingFile,
  type MarkdownFile,
  type Unlisten,
} from '../lib/ipc';
import { errorMessage } from './errorMessage';

function App() {
  const [file, setFile] = useState<MarkdownFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // 開けなかった時は、表示中の文書を残してエラーの帯だけを出す
  const open = useCallback(async (path: string) => {
    try {
      setFile(await readMarkdownFile(path));
      setError(null);
    } catch (e) {
      setError(errorMessage(e, t));
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    const unlisteners: Unlisten[] = [];
    const keep = (unlisten: Unlisten) => {
      if (disposed) {
        unlisten();
      } else {
        unlisteners.push(unlisten);
      }
    };

    (async () => {
      keep(
        await onDragDrop((event) => {
          if (event.type === 'enter') {
            setDragging(true);
          } else if (event.type === 'leave') {
            setDragging(false);
          } else if (event.type === 'drop') {
            setDragging(false);
            // 複数をドロップした時は先頭の 1 つだけを開く
            if (event.paths.length > 0) {
              void open(event.paths[0]);
            }
          }
        })
      );
      keep(await onOpenFile((path) => void open(path)));
      if (disposed) {
        return;
      }
      // 購読の準備ができてから、起動時の引数のファイルを取り出す
      const pending = await takePendingFile();
      if (pending && !disposed) {
        await open(pending);
      }
    })();

    return () => {
      disposed = true;
      unlisteners.forEach((unlisten) => unlisten());
    };
  }, [open]);

  return (
    <main className="app">
      {error && (
        <div className="error-bar" role="alert">
          {error}
        </div>
      )}
      {file ? (
        <pre className="source">{file.content}</pre>
      ) : (
        <div className="empty">
          <p>{t('Drop a Markdown file here')}</p>
        </div>
      )}
      {dragging && <div className="drop-overlay">{t('Drop to open')}</div>}
    </main>
  );
}

export default App;
