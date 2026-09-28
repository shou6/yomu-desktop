import { describe, expect, it } from 'vitest';
import { checkVersions, readCargoVersion } from './check-version.mjs';

const cargoToml = (version) =>
  [
    '[package]',
    'name = "yomu-desktop"',
    `version = "${version}"`,
    '',
    '[dependencies]',
    'tauri = { version = "2", features = [] }',
    'serde = { version = "1" }',
  ].join('\n');

describe('readCargoVersion', () => {
  it('[package] の version を読む', () => {
    expect(readCargoVersion(cargoToml('1.2.3'))).toBe('1.2.3');
  });

  it('依存の version や、別の節の version は読まない', () => {
    const toml = ['[dependencies]', 'version = "9.9.9"', '[package]', 'name = "x"'].join('\n');
    expect(readCargoVersion(toml)).toBeUndefined();
  });

  it('CRLF の改行でも読める', () => {
    expect(readCargoVersion(cargoToml('1.0.0').replace(/\n/g, '\r\n'))).toBe('1.0.0');
  });
});

describe('checkVersions', () => {
  const ok = {
    packageVersion: '1.0.0',
    cargoToml: cargoToml('1.0.0'),
    tauriConfVersion: '../package.json',
  };

  it('すべて一致すればエラーは無い', () => {
    expect(checkVersions(ok)).toEqual([]);
    expect(checkVersions({ ...ok, tag: 'v1.0.0' })).toEqual([]);
  });

  it('Cargo.toml の版が違えば知らせる', () => {
    expect(checkVersions({ ...ok, cargoToml: cargoToml('0.9.0') })).toEqual([
      'Cargo.toml version 0.9.0 does not match package.json version 1.0.0',
    ]);
  });

  it('Cargo.toml に版が無ければ知らせる', () => {
    expect(checkVersions({ ...ok, cargoToml: '[package]\nname = "x"' })).toEqual([
      'Cargo.toml has no [package] version',
    ]);
  });

  it('タグが v と package.json の版の組み合わせでなければ知らせる', () => {
    expect(checkVersions({ ...ok, tag: 'v1.0.1' })).toEqual([
      'Tag v1.0.1 does not match package.json version 1.0.0',
    ]);
    expect(checkVersions({ ...ok, tag: '1.0.0' })).toEqual([
      'Tag 1.0.0 does not match package.json version 1.0.0',
    ]);
  });

  it('tauri.conf.json の version が package.json を参照していなければ知らせる', () => {
    expect(checkVersions({ ...ok, tauriConfVersion: '1.0.0' })).toEqual([
      'tauri.conf.json version must be "../package.json", but is "1.0.0"',
    ]);
  });
});
