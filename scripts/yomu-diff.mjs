// 取り込み済みの Yomu の版（= package.json の版）と、Yomu の最新のリリースの差分のうち、
// こちらと共有しているファイルだけを、対応するこちらのパスと並べて出す。gh コマンドを使う。
//
//   node scripts/yomu-diff.mjs          # 最新のリリースと比べる
//   node scripts/yomu-diff.mjs v0.5.0   # 指定したタグと比べる
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REPO = 'shou6/yomu';

/** Yomu のパスの接頭辞と、こちらで探すディレクトリ。上から順に、ファイルがある方を対応先にする */
const SHARED = [
  { prefix: 'src/reader/', dirs: ['src/reader/', 'src/content/'] },
  {
    prefix: 'src/test/unit/',
    dirs: ['src/reader/', 'src/content/', 'src/styles/', 'src/l10n/'],
  },
  { prefix: 'media/', dirs: ['src/styles/'] },
  { prefix: 'fonts/', dirs: ['src/assets/fonts/'] },
];

/** 名前が変わったファイル */
const RENAMED = new Map([['l10n/bundle.l10n.ja.json', 'src/l10n/ja.json']]);

function isShared(path) {
  return RENAMED.has(path) || SHARED.some(({ prefix }) => path.startsWith(prefix));
}

/** Yomu のパスに対応するこちらのパス。共有していないか、こちらに無ければ undefined */
export function mapToDesktop(path, exists) {
  const renamed = RENAMED.get(path);
  if (renamed !== undefined) {
    return exists(renamed) ? renamed : undefined;
  }
  for (const { prefix, dirs } of SHARED) {
    if (path.startsWith(prefix)) {
      const rest = path.slice(prefix.length);
      return dirs.map((dir) => dir + rest).find(exists);
    }
  }
  return undefined;
}

function formatFile({ filename, status, additions, deletions }) {
  return `  ${status.padEnd(9)} ${filename} (+${additions} -${deletions})`;
}

/** 差分の一覧を文字列で返す。files は GitHub の compare API の files の形 */
export function buildReport({ base, head, files, exists }) {
  const lines = [
    `Yomu ${base} -> ${head}`,
    `https://github.com/${REPO}/compare/${base}...${head}`,
    '',
    'Shared files:',
  ];
  const added = [];
  let shared = 0;
  for (const file of files) {
    const desktop = mapToDesktop(file.filename, exists);
    if (desktop !== undefined) {
      lines.push(`${formatFile(file)} -> ${desktop}`);
      shared++;
    } else if (file.status === 'added' && isShared(file.filename)) {
      added.push(formatFile(file));
    }
  }
  if (shared === 0) {
    lines.push('  (none)');
  }
  if (added.length > 0) {
    lines.push('', 'New upstream files without a counterpart:', ...added);
  }
  return lines.join('\n');
}

function gh(...args) {
  return execFileSync('gh', ['api', ...args], { encoding: 'utf8' }).trim();
}

function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const version = JSON.parse(readFileSync(`${root}package.json`, 'utf8')).version;
  const base = `v${version}`;
  const head = process.argv[2] || gh(`repos/${REPO}/releases/latest`, '--jq', '.tag_name');
  if (head === base) {
    console.log(`Up to date with Yomu ${base}.`);
    return;
  }
  const files = JSON.parse(gh(`repos/${REPO}/compare/${base}...${head}`, '--jq', '.files'));
  console.log(buildReport({ base, head, files, exists: (path) => existsSync(root + path) }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
