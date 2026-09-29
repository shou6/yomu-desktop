import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppError, DragDropEvent, MarkdownFile } from '../lib/ipc';
import * as ipc from '../lib/ipc';
import App from './App';

vi.mock('../lib/ipc', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/ipc')>();
  return {
    isAppError: original.isAppError,
    takePendingFile: vi.fn(),
    readMarkdownFile: vi.fn(),
    onOpenFile: vi.fn(),
    onDragDrop: vi.fn(),
    allowImages: vi.fn(async () => undefined),
    fileUrl: vi.fn((path: string) => path),
  };
});

const files: Record<string, string> = {
  'C:/docs/a.md': '# A\n\nfirst',
  'C:/docs/b.md': '# B\n\nsecond',
};

let openFileHandler: (path: string) => void = () => {};
let dragDropHandler: (event: DragDropEvent) => void = () => {};

beforeEach(() => {
  vi.mocked(ipc.takePendingFile).mockResolvedValue(null);
  vi.mocked(ipc.readMarkdownFile).mockImplementation(async (path: string) => {
    const content = files[path];
    if (content === undefined) {
      const error: AppError = { kind: 'not_found', path };
      throw error;
    }
    const file: MarkdownFile = { path, content, baseDir: 'C:/docs' };
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
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function renderReady() {
  render(<App />);
  await waitFor(() => expect(ipc.onDragDrop).toHaveBeenCalled());
  await waitFor(() => expect(ipc.onOpenFile).toHaveBeenCalled());
}

describe('App', () => {
  it('文書が無い時は、ドロップの案内を出す', async () => {
    await renderReady();
    expect(screen.getByText('Drop a Markdown file here')).toBeTruthy();
  });

  it('起動時の引数のファイルを、準備ができてから開く', async () => {
    vi.mocked(ipc.takePendingFile).mockResolvedValue('C:/docs/a.md');
    await renderReady();
    expect(await screen.findByText(/first/)).toBeTruthy();
    expect(ipc.readMarkdownFile).toHaveBeenCalledWith('C:/docs/a.md');
  });

  it('開いた文書は Markdown として描画する', async () => {
    vi.mocked(ipc.takePendingFile).mockResolvedValue('C:/docs/a.md');
    await renderReady();
    expect(await screen.findByRole('heading', { level: 1, name: 'A' })).toBeTruthy();
  });

  it('テーマを body に付ける。既定の auto は OS の明暗で決める（matchMedia が無ければライト）', async () => {
    await renderReady();
    expect(document.body.dataset.theme).toBe('paper');
  });

  it('二重起動で転送されたファイルを開き、文書を差し替える', async () => {
    vi.mocked(ipc.takePendingFile).mockResolvedValue('C:/docs/a.md');
    await renderReady();
    await screen.findByText(/first/);
    await act(async () => openFileHandler('C:/docs/b.md'));
    expect(await screen.findByText(/second/)).toBeTruthy();
    expect(screen.queryByText(/first/)).toBeNull();
  });

  it('ドラッグ中は案内を重ねて出し、離れたら消す', async () => {
    await renderReady();
    act(() => dragDropHandler({ type: 'enter', paths: ['C:/docs/a.md'] }));
    expect(screen.getByText('Drop to open')).toBeTruthy();
    act(() => dragDropHandler({ type: 'leave' }));
    expect(screen.queryByText('Drop to open')).toBeNull();
  });

  it('複数をドロップした時は、先頭の 1 つだけを開く', async () => {
    await renderReady();
    act(() => dragDropHandler({ type: 'enter', paths: ['C:/docs/b.md', 'C:/docs/a.md'] }));
    await act(async () =>
      dragDropHandler({ type: 'drop', paths: ['C:/docs/b.md', 'C:/docs/a.md'] })
    );
    expect(await screen.findByText(/second/)).toBeTruthy();
    expect(ipc.readMarkdownFile).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Drop to open')).toBeNull();
  });

  it('開けない時はエラーの帯で知らせ、表示中の文書を残す', async () => {
    vi.mocked(ipc.takePendingFile).mockResolvedValue('C:/docs/a.md');
    await renderReady();
    await screen.findByText(/first/);
    await act(async () => openFileHandler('C:/docs/missing.md'));
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      expect.stringContaining('File not found: missing.md')
    );
    expect(screen.getByText(/first/)).toBeTruthy();
  });

  it('次のファイルを開けたら、エラーの帯を消す', async () => {
    await renderReady();
    await act(async () => openFileHandler('C:/docs/missing.md'));
    await screen.findByRole('alert');
    await act(async () => openFileHandler('C:/docs/a.md'));
    await screen.findByText(/first/);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
