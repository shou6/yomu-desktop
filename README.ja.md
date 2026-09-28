# Yomu

[English](README.md)

和文の組版を重視した、デスクトップ向けの Markdown リーダーです。`.md` ファイルをダブルクリックすると、VS Code 拡張機能 [Yomu](https://github.com/shou6/yomu) と同じ組版で開きます。

> [!NOTE]
> 開発中です。最初のリリースは v1.0.0 の予定です。

## 開発

必要なもの：Node.js 24、Rust（stable）、各 OS の [Tauri の前提ソフトウェア](https://tauri.app/start/prerequisites/)。

```bash
npm install
npm run tauri dev     # 開発用に起動する
npm run check         # 整形、lint、型検査、テスト、ビルド、版の検査
npm run tauri build   # インストーラーを作る
```

## ライセンス

[MIT](LICENSE)
