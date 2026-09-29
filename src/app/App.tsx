import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { resolveLanguage, setLanguage, t } from '../l10n/t';
import {
  isMac,
  loadStore,
  onDragDrop,
  onFileChanged,
  onOpenFile,
  openFileDialog,
  openInEditor,
  openPath,
  openUrl,
  pathsExist,
  readMarkdownFile,
  saveStore,
  setWindowTitle,
  takePendingFile,
  type MarkdownFile,
  type Unlisten,
} from '../lib/ipc';
import { resolveImagePath } from '../reader/imagePath';
import { classifyLink } from '../reader/links';
import {
  EMPTY_NAVIGATION,
  canGoBack,
  canGoForward,
  goBack,
  goForward,
  navigate,
  type Navigation,
} from '../reader/navigation';
import { currentHeadingIndex, extractHeadings } from '../reader/outline';
import { DEFAULT_SETTINGS, resolveTheme, type ReaderSettings } from '../reader/readerSettings';
import {
  progressFromScroll,
  recentRecords,
  removeRecord,
  resumeScrollY,
  updateRecord,
  type ReadingRecords,
} from '../reader/reading';
import { settingsFromStore, settingsToStore } from '../reader/settingsStore';
import { readingLine } from '../reader/sourceLine';
import { applySettings } from './applySettings';
import EmptyState from './EmptyState';
import { errorMessage } from './errorMessage';
import History from './History';
import { Icon } from './icons';
import Outline from './Outline';
import Reader from './Reader';
import SettingsDialog from './SettingsDialog';
import { shortcutAction } from './shortcuts';
import Toolbar from './Toolbar';
import {
  DEFAULT_UI_STATE,
  clampSidePanelWidth,
  normalizeUiState,
  type SidePanelTab,
  type UiState,
} from './uiState';
import { useOsDark } from './useOsDark';

/** 本文を差し込んだ後に合わせるスクロールの位置 */
type ScrollTarget =
  | { kind: 'top' }
  | { kind: 'position'; scrollTop: number }
  | { kind: 'progress'; progress: number }
  | { kind: 'fragment'; id: string };

interface OpenOptions {
  /** 戻る・進むで開く時の、移った後の履歴 */
  navigation?: Navigation;
  /** 開いた後に移る見出しの ID */
  fragment?: string;
  /** 保存されて読み直す時。スクロールの位置を保つ */
  reload?: boolean;
}

/** 今読んでいる見出しと行の基準。画面の上から 2 割（F-9、F-12） */
const READING_LINE = 0.2;
/** 読書の記録を保存するまで待つ時間 */
const SAVE_DELAY = 800;

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function App() {
  const mac = useMemo(() => isMac(), []);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [ui, setUi] = useState<UiState>(DEFAULT_UI_STATE);
  const [records, setRecords] = useState<ReadingRecords>({});
  const [storesLoaded, setStoresLoaded] = useState(false);
  const [file, setFile] = useState<MarkdownFile | null>(null);
  const [nav, setNav] = useState<Navigation>(EMPTY_NAVIGATION);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [headingIndex, setHeadingIndex] = useState(-1);
  const [missing, setMissing] = useState<ReadonlySet<string>>(new Set());

  const osIsDark = useOsDark();
  const theme = resolveTheme(settings.theme, osIsDark);
  // 描画より先に言語を切り替える。t はこの後の呼び出しから新しい言語で訳す（F-20）
  setLanguage(resolveLanguage(settings.language, navigator.language));

  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollTarget = useRef<ScrollTarget | null>(null);
  const fileRef = useRef(file);
  const navRef = useRef(nav);
  const recordsRef = useRef(records);
  useEffect(() => {
    fileRef.current = file;
    navRef.current = nav;
    recordsRef.current = records;
  });

  useEffect(() => {
    applySettings(settings, osIsDark);
  }, [settings, osIsDark]);

  useEffect(() => {
    void setWindowTitle(file ? `${fileName(file.path)} - Yomu` : 'Yomu');
  }, [file]);

  // 開けなかった時は、表示中の文書を残してエラーの帯だけを出す（F-1）
  const open = useCallback(async (path: string, options: OpenOptions = {}) => {
    let loaded: MarkdownFile;
    try {
      loaded = await readMarkdownFile(path);
    } catch (e) {
      setError(errorMessage(e, t));
      return;
    }
    const record = recordsRef.current[loaded.path];
    if (options.reload) {
      scrollTarget.current = null;
    } else if (options.navigation) {
      setNav(options.navigation);
      navRef.current = options.navigation;
      scrollTarget.current = {
        kind: 'position',
        scrollTop: options.navigation.current?.scrollTop ?? 0,
      };
    } else {
      const next = navigate(navRef.current, loaded.path, scrollerRef.current?.scrollTop ?? 0);
      setNav(next);
      navRef.current = next;
      scrollTarget.current = options.fragment
        ? { kind: 'fragment', id: options.fragment }
        : record
          ? { kind: 'progress', progress: record.progress }
          : { kind: 'top' };
    }
    fileRef.current = loaded;
    setFile(loaded);
    setError(null);
    setNotice(null);
    setRecords((current) =>
      updateRecord(
        current,
        loaded.path,
        fileName(loaded.path),
        current[loaded.path]?.progress ?? 0,
        Date.now()
      )
    );
  }, []);

  const scrollToId = useCallback((id: string) => {
    const scroller = scrollerRef.current;
    const target = document.getElementById(id);
    if (scroller === null || target === null) {
      return;
    }
    scroller.scrollTop += target.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
  }, []);

  /** スクロールの位置から、読んだ割合と今読んでいる見出しを求め、記録を更新する */
  const updateReading = useCallback(() => {
    const scroller = scrollerRef.current;
    const current = fileRef.current;
    if (scroller === null || current === null) {
      return;
    }
    const next = progressFromScroll(
      scroller.scrollTop,
      scroller.scrollHeight,
      scroller.clientHeight
    );
    setProgress(next);
    const top = scroller.getBoundingClientRect().top;
    const headings = [...scroller.querySelectorAll('#content :is(h1, h2, h3, h4, h5, h6)[id]')];
    setHeadingIndex(
      currentHeadingIndex(
        headings.map((heading) => heading.getBoundingClientRect().top - top),
        scroller.clientHeight * READING_LINE
      )
    );
    setRecords((records) =>
      updateRecord(records, current.path, fileName(current.path), next, Date.now())
    );
  }, []);

  const onShown = useCallback(() => {
    const scroller = scrollerRef.current;
    const target = scrollTarget.current;
    scrollTarget.current = null;
    if (scroller !== null && target !== null) {
      if (target.kind === 'top') {
        scroller.scrollTop = 0;
      } else if (target.kind === 'position') {
        scroller.scrollTop = target.scrollTop;
      } else if (target.kind === 'progress') {
        scroller.scrollTop = resumeScrollY(
          target.progress,
          scroller.scrollHeight,
          scroller.clientHeight
        );
      } else {
        scrollToId(target.id);
      }
    }
    updateReading();
  }, [scrollToId, updateReading]);

  const back = useCallback(() => {
    const next = goBack(navRef.current, scrollerRef.current?.scrollTop ?? 0);
    if (next?.current) {
      void open(next.current.path, { navigation: next });
    }
  }, [open]);

  const forward = useCallback(() => {
    const next = goForward(navRef.current, scrollerRef.current?.scrollTop ?? 0);
    if (next?.current) {
      void open(next.current.path, { navigation: next });
    }
  }, [open]);

  const openWithDialog = useCallback(async () => {
    const path = await openFileDialog({ title: t('Open File'), filterName: t('Markdown') });
    if (path !== null) {
      await open(path);
    }
  }, [open]);

  /** 今読んでいる行（1 始まり）。一番上にいる時は 1 行目（F-12） */
  const readingLineNumber = useCallback((): number => {
    const scroller = scrollerRef.current;
    if (scroller === null || scroller.scrollTop === 0) {
      return 1;
    }
    const threshold = scroller.getBoundingClientRect().top + scroller.clientHeight * READING_LINE;
    const blocks = [...scroller.querySelectorAll<HTMLElement>('#content [data-line]')].map(
      (element) => {
        const rect = element.getBoundingClientRect();
        return { line: Number(element.dataset.line), top: rect.top, bottom: rect.bottom };
      }
    );
    return readingLine(blocks, threshold) + 1;
  }, []);

  const editCurrent = useCallback(() => {
    const current = fileRef.current;
    if (current === null) {
      return;
    }
    openInEditor(current.path, readingLineNumber(), settings.editorCommand).catch((e: unknown) =>
      setError(errorMessage(e, t))
    );
  }, [readingLineNumber, settings.editorCommand]);

  const showPanel = useCallback((tab: SidePanelTab) => {
    setUi((current) =>
      current.sidePanelOpen && current.sidePanelTab === tab
        ? { ...current, sidePanelOpen: false }
        : { ...current, sidePanelOpen: true, sidePanelTab: tab }
    );
  }, []);

  const onLinkClick = useCallback(
    (href: string) => {
      const current = fileRef.current;
      const link = classifyLink(href);
      if (link.kind === 'fragment') {
        scrollToId(link.id);
      } else if (link.kind === 'external') {
        openUrl(link.href).catch((e: unknown) => setError(errorMessage(e, t)));
      } else if (current !== null && (link.kind === 'document' || link.kind === 'file')) {
        // 文書からの相対パスを、画像と同じ規則で絶対パスにする
        const path = resolveImagePath(current.baseDir, link.path);
        if (path === undefined) {
          return;
        }
        if (link.kind === 'document') {
          void open(path, { fragment: link.fragment });
        } else {
          openPath(path).catch((e: unknown) => setError(errorMessage(e, t)));
        }
      }
    },
    [open, scrollToId]
  );

  // 設定、画面の状態、読書の記録を読み、ファイルを受け取る準備をしてから、起動時の引数のファイルを開く
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
      const [stored, storedUi, storedHistory] = await Promise.all([
        loadStore('settings'),
        loadStore('ui'),
        loadStore('history'),
      ]);
      if (disposed) {
        return;
      }
      setSettings(settingsFromStore(stored.value));
      if (stored.corrupt) {
        setNotice(t('The settings file could not be read. Using the default settings.'));
      }
      setUi(normalizeUiState(storedUi.value));
      if (typeof storedHistory.value === 'object' && storedHistory.value !== null) {
        const history = storedHistory.value as ReadingRecords;
        recordsRef.current = history;
        setRecords(history);
      }
      setStoresLoaded(true);

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
      keep(
        await onFileChanged((change) => {
          if (change.path !== fileRef.current?.path) {
            return;
          }
          if (change.kind === 'modified') {
            void open(change.path, { reload: true });
          } else {
            setNotice(t('The file was deleted. Showing the last loaded content.'));
          }
        })
      );
      if (disposed) {
        return;
      }
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

  // 保存。読み込みが済むまでは保存しない（既定値で上書きしないため）
  useEffect(() => {
    if (storesLoaded) {
      void saveStore('settings', settingsToStore(settings));
    }
  }, [settings, storesLoaded]);

  useEffect(() => {
    if (storesLoaded) {
      void saveStore('ui', ui);
    }
  }, [ui, storesLoaded]);

  useEffect(() => {
    if (!storesLoaded) {
      return;
    }
    const timer = setTimeout(() => void saveStore('history', records), SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [records, storesLoaded]);

  // 読書の記録を出す時に、無くなったファイルを確かめる（F-11）
  const historyVisible = ui.sidePanelOpen && ui.sidePanelTab === 'history';
  const showRecent = file === null;
  const recordPaths = useMemo(() => Object.keys(records).sort().join('\n'), [records]);
  useEffect(() => {
    if (!historyVisible && !showRecent) {
      return;
    }
    const paths = recordPaths === '' ? [] : recordPaths.split('\n');
    let cancelled = false;
    pathsExist(paths)
      .then((exists) => {
        if (!cancelled) {
          setMissing(new Set(paths.filter((_, index) => !exists[index])));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [historyVisible, showRecent, recordPaths]);

  // ショートカット（要件定義 3.3 節）とマウスの戻る・進むボタン
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = shortcutAction(event, mac);
      if (action === undefined) {
        return;
      }
      event.preventDefault();
      if (action === 'open') {
        void openWithDialog();
      } else if (action === 'back') {
        back();
      } else if (action === 'forward') {
        forward();
      } else if (action === 'toggleSidePanel') {
        setUi((current) => ({ ...current, sidePanelOpen: !current.sidePanelOpen }));
      } else if (action === 'openInEditor') {
        editCurrent();
      } else {
        setSettingsOpen(true);
      }
    };
    const onMouseUp = (event: MouseEvent) => {
      if (event.button === 3) {
        back();
      } else if (event.button === 4) {
        forward();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [mac, openWithDialog, back, forward, editCurrent]);

  // スクロールのたびに計算しすぎないよう、描画の区切りで 1 回にまとめる
  const frame = useRef<number | null>(null);
  const onScroll = () => {
    if (frame.current !== null) {
      return;
    }
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      updateReading();
    });
  };

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = ui.sidePanelWidth;
    const onMove = (move: PointerEvent) =>
      setUi((current) => ({
        ...current,
        sidePanelWidth: clampSidePanelWidth(startWidth + move.clientX - startX),
      }));
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const headings = useMemo(() => (file ? extractHeadings(file.content) : []), [file]);
  const recent = recentRecords(records);

  return (
    <div className="app">
      <Toolbar
        filePath={file?.path}
        progress={file ? progress : undefined}
        canGoBack={canGoBack(nav)}
        canGoForward={canGoForward(nav)}
        sidePanelOpen={ui.sidePanelOpen}
        sidePanelTab={ui.sidePanelTab}
        isMac={mac}
        onBack={back}
        onForward={forward}
        onShowPanel={showPanel}
        onOpenInEditor={editCurrent}
        onOpenFile={() => void openWithDialog()}
        onSettings={() => setSettingsOpen(true)}
      />
      <div className="main">
        {ui.sidePanelOpen && (
          <>
            <aside className="side-panel" style={{ width: ui.sidePanelWidth }}>
              <div className="side-panel-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={ui.sidePanelTab === 'outline'}
                  onClick={() => setUi({ ...ui, sidePanelTab: 'outline' })}
                >
                  {t('Outline')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={ui.sidePanelTab === 'history'}
                  onClick={() => setUi({ ...ui, sidePanelTab: 'history' })}
                >
                  {t('Reading History')}
                </button>
              </div>
              <div className="side-panel-body">
                {ui.sidePanelTab === 'outline' ? (
                  <Outline headings={headings} currentIndex={headingIndex} onSelect={scrollToId} />
                ) : (
                  <History
                    items={recent.map((record) => ({
                      path: record.uri,
                      title: record.title,
                      progress: record.progress,
                      lastRead: record.lastRead,
                      missing: missing.has(record.uri),
                    }))}
                    onOpen={(path) => void open(path)}
                    onRemove={(path) => setRecords((current) => removeRecord(current, path))}
                  />
                )}
              </div>
            </aside>
            <div
              className="side-panel-resizer"
              role="separator"
              aria-orientation="vertical"
              onPointerDown={startResize}
            />
          </>
        )}
        <div className="scroller" ref={scrollerRef} onScroll={onScroll}>
          {error && (
            <div className="message-bar error" role="alert">
              <span>{error}</span>
              <button type="button" aria-label={t('Close')} onClick={() => setError(null)}>
                <Icon name="close" />
              </button>
            </div>
          )}
          {notice && (
            <div className="message-bar notice" role="status">
              <span>{notice}</span>
              <button type="button" aria-label={t('Close')} onClick={() => setNotice(null)}>
                <Icon name="close" />
              </button>
            </div>
          )}
          {file ? (
            <Reader
              file={file}
              settings={settings}
              theme={theme}
              onShown={onShown}
              onLinkClick={onLinkClick}
            />
          ) : (
            <EmptyState
              recent={recent
                .filter((record) => !missing.has(record.uri))
                .map((record) => ({ path: record.uri, title: record.title }))}
              onOpenFile={() => void openWithDialog()}
              onOpenRecent={(path) => void open(path)}
            />
          )}
        </div>
      </div>
      {dragging && <div className="drop-overlay">{t('Drop to open')}</div>}
      {settingsOpen && (
        <SettingsDialog
          settings={settings}
          onChange={setSettings}
          onReset={() => setSettings(DEFAULT_SETTINGS)}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
