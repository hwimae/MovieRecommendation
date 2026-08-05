import React from "react";

import { CardSurface } from "./card-surface";

export type StatCardTone = "neutral" | "success" | "warning" | "danger";

export type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  tone?: StatCardTone;
  className?: string;
};

const TONE_VALUE_CLASS: Record<StatCardTone, string> = {
  neutral: "text-text",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

/**
 * Bọc ngoài bằng div để phát data-testid/data-tone riêng, thay vì mở rộng
 * CardSurfaceProps cho phép truyền data-* từ ngoài — giữ CardSurface đơn giản.
 */
export function StatCard({
  label,
  value,
  delta,
  tone = "neutral",
  className,
}: StatCardProps) {
  return (
    <div data-testid="stat-card" data-tone={tone} className={className}>
      <CardSurface bodyClassName="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">
          {label}
        </p>
        <p
          className={`text-2xl font-bold tabular-nums ${TONE_VALUE_CLASS[tone]}`}
        >
          {value}
        </p>
        {delta ? <p className="text-sm text-textMuted">{delta}</p> : null}
      </CardSurface>
    </div>
  );
}
