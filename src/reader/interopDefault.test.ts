import { describe, expect, it } from 'vitest';
import { interopDefault } from './interopDefault';

describe('interopDefault', () => {
  const plugin = () => undefined;

  it('関数ならそのまま返す（Node で読んだ時）', () => {
    expect(interopDefault(plugin)).toBe(plugin);
  });

  it('default に関数を持つモジュールなら、その関数を返す（Vite でビルドした時）', () => {
    expect(interopDefault({ __esModule: true, default: plugin })).toBe(plugin);
  });
});
