/** Column index → letter (0→A, 1→B, ..., 25→Z, 26→AA) */
export function colToLetter(col: number): string {
  let s = '';
  do {
    s = String.fromCharCode(65 + (col % 26)) + s;
    col = Math.floor(col / 26) - 1;
  } while (col >= 0);
  return s;
}

/** Letter → column index (A→0, B→1, ..., Z→25, AA→26) */
export function letterToCol(s: string): number {
  const str = (s || '').trim().toUpperCase();
  let col = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i) - 64;
    if (c < 1 || c > 26) return 0;
    col = col * 26 + c;
  }
  return col - 1;
}
