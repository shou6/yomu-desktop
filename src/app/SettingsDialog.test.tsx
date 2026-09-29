import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../reader/readerSettings';
import SettingsDialog from './SettingsDialog';

afterEach(cleanup);

function setup(settings = DEFAULT_SETTINGS) {
  const handlers = { onChange: vi.fn(), onReset: vi.fn(), onClose: vi.fn() };
  render(<SettingsDialog settings={settings} {...handlers} />);
  return handlers;
}

describe('SettingsDialog', () => {
  it('分類ごとに見出しを出す', () => {
    setup();
    for (const name of ['Display', 'Layout', 'Text', 'Editor', 'Language']) {
      expect(screen.getByRole('heading', { name })).toBeTruthy();
    }
  });

  it('値を変えるとすぐに新しい設定を渡す（適用ボタンは無い）', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'nord' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, theme: 'nord' });
    fireEvent.change(screen.getByLabelText('Font size (px)'), { target: { value: '18' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, fontSize: 18 });
    fireEvent.change(screen.getByLabelText('Editor command'), {
      target: { value: 'code -g {file}:{line}' },
    });
    expect(onChange).toHaveBeenLastCalledWith({
      ...DEFAULT_SETTINGS,
      editorCommand: 'code -g {file}:{line}',
    });
    expect(screen.queryByRole('button', { name: 'Apply' })).toBeNull();
  });

  it('範囲外の数値は、既定値に丸めてから渡す', () => {
    const { onChange } = setup();
    fireEvent.change(screen.getByLabelText('Font size (px)'), { target: { value: '500' } });
    expect(onChange).toHaveBeenLastCalledWith(DEFAULT_SETTINGS);
  });

  it('既定に戻す時は確認し、確かめてから戻す', () => {
    const { onReset } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Reset to Defaults' }));
    expect(onReset).not.toHaveBeenCalled();
    expect(screen.getByText('Reset all settings to their defaults?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onReset).toHaveBeenCalled();
  });

  it('Esc か閉じるボタンで閉じる', () => {
    const { onClose } = setup();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
