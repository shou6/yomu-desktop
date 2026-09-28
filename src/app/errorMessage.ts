import type { Translator } from '../l10n/t';
import { isAppError } from '../lib/ipc';

/** パスの最後の要素。区切りは / と \ の両方を扱う */
function fileName(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

/** Rust のエラーの種類から、エラーの帯に出す文を作る */
export function errorMessage(error: unknown, t: Translator): string {
  if (!isAppError(error)) {
    const detail = error instanceof Error ? error.message : String(error);
    return t('Could not read the file: {0}', detail);
  }
  const name = fileName(error.path);
  switch (error.kind) {
    case 'unsupported_type':
      return t('Only .md and .markdown files can be opened: {0}', name);
    case 'not_found':
      return t('File not found: {0}', name);
    case 'too_large':
      return t('File is larger than 10 MiB: {0}', name);
    case 'not_utf8':
      return t('File is not UTF-8 text: {0}', name);
    case 'editor_failed':
      return t('Could not start the editor: {0}', name);
    case 'io':
      return t('Could not read the file: {0}', name);
  }
}
