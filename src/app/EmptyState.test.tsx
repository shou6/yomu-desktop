import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import EmptyState from './EmptyState';

afterEach(cleanup);

describe('EmptyState', () => {
  it('ファイルを開くボタンとドロップの案内を出す', () => {
    const onOpenFile = vi.fn();
    render(<EmptyState recent={[]} onOpenFile={onOpenFile} onOpenRecent={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open File' }));
    expect(onOpenFile).toHaveBeenCalled();
    expect(screen.getByText('Drop a Markdown file here')).toBeTruthy();
  });

  it('最近の文書を 10 件まで並べ、クリックで開く', () => {
    const recent = Array.from({ length: 12 }, (_, i) => ({
      path: `C:/d${i}.md`,
      title: `d${i}.md`,
    }));
    const onOpenRecent = vi.fn();
    render(<EmptyState recent={recent} onOpenFile={vi.fn()} onOpenRecent={onOpenRecent} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
    fireEvent.click(screen.getByRole('button', { name: 'd3.md' }));
    expect(onOpenRecent).toHaveBeenCalledWith('C:/d3.md');
  });
});
