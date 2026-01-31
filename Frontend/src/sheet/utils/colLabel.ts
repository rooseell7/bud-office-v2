/**
 * Column index → letter label (0→A, 1→B, ..., 25→Z, 26→AA, ...)
 */

export function colToLabel(index: number): string {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}
