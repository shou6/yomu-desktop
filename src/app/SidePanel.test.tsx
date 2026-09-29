import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import History, { type HistoryItem } from './History';
import Outline from './Outline';

afterEach(cleanup);

describe('Outline', () => {
  const headings = [
    { level: 1, text: '概要', id: '概要' },
    { level: 2, text: '目的', id: '目的' },
    { level: 4, text: '細目', id: '細目' },
    { level: 1, text: '設計', id: '設計' },
  ];

  it('見出しをレベルで入れ子にし、今読んでいる見出しを選択状態にする', () => {
    const { container } = render(
      <Outline headings={headings} currentIndex={2} onSelect={vi.fn()} />
    );
    const nested = container.querySelectorAll('ul ul ul li');
    expect([...nested].map((li) => li.firstElementChild?.textContent)).toEqual(['細目']);
    expect(screen.getByRole('button', { name: '細目' }).getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('button', { name: '概要' }).getAttribute('aria-current')).toBeNull();
  });

  it('項目をクリックすると、その見出しの ID を渡す', () => {
    const onSelect = vi.fn();
    render(<Outline headings={headings} currentIndex={-1} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: '設計' }));
    expect(onSelect).toHaveBeenCalledWith('設計');
  });

  it('見出しが無い時はその旨を出す', () => {
    render(<Outline headings={[]} currentIndex={-1} onSelect={vi.fn()} />);
    expect(screen.getByText('This document has no headings.')).toBeTruthy();
  });
});

describe('History', () => {
  const items: HistoryItem[] = [
    { path: 'C:/b.md', title: 'b.md', progress: 1, lastRead: 2, missing: false },
    { path: 'C:/a.md', title: 'a.md', progress: 0.3, lastRead: 1, missing: false },
    { path: 'C:/gone.md', title: 'gone.md', progress: 0.5, lastRead: 0, missing: true },
  ];

  it('記録を割合付きで並べ、最後まで読んだ文書は印を変える', () => {
    const { container } = render(<History items={items} onOpen={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText('30%')).toBeTruthy();
    const finished = container.querySelectorAll('.history-item.finished');
    expect(finished).toHaveLength(1);
    expect(finished[0].textContent).toContain('b.md');
  });

  it('クリックでその文書を開く。無くなったファイルは押せず、記録から消せる', () => {
    const onOpen = vi.fn();
    const onRemove = vi.fn();
    render(<History items={items} onOpen={onOpen} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole('button', { name: /a\.md/ }));
    expect(onOpen).toHaveBeenCalledWith('C:/a.md');
    expect(screen.getByRole('button', { name: /gone\.md/ })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('button', { name: 'Remove from history' }));
    expect(onRemove).toHaveBeenCalledWith('C:/gone.md');
  });

  it('記録が無い時はその旨を出す', () => {
    render(<History items={[]} onOpen={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.getByText('No reading history yet.')).toBeTruthy();
  });
});
