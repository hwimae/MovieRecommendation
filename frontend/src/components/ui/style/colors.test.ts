import { describe, expect, it } from "vitest";

import { colors } from "./colors";
import { contrastRatio } from "./contrast";

/** WCAG 2.1 AA — chữ thường cần 4.5:1 */
const AA_TEXT = 4.5;
/** WCAG 2.1 SC 1.4.11 — ranh giới control và focus ring cần 3:1 */
const AA_NON_TEXT = 3;

const TEXT_PAIRS: Array<[string, string, string]> = [
  ["text trên surface", colors.text, colors.surface],
  ["text trên background", colors.text, colors.background],
  ["text trên surfaceMuted", colors.text, colors.surfaceMuted],
  ["textMuted trên surface", colors.textMuted, colors.surface],
  ["textMuted trên background", colors.textMuted, colors.background],
  [
    "textPlaceholder trên surfaceMuted",
    colors.textPlaceholder,
    colors.surfaceMuted,
  ],
  ["primary trên surface", colors.primary, colors.surface],
  ["primaryStrong trên surface", colors.primaryStrong, colors.surface],
  ["chữ trắng trên primary", "#ffffff", colors.primary],
  ["chữ trắng trên primaryStrong", "#ffffff", colors.primaryStrong],
  ["onPrimarySoft trên primarySoft", colors.onPrimarySoft, colors.primarySoft],
  ["success trên surface", colors.success, colors.surface],
  ["onSuccessSoft trên successSoft", colors.onSuccessSoft, colors.successSoft],
  ["warning trên surface", colors.warning, colors.surface],
  ["onWarningSoft trên warningSoft", colors.onWarningSoft, colors.warningSoft],
  ["danger trên surface", colors.danger, colors.surface],
  ["onDangerSoft trên dangerSoft", colors.onDangerSoft, colors.dangerSoft],
  ["info trên surface", colors.info, colors.surface],
  ["onInfoSoft trên infoSoft", colors.onInfoSoft, colors.infoSoft],
];

const NON_TEXT_PAIRS: Array<[string, string, string]> = [
  ["borderField trên surface", colors.borderField, colors.surface],
  ["focus ring (primary) trên surface", colors.primary, colors.surface],
  ["focus ring (primary) trên background", colors.primary, colors.background],
  ["fill warning trên trackMuted", colors.warning, colors.trackMuted],
  ["fill success trên trackMuted", colors.success, colors.trackMuted],
  ["fill danger trên trackMuted", colors.danger, colors.trackMuted],
];

describe("bảng màu dùng chung", () => {
  it.each(TEXT_PAIRS)(
    "%s đạt WCAG AA cho chữ thường",
    (_label, foreground, background) => {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(
        AA_TEXT,
      );
    },
  );

  it.each(NON_TEXT_PAIRS)(
    "%s đạt WCAG 1.4.11 cho thành phần phi văn bản",
    (_label, a, b) => {
      expect(contrastRatio(a, b)).toBeGreaterThanOrEqual(AA_NON_TEXT);
    },
  );

  it("mọi giá trị đều là mã hex 6 ký tự", () => {
    for (const [name, value] of Object.entries(colors)) {
      expect(value, `colors.${name}`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
