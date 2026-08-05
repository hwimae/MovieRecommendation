import { Card, CardBody, CardHeader } from "@heroui/react";
import clsx from "clsx";
import React, {
  type FormEventHandler,
  type PropsWithChildren,
  type ReactNode,
} from "react";

export type CardSurfaceProps = PropsWithChildren<{
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  padding?: "md" | "lg";
  as?: "div" | "section" | "form" | "aside" | "article";
  className?: string;
  bodyClassName?: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  "aria-label"?: string;
}>;

export function CardSurface({
  title,
  description,
  action,
  padding = "md",
  as = "div",
  className,
  bodyClassName,
  onSubmit,
  children,
  ...rest
}: CardSurfaceProps) {
  const hasHeader = Boolean(title || description || action);

  return (
    <Card
      {...rest}
      as={as}
      shadow="none"
      className={clsx(
        "bg-surface border border-border rounded-card shadow-card",
        className,
      )}
      data-testid="card-surface"
      // Type của HeroUI Card cố định onSubmit theo HTMLDivElement (CardProps kế thừa
      // HTMLHeroUIProps<"div"> không phụ thuộc "as"); ép kiểu để giữ contract
      // onSubmit?: FormEventHandler<HTMLFormElement> cho call site khi as="form".
      onSubmit={
        onSubmit as unknown as FormEventHandler<HTMLDivElement> | undefined
      }
    >
      {hasHeader ? (
        <CardHeader
          className="flex items-start justify-between gap-4 px-5 pt-5 pb-0"
          data-testid="card-surface-header"
        >
          <div className="flex flex-col gap-1">
            {title ? (
              <h3 className="text-base font-semibold text-text">{title}</h3>
            ) : null}
            {description ? (
              <p className="text-sm text-textMuted">{description}</p>
            ) : null}
          </div>
          {action}
        </CardHeader>
      ) : null}
      {/* Không truyền bodyClassName: mặc định gap-4 để khôi phục khoảng cách của
          .form-surface-body cũ. Có truyền bodyClassName: giá trị đó THAY THẾ hoàn
          toàn gap-4 (không cộng dồn) — tránh hai class gap cạnh tranh theo thứ tự CSS. */}
      <CardBody
        className={clsx(
          padding === "lg" ? "p-6" : "p-5",
          bodyClassName ?? "gap-4",
        )}
      >
        {children}
      </CardBody>
    </Card>
  );
}
