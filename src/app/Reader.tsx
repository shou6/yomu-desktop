import { useMemo } from 'react';
import { t } from '../l10n/t';
import type { MarkdownFile } from '../lib/ipc';
import type { ReaderSettings } from '../reader/readerSettings';
import { renderSafely } from '../reader/render';

interface ReaderProps {
  file: MarkdownFile;
  settings: ReaderSettings;
}

/**
 * 本文の領域。Markdown を HTML にして #content に差し込む。
 * 生の HTML は変換の段階で許可リストに通している（htmlAllowlist.ts）ので、innerHTML に入れてよい
 */
function Reader({ file, settings }: ReaderProps) {
  const frontMatterDisplay = settings.frontMatter;
  const html = useMemo(
    () =>
      renderSafely(file.content, {
        resolveImageSrc: (src) => src,
        frontMatter: { display: frontMatterDisplay, label: t('Front matter') },
      }),
    [file.content, frontMatterDisplay]
  );

  return <div id="content" dangerouslySetInnerHTML={{ __html: html }} />;
}

export default Reader;
