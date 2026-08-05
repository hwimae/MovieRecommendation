import { Link as HeroLink } from "@heroui/react";
import React, { type ComponentProps } from "react";

type HeroLinkProps = ComponentProps<typeof HeroLink>;

export type TextLinkTone = "primary" | "muted";

export type TextLinkProps = Omit<HeroLinkProps, "color" | "underline"> & {
  tone?: TextLinkTone;
};

export function TextLink({ tone = "primary", ...rest }: TextLinkProps) {
  return (
    <HeroLink
      {...rest}
      color={tone === "primary" ? "primary" : "foreground"}
      underline="hover"
      data-testid="text-link"
      data-tone={tone}
    />
  );
}
