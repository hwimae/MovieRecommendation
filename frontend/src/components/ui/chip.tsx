import { Chip as HeroChip } from "@heroui/react";
import React, { type ComponentProps } from "react";

type HeroChipProps = ComponentProps<typeof HeroChip>;

export type ChipTone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

export type ChipProps = Omit<HeroChipProps, "color" | "variant" | "radius"> & {
  tone?: ChipTone;
};

/**
 * info dùng cùng màu với primary trong bảng màu (#0369a1) nên map về primary.
 * Vẫn giữ tone "info" ở API để call site diễn đạt đúng ý nghĩa.
 */
const TONE_COLOR: Record<ChipTone, HeroChipProps["color"]> = {
  neutral: "default",
  primary: "primary",
  success: "success",
  warning: "warning",
  danger: "danger",
  info: "primary",
};

export function Chip({ tone = "neutral", ...rest }: ChipProps) {
  return (
    <HeroChip
      {...rest}
      color={TONE_COLOR[tone]}
      variant="flat"
      radius="full"
      data-testid="chip"
      data-tone={tone}
    />
  );
}
