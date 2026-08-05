import { heroui } from "@heroui/react";
import type { Config } from "tailwindcss";

import { colors, radius, shadows } from "./src/components/ui/style";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
    "../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: { ...colors },
      borderRadius: {
        card: radius.card,
        field: radius.field,
        pill: radius.pill,
        small: radius.small,
      },
      boxShadow: {
        soft: shadows.soft,
        card: shadows.card,
        primary: shadows.primary,
      },
    },
  },
  plugins: [
    heroui({
      layout: {
        radius: {
          small: radius.small,
          medium: radius.field,
          large: radius.card,
        },
        borderWidth: {
          small: "1px",
          medium: "1px",
          large: "1px",
        },
      },
      themes: {
        light: {
          colors: {
            background: colors.background,
            foreground: colors.text,
            divider: colors.border,
            focus: colors.primary,
            primary: {
              DEFAULT: colors.primary,
              foreground: "#ffffff",
              50: colors.primarySoft,
              600: colors.primary,
              700: colors.primaryStrong,
            },
            success: {
              DEFAULT: colors.success,
              foreground: "#ffffff",
              50: colors.successSoft,
              700: colors.onSuccessSoft,
            },
            warning: {
              DEFAULT: colors.warning,
              foreground: "#ffffff",
              50: colors.warningSoft,
              700: colors.onWarningSoft,
            },
            danger: {
              DEFAULT: colors.danger,
              foreground: "#ffffff",
              50: colors.dangerSoft,
              700: colors.onDangerSoft,
            },
          },
        },
      },
    }),
  ],
};

export default config;
