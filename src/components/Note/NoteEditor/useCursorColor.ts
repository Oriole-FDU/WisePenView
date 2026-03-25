import { useMemo } from 'react';

function colorFromString(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = seed.charCodeAt(i) + ((h << 5) - h);
  }
  const n = (h & 0xffffff).toString(16).padStart(6, '0');
  return `#${n}`;
}

/** 由 userId + resourceId 派生稳定光标色，避免每次刷新随机变化 */
export function useCursorColor(userId: string, resourceId: string): string {
  return useMemo(() => colorFromString(`${userId}:${resourceId}`), [userId, resourceId]);
}
