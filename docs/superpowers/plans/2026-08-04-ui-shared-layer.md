# Tầng giao diện dùng chung + màn pilot /finance/expenses — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng tầng giao diện dùng chung cho `frontend/` — giá trị màu/bo góc/đổ bóng ở một nơi duy nhất, 9 primitive wrap HeroUI, ESLint chặn import HeroUI trực tiếp — rồi redesign màn `/finance/expenses` làm pilot.

**Architecture:** Giá trị thô nằm ở `src/components/ui/style/*.ts` (TypeScript, không phải CSS, vì plugin HeroUI cần màu literal). `tailwind.config.ts` import từ đó và map vào **cả** `theme.extend` (sinh utility class) **và** `heroui({ themes.light })` (component HeroUI) → hai hệ không bao giờ lệch. Primitive trong `src/components/ui/` là wrapper mỏng chốt sẵn variant. ESLint `no-restricted-imports` chặn `@heroui/react` ngoài `src/components/ui/**`.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript strict, Tailwind CSS 3.4, HeroUI 2.8, Vitest 2 (`renderToStaticMarkup` + `expect(html).toContain(...)`, môi trường node, **không có** `@testing-library/react`).

**Spec:** `docs/superpowers/specs/2026-08-04-design-system-layer-design.md`

**Branch:** `design/ui-shared-layer` (đã tạo, spec đã commit tại `d69adf6`)

## Global Constraints

- Mọi lệnh chạy từ repo root dạng `pnpm --dir frontend <script>`. Không `cd` vào `frontend`.
- Test viết bằng `renderToStaticMarkup` từ `react-dom/server` + `expect(html).toContain(...)`. **Không** cài `@testing-library/react`, **không** dùng `render`/`screen`/`getByRole`.
- Import trong file test dùng **đường dẫn tương đối** (`./colors`, `../ui/button`), theo đúng kiểu đa số test hiện có.
- Test đặt cạnh source: `<name>.test.tsx` cạnh `<name>.tsx`.
- Toàn bộ chữ hiển thị cho người dùng bằng **tiếng Việt**.
- `pnpm --dir frontend lint` chạy `--max-warnings=0` — mọi warning là fail.
- Baseline trước khi bắt đầu: **59 file test, 152 test, tất cả xanh**. Mỗi task kết thúc phải giữ toàn bộ test xanh.
- Bảng màu đã chốt và đã kiểm WCAG — **không tự đổi giá trị hex nào**. Nếu cần màu mới, thêm vào `colors.ts` và thêm cặp tương ứng vào `colors.test.ts`.
- `data-testid` của primitive là hợp đồng với test: `button`, `form-field`, `card-surface`, `chip`, `text-link`, `data-table`, `stat-card`, `segmented-filter`, `empty-state`.
- Commit sau mỗi task. Không amend commit của task trước.

---

## File Structure

**Tạo mới**

| File | Trách nhiệm |
|---|---|
| `frontend/src/components/ui/style/colors.ts` | Bảng màu — nguồn duy nhất |
| `frontend/src/components/ui/style/radius.ts` | Bo góc — nguồn duy nhất |
| `frontend/src/components/ui/style/shadows.ts` | Đổ bóng — nguồn duy nhất |
| `frontend/src/components/ui/style/contrast.ts` | Hàm tính tỉ lệ tương phản WCAG |
| `frontend/src/components/ui/style/index.ts` | Barrel cho `tailwind.config.ts` |
| `frontend/src/components/ui/style/colors.test.ts` | Canh mọi cặp màu đạt ngưỡng WCAG |
| `frontend/src/components/ui/style/contrast.test.ts` | Canh hàm tính tương phản đúng |
| `frontend/src/components/ui/index.ts` | Barrel primitive cho call site |
| `frontend/src/components/ui/button.tsx` + `.test.tsx` | Primitive Button |
| `frontend/src/components/ui/card-surface.tsx` + `.test.tsx` | Primitive CardSurface |
| `frontend/src/components/ui/chip.tsx` + `.test.tsx` | Primitive Chip |
| `frontend/src/components/ui/text-link.tsx` + `.test.tsx` | Primitive TextLink |
| `frontend/src/components/ui/data-table.tsx` + `.test.tsx` | Primitive DataTable |
| `frontend/src/components/ui/stat-card.tsx` + `.test.tsx` | Primitive StatCard |
| `frontend/src/components/ui/segmented-filter.tsx` + `.test.tsx` | Primitive SegmentedFilter |
| `frontend/src/components/ui/empty-state.tsx` + `.test.tsx` | Primitive EmptyState |
| `frontend/src/app/globals.css.test.ts` | Ratchet — `globals.css` chỉ được ngắn đi |

**Sửa**

| File | Việc |
|---|---|
| `frontend/tailwind.config.ts` | Import style, map vào `theme.extend` + `heroui()`, xóa `darkMode` |
| `frontend/eslint.config.mjs` | Thêm `no-restricted-imports` |
| `frontend/src/components/ui/form-field.tsx` + `.test.tsx` | Thêm kind select/radio, error, required |
| `frontend/src/components/ui/metric-pill.tsx` | Viết lại ruột trên `Chip`, API không đổi |
| `frontend/src/components/ui/global-header.tsx` | Dùng `Button`/`TextLink` nội bộ |
| `frontend/src/app/globals.css` | Rule global + chrome; xóa class đã chết |
| `frontend/src/components/finance/finance-expenses-content.tsx` + `.test.tsx` | Viết lại bằng primitive |
| `frontend/src/components/finance/finance-expenses.tsx` + `.test.tsx` | `submitMessage` có tone tường minh |
| 17 file call site (Task 9) | Đổi sang import từ `components/ui` |

**Xóa**

| File | Lý do |
|---|---|
| `frontend/src/components/ui/form-surface.tsx` | `CardSurface` thay thế |
| `frontend/src/components/ui/form-surface.test.tsx` | Thay bằng `card-surface.test.tsx` |

---

## Task 1: Nguồn giá trị giao diện + test canh tương phản WCAG

**Files:**
- Create: `frontend/src/components/ui/style/contrast.ts`
- Create: `frontend/src/components/ui/style/contrast.test.ts`
- Create: `frontend/src/components/ui/style/colors.ts`
- Create: `frontend/src/components/ui/style/colors.test.ts`
- Create: `frontend/src/components/ui/style/radius.ts`
- Create: `frontend/src/components/ui/style/shadows.ts`
- Create: `frontend/src/components/ui/style/index.ts`
- Create: `frontend/src/app/globals.css.test.ts`
- Modify: `frontend/tailwind.config.ts`

**Interfaces:**
- Produces: `colors` (object, khóa camelCase → mã hex), `radius` (`{ card, field, pill, small }`), `shadows` (`{ soft, card, primary }`), `contrastRatio(foreground: string, background: string): number`. Mọi task sau dùng utility Tailwind sinh từ đây: `bg-surface`, `bg-surfaceMuted`, `text-text`, `text-textMuted`, `border-border`, `border-borderField`, `rounded-card`, `rounded-field`, `rounded-pill`, `shadow-card`, `shadow-soft`, `shadow-primary`.

- [ ] **Step 1: Viết test cho hàm tính tương phản**

`frontend/src/components/ui/style/contrast.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { contrastRatio } from "./contrast";

describe("contrastRatio", () => {
  it("trả 21 cho cặp đen trắng", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("trả 1 cho hai màu giống nhau", () => {
    expect(contrastRatio("#0369a1", "#0369a1")).toBeCloseTo(1, 5);
  });

  it("không phụ thuộc thứ tự tham số", () => {
    expect(contrastRatio("#0369a1", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#0369a1"),
      5,
    );
  });

  it("khớp giá trị đã tính tay cho primary trên nền trắng", () => {
    expect(contrastRatio("#0369a1", "#ffffff")).toBeCloseTo(5.93, 1);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --dir frontend test -- contrast`
Expected: FAIL — `Failed to resolve import "./contrast"`

- [ ] **Step 3: Viết `contrast.ts`**

`frontend/src/components/ui/style/contrast.ts`:

```ts
/**
 * Tỉ lệ tương phản theo WCAG 2.1 (công thức relative luminance).
 * Dùng bởi colors.test.ts để canh bảng màu không tụt dưới ngưỡng.
 */
function channels(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  if (value.length !== 6) {
    throw new Error(`Mã màu phải ở dạng #rrggbb, nhận được: ${hex}`);
  }
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
}

function linearize(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map(linearize);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `pnpm --dir frontend test -- contrast`
Expected: PASS — 4 test

- [ ] **Step 5: Viết test cho bảng màu**

`frontend/src/components/ui/style/colors.test.ts`:

```ts
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
  ["textPlaceholder trên surfaceMuted", colors.textPlaceholder, colors.surfaceMuted],
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
  ["borderField trên background", colors.borderField, colors.background],
  ["focus ring (primary) trên surface", colors.primary, colors.surface],
  ["focus ring (primary) trên background", colors.primary, colors.background],
  ["fill warning trên trackMuted", colors.warning, colors.trackMuted],
  ["fill success trên trackMuted", colors.success, colors.trackMuted],
  ["fill danger trên trackMuted", colors.danger, colors.trackMuted],
];

describe("bảng màu dùng chung", () => {
  it.each(TEXT_PAIRS)("%s đạt WCAG AA cho chữ thường", (_label, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each(NON_TEXT_PAIRS)("%s đạt WCAG 1.4.11 cho thành phần phi văn bản", (_label, a, b) => {
    expect(contrastRatio(a, b)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it("mọi giá trị đều là mã hex 6 ký tự", () => {
    for (const [name, value] of Object.entries(colors)) {
      expect(value, `colors.${name}`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
```

- [ ] **Step 6: Chạy test, xác nhận fail**

Run: `pnpm --dir frontend test -- colors`
Expected: FAIL — `Failed to resolve import "./colors"`

- [ ] **Step 7: Viết `colors.ts`, `radius.ts`, `shadows.ts`, `index.ts`**

`frontend/src/components/ui/style/colors.ts`:

```ts
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
```

`frontend/src/components/ui/style/radius.ts`:

```ts
/**
 * Độ bo góc dùng chung — nguồn duy nhất.
 * Thay cho 17 giá trị border-radius rời rạc từng có trong globals.css.
 */
export const radius = {
  card: "1.25rem",
  field: "0.875rem",
  pill: "999px",
  small: "0.5rem",
} as const;
```

`frontend/src/components/ui/style/shadows.ts`:

```ts
/** Các mức đổ bóng dùng chung — nguồn duy nhất. */
export const shadows = {
  soft: "0 4px 14px rgba(15, 23, 42, 0.05)",
  card: "0 10px 26px rgba(15, 23, 42, 0.07)",
  primary: "0 6px 16px rgba(3, 105, 161, 0.24)",
} as const;
```

`frontend/src/components/ui/style/index.ts`:

```ts
export { colors, type ColorName } from "./colors";
export { radius } from "./radius";
export { shadows } from "./shadows";
export { contrastRatio } from "./contrast";
```

- [ ] **Step 8: Chạy test, xác nhận pass**

Run: `pnpm --dir frontend test -- colors`
Expected: PASS — 27 test (19 cặp chữ + 7 cặp phi văn bản + 1 định dạng hex)

- [ ] **Step 9: Kiểm màu `ocean` trong tailwind config còn dùng không**

Run: `grep -rn "ocean-" frontend/src || echo "KHONG DUNG"`
Expected: in `KHONG DUNG` → được phép xóa khối `colors.ocean` ở Step 10. Nếu có kết quả, giữ khối `ocean` nguyên trạng và ghi lại file nào đang dùng.

- [ ] **Step 10: Viết lại `tailwind.config.ts`**

`frontend/tailwind.config.ts` — thay toàn bộ nội dung:

```ts
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
```

Ba thay đổi có chủ ý so với bản cũ: bỏ `darkMode: "class"` (đã chốt chỉ làm light), bỏ khối `colors.ocean` (Step 9 xác nhận không dùng), và `primary` đổi từ `#0284c7` sang `#0369a1` để chữ trắng đạt 4.5:1.

- [ ] **Step 11: Viết ratchet test cho `globals.css`**

`frontend/src/app/globals.css.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Mốc chặn: globals.css chỉ được ngắn đi, không bao giờ dài thêm.
 * Style mới phải đi qua src/components/ui/ (primitive + style/), không thêm
 * class bespoke vào đây. Khi migrate xong một màn thì hạ con số này xuống.
 * KHÔNG BAO GIỜ nâng con số này lên.
 */
const MAX_LINES = 3275;

describe("globals.css", () => {
  it(`không dài quá ${MAX_LINES} dòng`, () => {
    const source = readFileSync(join(__dirname, "globals.css"), "utf8");
    const lineCount = source.split("\n").length;

    expect(lineCount).toBeLessThanOrEqual(MAX_LINES);
  });
});
```

- [ ] **Step 12: Chạy toàn bộ test + typecheck + build**

Run: `pnpm --dir frontend test`
Expected: PASS — 62 file test (59 cũ + `contrast.test.ts`, `colors.test.ts`, `globals.css.test.ts`), 0 fail

Run: `pnpm --dir frontend typecheck`
Expected: không có lỗi

Run: `pnpm --dir frontend build`
Expected: build thành công. Bước này quan trọng vì `tailwind.config.ts` vừa đổi — nếu plugin HeroUI không nhận cấu trúc `themes.light.colors` thì lỗi hiện ở đây, không hiện ở test.

- [ ] **Step 13: Commit**

```bash
git add frontend/src/components/ui/style frontend/src/app/globals.css.test.ts frontend/tailwind.config.ts
git commit -m "feat(ui): nguồn giá trị giao diện dùng chung + test canh tương phản WCAG"
```

---

## Task 2: Primitive `Button` + barrel `components/ui/index.ts`

**Files:**
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/components/ui/button.test.tsx`
- Create: `frontend/src/components/ui/index.ts`

**Interfaces:**
- Consumes: utility Tailwind từ Task 1 (`shadow-primary`, `rounded-pill`).
- Produces: `Button` với props `variant?: "primary" | "secondary" | "ghost" | "danger"` (mặc định `"primary"`), `size?: "sm" | "md"` (mặc định `"md"`), cùng mọi props còn lại của HeroUI Button **trừ** `color`, `variant`, `radius`. Phát `data-testid="button"`. Barrel `frontend/src/components/ui/index.ts` là đường import duy nhất cho call site ngoài `components/ui/`.

- [ ] **Step 1: Viết test**

`frontend/src/components/ui/button.test.tsx`:

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("render nhãn và data-testid", () => {
    const html = renderToStaticMarkup(<Button>Thêm khoản chi</Button>);

    expect(html).toContain('data-testid="button"');
    expect(html).toContain("Thêm khoản chi");
  });

  it("mặc định là variant primary", () => {
    const html = renderToStaticMarkup(<Button>Lưu</Button>);

    expect(html).toContain('data-variant="primary"');
  });

  it("giữ nguyên nhãn và đặt aria-busy khi đang loading", () => {
    const html = renderToStaticMarkup(<Button isLoading>Thêm khoản chi</Button>);

    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Thêm khoản chi");
  });

  it("không đặt aria-busy khi không loading", () => {
    const html = renderToStaticMarkup(<Button>Thêm khoản chi</Button>);

    expect(html).not.toContain("aria-busy");
  });

  it("phơi variant ra data-variant cho từng biến thể", () => {
    for (const variant of ["primary", "secondary", "ghost", "danger"] as const) {
      const html = renderToStaticMarkup(<Button variant={variant}>Nút</Button>);

      expect(html).toContain(`data-variant="${variant}"`);
    }
  });

  it("giữ className do call site truyền vào", () => {
    const html = renderToStaticMarkup(<Button className="global-header-auth-button">Nút</Button>);

    expect(html).toContain("global-header-auth-button");
  });

  it("render thành thẻ a khi truyền as", () => {
    const html = renderToStaticMarkup(
      <Button as="a" href="/stories">
        Xem truyện
      </Button>,
    );

    expect(html).toContain("<a");
    expect(html).toContain('href="/stories"');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --dir frontend test -- button`
Expected: FAIL — `Failed to resolve import "./button"`

- [ ] **Step 3: Viết `button.tsx`**

`frontend/src/components/ui/button.tsx`:

```tsx
import { Button as HeroButton } from "@heroui/react";
import clsx from "clsx";
import React, { type ComponentProps } from "react";

type HeroButtonProps = ComponentProps<typeof HeroButton>;

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonProps = Omit<HeroButtonProps, "color" | "variant" | "radius" | "size"> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
};

const VARIANT_PROPS: Record<ButtonVariant, Pick<HeroButtonProps, "color" | "variant">> = {
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
      radius="full"
      isLoading={isLoading}
      aria-busy={isLoading ? true : undefined}
      className={clsx("font-semibold", VARIANT_CLASS[variant], className)}
      data-testid="button"
      data-variant={variant}
    />
  );
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `pnpm --dir frontend test -- button`
Expected: PASS — 7 test

- [ ] **Step 5: Tạo barrel**

`frontend/src/components/ui/index.ts`:

```ts
export { Button, type ButtonProps, type ButtonVariant } from "./button";
```

Các task sau sẽ thêm export vào file này. Đây là đường import duy nhất mà call site ngoài `components/ui/` được dùng.

- [ ] **Step 6: Chạy toàn bộ test + typecheck**

Run: `pnpm --dir frontend test`
Expected: PASS — 63 file test, 0 fail

Run: `pnpm --dir frontend typecheck`
Expected: không có lỗi

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ui/button.tsx frontend/src/components/ui/button.test.tsx frontend/src/components/ui/index.ts
git commit -m "feat(ui): primitive Button + barrel components/ui"
```

---

## Task 3: Primitive `CardSurface`, xóa `FormSurface`, cập nhật 5 call site

**Files:**
- Create: `frontend/src/components/ui/card-surface.tsx`
- Create: `frontend/src/components/ui/card-surface.test.tsx`
- Delete: `frontend/src/components/ui/form-surface.tsx`
- Delete: `frontend/src/components/ui/form-surface.test.tsx`
- Modify: `frontend/src/components/ui/index.ts`
- Modify: `frontend/src/app/login/page.tsx:9,75,121`
- Modify: `frontend/src/app/register/page.tsx:8,56,106`
- Modify: `frontend/src/components/review-form.tsx:7,58,112`
- Modify: `frontend/src/components/story-advisor-form.tsx:13,81,127`
- Modify: `frontend/src/components/story-advisor-panel.tsx:6,19,28`
- Modify: `frontend/src/app/register/page.test.tsx`

**Interfaces:**
- Consumes: utility Tailwind từ Task 1; barrel từ Task 2.
- Produces: `CardSurface` với props `title?`, `description?`, `action?` (ReactNode), `padding?: "md" | "lg"` (mặc định `"md"`), `as?: "div" | "section" | "form" | "aside"` (mặc định `"div"`), `className?`, `bodyClassName?`, `onSubmit?`, `aria-label?`. Phát `data-testid="card-surface"`. Giữ `className` passthrough để 5 call site của `FormSurface` chỉ cần đổi tên component.

- [ ] **Step 1: Viết test**

`frontend/src/components/ui/card-surface.test.tsx`:

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CardSurface } from "./card-surface";

describe("CardSurface", () => {
  it("render children và data-testid", () => {
    const html = renderToStaticMarkup(
      <CardSurface>
        <p>Nội dung thẻ</p>
      </CardSurface>,
    );

    expect(html).toContain('data-testid="card-surface"');
    expect(html).toContain("Nội dung thẻ");
  });

  it("không render vùng header khi không có title/description/action", () => {
    const html = renderToStaticMarkup(<CardSurface>Chỉ có ruột</CardSurface>);

    expect(html).not.toContain('data-testid="card-surface-header"');
  });

  it("render title, description và action khi được truyền", () => {
    const html = renderToStaticMarkup(
      <CardSurface
        title="Thêm khoản chi mới"
        description="Ghi nhanh giao dịch thủ công."
        action={<span>Bộ lọc</span>}
      >
        Ruột
      </CardSurface>,
    );

    expect(html).toContain('data-testid="card-surface-header"');
    expect(html).toContain("Thêm khoản chi mới");
    expect(html).toContain("Ghi nhanh giao dịch thủ công.");
    expect(html).toContain("Bộ lọc");
  });

  it("giữ className do call site truyền vào", () => {
    const html = renderToStaticMarkup(<CardSurface className="auth-card">Ruột</CardSurface>);

    expect(html).toContain("auth-card");
  });

  it("render thành thẻ form khi as=form", () => {
    const html = renderToStaticMarkup(
      <CardSurface as="form">
        <input name="amount" />
      </CardSurface>,
    );

    expect(html).toContain("<form");
  });

  it("render thành thẻ section và giữ aria-label", () => {
    const html = renderToStaticMarkup(
      <CardSurface as="section" aria-label="Lịch sử chi tiêu">
        Ruột
      </CardSurface>,
    );

    expect(html).toContain("<section");
    expect(html).toContain('aria-label="Lịch sử chi tiêu"');
  });

  it("render thành thẻ aside", () => {
    const html = renderToStaticMarkup(
      <CardSurface as="aside" aria-label="Khu vực AI phân tích">
        Ruột
      </CardSurface>,
    );

    expect(html).toContain("<aside");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --dir frontend test -- card-surface`
Expected: FAIL — `Failed to resolve import "./card-surface"`

- [ ] **Step 3: Viết `card-surface.tsx`**

`frontend/src/components/ui/card-surface.tsx`:

```tsx
import { Card, CardBody, CardHeader } from "@heroui/react";
import clsx from "clsx";
import React, { type FormEventHandler, type PropsWithChildren, type ReactNode } from "react";

export type CardSurfaceProps = PropsWithChildren<{
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  padding?: "md" | "lg";
  as?: "div" | "section" | "form" | "aside";
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
  children,
  ...rest
}: CardSurfaceProps) {
  const hasHeader = Boolean(title || description || action);

  return (
    <Card
      {...rest}
      as={as}
      shadow="none"
      className={clsx("bg-surface border border-border rounded-card shadow-card", className)}
      data-testid="card-surface"
    >
      {hasHeader ? (
        <CardHeader
          className="flex items-start justify-between gap-4 px-5 pt-5 pb-0"
          data-testid="card-surface-header"
        >
          <div className="flex flex-col gap-1">
            {title ? <h3 className="text-base font-semibold text-text">{title}</h3> : null}
            {description ? <p className="text-sm text-textMuted">{description}</p> : null}
          </div>
          {action}
        </CardHeader>
      ) : null}
      <CardBody className={clsx(padding === "lg" ? "p-6" : "p-5", bodyClassName)}>
        {children}
      </CardBody>
    </Card>
  );
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `pnpm --dir frontend test -- card-surface`
Expected: PASS — 6 test

- [ ] **Step 5: Thêm export vào barrel**

Sửa `frontend/src/components/ui/index.ts` thành:

```ts
export { Button, type ButtonProps, type ButtonVariant } from "./button";
export { CardSurface, type CardSurfaceProps } from "./card-surface";
```

- [ ] **Step 6: Đổi 5 call site của `FormSurface` sang `CardSurface`**

Ở cả 5 file, đổi dòng import và tên thẻ, **giữ nguyên `className` đang truyền**:

`frontend/src/app/login/page.tsx` — dòng 9 đổi `import { FormSurface } from "@/components/ui/form-surface";` thành `import { CardSurface } from "@/components/ui";`; dòng 75 đổi `<FormSurface className="auth-card">` thành `<CardSurface className="auth-card">`; dòng 121 đổi `</FormSurface>` thành `</CardSurface>`.

`frontend/src/app/register/page.tsx` — dòng 8, 56, 106: cùng cách, `className="auth-card"`.

`frontend/src/components/review-form.tsx` — dòng 7 đổi thành `import { CardSurface } from "./ui";`; dòng 58 `<CardSurface className="workspace-card">`; dòng 112 `</CardSurface>`.

`frontend/src/components/story-advisor-form.tsx` — dòng 13 đổi thành `import { CardSurface } from "./ui";`; dòng 81 `<CardSurface className="workspace-card story-advisor-card">`; dòng 127 `</CardSurface>`.

`frontend/src/components/story-advisor-panel.tsx` — dòng 6 đổi thành `import { CardSurface } from "./ui";`; dòng 19 `<CardSurface className="workspace-card story-advisor-card">`; dòng 28 `</CardSurface>`.

- [ ] **Step 7: Xóa `FormSurface` và test của nó**

```bash
git rm frontend/src/components/ui/form-surface.tsx frontend/src/components/ui/form-surface.test.tsx
```

- [ ] **Step 8: Sửa mock trong `register/page.test.tsx`**

`frontend/src/app/register/page.test.tsx` đang mock `@/components/ui/form-surface`. Đổi sang mock barrel — mock phải giữ cả `Button` vì trang này cũng dùng:

```tsx
vi.mock("@/components/ui", () => ({
  CardSurface: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "card-surface" }, children),
  Button: ({ children }: { children: React.ReactNode }) =>
    React.createElement("button", null, children),
}));
```

Nếu file test còn assertion `toContain("form-surface")`, đổi thành `toContain('data-testid="card-surface"')`.

- [ ] **Step 9: Chạy toàn bộ test + typecheck**

Run: `pnpm --dir frontend test`
Expected: PASS — 63 file test (thêm `card-surface`, bớt `form-surface`), 0 fail. Nếu `review-form.test.tsx` hay `story-advisor-form.test.tsx` fail vì assertion `toContain("form-surface")`, đổi thành `toContain('data-testid="card-surface"')`.

Run: `pnpm --dir frontend typecheck`
Expected: không có lỗi

Run: `grep -rn "FormSurface" frontend/src || echo "SACH"`
Expected: in `SACH`

- [ ] **Step 10: Commit**

```bash
git add -A frontend/src
git commit -m "feat(ui): primitive CardSurface thay FormSurface"
```

---

## Task 4: Primitive `Chip`, `TextLink`, và viết lại `MetricPill`

**Files:**
- Create: `frontend/src/components/ui/chip.tsx`
- Create: `frontend/src/components/ui/chip.test.tsx`
- Create: `frontend/src/components/ui/text-link.tsx`
- Create: `frontend/src/components/ui/text-link.test.tsx`
- Modify: `frontend/src/components/ui/metric-pill.tsx`
- Modify: `frontend/src/components/ui/index.ts`

**Interfaces:**
- Consumes: barrel từ Task 2-3.
- Produces: `Chip` với `tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "info"` (mặc định `"neutral"`), phát `data-testid="chip"` và `data-tone`. `TextLink` với `href`, `tone?: "primary" | "muted"` (mặc định `"primary"`), phát `data-testid="text-link"`. `MetricPill` giữ nguyên API `{ label, value, tone?: "primary" | "success" | "warning" | "default" }` — call site `app/stories/[id]/page.tsx` không phải sửa.

- [ ] **Step 1: Viết test cho `Chip` và `TextLink`**

`frontend/src/components/ui/chip.test.tsx`:

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Chip } from "./chip";

describe("Chip", () => {
  it("render nội dung và data-testid", () => {
    const html = renderToStaticMarkup(<Chip>Ăn uống</Chip>);

    expect(html).toContain('data-testid="chip"');
    expect(html).toContain("Ăn uống");
  });

  it("mặc định tone neutral", () => {
    const html = renderToStaticMarkup(<Chip>Khác</Chip>);

    expect(html).toContain('data-tone="neutral"');
  });

  it("phơi tone ra data-tone cho từng tone", () => {
    for (const tone of ["neutral", "primary", "success", "warning", "danger", "info"] as const) {
      const html = renderToStaticMarkup(<Chip tone={tone}>Nhãn</Chip>);

      expect(html).toContain(`data-tone="${tone}"`);
    }
  });
});
```

`frontend/src/components/ui/text-link.test.tsx`:

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TextLink } from "./text-link";

describe("TextLink", () => {
  it("render href, nhãn và data-testid", () => {
    const html = renderToStaticMarkup(<TextLink href="/stories">Khu Truyện</TextLink>);

    expect(html).toContain('data-testid="text-link"');
    expect(html).toContain('href="/stories"');
    expect(html).toContain("Khu Truyện");
  });

  it("mặc định tone primary", () => {
    const html = renderToStaticMarkup(<TextLink href="/">Trang chủ</TextLink>);

    expect(html).toContain('data-tone="primary"');
  });

  it("nhận tone muted", () => {
    const html = renderToStaticMarkup(
      <TextLink href="/" tone="muted">
        Trang chủ
      </TextLink>,
    );

    expect(html).toContain('data-tone="muted"');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --dir frontend test -- chip text-link`
Expected: FAIL — không resolve được `./chip` và `./text-link`

- [ ] **Step 3: Viết `chip.tsx` và `text-link.tsx`**

`frontend/src/components/ui/chip.tsx`:

```tsx
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
```

`frontend/src/components/ui/text-link.tsx`:

```tsx
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
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `pnpm --dir frontend test -- chip text-link`
Expected: PASS — 3 test cho Chip, 3 test cho TextLink

- [ ] **Step 5: Viết lại ruột `MetricPill` trên `Chip`**

`frontend/src/components/ui/metric-pill.tsx` — thay toàn bộ nội dung. API bên ngoài không đổi:

```tsx
import React from "react";

import { Chip, type ChipTone } from "./chip";

type MetricPillProps = {
  label: string;
  value: string;
  tone?: "primary" | "success" | "warning" | "default";
};

const TONE_TO_CHIP_TONE: Record<NonNullable<MetricPillProps["tone"]>, ChipTone> = {
  primary: "primary",
  success: "success",
  warning: "warning",
  default: "neutral",
};

export function MetricPill({ label, value, tone = "primary" }: MetricPillProps) {
  return (
    <Chip tone={TONE_TO_CHIP_TONE[tone]} className="metric-pill">
      <span className="metric-pill-label">{label}</span>
      <strong>{value}</strong>
    </Chip>
  );
}
```

- [ ] **Step 6: Thêm export vào barrel**

Sửa `frontend/src/components/ui/index.ts` thành:

```ts
export { Button, type ButtonProps, type ButtonVariant } from "./button";
export { CardSurface, type CardSurfaceProps } from "./card-surface";
export { Chip, type ChipProps, type ChipTone } from "./chip";
export { MetricPill } from "./metric-pill";
export { TextLink, type TextLinkProps, type TextLinkTone } from "./text-link";
```

- [ ] **Step 7: Chạy toàn bộ test + typecheck**

Run: `pnpm --dir frontend test`
Expected: PASS — 65 file test, 0 fail. `metric-pill.test.tsx` phải còn xanh vì API không đổi; nếu nó assert `metric-pill` class thì vẫn còn (được truyền qua `className`).

Run: `pnpm --dir frontend typecheck`
Expected: không có lỗi

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/ui
git commit -m "feat(ui): primitive Chip, TextLink; MetricPill viết lại trên Chip"
```

---

## Task 5: Viết lại `FormField` — 4 kind, error, required

**Files:**
- Modify: `frontend/src/components/ui/form-field.tsx`
- Modify: `frontend/src/components/ui/form-field.test.tsx`
- Modify: `frontend/src/components/ui/index.ts`

**Interfaces:**
- Consumes: barrel từ Task 2-4.
- Produces: `FormField` — union theo `kind`:
  - `kind` bỏ trống hoặc `"input"`: nhận props của HeroUI `Input` (`value`, `onChange`, `type`, `inputMode`, `placeholder`...).
  - `kind="textarea"`: nhận props của HeroUI `Textarea` (`rows`, `value`, `onChange`...).
  - `kind="select"`: `value: string`, `onValueChange: (value: string) => void`, `options: FormFieldOption[]`, `placeholder?: string`.
  - `kind="radio"`: `value: string`, `onValueChange: (value: string) => void`, `options: FormFieldOption[]`, `orientation?: "horizontal" | "vertical"`.
  - Chung: `id: string`, `label: string`, `hint?: string`, `error?: string`, `required?: boolean`.
  - `FormFieldOption = { value: string; label: string }`.
  - Phát `data-testid="form-field"` và `data-kind`. Khi có `error`: đặt `aria-invalid="true"` và `aria-describedby="<id>-error"`, render message ở element có `id="<id>-error"` và `role="alert"`.

- [ ] **Step 1: Viết test**

`frontend/src/components/ui/form-field.test.tsx` — thay toàn bộ nội dung:

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FormField } from "./form-field";

describe("FormField", () => {
  it("render input với label, hint và data-testid", () => {
    const html = renderToStaticMarkup(
      <FormField id="expense-merchant" label="Nơi chi" hint="Ví dụ: VinMart" />,
    );

    expect(html).toContain('data-testid="form-field"');
    expect(html).toContain('data-kind="input"');
    expect(html).toContain("Nơi chi");
    expect(html).toContain("Ví dụ: VinMart");
    expect(html).toContain('id="expense-merchant"');
  });

  it("render textarea khi kind=textarea", () => {
    const html = renderToStaticMarkup(
      <FormField kind="textarea" id="expense-description" label="Mô tả chi tiết" rows={3} />,
    );

    expect(html).toContain('data-kind="textarea"');
    expect(html).toContain("<textarea");
    expect(html).toContain("Mô tả chi tiết");
  });

  it("render select với đủ option khi kind=select", () => {
    const html = renderToStaticMarkup(
      <FormField
        kind="select"
        id="expense-category"
        label="Danh mục"
        value=""
        onValueChange={() => {}}
        options={[
          { value: "food", label: "Ăn uống" },
          { value: "home", label: "Nhà cửa" },
        ]}
      />,
    );

    expect(html).toContain('data-kind="select"');
    expect(html).toContain("Danh mục");
    expect(html).toContain("Ăn uống");
    expect(html).toContain("Nhà cửa");
  });

  it("render radio với đủ option khi kind=radio", () => {
    const html = renderToStaticMarkup(
      <FormField
        kind="radio"
        id="review-rating"
        label="Điểm đánh giá"
        value="5"
        onValueChange={() => {}}
        options={[
          { value: "4", label: "4 sao" },
          { value: "5", label: "5 sao" },
        ]}
      />,
    );

    expect(html).toContain('data-kind="radio"');
    expect(html).toContain("Điểm đánh giá");
    expect(html).toContain("4 sao");
    expect(html).toContain("5 sao");
  });

  it("gắn aria-invalid và aria-describedby khi có error", () => {
    const html = renderToStaticMarkup(
      <FormField id="expense-amount" label="Số tiền" error="Vui lòng nhập số tiền hợp lệ." />,
    );

    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="expense-amount-error"');
    expect(html).toContain('id="expense-amount-error"');
    expect(html).toContain('role="alert"');
    expect(html).toContain("Vui lòng nhập số tiền hợp lệ.");
  });

  it("không gắn aria-invalid khi không có error", () => {
    const html = renderToStaticMarkup(<FormField id="expense-amount" label="Số tiền" />);

    expect(html).not.toContain("aria-invalid");
    expect(html).not.toContain('role="alert"');
  });

  it("đánh dấu required trên control", () => {
    const html = renderToStaticMarkup(
      <FormField id="expense-amount" label="Số tiền" required />,
    );

    expect(html).toContain("required");
  });

  it("hiện error thay cho hint khi có cả hai", () => {
    const html = renderToStaticMarkup(
      <FormField
        id="expense-amount"
        label="Số tiền"
        hint="Nhập số, tự chèn dấu phân cách"
        error="Vui lòng nhập số tiền hợp lệ."
      />,
    );

    expect(html).toContain("Vui lòng nhập số tiền hợp lệ.");
    expect(html).not.toContain("Nhập số, tự chèn dấu phân cách");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --dir frontend test -- form-field`
Expected: FAIL — các test về `data-kind`, `select`, `radio`, `error` fail vì `FormField` hiện chưa có

- [ ] **Step 3: Viết lại `form-field.tsx`**

`frontend/src/components/ui/form-field.tsx` — thay toàn bộ nội dung:

```tsx
import { Input, Radio, RadioGroup, Select, SelectItem, Textarea } from "@heroui/react";
import React, { type ComponentProps, type ReactNode } from "react";

export type FormFieldOption = {
  value: string;
  label: string;
};

type SharedProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
};

type HeroInputProps = ComponentProps<typeof Input>;
type HeroTextareaProps = ComponentProps<typeof Textarea>;

type InputFieldProps = SharedProps &
  Omit<HeroInputProps, "id" | "label" | "description" | "errorMessage" | "isInvalid"> & {
    kind?: "input";
  };

type TextareaFieldProps = SharedProps &
  Omit<HeroTextareaProps, "id" | "label" | "description" | "errorMessage" | "isInvalid"> & {
    kind: "textarea";
  };

type SelectFieldProps = SharedProps & {
  kind: "select";
  value: string;
  onValueChange: (value: string) => void;
  options: FormFieldOption[];
  placeholder?: string;
};

type RadioFieldProps = SharedProps & {
  kind: "radio";
  value: string;
  onValueChange: (value: string) => void;
  options: FormFieldOption[];
  orientation?: "horizontal" | "vertical";
};

export type FormFieldProps =
  | InputFieldProps
  | TextareaFieldProps
  | SelectFieldProps
  | RadioFieldProps;

/** Vùng chú thích dưới control: ưu tiên error, không có error thì hiện hint. */
function FieldFooter({ id, hint, error }: { id: string; hint?: string; error?: string }): ReactNode {
  if (error) {
    return (
      <p id={`${id}-error`} role="alert" className="mt-1.5 text-sm text-onDangerSoft">
        {error}
      </p>
    );
  }
  if (hint) {
    return <p className="mt-1.5 text-sm text-textMuted">{hint}</p>;
  }
  return null;
}

export function FormField(props: FormFieldProps) {
  const { id, label, hint, error, required } = props;
  const describedBy = error ? `${id}-error` : undefined;

  const wrapperProps = {
    "data-testid": "form-field",
    "data-kind": props.kind ?? "input",
    className: "flex flex-col",
  } as const;

  if (props.kind === "select") {
    const { value, onValueChange, options, placeholder } = props;

    return (
      <div {...wrapperProps}>
        <Select
          id={id}
          label={label}
          variant="bordered"
          radius="md"
          placeholder={placeholder}
          isRequired={required}
          isInvalid={Boolean(error)}
          aria-describedby={describedBy}
          selectedKeys={value ? [value] : []}
          onSelectionChange={(keys) => {
            const [first] = Array.from(keys as Set<string>);
            onValueChange(first ?? "");
          }}
        >
          {options.map((option) => (
            <SelectItem key={option.value}>{option.label}</SelectItem>
          ))}
        </Select>
        <FieldFooter id={id} hint={hint} error={error} />
      </div>
    );
  }

  if (props.kind === "radio") {
    const { value, onValueChange, options, orientation = "horizontal" } = props;

    return (
      <div {...wrapperProps}>
        <RadioGroup
          label={label}
          orientation={orientation}
          isRequired={required}
          isInvalid={Boolean(error)}
          aria-describedby={describedBy}
          value={value}
          onValueChange={onValueChange}
        >
          {options.map((option) => (
            <Radio key={option.value} value={option.value}>
              {option.label}
            </Radio>
          ))}
        </RadioGroup>
        <FieldFooter id={id} hint={hint} error={error} />
      </div>
    );
  }

  if (props.kind === "textarea") {
    const { kind: _kind, id: _id, label: _label, hint: _hint, error: _error, required: _required, ...fieldProps } = props;

    return (
      <div {...wrapperProps}>
        <Textarea
          {...fieldProps}
          id={id}
          label={label}
          variant="bordered"
          isRequired={required}
          isInvalid={Boolean(error)}
          aria-describedby={describedBy}
        />
        <FieldFooter id={id} hint={hint} error={error} />
      </div>
    );
  }

  const { kind: _kind, id: _id, label: _label, hint: _hint, error: _error, required: _required, ...fieldProps } = props;

  return (
    <div {...wrapperProps}>
      <Input
        {...fieldProps}
        id={id}
        label={label}
        variant="bordered"
        isRequired={required}
        isInvalid={Boolean(error)}
        aria-describedby={describedBy}
      />
      <FieldFooter id={id} hint={hint} error={error} />
    </div>
  );
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `pnpm --dir frontend test -- form-field`
Expected: PASS — 8 test

Hai điểm cần xử lý nếu fail:

1. `required` không xuất hiện trong HTML: HeroUI dùng `isRequired` và có thể chỉ render dấu `*` thay vì thuộc tính `required`. Nếu vậy, truyền thêm `isRequired={required}` **và** `required={required}` cho `Input`/`Textarea` để thuộc tính native cũng có mặt.
2. `Select` hoặc `RadioGroup` lỗi khi render trong môi trường node (React Aria cần DOM): thay riêng nhánh đó bằng markup native — `<select>` với `<option>` cho kind select, `<fieldset>` + `<legend>` + `<input type="radio">` cho kind radio — style bằng utility Tailwind (`rounded-field border border-borderField bg-surfaceMuted text-text`). **API của `FormField` không đổi**, chỉ đổi ruột. Ghi lại lý do đổi trong comment ở đầu nhánh.

- [ ] **Step 5: Thêm export vào barrel**

Sửa `frontend/src/components/ui/index.ts` thành:

```ts
export { Button, type ButtonProps, type ButtonVariant } from "./button";
export { CardSurface, type CardSurfaceProps } from "./card-surface";
export { Chip, type ChipProps, type ChipTone } from "./chip";
export { FormField, type FormFieldOption, type FormFieldProps } from "./form-field";
export { MetricPill } from "./metric-pill";
export { TextLink, type TextLinkProps, type TextLinkTone } from "./text-link";
```

- [ ] **Step 6: Chạy toàn bộ test + typecheck**

Run: `pnpm --dir frontend test`
Expected: PASS — 65 file test. `story-advisor-form.test.tsx` và các test khác dùng `FormField` có thể fail vì mất class `form-field-input-wrapper` / `form-field-label`; đổi các assertion đó sang `toContain('data-testid="form-field"')`.

Run: `pnpm --dir frontend typecheck`
Expected: không có lỗi

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ui frontend/src/components/story-advisor-form.test.tsx
git commit -m "feat(ui): FormField hỗ trợ select/radio, error và required"
```

---

## Task 6: Primitive `DataTable`

**Files:**
- Create: `frontend/src/components/ui/data-table.tsx`
- Create: `frontend/src/components/ui/data-table.test.tsx`
- Modify: `frontend/src/components/ui/index.ts`

**Quyết định kỹ thuật:** `DataTable` dựng bằng `<table>` semantic + utility Tailwind, **không** wrap `Table` của HeroUI. Lý do: `Table` của HeroUI đòi cấu trúc children `TableHeader/TableColumn/TableBody/TableRow/TableCell` qua React Aria collections, không khớp với API render-prop theo cột mà các màn cần, và nặng hơn nhu cầu của một bảng tĩnh. Mục tiêu "sửa một chỗ, toàn dự án đổi" vẫn giữ vì file này nằm trong `components/ui/` và ăn màu từ `components/ui/style/`.

**Interfaces:**
- Consumes: utility Tailwind từ Task 1.
- Produces: `DataTable<Row>` với props `columns: DataTableColumn<Row>[]`, `rows: Row[]`, `getRowKey: (row: Row) => string`, `caption: string`, `emptyContent?: ReactNode`. `DataTableColumn<Row> = { key: string; header: string; align?: "left" | "right"; render: (row: Row) => ReactNode }`. Phát `data-testid="data-table"`. Cột `align="right"` tự thêm `text-right tabular-nums`. Header luôn có `scope="col"`. Khi `rows` rỗng: render `emptyContent` và **không** render `<table>`.

- [ ] **Step 1: Viết test**

`frontend/src/components/ui/data-table.test.tsx`:

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DataTable, type DataTableColumn } from "./data-table";

type Expense = { id: string; merchant: string; amount: string };

const columns: DataTableColumn<Expense>[] = [
  { key: "merchant", header: "Nơi chi", render: (row) => row.merchant },
  { key: "amount", header: "Số tiền", align: "right", render: (row) => row.amount },
];

const rows: Expense[] = [
  { id: "e1", merchant: "Tiền điện", amount: "850.000 ₫" },
  { id: "e2", merchant: "VinMart", amount: "1.250.000 ₫" },
];

describe("DataTable", () => {
  it("render caption, header và mọi hàng", () => {
    const html = renderToStaticMarkup(
      <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} caption="Lịch sử chi tiêu" />,
    );

    expect(html).toContain('data-testid="data-table"');
    expect(html).toContain("Lịch sử chi tiêu");
    expect(html).toContain("Nơi chi");
    expect(html).toContain("Tiền điện");
    expect(html).toContain("VinMart");
    expect(html).toContain("1.250.000 ₫");
  });

  it("gắn scope=col cho mọi header", () => {
    const html = renderToStaticMarkup(
      <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} caption="Lịch sử chi tiêu" />,
    );

    expect(html.match(/scope="col"/g)).toHaveLength(2);
  });

  it("căn phải và dùng tabular-nums cho cột align=right", () => {
    const html = renderToStaticMarkup(
      <DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} caption="Lịch sử chi tiêu" />,
    );

    expect(html).toContain("text-right");
    expect(html).toContain("tabular-nums");
  });

  it("render emptyContent và không render table khi không có hàng", () => {
    const html = renderToStaticMarkup(
      <DataTable
        columns={columns}
        rows={[]}
        getRowKey={(row) => row.id}
        caption="Lịch sử chi tiêu"
        emptyContent={<p>Chưa có khoản chi nào.</p>}
      />,
    );

    expect(html).toContain("Chưa có khoản chi nào.");
    expect(html).not.toContain("<table");
  });

  it("không render gì khi rỗng và không truyền emptyContent", () => {
    const html = renderToStaticMarkup(
      <DataTable columns={columns} rows={[]} getRowKey={(row) => row.id} caption="Lịch sử chi tiêu" />,
    );

    expect(html).toBe("");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --dir frontend test -- data-table`
Expected: FAIL — `Failed to resolve import "./data-table"`

- [ ] **Step 3: Viết `data-table.tsx`**

`frontend/src/components/ui/data-table.tsx`:

```tsx
import clsx from "clsx";
import React, { type ReactNode } from "react";

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: Row) => ReactNode;
};

export type DataTableProps<Row> = {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  /** Bắt buộc — trình đọc màn hình cần biết bảng này nói về cái gì. */
  caption: string;
  emptyContent?: ReactNode;
  className?: string;
};

function alignClass(align: DataTableColumn<unknown>["align"]): string {
  return align === "right" ? "text-right tabular-nums" : "text-left";
}

export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  caption,
  emptyContent,
  className,
}: DataTableProps<Row>) {
  if (rows.length === 0) {
    return emptyContent ? <>{emptyContent}</> : null;
  }

  return (
    <div className={clsx("overflow-x-auto", className)} data-testid="data-table">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={clsx(
                  "border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-textMuted",
                  alignClass(column.align),
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={clsx(
                    "border-b border-surfaceMuted px-3 py-2.5 text-text",
                    alignClass(column.align),
                  )}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `pnpm --dir frontend test -- data-table`
Expected: PASS — 5 test

- [ ] **Step 5: Thêm export vào barrel**

Thêm vào `frontend/src/components/ui/index.ts` (giữ thứ tự alphabet):

```ts
export { DataTable, type DataTableColumn, type DataTableProps } from "./data-table";
```

- [ ] **Step 6: Chạy toàn bộ test + typecheck**

Run: `pnpm --dir frontend test`
Expected: PASS — 66 file test, 0 fail

Run: `pnpm --dir frontend typecheck`
Expected: không có lỗi

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/ui
git commit -m "feat(ui): primitive DataTable"
```

---

## Task 7: Primitive `StatCard`, `SegmentedFilter`, `EmptyState`

**Files:**
- Create: `frontend/src/components/ui/stat-card.tsx`
- Create: `frontend/src/components/ui/stat-card.test.tsx`
- Create: `frontend/src/components/ui/segmented-filter.tsx`
- Create: `frontend/src/components/ui/segmented-filter.test.tsx`
- Create: `frontend/src/components/ui/empty-state.tsx`
- Create: `frontend/src/components/ui/empty-state.test.tsx`
- Modify: `frontend/src/components/ui/index.ts`

**Interfaces:**
- Consumes: `CardSurface` (Task 3), `Chip` (Task 4), `Button` (Task 2).
- Produces:
  - `StatCard` — `{ label: string; value: string; delta?: string; tone?: "neutral" | "success" | "warning" | "danger" }`. Phát `data-testid="stat-card"`.
  - `SegmentedFilter` — `{ items: { key: string; label: string }[]; activeKey: string; onChange?: (key: string) => void; isDisabled?: boolean; ariaLabel: string }`. Phát `data-testid="segmented-filter"`, nút đang chọn có `aria-current="true"`.
  - `EmptyState` — `{ title: string; description?: string; action?: ReactNode; tone?: "info" | "error" | "success" }`. Phát `data-testid="empty-state"`, `role="alert"` khi `tone="error"`, ngược lại `role="status"`.

- [ ] **Step 1: Viết test cho cả ba**

`frontend/src/components/ui/stat-card.test.tsx`:

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StatCard } from "./stat-card";

describe("StatCard", () => {
  it("render label, value và data-testid", () => {
    const html = renderToStaticMarkup(<StatCard label="Cao nhất" value="1.250.000 ₫" />);

    expect(html).toContain('data-testid="stat-card"');
    expect(html).toContain("Cao nhất");
    expect(html).toContain("1.250.000 ₫");
  });

  it("render delta khi được truyền", () => {
    const html = renderToStaticMarkup(
      <StatCard label="Tổng chi" value="12.480.000 ₫" delta="Giảm 8% so với tháng trước" />,
    );

    expect(html).toContain("Giảm 8% so với tháng trước");
  });

  it("phơi tone ra data-tone", () => {
    const html = renderToStaticMarkup(<StatCard label="Cao nhất" value="1 ₫" tone="warning" />);

    expect(html).toContain('data-tone="warning"');
  });
});
```

`frontend/src/components/ui/segmented-filter.test.tsx`:

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SegmentedFilter } from "./segmented-filter";

const items = [
  { key: "all", label: "Tất cả" },
  { key: "week", label: "Tuần này" },
  { key: "month", label: "Tháng này" },
];

describe("SegmentedFilter", () => {
  it("render mọi item và data-testid", () => {
    const html = renderToStaticMarkup(
      <SegmentedFilter items={items} activeKey="all" ariaLabel="Bộ lọc lịch sử chi tiêu" />,
    );

    expect(html).toContain('data-testid="segmented-filter"');
    expect(html).toContain("Tất cả");
    expect(html).toContain("Tuần này");
    expect(html).toContain("Tháng này");
  });

  it("gắn aria-current cho đúng một item đang chọn", () => {
    const html = renderToStaticMarkup(
      <SegmentedFilter items={items} activeKey="week" ariaLabel="Bộ lọc lịch sử chi tiêu" />,
    );

    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
  });

  it("gắn aria-label cho nhóm", () => {
    const html = renderToStaticMarkup(
      <SegmentedFilter items={items} activeKey="all" ariaLabel="Bộ lọc lịch sử chi tiêu" />,
    );

    expect(html).toContain('aria-label="Bộ lọc lịch sử chi tiêu"');
  });
});
```

`frontend/src/components/ui/empty-state.test.tsx`:

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("render title và data-testid", () => {
    const html = renderToStaticMarkup(<EmptyState title="Chưa có khoản chi nào." />);

    expect(html).toContain('data-testid="empty-state"');
    expect(html).toContain("Chưa có khoản chi nào.");
  });

  it("dùng role=status cho tone info", () => {
    const html = renderToStaticMarkup(<EmptyState title="Đang tải chi tiêu..." />);

    expect(html).toContain('role="status"');
  });

  it("dùng role=alert cho tone error", () => {
    const html = renderToStaticMarkup(
      <EmptyState tone="error" title="Không thể tải chi tiêu." />,
    );

    expect(html).toContain('role="alert"');
  });

  it("render description và action", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="Chưa có khoản chi nào."
        description="Thêm khoản chi đầu tiên để bắt đầu theo dõi."
        action={<button type="button">Thêm khoản chi</button>}
      />,
    );

    expect(html).toContain("Thêm khoản chi đầu tiên để bắt đầu theo dõi.");
    expect(html).toContain("Thêm khoản chi");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --dir frontend test -- stat-card segmented-filter empty-state`
Expected: FAIL — không resolve được cả ba module

- [ ] **Step 3: Viết `stat-card.tsx`**

`frontend/src/components/ui/stat-card.tsx`:

```tsx
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
export function StatCard({ label, value, delta, tone = "neutral", className }: StatCardProps) {
  return (
    <div data-testid="stat-card" data-tone={tone} className={className}>
      <CardSurface bodyClassName="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-textMuted">{label}</p>
        <p className={`text-2xl font-bold tabular-nums ${TONE_VALUE_CLASS[tone]}`}>{value}</p>
        {delta ? <p className="text-sm text-textMuted">{delta}</p> : null}
      </CardSurface>
    </div>
  );
}
```

- [ ] **Step 4: Viết `segmented-filter.tsx`**

`frontend/src/components/ui/segmented-filter.tsx`:

```tsx
import React from "react";

import { Button } from "./button";

export type SegmentedFilterItem = {
  key: string;
  label: string;
};

export type SegmentedFilterProps = {
  items: SegmentedFilterItem[];
  activeKey: string;
  onChange?: (key: string) => void;
  isDisabled?: boolean;
  /** Bắt buộc — nhóm nút cần nhãn để trình đọc màn hình biết đang lọc cái gì. */
  ariaLabel: string;
  className?: string;
};

export function SegmentedFilter({
  items,
  activeKey,
  onChange,
  isDisabled,
  ariaLabel,
  className,
}: SegmentedFilterProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-testid="segmented-filter"
      className={`flex flex-wrap gap-1 rounded-pill bg-surfaceMuted p-1 ${className ?? ""}`}
    >
      {items.map((item) => {
        const isActive = item.key === activeKey;

        return (
          <Button
            key={item.key}
            type="button"
            size="sm"
            variant={isActive ? "primary" : "ghost"}
            aria-current={isActive ? true : undefined}
            isDisabled={isDisabled}
            onPress={onChange ? () => onChange(item.key) : undefined}
          >
            {item.label}
          </Button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Viết `empty-state.tsx`**

`frontend/src/components/ui/empty-state.tsx`:

```tsx
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

export function EmptyState({ title, description, action, tone = "info", className }: EmptyStateProps) {
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
```

- [ ] **Step 6: Chạy test, xác nhận pass**

Run: `pnpm --dir frontend test -- stat-card segmented-filter empty-state`
Expected: PASS — 3 + 3 + 4 = 10 test

- [ ] **Step 7: Thêm export vào barrel**

`frontend/src/components/ui/index.ts` — nội dung đầy đủ sau task này:

```ts
export { Button, type ButtonProps, type ButtonVariant } from "./button";
export { CardSurface, type CardSurfaceProps } from "./card-surface";
export { Chip, type ChipProps, type ChipTone } from "./chip";
export { DataTable, type DataTableColumn, type DataTableProps } from "./data-table";
export { EmptyState, type EmptyStateProps, type EmptyStateTone } from "./empty-state";
export { FormField, type FormFieldOption, type FormFieldProps } from "./form-field";
export { MetricPill } from "./metric-pill";
export {
  SegmentedFilter,
  type SegmentedFilterItem,
  type SegmentedFilterProps,
} from "./segmented-filter";
export { StatCard, type StatCardProps, type StatCardTone } from "./stat-card";
export { TextLink, type TextLinkProps, type TextLinkTone } from "./text-link";
```

- [ ] **Step 8: Chạy toàn bộ test + typecheck**

Run: `pnpm --dir frontend test`
Expected: PASS — 69 file test, 0 fail

Run: `pnpm --dir frontend typecheck`
Expected: không có lỗi

- [ ] **Step 9: Commit**

```bash
git add frontend/src/components/ui
git commit -m "feat(ui): primitive StatCard, SegmentedFilter, EmptyState"
```

---

## Task 8: Chrome dùng chung — rule global, header, page-shell

**Files:**
- Modify: `frontend/src/app/globals.css` (vùng `:root` dòng 5-32; rule global dòng 51-103; `.global-header*` dòng 105-257 và 2530-2564, 2860-2888, 3135-3170; `.page-shell*` dòng 259-268 và 2565-2578)
- Modify: `frontend/src/components/ui/global-header.tsx`

**Interfaces:**
- Consumes: `Button`, `TextLink` từ barrel.
- Produces: không có API mới. Giữ **nguyên toàn bộ tên class** trong markup của `global-header.tsx` và `page-shell.tsx` để `global-header.test.tsx` (7 assertion) và `page-shell.test.tsx` (7 assertion) còn xanh — đợt này chỉ đổi **giá trị CSS**, không đổi cấu trúc.

- [ ] **Step 1: Chạy test chrome để chốt baseline**

Run: `pnpm --dir frontend test -- global-header page-shell`
Expected: PASS. Ghi lại số test — sau khi sửa phải vẫn đúng con số đó.

- [ ] **Step 2: Cập nhật `:root` trong `globals.css`**

Thay khối `:root` (dòng 5-32) bằng:

```css
:root {
  color-scheme: light;
  --background: #f6f9fc;
  --background-strong: #eaf1f8;
  --surface: #ffffff;
  --surface-muted: #f1f5f9;
  --surface-strong: #e8eef6;
  --border: #e2e8f0;
  --border-strong: #8492a4;
  --text: #0f172a;
  --text-muted: #64748b;
  --primary: #0369a1;
  --primary-strong: #075985;
  --primary-soft: #e0f2fe;
  --accent: #0369a1;
  --success: #15803d;
  --success-soft: #dcfce7;
  --warning: #b45309;
  --warning-soft: #fef3c7;
  --error: #b91c1c;
  --error-soft: #fee2e2;
  --info: #0369a1;
  --info-soft: #e0f2fe;
  --shadow: 0 10px 26px rgba(15, 23, 42, 0.07);
  --shadow-soft: 0 4px 14px rgba(15, 23, 42, 0.05);
  --radius-lg: 1.25rem;
  --radius-xl: 1.5rem;
}
```

Giá trị khớp `colors.ts` và `shadows.ts`. Các biến trạng thái trước đây đều là `#111111` (mất khả năng phân biệt) nay có màu thật, nên mọi class cũ đang dùng `var(--success)` / `var(--error)` cũng được lợi ngay.

- [ ] **Step 3: Cập nhật focus ring**

Thay rule ở dòng 99-103 bằng:

```css
button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

Trước đây outline là `rgba(17, 17, 17, 0.28)` — mờ và chỉ áp cho `button`/`a`. Nay dùng `--primary` (đạt 3:1 trên cả `surface` và `background`) và phủ cả control nhập liệu.

- [ ] **Step 4: Bỏ gradient xanh cũ của header**

Ở `.global-header` (dòng 105-111) thay `background` bằng:

```css
.global-header {
  position: sticky;
  top: 0;
  z-index: 20;
  padding: 0.7rem 1rem 0;
  background: var(--background);
  border-bottom: 1px solid var(--border);
}
```

Sau đó tìm mọi rule `.global-header` ở **vùng override** (dòng 2530, 2860, 3135) và xóa khai báo `background` / `linear-gradient` còn sót trong đó, vì vùng override thắng vùng gốc. Dùng `grep -n "global-header" frontend/src/app/globals.css` để duyệt hết.

- [ ] **Step 5: Chạy test, xác nhận vẫn xanh**

Run: `pnpm --dir frontend test`
Expected: PASS — 69 file test, 0 fail. Chỉ CSS đổi nên không test nào được phép đỏ. Nếu có test đỏ, nghĩa là đã sửa markup ngoài ý muốn — hoàn nguyên phần đó.

Run: `pnpm --dir frontend test -- globals.css`
Expected: PASS — ratchet còn thoả (số dòng không tăng)

- [ ] **Step 6: Cho `global-header.tsx` dùng `Button` và `TextLink` nội bộ**

`frontend/src/components/ui/global-header.tsx` — đổi dòng 3 từ `import { Button, Link as HeroLink } from "@heroui/react";` thành:

```tsx
import { Button } from "./button";
import { TextLink } from "./text-link";
```

Ở các `<Button>` (dòng 61, 73, 83) **bỏ** `color`, `variant`, `radius` và thay bằng `variant` của primitive: `variant="flat" color="primary"` → `variant="ghost"`; `variant="light" color="primary"` → `variant="ghost"`; `color="primary" radius="full"` (nút Đăng ký) → `variant="primary"`. **Giữ nguyên mọi `className`** (`global-header-auth-button`, `global-header-register-button`, `global-header-login-button`) vì test assert vào chúng.

Đổi `<HeroLink>` thành `<TextLink>`, giữ nguyên props và className.

- [ ] **Step 7: Chạy test + typecheck + build**

Run: `pnpm --dir frontend test`
Expected: PASS — 69 file test, 0 fail. Nếu `global-header.test.tsx` đỏ vì mất một class, thêm lại class đó vào `className` của primitive.

Run: `pnpm --dir frontend typecheck`
Expected: không có lỗi

Run: `pnpm --dir frontend build`
Expected: build thành công

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/globals.css frontend/src/components/ui/global-header.tsx
git commit -m "feat(ui): chrome dùng chung theo bảng màu mới (nền, focus ring, header)"
```

---

## Task 9: Bật ESLint rule và migrate 16 call site

**Files:**
- Modify: `frontend/eslint.config.mjs`
- Modify 16 file (danh sách đầy đủ ở Step 3)

**Interfaces:**
- Consumes: toàn bộ barrel `components/ui` từ Task 2-7.
- Produces: bất biến — không còn file nào ngoài `src/components/ui/**` import `@heroui/react`.

- [ ] **Step 1: Thêm rule vào ESLint config**

`frontend/eslint.config.mjs` — thay toàn bộ nội dung:

```js
import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@heroui/react",
              message:
                "Import primitive từ @/components/ui thay vì @heroui/react. Style dùng chung nằm ở src/components/ui/style/.",
            },
          ],
        },
      ],
    },
  },
];

export default config;
```

- [ ] **Step 2: Chạy lint để lấy danh sách vi phạm thật**

Run: `pnpm --dir frontend lint`
Expected: FAIL — 16 lỗi `no-restricted-imports`, đúng danh sách ở Step 3. Nếu con số khác 16, dùng danh sách lint in ra làm chuẩn thay vì danh sách trong plan.

- [ ] **Step 3: Migrate từng file**

Với mỗi file: đổi import sang barrel và **bỏ** các props `color` / `variant` / `radius` đã được wrapper chốt sẵn. **Giữ nguyên mọi `className`** để không làm vỡ assertion trong test.

Chỉ đổi `Button`, giữ nguyên phần còn lại — 8 file:

| File | Việc |
|---|---|
| `src/app/login/page.tsx` | `import { Button, CardSurface } from "@/components/ui";` (CardSurface đã đổi ở Task 3); `<Button color="primary" type="submit">` → `<Button type="submit">` |
| `src/app/register/page.tsx` | như trên |
| `src/components/story-list-controls.tsx` | `import { Button } from "./ui";` |
| `src/components/stories/advisor-quick-prompts.tsx` | `import { Button } from "../ui";`; `variant="flat"` → `variant="ghost"` |
| `src/components/finance/finance-groups-panel.tsx` | `import { Button } from "../ui";`; `variant="light"` → `variant="ghost"` |
| `src/components/finance/finance-member-selector.tsx` | `import { Button } from "../ui";`; `variant="light"` → `variant="ghost"` |
| `src/app/movie/page.tsx` | `import { Button, Chip } from "@/components/ui";`; `<Button as={NextLink} href="/" color="primary">` → bỏ `color` |
| `src/components/story-advisor-form.tsx` | `import { Button, CardSurface, FormField } from "./ui";`; `<Button color="primary" type="submit">` → bỏ `color`; `<Textarea>` → `<FormField kind="textarea" id="..." label="...">`, bỏ `classNames` bespoke `story-advisor-textarea-*` |

Chỉ đổi `Chip` — 2 file:

| File | Việc |
|---|---|
| `src/components/stories/story-catalog-card.tsx` | `import { Chip } from "../ui";`; bỏ `color`/`variant`, dùng `tone` tương ứng (`color="primary"` → `tone="primary"`) |
| `src/components/stories/story-recommendation-showcase.tsx` | như trên |

Đổi `Card` + `CardBody` → `CardSurface` — 2 file:

| File | Việc |
|---|---|
| `src/components/finance/recent-transaction.tsx` | `import { CardSurface } from "../ui";`; `<Card ...><CardBody>…</CardBody></Card>` → `<CardSurface className="<className cũ của Card>">…</CardSurface>` |
| `src/components/finance/category-card.tsx` | như trên |

Đổi `Card` + `CardBody` + `CardHeader` + `Chip` + `Button` — 3 file:

| File | Việc |
|---|---|
| `src/app/admin/users/page.tsx` | `import { Button, CardSurface, Chip } from "@/components/ui";`; nội dung `CardHeader` chuyển sang prop `title` của `CardSurface`; `<Button color="primary" variant="flat">` → `variant="ghost"`; `<Button color="danger" variant="flat">` → `variant="danger"` |
| `src/app/stories/[id]/page.tsx` | `import { Button, CardSurface, Chip, MetricPill } from "@/components/ui";`; `<Button color="primary" variant="flat">` → `variant="ghost"`; `CardHeader` → prop `title` |
| `src/app/page.tsx` | `import { CardSurface, TextLink } from "@/components/ui";`; `<Link>` → `<TextLink>`; `CardHeader` → prop `title` |

Đổi `Radio`/`RadioGroup` → `FormField kind="radio"` — 1 file:

| File | Việc |
|---|---|
| `src/components/review-form.tsx` | `import { Button, CardSurface, FormField } from "./ui";`; `<RadioGroup label="..." value={...} onValueChange={...}>` + các `<Radio value="n">` → `<FormField kind="radio" id="review-rating" label="..." value={...} onValueChange={...} options={[{value:"1",label:"1"},…]} />`; `<Button color="primary" type="submit">` → bỏ `color` |

- [ ] **Step 4: Chạy lint, xác nhận sạch**

Run: `pnpm --dir frontend lint`
Expected: không có lỗi, không có warning

Run: `grep -rn 'from "@heroui/react"' frontend/src --include=*.tsx | grep -v "components/ui/" || echo "SACH"`
Expected: in `SACH`

- [ ] **Step 5: Chạy test, sửa assertion bị vỡ**

Run: `pnpm --dir frontend test`
Expected: một số test đỏ do markup đổi. Với mỗi test đỏ, đổi assertion class sang `data-testid` tương ứng (`data-testid="button"`, `"chip"`, `"card-surface"`, `"form-field"`, `"text-link"`). **Không** thêm lại class chỉ để test xanh — trừ khi class đó thuộc `className` mà call site vốn đã truyền.

Chạy lại tới khi: PASS — 69 file test, 0 fail

Run: `pnpm --dir frontend typecheck`
Expected: không có lỗi

Run: `pnpm --dir frontend build`
Expected: build thành công

- [ ] **Step 6: Commit**

```bash
git add -A frontend
git commit -m "refactor(ui): mọi call site dùng primitive; bật ESLint chặn import @heroui/react"
```

---

## Task 10: Viết lại màn pilot `/finance/expenses` + sửa tone thông báo

**Files:**
- Modify: `frontend/src/components/finance/finance-expenses-content.tsx`
- Modify: `frontend/src/components/finance/finance-expenses-content.test.tsx`
- Modify: `frontend/src/components/finance/finance-expenses.tsx:42,88,97,108,113,116,124,153`
- Modify: `frontend/src/components/finance/finance-expenses.test.tsx`

**Interfaces:**
- Consumes: toàn bộ barrel `components/ui`.
- Produces: `FinanceExpensesContent` với prop `submitMessage` đổi kiểu từ `string | null` thành `FinanceSubmitMessage | null`, trong đó `export type FinanceSubmitMessage = { tone: "success" | "error" | "info"; text: string }` (khai trong `finance-expenses-content.tsx`). Các prop khác không đổi.

- [ ] **Step 1: Viết test cho tone thông báo**

Thêm vào `frontend/src/components/finance/finance-expenses-content.test.tsx` (giữ test hiện có, chỉ đổi các chỗ truyền `submitMessage={null}` cho khớp kiểu mới — `null` vẫn hợp lệ nên không phải đổi):

```tsx
  it("hiện thông báo thử-lại với tone info, không phải error", () => {
    const highlights = buildFinanceExpenseHighlights(categories, [], new Date("2026-06-23T10:00:00.000Z"));

    const html = renderToStaticMarkup(
      <FinanceExpensesContent
        categories={categories}
        highlights={highlights}
        draft={draft}
        isSubmitting={false}
        submitMessage={{ tone: "info", text: "Hệ thống đang chậm, đang tải lại dữ liệu chi tiêu..." }}
        onSubmit={() => {}}
        onDraftChange={() => {}}
      />,
    );

    expect(html).toContain("Hệ thống đang chậm, đang tải lại dữ liệu chi tiêu...");
    expect(html).toContain('data-tone="info"');
    expect(html).not.toContain('data-tone="error"');
  });

  it("hiện thông báo thành công với tone success", () => {
    const highlights = buildFinanceExpenseHighlights(categories, [], new Date("2026-06-23T10:00:00.000Z"));

    const html = renderToStaticMarkup(
      <FinanceExpensesContent
        categories={categories}
        highlights={highlights}
        draft={draft}
        isSubmitting={false}
        submitMessage={{ tone: "success", text: "Đã thêm khoản chi mới." }}
        onSubmit={() => {}}
        onDraftChange={() => {}}
      />,
    );

    expect(html).toContain('data-tone="success"');
  });

  it("dùng primitive cho form, bảng và chip, không còn control thô", () => {
    const highlights = buildFinanceExpenseHighlights(
      categories,
      [
        {
          id: "expense-1",
          amount: 850_000,
          merchantName: "Tiền điện",
          description: "Qua ví điện tử",
          spentAt: "2026-06-21T08:00:00.000Z",
          categoryId: "home",
        },
      ],
      new Date("2026-06-23T10:00:00.000Z"),
    );

    const html = renderToStaticMarkup(
      <FinanceExpensesContent
        categories={categories}
        highlights={highlights}
        draft={draft}
        isSubmitting={false}
        submitMessage={null}
        onSubmit={() => {}}
        onDraftChange={() => {}}
      />,
    );

    expect(html).toContain('data-testid="stat-card"');
    expect(html).toContain('data-testid="form-field"');
    expect(html).toContain('data-testid="data-table"');
    expect(html).toContain('data-testid="segmented-filter"');
    expect(html).toContain('data-testid="chip"');
    expect(html).not.toContain("finance-expenses-summary-card");
    expect(html).not.toContain("finance-expenses-category-pill");
    expect(html).not.toContain("finance-expenses-filter");
  });

  it("hiện EmptyState khi chưa có khoản chi", () => {
    const highlights = buildFinanceExpenseHighlights(categories, [], new Date("2026-06-23T10:00:00.000Z"));

    const html = renderToStaticMarkup(
      <FinanceExpensesContent
        categories={categories}
        highlights={highlights}
        draft={draft}
        isSubmitting={false}
        submitMessage={null}
        onSubmit={() => {}}
        onDraftChange={() => {}}
      />,
    );

    expect(html).toContain('data-testid="empty-state"');
    expect(html).toContain("Chưa có khoản chi nào.");
    expect(html).not.toContain("<table");
  });
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --dir frontend test -- finance-expenses-content`
Expected: FAIL — lỗi kiểu ở `submitMessage={{ tone: ..., text: ... }}` và thiếu `data-testid` của primitive

- [ ] **Step 3: Viết lại `finance-expenses-content.tsx`**

`frontend/src/components/finance/finance-expenses-content.tsx` — thay toàn bộ nội dung:

```tsx
import React from "react";

import {
  Button,
  CardSurface,
  Chip,
  DataTable,
  EmptyState,
  FormField,
  SegmentedFilter,
  StatCard,
  type DataTableColumn,
} from "../ui";
import type { FinanceCategory, FinanceExpense } from "../../types/finance";
import { formatFinanceAmountInput, formatFinanceDate, formatFinanceMoney } from "./finance-format";
import type { FinanceExpenseHighlights } from "./finance-expenses-summary";

export type FinanceExpenseDraft = {
  merchantName: string;
  description: string;
  amount: string;
  categoryId: string;
  spentAt: string;
};

export type FinanceSubmitMessage = {
  tone: "success" | "error" | "info";
  text: string;
};

export type FinanceExpensesContentProps = {
  categories: FinanceCategory[];
  highlights: FinanceExpenseHighlights;
  draft: FinanceExpenseDraft;
  isSubmitting: boolean;
  submitMessage: FinanceSubmitMessage | null;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onDraftChange: (patch: Partial<FinanceExpenseDraft>) => void;
};

const HISTORY_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "week", label: "Tuần này" },
  { key: "month", label: "Tháng này" },
];

export function FinanceExpensesContent({
  categories,
  highlights,
  draft,
  isSubmitting,
  submitMessage,
  onSubmit,
  onDraftChange,
}: FinanceExpensesContentProps) {
  const highestExpenseLabel = highlights.highestExpense
    ? `${highlights.highestExpense.merchantName || "Không rõ"} (${formatFinanceMoney(highlights.highestExpense.amount)})`
    : "Chưa có dữ liệu";

  const topCategoryLabel = highlights.topCategory
    ? `${highlights.topCategory.label} (${formatFinanceMoney(highlights.topCategory.amount)})`
    : "Chưa có dữ liệu";

  const categoryOptions = [
    { value: "", label: "Chưa phân loại" },
    ...categories.map((category) => ({ value: category.id, label: category.name })),
  ];

  const columns: DataTableColumn<FinanceExpense>[] = [
    { key: "spentAt", header: "Ngày", render: (expense) => formatFinanceDate(expense.spentAt) },
    {
      key: "merchant",
      header: "Nơi chi / Mô tả",
      render: (expense) => (
        <div className="flex flex-col">
          <span className="font-semibold text-text">{expense.merchantName || "Không rõ"}</span>
          <span className="text-xs text-textMuted">{expense.description || "-"}</span>
        </div>
      ),
    },
    {
      key: "category",
      header: "Danh mục",
      render: (expense) => {
        const category =
          expense.category ?? (expense.categoryId ? highlights.categoryMap[expense.categoryId] : undefined);

        return <Chip tone="primary">{category?.name || "Khác"}</Chip>;
      },
    },
    {
      key: "amount",
      header: "Số tiền",
      align: "right",
      render: (expense) => formatFinanceMoney(expense.amount),
    },
  ];

  return (
    <section className="flex flex-col gap-5">
      <CardSurface as="section" aria-label="Tổng quan chi tiêu" padding="lg">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-text">Tổng chi tiêu tháng này</h2>
          <p className="text-3xl font-bold tabular-nums text-text">
            {formatFinanceMoney(highlights.totalAmount)}
          </p>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <StatCard label="Cao nhất" value={highestExpenseLabel} />
          <StatCard label="Danh mục chính" value={topCategoryLabel} />
        </div>
      </CardSurface>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <CardSurface
          as="form"
          onSubmit={onSubmit}
          title="Thêm khoản chi mới"
          description="Ghi nhanh giao dịch thủ công và giữ lịch sử chi tiêu của bạn luôn cập nhật."
          padding="lg"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="expense-merchant"
              label="Nơi chi"
              value={draft.merchantName}
              onChange={(event) => onDraftChange({ merchantName: event.target.value })}
            />

            <FormField
              id="expense-amount"
              label="Số tiền (VNĐ)"
              hint="Nhập số, hệ thống tự chèn dấu phân cách"
              required
              type="text"
              inputMode="numeric"
              placeholder="Ví dụ: 1.250.000"
              value={draft.amount}
              onChange={(event) => onDraftChange({ amount: formatFinanceAmountInput(event.target.value) })}
            />

            <FormField
              kind="select"
              id="expense-category"
              label="Danh mục"
              value={draft.categoryId}
              onValueChange={(categoryId) => onDraftChange({ categoryId })}
              options={categoryOptions}
            />

            <FormField
              id="expense-spent-at"
              label="Thời gian"
              type="datetime-local"
              value={draft.spentAt}
              onChange={(event) => onDraftChange({ spentAt: event.target.value })}
            />

            <div className="sm:col-span-2">
              <FormField
                kind="textarea"
                id="expense-description"
                label="Mô tả chi tiết"
                rows={3}
                value={draft.description}
                onChange={(event) => onDraftChange({ description: event.target.value })}
              />
            </div>
          </div>

          {submitMessage ? (
            <div className="mt-4">
              <EmptyState tone={submitMessage.tone} title={submitMessage.text} />
            </div>
          ) : null}

          <div className="mt-4 flex justify-end">
            <Button type="submit" isLoading={isSubmitting}>
              Thêm khoản chi
            </Button>
          </div>
        </CardSurface>

        <CardSurface
          as="aside"
          aria-label="Khu vực AI phân tích"
          title="AI Phân tích"
          description="Khu vực AI phân tích sẽ được bổ sung sau. Hiện tại card này giữ chỗ để bám layout của workspace Chi tiêu."
          padding="lg"
        >
          <Button variant="secondary" isDisabled>
            Xem báo cáo chi tiết
          </Button>
        </CardSurface>
      </div>

      <CardSurface
        as="section"
        aria-label="Lịch sử chi tiêu"
        title="Lịch sử chi tiêu"
        action={
          <SegmentedFilter
            items={HISTORY_FILTERS}
            activeKey="all"
            isDisabled
            ariaLabel="Bộ lọc lịch sử chi tiêu"
          />
        }
        padding="lg"
      >
        <DataTable
          caption="Lịch sử các khoản chi trong tháng"
          columns={columns}
          rows={highlights.sortedExpenses}
          getRowKey={(expense) => expense.id}
          emptyContent={
            <EmptyState
              title="Chưa có khoản chi nào."
              description="Thêm khoản chi đầu tiên ở form phía trên để bắt đầu theo dõi."
            />
          }
        />
      </CardSurface>
    </section>
  );
}
```

Nhãn nút submit giữ **cố định** là `"Thêm khoản chi"` cho cả hai trạng thái — `isLoading` của `Button` đã hiện spinner và đặt `aria-busy`, nên không đổi text nữa để nút không co lại làm nhảy layout.

- [ ] **Step 4: Cập nhật container `finance-expenses.tsx`**

Trong `frontend/src/components/finance/finance-expenses.tsx`:

Dòng 8 — thêm import kiểu:

```tsx
import {
  FinanceExpensesContent,
  type FinanceExpenseDraft,
  type FinanceSubmitMessage,
} from "./finance-expenses-content";
```

Dòng 42 — đổi kiểu state:

```tsx
const [submitMessage, setSubmitMessage] = useState<FinanceSubmitMessage | null>(null);
```

Rồi đổi 6 chỗ `setSubmitMessage`:

```tsx
// dòng 88
setSubmitMessage({ tone: "error", text: "Vui lòng nhập số tiền hợp lệ." });

// dòng 108
setSubmitMessage({ tone: "success", text: "Đã thêm khoản chi mới." });

// dòng 113 — đây là chỗ bug: trước đây hiện màu đỏ như lỗi
setSubmitMessage({ tone: "info", text: "Hệ thống đang chậm, đang tải lại dữ liệu chi tiêu..." });

// dòng 116-120
setSubmitMessage(
  didReload
    ? { tone: "info", text: "Dữ liệu chi tiêu đã được tải lại. Vui lòng thử thêm lại nếu cần." }
    : { tone: "error", text: "Không thể tải lại dữ liệu chi tiêu. Vui lòng thử lại sau." },
);

// dòng 124
setSubmitMessage({
  tone: "error",
  text: error instanceof Error ? error.message : "Không thể thêm khoản chi.",
});
```

Dòng 97 (`setSubmitMessage(null)`) giữ nguyên.

Dòng 137-140 — đổi trạng thái loading sang `EmptyState`, đồng thời đổi import dòng 5 từ `StatusMessage` sang `EmptyState`:

```tsx
if (state.isLoading) {
  return (
    <section className="flex flex-col gap-5">
      <EmptyState title="Đang tải chi tiêu..." />
    </section>
  );
}
```

Dòng 147 — lỗi tải danh sách:

```tsx
{state.error ? <EmptyState tone="error" title={state.error} /> : null}
```

Lưu ý: `finance-expenses.test.tsx` đang assert `toContain("finance-expenses-loading")`. Class đó không còn — đổi assertion sang `toContain('data-testid="empty-state"')` và `toContain("Đang tải chi tiêu...")`.

- [ ] **Step 5: Chạy test, xác nhận pass**

Run: `pnpm --dir frontend test -- finance-expenses`
Expected: PASS — cả `finance-expenses-content.test.tsx` và `finance-expenses.test.tsx`

Run: `pnpm --dir frontend test`
Expected: PASS — 69 file test, 0 fail

Run: `pnpm --dir frontend typecheck`
Expected: không có lỗi

Run: `pnpm --dir frontend lint`
Expected: không có lỗi

- [ ] **Step 6: Xác nhận không còn control thô trên màn pilot**

Run: `grep -nE "<(input|select|textarea|table|button)[ >]" frontend/src/components/finance/finance-expenses-content.tsx || echo "SACH"`
Expected: in `SACH`

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/finance frontend/src/components/ui
git commit -m "feat(finance): redesign màn Chi tiêu bằng primitive; sửa tone thông báo thử-lại"
```

---

## Task 11: Dọn `globals.css` và hạ mốc ratchet

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/app/globals.css.test.ts`

**Interfaces:**
- Consumes: kết quả Task 3, 5, 10 (các class đã hết chỗ dùng).
- Produces: `globals.css` ngắn hơn; hằng `MAX_LINES` mới trong ratchet test.

- [ ] **Step 1: Xóa nhóm `.finance-expenses-*`**

Run: `grep -n "finance-expenses" frontend/src/app/globals.css`

Xóa mọi rule khớp, ở **cả hai vùng** (vùng gốc quanh dòng 1174-1427 và vùng override quanh dòng 2726-2757). Không xóa `.finance-expenses-page` nếu `finance-expenses.tsx` còn dùng — kiểm bằng `grep -rn "finance-expenses-page" frontend/src --include=*.tsx`.

- [ ] **Step 2: Xóa nhóm `.form-surface*`**

Run: `grep -rn "form-surface" frontend/src --include=*.tsx || echo "KHONG CON CHO DUNG"`
Expected: in `KHONG CON CHO DUNG`

Sau đó xóa `.form-surface`, `.form-surface-body`, `.form-surface-stack`, `.form-surface-heading` khỏi `globals.css` (quanh dòng 1070-1095).

- [ ] **Step 3: Xét nhóm `.form-field*`**

Run: `grep -rn "form-field" frontend/src --include=*.tsx`

`FormField` sau Task 5 không còn phát các class này. Nhưng một số form khác có thể vẫn mượn `.form-field` cho `<label>` thô. Xóa **chỉ** những class không còn xuất hiện trong kết quả grep. Ghi vào commit message class nào giữ lại và vì sao.

- [ ] **Step 4: Xóa `.finance-expenses-table-wrap`, giữ `.table-wrap`**

Run: `grep -rn "table-wrap" frontend/src --include=*.tsx`
Expected: còn `budget-settings-content.tsx`, `expense-chart.tsx`, `finance-member-dashboard.tsx` → **giữ** `.table-wrap`. Xóa riêng `.finance-expenses-table-wrap`.

- [ ] **Step 5: Đo lại số dòng và hạ mốc ratchet**

Run: `wc -l frontend/src/app/globals.css`

Lấy con số in ra, đặt vào `MAX_LINES` trong `frontend/src/app/globals.css.test.ts`. Ví dụ nếu in ra `2980` thì đổi dòng hằng thành:

```ts
const MAX_LINES = 2980;
```

Chỉ được hạ, không được nâng.

- [ ] **Step 6: Chạy toàn bộ kiểm tra**

Run: `pnpm --dir frontend test`
Expected: PASS — 69 file test, 0 fail

Run: `pnpm --dir frontend typecheck`
Expected: không có lỗi

Run: `pnpm --dir frontend lint`
Expected: không có lỗi

Run: `pnpm --dir frontend format:check`
Expected: không có file nào lệch format. Nếu lệch, chạy `pnpm --dir frontend exec prettier --write "src/**/*.{ts,tsx}"` rồi chạy lại.

Run: `pnpm --dir frontend build`
Expected: build thành công

- [ ] **Step 7: Kiểm mắt màn pilot**

Run: `pnpm --dir frontend dev`

Mở `http://localhost:3000/finance/expenses` và kiểm 5 điểm:
1. Nút "Thêm khoản chi" là pill xanh `#0369a1`, chữ trắng đọc rõ.
2. Ô nhập có **viền thấy được** (`#8492a4`), không phải chỉ có nền xám.
3. Tab qua các ô — focus ring xanh 2px, offset 2px, thấy rõ trên cả nền trắng và nền trang.
4. Bảng lịch sử: cột "Số tiền" căn phải, số căn cột đều nhau.
5. Submit form với ô số tiền để trống — thông báo lỗi hiện màu đỏ nhạt; nếu backend chậm thì thông báo "Hệ thống đang chậm..." hiện màu **xanh info**, không phải đỏ.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/globals.css frontend/src/app/globals.css.test.ts
git commit -m "chore(ui): xóa class đã chết khỏi globals.css, hạ mốc ratchet"
```

---

## Ghi chú cho người thực thi

**Thứ tự bắt buộc:** Task 1 → 2 → 3 → 4 → 5 → 6 → 7 phải xong hết trước Task 9, vì Task 9 bật ESLint rule và cần đủ primitive để chuyển sang. Task 8 (chrome) độc lập, có thể làm trước hoặc sau Task 9. Task 10 cần toàn bộ primitive. Task 11 phải là cuối.

**Nếu một test cũ đỏ vì mất tên class:** mặc định là đổi assertion sang `data-testid`, **không** thêm lại class chỉ để test xanh. Ngoại lệ duy nhất: class đó vốn được call site truyền qua `className` và vẫn còn ý nghĩa layout.

**Nếu HeroUI component nào lỗi khi render trong môi trường node** (không có DOM — Vitest chạy môi trường `node`, không có jsdom): thay ruột primitive đó bằng markup native + utility Tailwind, **giữ nguyên API của primitive**, và ghi lý do vào comment. Đã lường trước khả năng này cho `Select` và `RadioGroup` ở Task 5 Step 4.

**Không cài thêm dependency nào.** Đặc biệt không `@testing-library/react`, không `jsdom`, không `class-variance-authority`. `clsx` đã có sẵn.
