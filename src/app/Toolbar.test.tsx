import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Toolbar, { type ToolbarProps } from './Toolbar';

afterEach(cleanup);

function props(overrides: Partial<ToolbarProps> = {}): ToolbarProps {
  return {
    filePath: 'C:\\docs\\設計.md',
    progress: 0.42,
    canGoBack: false,
    canGoForward: false,
    sidePanelOpen: false,
    sidePanelTab: 'outline',
    isMac: false,
    onBack: vi.fn(),
    onForward: vi.fn(),
    onShowPanel: vi.fn(),
    onOpenInEditor: vi.fn(),
    onOpenFile: vi.fn(),
    onSettings: vi.fn(),
    focusMode: false,
    onSearch: vi.fn(),
    onToggleFocus: vi.fn(),
    onPrint: vi.fn(),
    ...overrides,
  };
}

describe('Toolbar', () => {
  it('ファイル名と読んだ割合を出し、ファイル名に乗せるとフルパスが出る', () => {
    render(<Toolbar {...props()} />);
    const name = screen.getByText('設計.md');
    expect(name.getAttribute('title')).toBe('C:\\docs\\設計.md');
    expect(screen.getByText('42%')).toBeTruthy();
  });

  it('戻る先・進む先が無い時は押せない', () => {
    render(<Toolbar {...props()} />);
    expect(screen.getByRole('button', { name: 'Back' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Forward' })).toHaveProperty('disabled', true);
  });

  it('ボタンには名前とショートカットを出す。macOS は Cmd で表す', () => {
    const { rerender } = render(<Toolbar {...props()} />);
    expect(screen.getByRole('button', { name: 'Open File' }).getAttribute('title')).toBe(
      'Open File (Ctrl+O)'
    );
    rerender(<Toolbar {...props({ isMac: true })} />);
    expect(screen.getByRole('button', { name: 'Open File' }).getAttribute('title')).toBe(
      'Open File (Cmd+O)'
    );
  });

  it('各ボタンで対応する操作を呼ぶ', () => {
    const p = props({ canGoBack: true, canGoForward: true });
    render(<Toolbar {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    fireEvent.click(screen.getByRole('button', { name: 'Outline' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reading History' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open in Editor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open File' }));
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(p.onBack).toHaveBeenCalled();
    expect(p.onForward).toHaveBeenCalled();
    expect(p.onShowPanel).toHaveBeenNthCalledWith(1, 'outline');
    expect(p.onShowPanel).toHaveBeenNthCalledWith(2, 'history');
    expect(p.onOpenInEditor).toHaveBeenCalled();
    expect(p.onOpenFile).toHaveBeenCalled();
    expect(p.onSettings).toHaveBeenCalled();
  });

  it('文書が無い時は、ファイル名と割合を出さず、エディタで開くは押せない', () => {
    render(<Toolbar {...props({ filePath: undefined, progress: undefined })} />);
    expect(screen.queryByText('42%')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open in Editor' })).toHaveProperty('disabled', true);
  });

  it('開いているパネルのボタンは押された表示にする', () => {
    render(<Toolbar {...props({ sidePanelOpen: true, sidePanelTab: 'history' })} />);
    expect(
      screen.getByRole('button', { name: 'Reading History' }).getAttribute('aria-pressed')
    ).toBe('true');
    expect(screen.getByRole('button', { name: 'Outline' }).getAttribute('aria-pressed')).toBe(
      'false'
    );
  });

  it('検索、集中モード、印刷のボタン。集中モードは今の状態をボタンで表す', () => {
    const p = props({ focusMode: true });
    render(<Toolbar {...p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Find' }));
    fireEvent.click(screen.getByRole('button', { name: 'Focus Mode' }));
    fireEvent.click(screen.getByRole('button', { name: 'Print' }));
    expect(p.onSearch).toHaveBeenCalled();
    expect(p.onToggleFocus).toHaveBeenCalled();
    expect(p.onPrint).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Focus Mode' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    expect(screen.getByRole('button', { name: 'Focus Mode' }).getAttribute('title')).toBe(
      'Focus Mode (Ctrl+Shift+F)'
    );
  });

  it('文書が無い時は、検索と印刷は押せない', () => {
    render(<Toolbar {...props({ filePath: undefined, progress: undefined })} />);
    expect(screen.getByRole('button', { name: 'Find' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Print' })).toHaveProperty('disabled', true);
  });
});
