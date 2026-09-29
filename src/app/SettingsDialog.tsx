import { useEffect, useRef, useState, type ReactNode } from 'react';
import { t } from '../l10n/t';
import { FRONT_MATTER_DISPLAYS } from '../reader/frontMatter';
import {
  ALIGNS,
  THEMES,
  normalizeSettings,
  type RawSettings,
  type ReaderSettings,
} from '../reader/readerSettings';
import { Icon } from './icons';

interface SettingsDialogProps {
  settings: ReaderSettings;
  onChange: (settings: ReaderSettings) => void;
  onReset: () => void;
  onClose: () => void;
  /** カスタム CSS のファイルを選ぶダイアログを開く */
  onChooseCustomCss: () => void;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

type NumberKey = 'maxWidth' | 'padding' | 'fontSize' | 'lineHeight' | 'foldLines';

interface NumberFieldProps {
  label: string;
  field: NumberKey;
  settings: ReaderSettings;
  min: number;
  max?: number;
  step?: number;
  onChange: (settings: ReaderSettings) => void;
}

/**
 * 数値の欄。入力の途中（18 と打つ途中の 1 など）で既定値に戻らないよう、範囲内の値だけをすぐに反映し、
 * 範囲外のまま欄を離れた時に既定値へ丸める（F-6）
 */
function NumberField({ label, field, settings, min, max, step, onChange }: NumberFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const normalized = (value: string) =>
    normalizeSettings({ ...settings, [field]: value.trim() === '' ? Number.NaN : Number(value) });
  return (
    <Field label={label}>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft ?? settings[field]}
        onChange={(e) => {
          const next = normalized(e.target.value);
          if (next[field] === Number(e.target.value)) {
            setDraft(null);
            onChange(next);
          } else {
            setDraft(e.target.value);
          }
        }}
        onBlur={() => {
          if (draft !== null) {
            setDraft(null);
            onChange(normalized(draft));
          }
        }}
      />
    </Field>
  );
}

/** 設定ダイアログ（F-7）。値を変えるとすぐに反映して保存する。「適用」ボタンは置かない */
function SettingsDialog({
  settings,
  onChange,
  onReset,
  onClose,
  onChooseCustomCss,
}: SettingsDialogProps) {
  const [confirming, setConfirming] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // 検査を通してから渡す。範囲外の値は既定値に丸まる（F-6）
  const change = (patch: RawSettings) => onChange(normalizeSettings({ ...settings, ...patch }));

  const themeLabels: Record<string, string> = {
    auto: t('Auto (follow the OS)'),
  };

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="dialog settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t('Settings')}
        tabIndex={-1}
        ref={dialogRef}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        <header className="dialog-header">
          <h1>{t('Settings')}</h1>
          <button
            type="button"
            className="tool-button"
            aria-label={t('Close')}
            title={t('Close')}
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="dialog-body">
          <section>
            <h2>{t('Display')}</h2>
            <Field label={t('Theme')}>
              <select value={settings.theme} onChange={(e) => change({ theme: e.target.value })}>
                {['auto', ...THEMES].map((theme) => (
                  <option key={theme} value={theme}>
                    {themeLabels[theme] ?? theme}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('Front matter')}>
              <select
                value={settings.frontMatter}
                onChange={(e) => change({ frontMatter: e.target.value })}
              >
                {FRONT_MATTER_DISPLAYS.map((display) => (
                  <option key={display} value={display}>
                    {display === 'collapsed'
                      ? t('Collapsed')
                      : display === 'expanded'
                        ? t('Expanded')
                        : t('Hidden')}
                  </option>
                ))}
              </select>
            </Field>
            <label className="settings-field settings-check">
              <span>{t('Focus mode')}</span>
              <input
                type="checkbox"
                checked={settings.focusMode}
                onChange={(e) => change({ focusMode: e.target.checked })}
              />
            </label>
          </section>

          <section>
            <h2>{t('Layout')}</h2>
            <NumberField
              label={t('Maximum width (px, 0 for no limit)')}
              field="maxWidth"
              min={0}
              settings={settings}
              onChange={onChange}
            />
            <Field label={t('Alignment')}>
              <select value={settings.align} onChange={(e) => change({ align: e.target.value })}>
                {ALIGNS.map((align) => (
                  <option key={align} value={align}>
                    {align === 'left' ? t('Left') : align === 'center' ? t('Center') : t('Right')}
                  </option>
                ))}
              </select>
            </Field>
            <NumberField
              label={t('Side padding (px)')}
              field="padding"
              min={0}
              settings={settings}
              onChange={onChange}
            />
          </section>

          <section>
            <h2>{t('Text')}</h2>
            <Field label={t('Font family')}>
              <input
                type="text"
                value={settings.fontFamily}
                onChange={(e) => change({ fontFamily: e.target.value })}
              />
            </Field>
            <Field label={t('Code font family (empty for the default)')}>
              <input
                type="text"
                value={settings.codeFontFamily}
                onChange={(e) => change({ codeFontFamily: e.target.value })}
              />
            </Field>
            <NumberField
              label={t('Font size (px)')}
              field="fontSize"
              min={8}
              max={72}
              settings={settings}
              onChange={onChange}
            />
            <NumberField
              label={t('Line height')}
              field="lineHeight"
              min={1}
              max={3}
              step={0.1}
              settings={settings}
              onChange={onChange}
            />
          </section>

          <section>
            <h2>{t('Code')}</h2>
            <NumberField
              label={t('Fold code longer than (lines, 0 to never fold)')}
              field="foldLines"
              min={0}
              settings={settings}
              onChange={onChange}
            />
          </section>

          <section>
            <h2>{t('Editor')}</h2>
            <Field label={t('Editor command')}>
              <input
                type="text"
                placeholder="code -g {file}:{line}"
                value={settings.editorCommand}
                onChange={(e) => change({ editorCommand: e.target.value })}
              />
            </Field>
            <p className="settings-note">
              {t(
                'Empty opens the OS text editor. {file} is replaced with the file path and {line} with the line you are reading.'
              )}
            </p>
          </section>

          <section>
            <h2>{t('Language')}</h2>
            <Field label={t('Display language')}>
              <select
                value={settings.language}
                onChange={(e) => change({ language: e.target.value })}
              >
                <option value="auto">{t('Auto (follow the OS)')}</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
              </select>
            </Field>
          </section>

          <section>
            <h2>{t('Custom CSS')}</h2>
            <Field label={t('CSS file')}>
              <span className="settings-file">
                <input
                  type="text"
                  value={settings.customCss}
                  onChange={(e) => change({ customCss: e.target.value })}
                />
                <button type="button" onClick={onChooseCustomCss}>
                  {t('Choose…')}
                </button>
              </span>
            </Field>
            <p className="settings-note">
              {t('Loaded after the theme. The theme colors are the --yomu-* CSS variables.')}
            </p>
          </section>
        </div>
        <footer className="dialog-footer">
          {confirming ? (
            <>
              <span>{t('Reset all settings to their defaults?')}</span>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setConfirming(false);
                  onReset();
                }}
              >
                {t('Reset')}
              </button>
              <button type="button" onClick={() => setConfirming(false)}>
                {t('Cancel')}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirming(true)}>
              {t('Reset to Defaults')}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

export default SettingsDialog;
