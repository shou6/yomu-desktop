# Changelog

This file lists the notable changes to Yomu.

It follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-10-03

The first release of the desktop version of [Yomu](https://github.com/shou6/yomu), based on the extension v0.4.0. Versions follow the extension from this release.

### Added

- Open Markdown files by double-click (file association for `.md` and `.markdown`), drag and drop, or the file dialog. A second launch opens the file in the running window.
- Rendering and typesetting from Yomu: CommonMark and GFM, footnotes, KaTeX math, Mermaid diagrams, syntax highlighting, YAML front matter, and bundled Japanese fonts.
- Raw HTML: `<details>`, `<summary>`, `<kbd>`, `<sub>`, `<sup>`, `<br>` and inline decoration tags such as `<span>`, `<b>` and `<mark>`. On inline tags the `style` attribute keeps text color and decoration only.
- Themes: `auto` (follows the OS light or dark mode), `paper`, `sepia`, `dark`, Solarized, GitHub, Nord and Catppuccin.
- Settings dialog for theme, layout, fonts, code folding, editor command, language and custom CSS.
- Outline and reading history in a side panel, reading progress in the toolbar, and resuming from where you stopped.
- Links between documents with back and forward, live update on save, and opening the file in your editor at the line you are reading.
- Find in page, focus mode, zoom for images and diagrams, folding for long code, print and PDF, and custom CSS.
- English and Japanese interface.
- Installers for Windows (NSIS), macOS (universal) and Linux (AppImage and deb).

[Unreleased]: https://github.com/shou6/yomu-desktop/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/shou6/yomu-desktop/releases/tag/v0.4.0
