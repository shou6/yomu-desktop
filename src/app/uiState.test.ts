import { describe, expect, it } from 'vitest';
import { DEFAULT_UI_STATE, normalizeUiState } from './uiState';

describe('normalizeUiState', () => {
  it('既定はサイドパネルを閉じ、幅 260px、目次を出す', () => {
    expect(DEFAULT_UI_STATE).toEqual({
      sidePanelOpen: false,
      sidePanelWidth: 260,
      sidePanelTab: 'outline',
    });
    expect(normalizeUiState(undefined)).toEqual(DEFAULT_UI_STATE);
  });

  it('保存した値を通し、範囲外は既定値か範囲の端に丸める', () => {
    expect(
      normalizeUiState({ sidePanelOpen: true, sidePanelWidth: 300, sidePanelTab: 'history' })
    ).toEqual({ sidePanelOpen: true, sidePanelWidth: 300, sidePanelTab: 'history' });
    expect(normalizeUiState({ sidePanelWidth: 50 }).sidePanelWidth).toBe(160);
    expect(normalizeUiState({ sidePanelWidth: 5000 }).sidePanelWidth).toBe(600);
    expect(normalizeUiState({ sidePanelTab: 'files', sidePanelOpen: 'yes' })).toEqual(
      DEFAULT_UI_STATE
    );
  });
});
