export function getAxiosErrorMessage(e: any, fallback: string = 'Невідома помилка'): string {
  const data = e?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;

  if (data && typeof data === 'object') {
    const msg = (data as any).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
    if (Array.isArray(msg) && msg.length) return String(msg[0]);
  }

  const msg = e?.message;
  if (typeof msg === 'string' && msg.trim()) return msg;

  return fallback;
}