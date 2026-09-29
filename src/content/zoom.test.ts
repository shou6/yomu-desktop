import { afterEach, describe, expect, it } from 'vitest';
import { openZoom, zoomTarget } from './zoom';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('zoomTarget', () => {
  it('画像と Mermaid の図はズームできる', () => {
    document.body.innerHTML =
      '<img id="img" src="a.png"><div class="yomu-mermaid"><svg id="svg"><g><rect id="rect"/></g></svg></div>';
    expect(zoomTarget(document.getElementById('img'))?.id).toBe('img');
    expect(zoomTarget(document.getElementById('rect'))?.id).toBe('svg');
  });

  it('リンクの中の画像はリンクを優先し、ズームしない。ほかの要素もズームしない', () => {
    document.body.innerHTML = '<a href="x.md"><img id="img" src="a.png"></a><p id="p">text</p>';
    expect(zoomTarget(document.getElementById('img'))).toBeUndefined();
    expect(zoomTarget(document.getElementById('p'))).toBeUndefined();
  });
});

describe('openZoom', () => {
  it('重ね表示を開き、閉じるボタンと Esc で閉じる', () => {
    document.body.innerHTML = '<img id="img" src="a.png">';
    const img = document.getElementById('img') as HTMLImageElement;
    openZoom(img, 'Close');
    const close = document.querySelector<HTMLButtonElement>('.yomu-zoom-close');
    expect(close?.getAttribute('aria-label')).toBe('Close');
    close?.click();
    expect(document.querySelector('.yomu-zoom')).toBeNull();
    openZoom(img, 'Close');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.querySelector('.yomu-zoom')).toBeNull();
  });
});
