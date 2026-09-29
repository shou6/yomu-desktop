import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SearchBar, { type SearchBarProps } from './SearchBar';

afterEach(cleanup);

function props(overrides: Partial<SearchBarProps> = {}): SearchBarProps {
  return {
    query: 'yomu',
    count: 12,
    current: 2,
    onQuery: vi.fn(),
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

describe('SearchBar', () => {
  it('件数と今の位置を「3/12」の形で出す', () => {
    render(<SearchBar {...props()} />);
    expect(screen.getByText('3/12')).toBeTruthy();
  });

  it('一致が無い時はその旨を出す', () => {
    render(<SearchBar {...props({ count: 0, current: -1 })} />);
    expect(screen.getByText('No results')).toBeTruthy();
  });

  it('入力を渡し、Enter で次、Shift+Enter で前、Esc で閉じる', () => {
    const p = props();
    render(<SearchBar {...p} />);
    const input = screen.getByRole('searchbox', { name: 'Find' });
    fireEvent.change(input, { target: { value: '設計' } });
    expect(p.onQuery).toHaveBeenCalledWith('設計');
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(p.onNext).toHaveBeenCalledTimes(1);
    expect(p.onPrevious).toHaveBeenCalledTimes(1);
    expect(p.onClose).toHaveBeenCalledTimes(1);
  });

  it('開いた時に入力欄へ焦点を移す', () => {
    render(<SearchBar {...props()} />);
    expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: 'Find' }));
  });
});
