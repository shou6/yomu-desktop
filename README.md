# Yomu

[![CI](https://github.com/shou6/yomu-desktop/actions/workflows/ci.yml/badge.svg)](https://github.com/shou6/yomu-desktop/actions/workflows/ci.yml)

[日本語](README.ja.md)

Yomu is a desktop Markdown reader, typeset for reading Japanese text.
Double-click a `.md` file and it opens with the same typesetting as the [Yomu](https://github.com/shou6/yomu) extension for Visual Studio Code.
Yomu reads, and your editor edits: open the file in your editor with one click, and the page follows your saves.

![A Markdown document in Yomu with the outline panel](images/screenshot.png)

## Features

- **Japanese typography**: separate fonts for Japanese and Latin text, comfortable line height, and tighter spacing around Japanese punctuation. Yomu ships with Japanese fonts, so the text looks the same on every OS.
- **Rendering**: CommonMark plus GFM tables, strikethrough, task lists and footnotes, syntax highlighting, Mermaid diagrams, math with KaTeX (`$...$`, `$$...$$` and `math` code blocks), heading anchors, local and remote images, and YAML front matter in a collapsible section. In raw HTML, Yomu renders `<details>`, `<summary>`, `<kbd>`, `<sub>`, `<sup>`, `<br>` and inline decoration tags such as `<span>`, `<b>` and `<mark>`. On inline tags the `style` attribute keeps only text color and decoration (`color`, `background-color`, `font-weight`, `font-style`, `text-decoration`, `font-size`). Other tags are shown as text.
- **Themes**: `auto` (follows the OS light or dark mode), `paper`, `sepia`, `dark`, Solarized, GitHub, Nord and Catppuccin.
- **Outline**: the side panel lists the headings. Click to jump; the current heading follows your scrolling.
- **Links between documents**: relative links to Markdown files open in the same window, with `#heading` support. Go back and forward like a browser. Other files open in their default app, and web links open in your browser.
- **Reading history**: the toolbar shows how far you have read, and Yomu continues from where you stopped. The side panel lists recent documents with their progress.
- **Live update**: when you save the file in your editor, the page updates and keeps its scroll position.
- **Open in editor**: opens the file in your editor at the line you are reading.
- **Find in page**, **focus mode** (dims everything except the block you are reading), **zoom** for images and diagrams, **folding** for long code, **print and PDF**, and **custom CSS**.
- **English and Japanese**: the interface follows the OS language, or choose one in Settings.

## Install

Download the installer for your OS from [Releases](https://github.com/shou6/yomu-desktop/releases).

| OS | File |
| --- | --- |
| Windows 10 / 11 (x64) | `Yomu_<version>_x64-setup.exe` |
| macOS (Apple Silicon and Intel) | `Yomu_<version>_universal.dmg` |
| Linux | `Yomu_<version>_amd64.AppImage` or `Yomu_<version>_amd64.deb` |

The installers are not code-signed, so the OS shows a warning the first time:

- **Windows**: SmartScreen says "Windows protected your PC". Click **More info**, then **Run anyway**.
- **macOS**: Gatekeeper refuses to open an app from an unknown developer. Open **System Settings** > **Privacy & Security** and click **Open Anyway**. If macOS reports the app as broken, run `xattr -dr com.apple.quarantine /Applications/Yomu.app` in Terminal.
- **Linux**: no warning. Make the AppImage executable with `chmod +x`.

The Windows installer registers Yomu for `.md` and `.markdown` files. To open Markdown files with Yomu by double-click, choose Yomu as the default app in the OS settings.

## Usage

Open a file in any of these ways:

- Double-click a `.md` file (after choosing Yomu as the default app), or use **Open with**.
- Drop a file onto the window.
- Click **Open File** in the toolbar, or press **Ctrl+O**.

### Keyboard shortcuts

On macOS, use Cmd instead of Ctrl.

| Action | Keys |
| --- | --- |
| Open a file | Ctrl+O |
| Back / Forward | Alt+Left / Alt+Right, or the mouse back and forward buttons |
| Show or hide the side panel | Ctrl+B |
| Find in page | Ctrl+F (Enter for next, Shift+Enter for previous, Esc to close) |
| Focus mode | Ctrl+Shift+F |
| Print | Ctrl+P |
| Open in editor | Ctrl+E |
| Settings | Ctrl+, |

## Settings

Open **Settings** from the toolbar (or press **Ctrl+,**). Changes apply right away.
Yomu saves them to `settings.json` in the app config folder (`%APPDATA%\io.github.shou6.yomu` on Windows).

| Setting | Default | What it does |
| --- | --- | --- |
| `theme` | `auto` | `auto` uses `paper` in light mode and `dark` in dark mode. Also `sepia`, `solarized-light`, `solarized-dark`, `github-light`, `github-dark`, `nord`, `catppuccin-latte` and `catppuccin-mocha`. |
| `frontMatter` | `collapsed` | How to show YAML front matter: `collapsed`, `expanded` or `hidden`. |
| `focusMode` | `false` | Dim everything except the block you are reading. |
| `layout.maxWidth` | `820` | Maximum width of the text in pixels. `0` means no limit. |
| `layout.align` | `center` | Where the text sits in a wide window: `left`, `center` or `right`. |
| `layout.padding` | `32` | Horizontal padding in pixels. |
| `font.family` | Latin fonts, then Japanese fonts | CSS `font-family` for the text. Put Latin fonts first and Japanese fonts after them. |
| `font.codeFamily` | (empty) | Font for code. Empty uses a Japanese monospace font with an exact 1:2 width ratio, so text diagrams line up. |
| `font.size` | `16` | Font size in pixels. |
| `font.lineHeight` | `1.8` | Line height as a multiple of the font size. |
| `code.foldLines` | `20` | Fold code blocks longer than this many lines. `0` never folds. |
| `editor.command` | (empty) | Command to open the file in your editor. `{file}` is the file path and `{line}` the line you are reading, for example `code -g {file}:{line}`. Empty uses Notepad on Windows, TextEdit on macOS, and `xdg-open` on Linux. |
| `language` | `auto` | Interface language: `auto` (follows the OS), `en` or `ja`. |
| `customCss` | (empty) | Path to a CSS file loaded after the theme. Saved changes apply immediately. |

### Bundled fonts

Three Japanese fonts ship with Yomu, under the SIL Open Font License. Use their names in `font.family`:

- `BIZ UDPGothic` (Morisawa): a universal-design gothic made for legibility.
- `Noto Sans JP` (Google): a variable font with weights 100 to 900. Used by default.
- `BIZ UDPMincho` (Morisawa): a universal-design mincho (serif) for book-like reading.

### Custom CSS

Every theme color is a CSS variable, so a small file is enough to restyle the page:

```css
body[data-theme] {
  --yomu-link: rebeccapurple;
  --yomu-h2-border: #888;
}
```

Variables:

- Page: `--yomu-bg` `--yomu-fg` `--yomu-link` `--yomu-hr`
- Headings: `--yomu-h1` to `--yomu-h5`, `--yomu-h1-border` to `--yomu-h3-border`
- Tables: `--yomu-th` `--yomu-th-border` `--yomu-td-border` `--yomu-row-hover`
- Code: `--yomu-pre-bg` `--yomu-pre-border` `--yomu-code-bg` `--yomu-code-fg` `--yomu-code-label-fg` `--yomu-code-label-bg`
- Quotes: `--yomu-quote-border` `--yomu-quote-bg` `--yomu-quote-fg`
- Syntax highlighting: `--yomu-hl-keyword` `--yomu-hl-string` `--yomu-hl-number` `--yomu-hl-comment` `--yomu-hl-function` `--yomu-hl-type` `--yomu-hl-variable` `--yomu-hl-attr` `--yomu-hl-meta`
- Zoom: `--yomu-zoom-backdrop`

Any other rule works too. The text lives in `<div id="content">`, and a `<div class="yomu-code" data-lang="…">` wraps each code block with a language.

## Development

Requirements: Node.js 24, Rust (stable), and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS.

```bash
npm install
npm run tauri dev     # Start the app for development
npm run check         # Format, lint, type check, tests, build, and version check
npm run tauri build   # Build the installer
```

## License

[MIT](LICENSE). The bundled fonts are under the SIL Open Font License; see `src/assets/fonts/`.
