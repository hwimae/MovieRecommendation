import { Button as HeroButton } from "@heroui/react";
import clsx from "clsx";
import React, { type ComponentProps } from "react";

type HeroButtonProps = ComponentProps<typeof HeroButton>;

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonProps = Omit<
  HeroButtonProps,
  "color" | "variant" | "radius" | "size"
> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
};

const VARIANT_PROPS: Record<
  ButtonVariant,
  Pick<HeroButtonProps, "color" | "variant">
> = {
  primary: { color: "primary", variant: "solid" },
  secondary: { color: "default", variant: "bordered" },
  ghost: { color: "primary", variant: "light" },
  danger: { color: "danger", variant: "flat" },
};

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "shadow-primary",
  secondary: "border-borderField text-text bg-surface",
  ghost: "",
  danger: "",
};

export function Button({
  variant = "primary",
  size = "md",
  isLoading,
  className,
  ...rest
}: ButtonProps) {
  return (
    <HeroButton
      {...rest}
      {...VARIANT_PROPS[variant]}
      size={size}
      // radius="full" của HeroUI (bán kính 9999px) thay vì utility rounded-pill (999px):
      // tránh hai class radius cạnh tranh theo thứ tự CSS; cả hai đều cho hình pill.
      radius="full"
      isLoading={isLoading}
      aria-busy={isLoading ? true : undefined}
      className={clsx("font-semibold", VARIANT_CLASS[variant], className)}
      data-testid="button"
      data-variant={variant}
    />
  );
}
