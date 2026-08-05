import React, { type ReactNode } from "react";

export type EmptyStateTone = "info" | "error" | "success";

export type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: EmptyStateTone;
  className?: string;
};

const TONE_CLASS: Record<EmptyStateTone, string> = {
  info: "bg-infoSoft text-onInfoSoft",
  error: "bg-dangerSoft text-onDangerSoft",
  success: "bg-successSoft text-onSuccessSoft",
};

export function EmptyState({
  title,
  description,
  action,
  tone = "info",
  className,
}: EmptyStateProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      data-testid="empty-state"
      data-tone={tone}
      className={`flex flex-col items-start gap-2 rounded-card px-5 py-4 ${TONE_CLASS[tone]} ${className ?? ""}`}
    >
      <p className="font-semibold">{title}</p>
      {description ? <p className="text-sm opacity-90">{description}</p> : null}
      {action}
    </div>
  );
}
