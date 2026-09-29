import { useEffect, useMemo, useRef, useState } from 'react';
import { renderMermaid, resetMermaid } from '../content/mermaid';
import { t } from '../l10n/t';
import { allowImages, fileUrl, type MarkdownFile } from '../lib/ipc';
import { resolveImagePath } from '../reader/imagePath';
import type { ReaderSettings, ResolvedTheme } from '../reader/readerSettings';
import { renderSafely } from '../reader/render';

interface ReaderProps {
  file: MarkdownFile;
  settings: ReaderSettings;
  /** 適用しているテーマ（auto は解決済み）。Mermaid の図の配色に使う */
  theme: ResolvedTheme;
}

/**
 * 本文の領域。Markdown を HTML にして #content に差し込む。
 * 生の HTML は変換の段階で許可リストに通している（htmlAllowlist.ts）ので、innerHTML に入れてよい。
 * ローカルの画像は、そのファイルだけを asset プロトコルに許可してから差し込む（要件定義 6 節）
 */
function Reader({ file, settings, theme }: ReaderProps) {
  const frontMatterDisplay = settings.frontMatter;
  const { html, imagePaths } = useMemo(() => {
    const paths: string[] = [];
    const rendered = renderSafely(file.content, {
      resolveImageSrc: (src) => {
        const path = resolveImagePath(file.baseDir, src);
        if (path === undefined) {
          return src;
        }
        paths.push(path);
        return fileUrl(path);
      },
      frontMatter: { display: frontMatterDisplay, label: t('Front matter') },
    });
    return { html: rendered, imagePaths: [...new Set(paths)] };
  }, [file.content, file.baseDir, frontMatterDisplay]);

  // 許可を待っている間は、前の本文を出したままにする
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const show = () => {
      if (!cancelled) {
        setShown(html);
      }
    };
    if (imagePaths.length === 0) {
      show();
    } else {
      // 許可できなくても本文は出す。画像だけが表示されない
      allowImages(imagePaths).then(show, show);
    }
    return () => {
      cancelled = true;
    };
  }, [html, imagePaths]);

  // 本文を差し込んだ後に Mermaid の図を描く。テーマが変わったら、描いた図をソースに戻してから描き直す
  const contentRef = useRef<HTMLDivElement>(null);
  const drawnTheme = useRef(theme);
  useEffect(() => {
    const root = contentRef.current;
    if (root === null || shown === null) {
      return;
    }
    if (drawnTheme.current !== theme) {
      resetMermaid(root);
      drawnTheme.current = theme;
    }
    void renderMermaid(root, { theme });
  }, [shown, theme]);

  return <div id="content" ref={contentRef} dangerouslySetInnerHTML={{ __html: shown ?? '' }} />;
}

export default Reader;
