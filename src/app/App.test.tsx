import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppError, DragDropEvent, FileChange, MarkdownFile } from '../lib/ipc';
import * as ipc from '../lib/ipc';
import App from './App';

vi.mock('../content/mermaid', () => ({
  renderMermaid: vi.fn(async () => undefined),
  resetMermaid: vi.fn(),
}));

vi.mock('../lib/ipc', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/ipc')>();
  return {
    isAppError: original.isAppError,
    takePendingFile: vi.fn(),
    readMarkdownFile: vi.fn(),
    onOpenFile: vi.fn(),
    onDragDrop: vi.fn(),
    onFileChanged: vi.fn(),
    allowImages: vi.fn(async () => undefined),
    fileUrl: vi.fn((path: string) => path),
    loadStore: vi.fn(),
    saveStore: vi.fn(async () => undefined),
    pathsExist: vi.fn(async (paths: string[]) => paths.map(() => true)),
    openFileDialog: vi.fn(),
    openPath: vi.fn(async () => undefined),
    openUrl: vi.fn(async () => undefined),
    openInEditor: vi.fn(async () => undefined),
    setWindowTitle: vi.fn(async () => undefined),
    isMac: vi.fn(() => false),
    readCustomCss: vi.fn(),
    stopCustomCss: vi.fn(async () => undefined),
    onCustomCssChanged: vi.fn(async () => () => {}),
    chooseCssFile: vi.fn(),
  };
});

const files: Record<string, string> = {
  'C:\\docs\\a.md': '# A\n\nfirst [to b](./b.md) [site](https://example.com)',
  'C:\\docs\\b.md': '# B\n\nsecond',
};

let openFileHandler: (path: string) => void = () => {};
let dragDropHandler: (event: DragDropEvent) => void = () => {};
let fileChangedHandler: (change: FileChange) => void = () => {};

beforeEach(() => {
  vi.mocked(ipc.takePendingFile).mockResolvedValue(null);
  vi.mocked(ipc.loadStore).mockResolvedValue({ value: null, corrupt: false });
  vi.mocked(ipc.readMarkdownFile).mockImplementation(async (path: string) => {
    const content = files[path];
    if (content === undefined) {
      const error: AppError = { kind: 'not_found', path };
      throw error;
    }
    const file: MarkdownFile = { path, content, baseDir: 'C:\\docs' };
    return file;
  });
  vi.mocked(ipc.onOpenFile).mockImplementation(async (handler) => {
    openFileHandler = handler;
    return () => {};
  });
  vi.mocked(ipc.onDragDrop).mockImplementation(async (handler) => {
    dragDropHandler = handler;
    return () => {};
  });
  vi.mocked(ipc.readCustomCss).mockResolvedValue('body { color: red; }');
  vi.mocked(ipc.onFileChanged).mockImplementation(async (handler) => {
    fileChangedHandler = handler;
    return () => {};
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  delete document.body.dataset.theme;
});

async function renderReady() {
  render(<App />);
  await waitFor(() => expect(ipc.onDragDrop).toHaveBeenCalled());
  await waitFor(() => expect(ipc.onOpenFile).toHaveBeenCalled());
  await waitFor(() => expect(ipc.takePendingFile).toHaveBeenCalled());
}

async function openA() {
  vi.mocked(ipc.takePendingFile).mockResolvedValue('C:\\docs\\a.md');
  await renderReady();
  await screen.findByRole('heading', { level: 1, name: 'A' });
}

describe('App: ファイルを開く', () => {
  it('文書が無い時は、ファイルを開くボタンとドロップの案内を出す', async () => {
    await renderReady();
    expect(screen.getByText('Drop a Markdown file here')).toBeTruthy();
    expect(ipc.setWindowTitle).toHaveBeenLastCalledWith('Yomu');
  });

  it('起動時の引数のファイルを開き、ウィンドウのタイトルを「ファイル名 - Yomu」にする', async () => {
    await openA();
    expect(ipc.readMarkdownFile).toHaveBeenCalledWith('C:\\docs\\a.md');
    await waitFor(() => expect(ipc.setWindowTitle).toHaveBeenLastCalledWith('a.md - Yomu'));
  });

  it('二重起動で転送されたファイルを開き、文書を差し替える', async () => {
    await openA();
    await act(async () => openFileHandler('C:\\docs\\b.md'));
    expect(await screen.findByRole('heading', { name: 'B' })).toBeTruthy();
  });

  it('ドラッグ中は案内を重ね、複数をドロップした時は先頭だけを開く', async () => {
    await renderReady();
    act(() => dragDropHandler({ type: 'enter', paths: ['C:\\docs\\b.md'] }));
    expect(screen.getByText('Drop to open')).toBeTruthy();
    await act(async () =>
      dragDropHandler({ type: 'drop', paths: ['C:\\docs\\b.md', 'C:\\docs\\a.md'] })
    );
    expect(await screen.findByRole('heading', { name: 'B' })).toBeTruthy();
    expect(ipc.readMarkdownFile).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Drop to open')).toBeNull();
  });

  it('開けない時はエラーの帯で知らせ、表示中の文書を残す', async () => {
    await openA();
    await act(async () => openFileHandler('C:\\docs\\missing.md'));
    expect((await screen.findByRole('alert')).textContent).toContain('File not found: missing.md');
    expect(screen.getByRole('heading', { name: 'A' })).toBeTruthy();
  });

  it('Ctrl+O で、翻訳したタイトルとフィルタでファイルを選ぶダイアログを開く', async () => {
    vi.mocked(ipc.openFileDialog).mockResolvedValue('C:\\docs\\b.md');
    await renderReady();
    await act(async () => {
      fireEvent.keyDown(window, { key: 'o', ctrlKey: true });
    });
    expect(ipc.openFileDialog).toHaveBeenCalledWith({
      title: 'Open File',
      filterName: 'Markdown',
    });
    expect(await screen.findByRole('heading', { name: 'B' })).toBeTruthy();
  });
});

describe('App: 設定', () => {
  it('保存した設定を読み込んでテーマを付ける', async () => {
    vi.mocked(ipc.loadStore).mockImplementation(async (name) =>
      name === 'settings'
        ? { value: { theme: 'nord' }, corrupt: false }
        : { value: null, corrupt: false }
    );
    await renderReady();
    await waitFor(() => expect(document.body.dataset.theme).toBe('nord'));
  });

  it('設定ファイルが壊れていたら、既定値で起動してその旨を一度だけ知らせる', async () => {
    vi.mocked(ipc.loadStore).mockImplementation(async (name) =>
      name === 'settings' ? { value: null, corrupt: true } : { value: null, corrupt: false }
    );
    await renderReady();
    expect(
      await screen.findByText('The settings file could not be read. Using the default settings.')
    ).toBeTruthy();
    expect(document.body.dataset.theme).toBe('paper');
  });

  it('設定ダイアログで値を変えると、すぐに反映して保存する', async () => {
    await renderReady();
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'sepia' } });
    expect(document.body.dataset.theme).toBe('sepia');
    await waitFor(() =>
      expect(ipc.saveStore).toHaveBeenCalledWith(
        'settings',
        expect.objectContaining({ theme: 'sepia' })
      )
    );
  });
});

describe('App: リンクと戻る・進む', () => {
  it('相対リンクの .md は同じウィンドウで開き、戻るで前の文書に戻る', async () => {
    await openA();
    fireEvent.click(screen.getByText('to b'));
    expect(await screen.findByRole('heading', { name: 'B' })).toBeTruthy();
    expect(ipc.readMarkdownFile).toHaveBeenLastCalledWith('C:\\docs\\b.md');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('heading', { name: 'A' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Forward' })).toHaveProperty('disabled', false);
  });

  it('外部のリンクは既定のブラウザで開き、アプリの中では遷移しない', async () => {
    await openA();
    fireEvent.click(screen.getByText('site'));
    expect(ipc.openUrl).toHaveBeenCalledWith('https://example.com');
    expect(screen.getByRole('heading', { name: 'A' })).toBeTruthy();
  });
});

describe('App: 自動再読込', () => {
  it('保存されたら読み直して描き直す', async () => {
    await openA();
    files['C:\\docs\\a.md'] = '# A2\n';
    await act(async () => fileChangedHandler({ path: 'C:\\docs\\a.md', kind: 'modified' }));
    expect(await screen.findByRole('heading', { name: 'A2' })).toBeTruthy();
    files['C:\\docs\\a.md'] = '# A\n\nfirst [to b](./b.md) [site](https://example.com)';
  });

  it('削除されたら知らせ、最後の内容を残す', async () => {
    await openA();
    await act(async () => fileChangedHandler({ path: 'C:\\docs\\a.md', kind: 'removed' }));
    expect(
      await screen.findByText('The file was deleted. Showing the last loaded content.')
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'A' })).toBeTruthy();
  });
});

describe('App: エディタで開く', () => {
  it('Ctrl+E で、今の文書と今読んでいる行と設定のコマンドを渡す', async () => {
    await openA();
    await act(async () => {
      fireEvent.keyDown(window, { key: 'e', ctrlKey: true });
    });
    expect(ipc.openInEditor).toHaveBeenCalledWith('C:\\docs\\a.md', 1, '');
  });
});

describe('App: 読む機能', () => {
  it('Ctrl+F で検索バーを出し、一致の件数を出す。Esc で閉じて強調を消す', async () => {
    await openA();
    await act(async () => {
      fireEvent.keyDown(window, { key: 'f', ctrlKey: true });
    });
    const input = screen.getByRole('searchbox', { name: 'Find' });
    fireEvent.change(input, { target: { value: 'first' } });
    expect(await screen.findByText('1/1')).toBeTruthy();
    expect(document.querySelectorAll('mark.yomu-search-match')).toHaveLength(1);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('searchbox')).toBeNull();
    expect(document.querySelectorAll('mark.yomu-search-match')).toHaveLength(0);
  });

  it('Ctrl+Shift+F で集中モードを切り替え、設定に保存する', async () => {
    await openA();
    await act(async () => {
      fireEvent.keyDown(window, { key: 'F', ctrlKey: true, shiftKey: true });
    });
    expect(document.body.classList.contains('yomu-focus-mode')).toBe(true);
    await waitFor(() =>
      expect(ipc.saveStore).toHaveBeenCalledWith(
        'settings',
        expect.objectContaining({ focusMode: true })
      )
    );
    await act(async () => {
      fireEvent.keyDown(window, { key: 'F', ctrlKey: true, shiftKey: true });
    });
    expect(document.body.classList.contains('yomu-focus-mode')).toBe(false);
  });

  it('Ctrl+P で印刷し、印刷の間だけ白地の paper にする', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {
      window.dispatchEvent(new Event('beforeprint'));
      expect(document.body.dataset.theme).toBe('paper');
      window.dispatchEvent(new Event('afterprint'));
    });
    vi.mocked(ipc.loadStore).mockImplementation(async (name) =>
      name === 'settings'
        ? { value: { theme: 'nord' }, corrupt: false }
        : { value: null, corrupt: false }
    );
    await openA();
    await waitFor(() => expect(document.body.dataset.theme).toBe('nord'));
    await act(async () => {
      fireEvent.keyDown(window, { key: 'p', ctrlKey: true });
    });
    expect(print).toHaveBeenCalled();
    expect(document.body.dataset.theme).toBe('nord');
    print.mockRestore();
  });

  it('カスタム CSS をテーマの後に読み込む。読めない時はその旨を一度だけ知らせる', async () => {
    vi.mocked(ipc.loadStore).mockImplementation(async (name) =>
      name === 'settings'
        ? { value: { customCss: 'C:/docs/my.css' }, corrupt: false }
        : { value: null, corrupt: false }
    );
    await renderReady();
    await waitFor(() =>
      expect(document.getElementById('yomu-custom-css')?.textContent).toBe('body { color: red; }')
    );
    expect(ipc.readCustomCss).toHaveBeenCalledWith('C:/docs/my.css');
    cleanup();
    document.getElementById('yomu-custom-css')?.remove();
    vi.mocked(ipc.readCustomCss).mockRejectedValue({ kind: 'not_found', path: 'C:/docs/my.css' });
    await renderReady();
    expect(
      await screen.findByText('Could not load the custom CSS: my.css. Showing the theme as is.')
    ).toBeTruthy();
    expect(document.getElementById('yomu-custom-css')).toBeNull();
  });
});
