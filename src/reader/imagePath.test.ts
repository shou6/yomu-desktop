import { describe, expect, it } from 'vitest';
import { resolveImagePath } from './imagePath';

describe('resolveImagePath', () => {
  const win = 'C:\\docs\\設計';

  it('相対パスは文書のフォルダから解決し、. と .. を畳む（Windows）', () => {
    expect(resolveImagePath(win, './images/a.png')).toBe('C:\\docs\\設計\\images\\a.png');
    expect(resolveImagePath(win, '../assets/b.png')).toBe('C:\\docs\\assets\\b.png');
    expect(resolveImagePath(win, 'c.png')).toBe('C:\\docs\\設計\\c.png');
    expect(resolveImagePath(win, 'x/../../y.png')).toBe('C:\\docs\\y.png');
  });

  it('相対パスは文書のフォルダから解決する（macOS と Linux）', () => {
    expect(resolveImagePath('/home/u/docs', './a.png')).toBe('/home/u/docs/a.png');
    expect(resolveImagePath('/home/u/docs', '../img/b.png')).toBe('/home/u/img/b.png');
  });

  it('根より上へは出ない', () => {
    expect(resolveImagePath('C:\\docs', '../../../a.png')).toBe('C:\\a.png');
    expect(resolveImagePath('/docs', '../../a.png')).toBe('/a.png');
  });

  it('markdown-it がパーセントエンコードした文字を戻す', () => {
    expect(resolveImagePath(win, './%E5%9B%B3/%E7%94%BB%20%E5%83%8F.png')).toBe(
      'C:\\docs\\設計\\図\\画 像.png'
    );
  });

  it('絶対パスは文書のフォルダに関わらずそのまま（区切りは OS に合わせる）', () => {
    expect(resolveImagePath(win, 'D:/pictures/a.png')).toBe('D:\\pictures\\a.png');
    expect(resolveImagePath(win, 'D:\\pictures\\..\\b.png')).toBe('D:\\b.png');
    expect(resolveImagePath('/home/u/docs', '/tmp/a.png')).toBe('/tmp/a.png');
    expect(resolveImagePath(win, '\\\\server\\share\\a.png')).toBe('\\\\server\\share\\a.png');
  });

  it('クエリとフラグメントは落とす', () => {
    expect(resolveImagePath('/docs', 'a.png?raw=true#x')).toBe('/docs/a.png');
  });

  it('URL（https:、data: など）はファイルでないので undefined', () => {
    expect(resolveImagePath(win, 'https://example.com/a.png')).toBeUndefined();
    expect(resolveImagePath(win, 'data:image/png;base64,AAAA')).toBeUndefined();
    expect(resolveImagePath(win, '//example.com/a.png')).toBeUndefined();
    expect(resolveImagePath(win, 'file:///C:/a.png')).toBeUndefined();
    expect(resolveImagePath(win, '')).toBeUndefined();
  });
});
