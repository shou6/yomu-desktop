/** 画面の状態（ui.json）。設定ではなく、次の起動でも保つための状態（F-9） */

export type SidePanelTab = 'outline' | 'history';

export interface UiState {
  sidePanelOpen: boolean;
  /** サイドパネルの幅（px） */
  sidePanelWidth: number;
  sidePanelTab: SidePanelTab;
}

export const SIDE_PANEL_MIN_WIDTH = 160;
export const SIDE_PANEL_MAX_WIDTH = 600;

export const DEFAULT_UI_STATE: UiState = {
  sidePanelOpen: false,
  sidePanelWidth: 260,
  sidePanelTab: 'outline',
};

export function clampSidePanelWidth(width: number): number {
  return Math.min(Math.max(Math.round(width), SIDE_PANEL_MIN_WIDTH), SIDE_PANEL_MAX_WIDTH);
}

export function normalizeUiState(raw: unknown): UiState {
  const value = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    sidePanelOpen:
      typeof value.sidePanelOpen === 'boolean'
        ? value.sidePanelOpen
        : DEFAULT_UI_STATE.sidePanelOpen,
    sidePanelWidth:
      typeof value.sidePanelWidth === 'number' && Number.isFinite(value.sidePanelWidth)
        ? clampSidePanelWidth(value.sidePanelWidth)
        : DEFAULT_UI_STATE.sidePanelWidth,
    sidePanelTab:
      value.sidePanelTab === 'outline' || value.sidePanelTab === 'history'
        ? value.sidePanelTab
        : DEFAULT_UI_STATE.sidePanelTab,
  };
}
