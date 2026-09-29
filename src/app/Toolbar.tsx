import { t } from '../l10n/t';
import { formatProgress } from '../reader/reading';
import { Icon, type IconName } from './icons';
import { shortcutLabel } from './shortcuts';
import type { SidePanelTab } from './uiState';

export interface ToolbarProps {
  /** 表示中の文書のパス。文書が無ければ undefined */
  filePath: string | undefined;
  /** 読んだ割合（0〜1）。文書が無ければ undefined */
  progress: number | undefined;
  canGoBack: boolean;
  canGoForward: boolean;
  sidePanelOpen: boolean;
  sidePanelTab: SidePanelTab;
  isMac: boolean;
  onBack: () => void;
  onForward: () => void;
  onShowPanel: (tab: SidePanelTab) => void;
  onOpenInEditor: () => void;
  onOpenFile: () => void;
  onSettings: () => void;
  /** 集中モードがオンか。ボタンのアイコンで今の状態を表す（F-14） */
  focusMode: boolean;
  onSearch: () => void;
  onToggleFocus: () => void;
  onPrint: () => void;
}

function fileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

interface ButtonProps {
  icon: IconName;
  label: string;
  keys?: string;
  isMac: boolean;
  disabled?: boolean;
  pressed?: boolean;
  onClick: () => void;
}

function ToolButton({ icon, label, keys, isMac, disabled, pressed, onClick }: ButtonProps) {
  return (
    <button
      type="button"
      className="tool-button"
      aria-label={label}
      title={keys ? `${label} (${shortcutLabel(keys, isMac)})` : label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} />
    </button>
  );
}

/** 細いツールバー（要件定義 3.1 節）。ボタンはアイコンで、マウスを乗せると名前とショートカットが出る */
function Toolbar(props: ToolbarProps) {
  const { isMac, filePath, progress } = props;
  const panelPressed = (tab: SidePanelTab) => props.sidePanelOpen && props.sidePanelTab === tab;
  return (
    <header className="toolbar">
      <div className="toolbar-group">
        <ToolButton
          icon="back"
          label={t('Back')}
          keys="Alt+←"
          isMac={isMac}
          disabled={!props.canGoBack}
          onClick={props.onBack}
        />
        <ToolButton
          icon="forward"
          label={t('Forward')}
          keys="Alt+→"
          isMac={isMac}
          disabled={!props.canGoForward}
          onClick={props.onForward}
        />
        <ToolButton
          icon="outline"
          label={t('Outline')}
          keys="Mod+B"
          isMac={isMac}
          pressed={panelPressed('outline')}
          onClick={() => props.onShowPanel('outline')}
        />
        <ToolButton
          icon="history"
          label={t('Reading History')}
          isMac={isMac}
          pressed={panelPressed('history')}
          onClick={() => props.onShowPanel('history')}
        />
      </div>
      <div className="toolbar-title">
        {filePath !== undefined && (
          <>
            <span className="toolbar-file" title={filePath}>
              {fileName(filePath)}
            </span>
            {progress !== undefined && (
              <span className="toolbar-progress">{formatProgress(progress)}</span>
            )}
          </>
        )}
      </div>
      <div className="toolbar-group">
        <ToolButton
          icon="search"
          label={t('Find')}
          keys="Mod+F"
          isMac={isMac}
          disabled={filePath === undefined}
          onClick={props.onSearch}
        />
        <ToolButton
          icon={props.focusMode ? 'focusOn' : 'focus'}
          label={t('Focus Mode')}
          keys="Mod+Shift+F"
          isMac={isMac}
          pressed={props.focusMode}
          onClick={props.onToggleFocus}
        />
        <ToolButton
          icon="print"
          label={t('Print')}
          keys="Mod+P"
          isMac={isMac}
          disabled={filePath === undefined}
          onClick={props.onPrint}
        />
        <ToolButton
          icon="editor"
          label={t('Open in Editor')}
          keys="Mod+E"
          isMac={isMac}
          disabled={filePath === undefined}
          onClick={props.onOpenInEditor}
        />
        <ToolButton
          icon="open"
          label={t('Open File')}
          keys="Mod+O"
          isMac={isMac}
          onClick={props.onOpenFile}
        />
        <ToolButton
          icon="settings"
          label={t('Settings')}
          keys="Mod+,"
          isMac={isMac}
          onClick={props.onSettings}
        />
      </div>
    </header>
  );
}

export default Toolbar;
