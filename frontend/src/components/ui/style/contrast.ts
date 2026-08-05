/**
 * Tỉ lệ tương phản theo WCAG 2.1 (công thức relative luminance).
 * Dùng bởi colors.test.ts để canh bảng màu không tụt dưới ngưỡng.
 */
function channels(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  if (value.length !== 6) {
    throw new Error(`Mã màu phải ở dạng #rrggbb, nhận được: ${hex}`);
  }
  return [0, 2, 4].map(
    (offset) => parseInt(value.slice(offset, offset + 2), 16) / 255,
  ) as [number, number, number];
}

function linearize(channel: number): number {
  return channel <= 0.03928
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [
    relativeLuminance(foreground),
    relativeLuminance(background),
  ].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}
