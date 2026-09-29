import * as assert from 'node:assert';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it } from 'vitest';
import { DEFAULT_SETTINGS, THEMES } from '../reader/readerSettings';

// Yomu の themes.test.ts、fonts.test.ts、readerCss.test.ts を移したもの。
// VS Code に固有の検査（package.json の設定の定義、公開パッケージ、vscode テーマ）は外した

const STYLES_DIR = import.meta.dirname;
const THEMES_DIR = path.join(STYLES_DIR, 'themes');
const FONTS_DIR = path.resolve(STYLES_DIR, '../assets/fonts');

function read(file: string): string {
  return fs.readFileSync(path.join(STYLES_DIR, file), 'utf8');
}

/** CSS の中で定義している --yomu-* の変数名 */
function definedVariables(css: string): Set<string> {
  return new Set([...css.matchAll(/(--yomu-[\w-]+)\s*:/g)].map((m) => m[1]));
}

/** CSS の中で参照している --yomu-* の変数名 */
function usedVariables(css: string): Set<string> {
  return new Set([...css.matchAll(/var\(\s*(--yomu-[\w-]+)/g)].map((m) => m[1]));
}

describe('テーマの CSS', () => {
  it('設定で選べるテーマごとに、styles/themes/<name>.css がある', () => {
    for (const theme of THEMES) {
      assert.ok(fs.existsSync(path.join(THEMES_DIR, theme + '.css')), theme + '.css が無い');
    }
  });

  it('各テーマは同じ変数の組を定義している（構成が共通で、色だけが違う）', () => {
    const sets = THEMES.map((theme) => ({
      theme,
      names: definedVariables(fs.readFileSync(path.join(THEMES_DIR, theme + '.css'), 'utf8')),
    }));
    const base = sets[0];
    for (const other of sets.slice(1)) {
      assert.deepStrictEqual(
        [...other.names].sort(),
        [...base.names].sort(),
        other.theme + ' と ' + base.theme + ' で定義している変数が違う'
      );
    }
  });

  it('各テーマは自分の data-theme のセレクタの中で定義している', () => {
    for (const theme of THEMES) {
      const css = fs.readFileSync(path.join(THEMES_DIR, theme + '.css'), 'utf8');
      assert.ok(css.includes(`body[data-theme='${theme}']`), theme + '.css にセレクタが無い');
    }
  });

  it('reader.css と highlight.css が参照する --yomu-* は、設定由来の変数を除いてテーマが定義している', () => {
    const defined = definedVariables(fs.readFileSync(path.join(THEMES_DIR, 'paper.css'), 'utf8'));
    // 設定（readerSettings の cssVariables）から入る変数
    const fromSettings = new Set([
      '--yomu-max-width',
      '--yomu-margin-left',
      '--yomu-margin-right',
      '--yomu-padding',
      '--yomu-font-family',
      '--yomu-code-font-family',
      '--yomu-font-size',
      '--yomu-line-height',
    ]);
    for (const file of ['reader.css', 'highlight.css']) {
      const used = usedVariables(read(file));
      const missing = [...used].filter((name) => !defined.has(name) && !fromSettings.has(name));
      assert.deepStrictEqual(missing, [], file + ' が参照する変数がテーマに無い');
    }
  });
});

function fontsCss(): string {
  return read('fonts.css');
}

/** 同梱のファイルを url() で読む @font-face の書体名。local() だけの書体（システムフォントの別名）は含めない */
function bundledFamilies(): string[] {
  const faces = fontsCss().match(/@font-face\s*{[^}]*}/g) ?? [];
  return [
    ...new Set(
      faces
        .filter((face) => face.includes('url('))
        .map((face) => face.match(/font-family:\s*['"]([^'"]+)['"]/)?.[1])
        .filter((family): family is string => family !== undefined)
    ),
  ];
}

describe('同梱フォント', () => {
  it('fonts.css の @font-face が参照するファイルは src/assets/fonts/ にある', () => {
    const urls = [...fontsCss().matchAll(/url\(['"]?\.\.\/assets\/fonts\/([^'")]+)['"]?\)/g)].map(
      (m) => m[1]
    );
    assert.ok(urls.length >= 2, '@font-face が足りない: ' + urls.join(', '));
    for (const file of urls) {
      assert.ok(fs.existsSync(path.join(FONTS_DIR, file)), file + ' が無い');
      assert.match(file, /\.woff2$/, 'woff2 でない: ' + file);
    }
  });

  it('fonts.css の font-family ごとに、OFL のライセンスファイルがある', () => {
    const families = bundledFamilies();
    assert.ok(families.length >= 1);
    const licenses = fs.readdirSync(FONTS_DIR).filter((name) => /^OFL-.*\.txt$/.test(name));
    assert.strictEqual(licenses.length, families.length, 'ライセンスの数が書体の数と合わない');
    for (const license of licenses) {
      const text = fs.readFileSync(path.join(FONTS_DIR, license), 'utf8');
      assert.ok(text.includes('SIL Open Font License'), license + ' が OFL でない');
    }
  });

  it('同梱のゴシック体は本文の既定値に入り、明朝体は選べる書体として登録だけする', () => {
    // 明朝体は好みが分かれるので既定にはしない。font.family に名前を書けば使える
    const families = bundledFamilies();
    for (const family of ['BIZ UDPGothic', 'Noto Sans JP']) {
      assert.ok(families.includes(family), family + ' が同梱されていない');
      assert.ok(DEFAULT_SETTINGS.fontFamily.includes(family), family + ' が既定値に無い');
    }
    assert.ok(families.includes('BIZ UDPMincho'), 'BIZ UDPMincho が同梱されていない');
    assert.ok(!DEFAULT_SETTINGS.fontFamily.includes('Mincho'), '明朝体が既定値に入っている');
  });

  it('明朝体は Regular と Bold の 2 つの太さを持つ', () => {
    const faces = (fontsCss().match(/@font-face\s*{[^}]*}/g) ?? []).filter((face) =>
      face.includes("'BIZ UDPMincho'")
    );
    const weights = faces.map((face) => face.match(/font-weight:\s*(\d+)/)?.[1]).sort();
    assert.deepStrictEqual(weights, ['400', '700']);
  });

  it('Yomu Symbols は、欧文の等幅フォントの罫線と図形を、ちょうど半角（0.5em）の幅に縮める', () => {
    // 各フォントの ASCII と罫線の字幅（em）。fontTools で hmtx の値を unitsPerEm で割って測った
    const advances: Record<string, { local: string; advance: number }> = {
      'Yomu Symbols Cascadia': { local: 'CascadiaMono-Regular', advance: 1200 / 2048 },
      'Yomu Symbols Consolas': { local: 'Consolas', advance: 1126 / 2048 },
      'Yomu Symbols Menlo': { local: 'Menlo-Regular', advance: 1233 / 2048 },
      'Yomu Symbols DejaVu': { local: 'DejaVuSansMono', advance: 1233 / 2048 },
      'Yomu Symbols Liberation': { local: 'LiberationMono-Regular', advance: 1229 / 2048 },
    };
    const faces = fontsCss().match(/@font-face\s*{[^}]*}/g) ?? [];
    for (const [family, { local, advance }] of Object.entries(advances)) {
      const face = faces.find((f) => f.includes(`font-family: '${family}'`));
      assert.ok(face, family + ' の @font-face が無い');
      assert.ok(face.includes(`local('${local}')`), family + ' に ' + local + ' が無い');
      assert.ok(!face.includes('url('), family + ' はフォントを同梱しない');
      const sizeAdjust = Number(face.match(/size-adjust:\s*([\d.]+)%/)?.[1]);
      assert.ok(Math.abs((advance * sizeAdjust) / 100 - 0.5) < 0.0001, family + ': ' + sizeAdjust);
      for (const range of ['U+2190-21FF', 'U+2500-257F', 'U+2580-259F', 'U+25A0-25FF']) {
        assert.ok(face.includes(range), family + ' の unicode-range に ' + range + ' が無い');
      }
    }
  });
});

describe('reader.css', () => {
  it('Mermaid の円グラフは最大幅を 480px に抑える', () => {
    // mermaid は円グラフを高さ 450 の固定の枠で描き、style 属性の max-width で本文の幅いっぱいまで広げる。
    // 他の図は中身に合わせた大きさになるので、円グラフだけが大きく見える。style 属性に勝つよう !important を付ける
    const rule = read('reader.css').match(
      /\.yomu-mermaid svg\[aria-roledescription='pie'\]\s*{([^}]*)}/
    )?.[1];
    assert.ok(rule, '円グラフの規則が無い');
    assert.match(rule, /max-width:\s*min\(100%,\s*480px\)\s*!important/);
  });

  it('ズームの重ね表示の画像は、最大の幅と高さの制限を外す', () => {
    // 重ね表示では元の大きさで置いて transform で縮めるので、本文の img の制限が残ると潰れる
    const rule = read('reader.css').match(/\.yomu-zoom-content\s*{([^}]*)}/)?.[1];
    assert.ok(rule, '.yomu-zoom-content の規則が無い');
    assert.match(rule, /max-width:\s*none/);
    assert.match(rule, /max-height:\s*none/);
  });

  it('表のセルは語の途中で折らない（数字やコードが縦に割れない）', () => {
    // anywhere は最小幅の計算にも効き、狭い列が 1 文字幅まで縮んで数字やコードが途中で折れる。
    // break-word は収まらない語だけを折るので、列は語の幅を保つ。和文は普段どおり文字の間で折り返す
    const rule = read('reader.css').match(/(?:^|\n)td\s*{([^}]*)}/)?.[1];
    assert.ok(rule, 'td の規則が無い');
    assert.match(rule, /overflow-wrap:\s*break-word/);
  });
});
