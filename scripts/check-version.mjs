// package.json、src-tauri/Cargo.toml、src-tauri/tauri.conf.json の版が揃っているかを検査する。
// タグ（引数か GITHUB_REF_NAME）があれば、それが v<package.json の版> であることも検査する。
//
//   node scripts/check-version.mjs          # 版の一致だけ
//   node scripts/check-version.mjs v1.0.0   # タグも検査する
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Cargo.toml の [package] 節の version を読む。無ければ undefined */
export function readCargoVersion(cargoToml) {
  let inPackage = false;
  for (const line of cargoToml.split(/\r?\n/)) {
    const section = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (section) {
      inPackage = section[1].trim() === 'package';
      continue;
    }
    const version = inPackage && line.match(/^\s*version\s*=\s*"([^"]+)"/);
    if (version) {
      return version[1];
    }
  }
  return undefined;
}

/** 食い違いを英語の文の配列で返す。揃っていれば空 */
export function checkVersions({ packageVersion, cargoToml, tauriConfVersion, tag }) {
  const errors = [];
  const cargoVersion = readCargoVersion(cargoToml);
  if (cargoVersion === undefined) {
    errors.push('Cargo.toml has no [package] version');
  } else if (cargoVersion !== packageVersion) {
    errors.push(
      `Cargo.toml version ${cargoVersion} does not match package.json version ${packageVersion}`
    );
  }
  if (tauriConfVersion !== '../package.json') {
    errors.push(`tauri.conf.json version must be "../package.json", but is "${tauriConfVersion}"`);
  }
  if (tag !== undefined && tag !== `v${packageVersion}`) {
    errors.push(`Tag ${tag} does not match package.json version ${packageVersion}`);
  }
  return errors;
}

function main() {
  const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const tag = process.argv[2] || process.env.GITHUB_REF_NAME?.match(/^v\d/)?.input;
  const errors = checkVersions({
    packageVersion: JSON.parse(read('package.json')).version,
    cargoToml: read('src-tauri/Cargo.toml'),
    tauriConfVersion: JSON.parse(read('src-tauri/tauri.conf.json')).version,
    tag,
  });
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(error);
    }
    process.exit(1);
  }
  console.log('Versions match.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
