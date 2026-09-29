/** ツールバーのアイコン。線だけの 16px の図で、色は文字の色（currentColor）に合わせる */

const PATHS = {
  back: 'M10 3 5 8l5 5',
  forward: 'm6 3 5 5-5 5',
  outline: 'M3 4h10M5 8h8M7 12h6',
  history: 'M8 3.5A4.5 4.5 0 1 1 3.5 8M3.5 4v4h4M8 5.5V8l2 1.5',
  editor: 'm10.5 2.5 3 3L6 13H3v-3z',
  open: 'M2.5 4.5h4l1.5 1.5h5.5v6.5h-11z',
  settings:
    'M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4',
  close: 'm4 4 8 8M12 4l-8 8',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
