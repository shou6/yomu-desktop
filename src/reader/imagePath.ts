/**
 * 本文の画像の src を、ローカルのファイルの絶対パスにする（純粋関数）。
 * asset プロトコルは、許可したパスと URL のパスが文字列として一致しないと読めない。
 * `..` を含んだままだと読めないので、ここで畳んでから許可と URL の両方に使う（実装計画 1.1 節の 2）。
 */

/** 2 文字以上のスキーム（https:、data:、file: など）か、プロトコル相対（//）。1 文字はドライブ名とみなす */
const URL_LIKE = /^([a-z][a-z0-9+.-]+:|\/\/(?!\/))/i;
const WINDOWS_DRIVE = /^[a-z]:[\\/]/i;
const WINDOWS_UNC = /^\\\\[^\\]/;

function decode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/** 根（C:\、\\server\share\、/）と、その下の要素に分ける */
function splitRoot(path: string, windows: boolean): { root: string; parts: string[] } {
  const parts = path.split(windows ? /[\\/]/ : /\//);
  if (windows && WINDOWS_UNC.test(path)) {
    // ['', '', 'server', 'share', ...]
    return { root: `\\\\${parts[2]}\\${parts[3]}`, parts: parts.slice(4) };
  }
  if (windows && WINDOWS_DRIVE.test(path)) {
    return { root: parts[0].toUpperCase(), parts: parts.slice(1) };
  }
  return { root: '', parts: parts.slice(1) };
}

function normalize(root: string, parts: string[], separator: string): string {
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') {
      continue;
    }
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return root + separator + stack.join(separator);
}

function isAbsolute(path: string): boolean {
  return path.startsWith('/') || WINDOWS_DRIVE.test(path) || WINDOWS_UNC.test(path);
}

/**
 * @param baseDir 文書のフォルダ（Rust が返した OS のパス）
 * @param src 本文の画像の src（markdown-it がパーセントエンコードしたもの）
 * @returns ローカルのファイルの絶対パス。URL などファイルでないものは undefined
 */
export function resolveImagePath(baseDir: string, src: string): string | undefined {
  if (src === '' || URL_LIKE.test(src)) {
    return undefined;
  }
  const path = decode(src.replace(/[?#].*$/, ''));
  const windows = WINDOWS_DRIVE.test(baseDir) || WINDOWS_UNC.test(baseDir);
  const separator = windows ? '\\' : '/';
  const full = isAbsolute(path) ? path : `${baseDir}${separator}${path}`;
  const { root, parts } = splitRoot(full, windows);
  return normalize(root, parts, separator);
}
