// 将颜色值转换为 RGB 通道字符串，例如 "#ff0000" -> "255, 0, 0"，"rgba(255, 0, 0, 0.5)" -> "255, 0, 0"
export function toRgbChannels(value: string): string | undefined {
  const color = value.trim();
  const hex = color.match(/^#([0-9a-f]{3,8})$/i)?.[1];
  if (hex) {
    const normalized =
      hex.length <= 4
        ? hex
            .slice(0, 3)
            .split('')
            .map((channel) => `${channel}${channel}`)
            .join('')
        : hex.slice(0, 6);
    return [0, 2, 4]
      .map((index) => Number.parseInt(normalized.slice(index, index + 2), 16))
      .join(', ');
  }

  const rgb = color.match(/^rgba?\(([^)]+)\)$/i)?.[1];
  if (!rgb) return undefined;
  const channels = rgb
    .split(/[,\s/]+/)
    .slice(0, 3)
    .map((channel) => Number.parseFloat(channel));
  return channels.length === 3 && channels.every(Number.isFinite) ? channels.join(', ') : undefined;
}
