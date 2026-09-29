/**
 * 本文の中の Mermaid の図を描く（Yomu の src/webview/mermaid.ts を移植）。
 * render.ts が出力した .yomu-mermaid の枠を探し、mermaid で SVG にして差し替える。
 * mermaid は大きいので、枠がある時だけ動的 import で読み込む（要件定義 F-4）。
 */
import { mermaidConfig, type MermaidConfig } from '../reader/mermaidTheme';
import type { ResolvedTheme } from '../reader/readerSettings';

/** mermaid の API のうち、使うもの */
export interface MermaidApi {
  initialize(config: MermaidConfig): void;
  render(id: string, source: string): Promise<{ svg: string }>;
}

export interface MermaidOptions {
  /** 適用しているテーマ（auto は解決済み） */
  theme: ResolvedTheme;
  /** mermaid を読み込む。テストでは差し替える */
  load?: () => Promise<MermaidApi>;
}

/** 読み込みは 1 回だけ。失敗したら次の描画でやり直す */
let loading: Promise<MermaidApi> | undefined;

function loadMermaid(): Promise<MermaidApi> {
  loading ??= import('mermaid')
    .then((module) => module.default as unknown as MermaidApi)
    .catch((error: unknown) => {
      loading = undefined;
      throw error;
    });
  return loading;
}

/** 同じソース・テーマ・幅の SVG を覚えておき、再読込で本文を差し替えた時に図がちらつかないようにする */
const cache = new Map<string, string>();

let renderCount = 0;
/** 描いている途中で本文が差し替わったら、古い描画の結果を捨てる */
let generation = 0;

function showError(block: HTMLElement, message: string): void {
  block.querySelector('.yomu-mermaid-error')?.remove();
  const note = document.createElement('p');
  note.className = 'yomu-mermaid-error';
  note.textContent = 'Mermaid: ' + message;
  block.prepend(note);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * root の中の Mermaid の枠を描く。
 * キャッシュにある図はその場で差し替え、無い図は mermaid を読み込んでから描く。
 * @returns すべての枠を描き終えたら解決する（描けなかった枠はソースとエラーを見せる）
 */
export async function renderMermaid(root: HTMLElement, options: MermaidOptions): Promise<void> {
  const blocks = [...root.querySelectorAll<HTMLElement>('.yomu-mermaid')];
  if (blocks.length === 0) {
    return;
  }
  const current = ++generation;
  // 図を置く枠の幅。ガントチャートはこの幅で描く（枠はすべて本文の幅なので、最初の 1 つで足りる）
  const width = blocks[0].clientWidth;
  const config = mermaidConfig(options.theme, width);
  const pending: { block: HTMLElement; source: string; key: string }[] = [];
  for (const block of blocks) {
    // ソースは最初の描画の前に保存しておく。テーマを変えた時の描き直しに使う
    block.dataset.source ??= block.querySelector('.yomu-mermaid-source')?.textContent ?? '';
    const source = block.dataset.source;
    const key = [config.theme, width, source].join('\n');
    const svg = cache.get(key);
    if (svg !== undefined) {
      block.innerHTML = svg;
    } else {
      pending.push({ block, source, key });
    }
  }
  if (pending.length === 0) {
    return;
  }

  let mermaid: MermaidApi;
  try {
    mermaid = await (options.load ?? loadMermaid)();
  } catch (error) {
    for (const { block } of pending) {
      showError(block, messageOf(error));
    }
    return;
  }
  if (current !== generation) {
    return;
  }
  mermaid.initialize(config);
  for (const { block, source, key } of pending) {
    try {
      const { svg } = await mermaid.render('yomu-mermaid-' + ++renderCount, source);
      cache.set(key, svg);
      if (current === generation) {
        block.innerHTML = svg;
      }
    } catch (error) {
      if (current === generation) {
        showError(block, messageOf(error));
      }
    }
  }
}

/** テーマを変えた時に、描いた図を元のソースに戻してから描き直す */
export function resetMermaid(root: HTMLElement): void {
  for (const block of root.querySelectorAll<HTMLElement>('.yomu-mermaid')) {
    const source = block.dataset.source;
    if (source === undefined) {
      continue;
    }
    const pre = document.createElement('pre');
    pre.className = 'yomu-mermaid-source';
    pre.textContent = source;
    block.replaceChildren(pre);
  }
}
