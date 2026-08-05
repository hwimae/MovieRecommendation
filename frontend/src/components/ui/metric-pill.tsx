import React from "react";

import { Chip, type ChipTone } from "./chip";

type MetricPillProps = {
  label: string;
  value: string;
  tone?: "primary" | "success" | "warning" | "default";
};

const TONE_TO_CHIP_TONE: Record<
  NonNullable<MetricPillProps["tone"]>,
  ChipTone
> = {
  primary: "primary",
  success: "success",
  warning: "warning",
  default: "neutral",
};

export function MetricPill({
  label,
  value,
  tone = "primary",
}: MetricPillProps) {
  return (
    <Chip tone={TONE_TO_CHIP_TONE[tone]} className="metric-pill">
      <span className="metric-pill-label">{label}</span>
      <strong>{value}</strong>
    </Chip>
  );
}
