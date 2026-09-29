/**
 * CommonJS で配られているプラグインの関数を取り出す。
 * exports.default に関数を置くモジュール（@vscode/markdown-it-katex など）は、Node（Vitest）では
 * default import が関数になるが、Vite のビルドでは { default: 関数 } のモジュールのままになる
 */
export function interopDefault<T extends (...args: never[]) => unknown>(
  mod: T | ({ default: T } & Record<string, unknown>)
): T {
  return typeof mod === 'function' ? mod : mod.default;
}
