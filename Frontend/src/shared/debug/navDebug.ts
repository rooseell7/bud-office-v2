import { DEBUG_NAV } from '../config/env';

type Off = () => void;

export function enableClickDebug(): Off {
  if (!DEBUG_NAV) return () => {};

  const mark = (e: any, phase: string) => {
    const path = (e.composedPath?.() || [])
      .slice(0, 6)
      .map((n: any) => n?.tagName || n?.nodeName)
      .join('>');
    console.log(`[${phase}] ${e.type}`, {
      target: e.target?.tagName,
      defaultPrevented: e.defaultPrevented,
      cancelBubble: e.cancelBubble,
      path,
    });
  };

  const cap = (e: any) => mark(e, 'CAPTURE');
  const bub = (e: any) => mark(e, 'BUBBLE');

  document.addEventListener('click', cap, true);
  document.addEventListener('click', bub, false);
  document.addEventListener('pointerdown', cap, true);
  document.addEventListener('pointerdown', bub, false);

  console.log('[dbg] click debug ON');

  return () => {
    document.removeEventListener('click', cap, true);
    document.removeEventListener('click', bub, false);
    document.removeEventListener('pointerdown', cap, true);
    document.removeEventListener('pointerdown', bub, false);
    console.log('[dbg] click debug OFF');
  };
}
