/**
 * リンクの href を、クリック時の扱いごとに分類する（純粋関数）。
 * 本文のリンクをクリックした時に、アプリの中で移るか、外で開くかを決める。
 */

export type LinkKind =
  /** `#見出し`。本文の中で移動する */
  | { kind: 'fragment'; id: string }
  /** http(s) と mailto。既定のブラウザやメーラーで開く */
  | { kind: 'external'; href: string }
  /** `./other.md` など。文書からの相対パスの Markdown。同じウィンドウで開く */
  | { kind: 'document'; path: string; fragment: string | undefined }
  /** `./spec.pdf` など。文書からの相対パスのそれ以外のファイル。OS の既定のアプリで開く */
  | { kind: 'file'; path: string }
  /** javascript:、file:、vscode: など。何もしない */
  | { kind: 'ignore' };

const EXTERNAL = /^(https?:\/\/|mailto:)/i;
/** スキーム付き、またはプロトコル相対（//） */
const HAS_SCHEME = /^([a-z][a-z0-9+.-]*:|\/\/)/i;

function decode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

export function classifyLink(href: string): LinkKind {
  if (href.startsWith('#')) {
    return { kind: 'fragment', id: decode(href.slice(1)) };
  }
  if (EXTERNAL.test(href)) {
    return { kind: 'external', href };
  }
  if (HAS_SCHEME.test(href)) {
    return { kind: 'ignore' };
  }
  const hash = href.indexOf('#');
  const path = decode(hash === -1 ? href : href.slice(0, hash));
  if (!isMarkdownPath(path)) {
    return { kind: 'file', path };
  }
  const fragment = hash === -1 ? undefined : decode(href.slice(hash + 1));
  return { kind: 'document', path, fragment };
}

/** リーダーで開く Markdown のファイルか（.md と .markdown。大文字小文字は問わない） */
export function isMarkdownPath(path: string): boolean {
  return /\.(md|markdown)$/i.test(path);
}
