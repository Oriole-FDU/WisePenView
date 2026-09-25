/**
 * UIS actionPayload 约定为二维码图片的 base64 字符（无 data: 前缀）；
 * 若带 `data:image/*;base64,` 亦可；会去掉 base64 段中的空白/换行。
 */
export function resolveUisQrImageDataUrl(payload: string): string | null {
  const raw = payload.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const base64Sep = ';base64,';
  const sepIdx = lower.indexOf(base64Sep);
  if (lower.startsWith('data:image/') && sepIdx !== -1) {
    const prefix = raw.slice(0, sepIdx + base64Sep.length);
    const b64 = raw.slice(sepIdx + base64Sep.length).replace(/\s/g, '');
    return b64 ? `${prefix}${b64}` : null;
  }

  const compact = raw.replace(/\s/g, '');
  if (compact.length < 24 || !/^[A-Za-z0-9+/]+=*$/.test(compact)) {
    return null;
  }
  if (compact.startsWith('iVBORw0KGgo')) {
    return `data:image/png;base64,${compact}`;
  }
  if (compact.startsWith('/9j/')) {
    return `data:image/jpeg;base64,${compact}`;
  }
  return `data:image/png;base64,${compact}`;
}
