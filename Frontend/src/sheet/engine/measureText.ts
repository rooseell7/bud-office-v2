/**
 * Measure text width via canvas. Canonical sheet: src/sheet/**
 */

let canvas: HTMLCanvasElement | null = null;

function getCanvas(): HTMLCanvasElement {
  if (!canvas) {
    canvas = document.createElement('canvas');
  }
  return canvas;
}

const measureCache = new Map<string, number>();

/** Measure text width in px. Uses cache key `${font}|${text}` */
export function measureTextPx(text: string, font: string): number {
  const key = `${font}|${text}`;
  const cached = measureCache.get(key);
  if (cached != null) return cached;

  const ctx = getCanvas().getContext('2d');
  if (!ctx) return text.length * 8; // fallback

  ctx.font = font;
  const metrics = ctx.measureText(text || ' ');
  const w = Math.ceil(metrics.width);
  measureCache.set(key, w);
  return w;
}
