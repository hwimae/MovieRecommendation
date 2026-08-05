/**
 * Bảng màu dùng chung của toàn bộ frontend — nguồn duy nhất.
 * Sửa ở đây là mọi utility Tailwind và mọi component HeroUI đổi theo.
 * Mọi cặp chữ/nền ở đây được colors.test.ts canh theo ngưỡng WCAG.
 */
export const colors = {
  // Nền và chữ
  background: "#f6f9fc",
  surface: "#ffffff",
  surfaceMuted: "#f1f5f9",
  text: "#0f172a",
  textMuted: "#64748b",
  textPlaceholder: "#5f6b7a",
  border: "#e2e8f0",
  borderField: "#8492a4",
  trackMuted: "#e8eef6",

  // Primary
  primary: "#0369a1",
  primaryStrong: "#075985",
  primarySoft: "#e0f2fe",
  onPrimarySoft: "#0369a1",

  // Trạng thái
  success: "#15803d",
  successSoft: "#dcfce7",
  onSuccessSoft: "#166534",
  warning: "#b45309",
  warningSoft: "#fef3c7",
  onWarningSoft: "#92400e",
  danger: "#b91c1c",
  dangerSoft: "#fee2e2",
  onDangerSoft: "#991b1b",
  info: "#0369a1",
  infoSoft: "#e0f2fe",
  onInfoSoft: "#0369a1",
} as const;

export type ColorName = keyof typeof colors;
