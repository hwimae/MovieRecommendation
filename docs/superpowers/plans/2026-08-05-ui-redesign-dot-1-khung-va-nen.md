# UI Redesign Đợt 1 — Khung app + primitive nền: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng khung điều hướng mới (pill active + sub-nav segmented trong header, menu ☰ trên mobile) và 4 primitive nền (Skeleton, ProgressBar, StatusMessage viết lại, DataTable mobile-card) để các đợt migrate trang sau chỉ việc lắp.

**Architecture:** Toàn bộ điều hướng gom về `GlobalHeader` (một khối sticky duy nhất — không cần magic number cho sub-nav dính): desktop hiện module rail dạng pill + hàng `SegmentedFilter` chế độ link; mobile ẩn hết, chỉ còn nút ☰ mở `AppMenu` chứa khu vực + tab con + auth. `FinanceNav`/`WorkspaceTabs` bị xoá. Primitive mới đặt trong `frontend/src/components/ui/`, export qua barrel `index.ts`.

**Tech Stack:** Next.js App Router, HeroUI (chỉ trong `components/ui/`), Tailwind (token từ `components/ui/style/`), Vitest (test tĩnh bằng `renderToStaticMarkup`, mock `next/navigation` bằng `vi.mock`).

**Spec:** `docs/superpowers/specs/2026-08-05-per-page-ui-redesign-design.md` (mục 2, 5, 6 và đợt 1 của mục 7).

## Global Constraints

- Chỉ dùng token có sẵn trong `frontend/src/components/ui/style/{colors,radius,shadows}.ts` — không thêm màu/bo góc/bóng mới. Utility hợp lệ: `bg-primary`, `text-primaryStrong`, `bg-surfaceMuted`, `bg-trackMuted`, `border-border`, `rounded-pill`, `rounded-field`, `rounded-card`, `rounded-small`, `shadow-soft`, `shadow-card`…
- Không viết class CSS bespoke mới vào `globals.css` — mọi style mới bằng Tailwind utility trong component.
- `frontend/src/app/globals.css.test.ts` có `MAX_LINES = 2914` (file đang 2913 dòng): **chỉ được hạ, không bao giờ nâng**.
- ESLint đã cấm import `@heroui/react` ngoài `frontend/src/components/ui/` — primitive mới không được phá luật này.
- Test theo pattern repo: `renderToStaticMarkup` + assert chuỗi; mock `next/navigation` như `global-header.test.tsx`. KHÔNG dùng `@testing-library/react` (repo không cài).
- Mỗi primitive phát `data-testid` riêng (kebab-case theo tên component).
- Commit message tiếng Việt theo convention repo (`feat(ui):`, `refactor(ui):`, `chore(ui):`…), kết thúc bằng dòng `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Lệnh kiểm tra: `pnpm --dir frontend test -- <tên-file>` (lọc theo tên), `pnpm --dir frontend test`, `pnpm --dir frontend typecheck`, `pnpm --dir frontend lint`.

---

### Task 1: Primitive `Skeleton`

**Files:**
- Create: `frontend/src/components/ui/skeleton.tsx`
- Create: `frontend/src/components/ui/skeleton.test.tsx`
- Modify: `frontend/src/components/ui/index.ts`

**Interfaces:**
- Consumes: token Tailwind (`bg-surfaceMuted`, `rounded-*`).
- Produces: `Skeleton({ variant?: "text" | "block" | "card"; className?: string })` — Đợt 2–4 dùng làm loading state mọi trang. `data-testid="skeleton"`, `data-variant` theo variant, `aria-hidden="true"`.

- [ ] **Step 1: Viết test fail**

```tsx
// frontend/src/components/ui/skeleton.test.tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Skeleton } from "./skeleton";

describe("Skeleton", () => {
  it("render data-testid, aria-hidden và variant mặc định block", () => {
    const html = renderToStaticMarkup(<Skeleton />);

    expect(html).toContain('data-testid="skeleton"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-variant="block"');
    expect(html).toContain("animate-pulse");
    expect(html).toContain("bg-surfaceMuted");
  });

  it("đổi lớp theo variant và nhận className ngoài", () => {
    const html = renderToStaticMarkup(<Skeleton variant="text" className="w-32" />);

    expect(html).toContain('data-variant="text"');
    expect(html).toContain("h-4");
    expect(html).toContain("w-32");
  });

  it("variant card dùng bo góc card và cao hơn", () => {
    const html = renderToStaticMarkup(<Skeleton variant="card" />);

    expect(html).toContain('data-variant="card"');
    expect(html).toContain("rounded-card");
    expect(html).toContain("h-40");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --dir frontend test -- skeleton`
Expected: FAIL — `Cannot find module './skeleton'`

- [ ] **Step 3: Viết implementation tối thiểu**

```tsx
// frontend/src/components/ui/skeleton.tsx
import clsx from "clsx";
import React from "react";

export type SkeletonVariant = "text" | "block" | "card";

export type SkeletonProps = {
  variant?: SkeletonVariant;
  className?: string;
};

const VARIANT_CLASS: Record<SkeletonVariant, string> = {
  text: "h-4 rounded-small",
  block: "h-24 rounded-field",
  card: "h-40 rounded-card",
};

export function Skeleton({ variant = "block", className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      data-testid="skeleton"
      data-variant={variant}
      className={clsx("animate-pulse bg-surfaceMuted", VARIANT_CLASS[variant], className)}
    />
  );
}
```

Thêm vào `frontend/src/components/ui/index.ts` (giữ thứ tự alphabet, sau `SegmentedFilter`):

```ts
export { Skeleton, type SkeletonProps, type SkeletonVariant } from "./skeleton";
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `pnpm --dir frontend test -- skeleton`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/skeleton.tsx frontend/src/components/ui/skeleton.test.tsx frontend/src/components/ui/index.ts
git commit -m "feat(ui): primitive Skeleton cho loading state giữ khung layout

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Primitive `ProgressBar`

**Files:**
- Create: `frontend/src/components/ui/progress-bar.tsx`
- Create: `frontend/src/components/ui/progress-bar.test.tsx`
- Modify: `frontend/src/components/ui/index.ts`

**Interfaces:**
- Consumes: token (`bg-trackMuted`, `bg-success`, `bg-warning`, `bg-danger`, `rounded-pill`).
- Produces: `ProgressBar({ value: number; max: number; ariaLabel: string; className?: string })` và hàm thuần `progressTone(percent: number): "success" | "warning" | "danger"` — Đợt 2 dùng ở Ngân sách/Dashboard. Quy tắc tone theo spec mục 6: `success` < 70%, `warning` 70–100%, `danger` > 100%. `data-testid="progress-bar"`, `data-tone`.

- [ ] **Step 1: Viết test fail**

```tsx
// frontend/src/components/ui/progress-bar.test.tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProgressBar, progressTone } from "./progress-bar";

describe("progressTone", () => {
  it("dưới 70% là success, 70–100% là warning, quá 100% là danger", () => {
    expect(progressTone(0)).toBe("success");
    expect(progressTone(69.9)).toBe("success");
    expect(progressTone(70)).toBe("warning");
    expect(progressTone(100)).toBe("warning");
    expect(progressTone(100.1)).toBe("danger");
  });
});

describe("ProgressBar", () => {
  it("render role progressbar với aria đầy đủ và tone theo mức dùng", () => {
    const html = renderToStaticMarkup(
      <ProgressBar value={82} max={100} ariaLabel="Ngân sách Di chuyển" />,
    );

    expect(html).toContain('data-testid="progress-bar"');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-label="Ngân sách Di chuyển"');
    expect(html).toContain('aria-valuenow="82"');
    expect(html).toContain('aria-valuemax="100"');
    expect(html).toContain('data-tone="warning"');
    expect(html).toMatch(/width:\s?82%/);
  });

  it("vượt hạn mức thì tone danger và width kẹp ở 100%", () => {
    const html = renderToStaticMarkup(
      <ProgressBar value={2100000} max={2000000} ariaLabel="Ngân sách Ăn uống" />,
    );

    expect(html).toContain('data-tone="danger"');
    expect(html).toMatch(/width:\s?100%/);
  });

  it("max = 0 không chia cho 0, coi như 0%", () => {
    const html = renderToStaticMarkup(
      <ProgressBar value={50} max={0} ariaLabel="Chưa đặt hạn mức" />,
    );

    expect(html).toContain('data-tone="success"');
    expect(html).toMatch(/width:\s?0%/);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --dir frontend test -- progress-bar`
Expected: FAIL — `Cannot find module './progress-bar'`

- [ ] **Step 3: Viết implementation**

```tsx
// frontend/src/components/ui/progress-bar.tsx
import clsx from "clsx";
import React from "react";

export type ProgressTone = "success" | "warning" | "danger";

export type ProgressBarProps = {
  /** Giá trị hiện tại (vd: số tiền đã chi). */
  value: number;
  /** Mốc 100% (vd: hạn mức). max <= 0 được coi là 0%. */
  max: number;
  /** Bắt buộc — trình đọc màn hình cần biết thanh này đo cái gì. */
  ariaLabel: string;
  className?: string;
};

const TONE_BAR_CLASS: Record<ProgressTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

export function progressTone(percent: number): ProgressTone {
  if (percent > 100) {
    return "danger";
  }

  if (percent >= 70) {
    return "warning";
  }

  return "success";
}

export function ProgressBar({ value, max, ariaLabel, className }: ProgressBarProps) {
  const percent = max > 0 ? (value / max) * 100 : 0;
  const tone = progressTone(percent);
  const width = Math.min(Math.max(percent, 0), 100);

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      data-testid="progress-bar"
      data-tone={tone}
      className={clsx("h-2 w-full overflow-hidden rounded-pill bg-trackMuted", className)}
    >
      <div
        className={clsx("h-full rounded-pill", TONE_BAR_CLASS[tone])}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
```

Thêm vào barrel `index.ts` (sau `MetricPill`):

```ts
export {
  ProgressBar,
  progressTone,
  type ProgressBarProps,
  type ProgressTone,
} from "./progress-bar";
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `pnpm --dir frontend test -- progress-bar`
Expected: PASS (4 test)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/progress-bar.tsx frontend/src/components/ui/progress-bar.test.tsx frontend/src/components/ui/index.ts
git commit -m "feat(ui): primitive ProgressBar màu theo mức dùng ngân sách

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Viết lại `StatusMessage` thành primitive chuẩn

**Files:**
- Modify: `frontend/src/components/ui/status-message.tsx` (viết lại toàn bộ)
- Modify: `frontend/src/components/ui/status-message.test.tsx` (viết lại toàn bộ)
- Modify: `frontend/src/components/ui/index.ts`

**Interfaces:**
- Consumes: token (`bg-infoSoft`/`text-onInfoSoft`, `bg-dangerSoft`/`text-onDangerSoft`, `bg-successSoft`/`text-onSuccessSoft`, `rounded-field`).
- Produces: `StatusMessage({ tone?: "info" | "error" | "success"; children; action?: ReactNode } & div props)` — **giữ nguyên chữ ký cũ, chỉ mở rộng** (tone + children + div attrs vẫn như trước) nên mọi call site hiện tại (dashboard, budgets, chat, groups, stories, auth, admin) không phải sửa. Thêm `action` cho nút "Thử lại". `data-testid="status-message"`, `data-tone`, `role="alert"` khi error / `role="status"` khi khác.
- **KHÔNG xoá** các class `.status-message-*` khỏi `globals.css` trong task này — `finance-chat.tsx` còn gán các class đó bằng tay; chúng sẽ chết ở plan Đợt 2 khi migrate chat.

- [ ] **Step 1: Viết lại test (fail trước khi sửa component)**

Thay toàn bộ nội dung `frontend/src/components/ui/status-message.test.tsx`:

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StatusMessage } from "./status-message";

describe("StatusMessage", () => {
  it("mặc định tone info, role status, có nhãn tiếng Việt", () => {
    const html = renderToStaticMarkup(<StatusMessage>Đang xử lý yêu cầu.</StatusMessage>);

    expect(html).toContain('data-testid="status-message"');
    expect(html).toContain('data-tone="info"');
    expect(html).toContain('role="status"');
    expect(html).toContain("Thông tin");
    expect(html).toContain("bg-infoSoft");
    expect(html).toContain("Đang xử lý yêu cầu.");
  });

  it("tone error dùng role alert và màu danger soft", () => {
    const html = renderToStaticMarkup(
      <StatusMessage tone="error">Không tải được dữ liệu.</StatusMessage>,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('data-tone="error"');
    expect(html).toContain("bg-dangerSoft");
    expect(html).toContain("Lỗi");
  });

  it("tone success dùng role status và màu success soft", () => {
    const html = renderToStaticMarkup(
      <StatusMessage tone="success">Đã lưu thay đổi.</StatusMessage>,
    );

    expect(html).toContain('role="status"');
    expect(html).toContain("bg-successSoft");
    expect(html).toContain("Thành công");
  });

  it("render action bên phải khi truyền vào", () => {
    const html = renderToStaticMarkup(
      <StatusMessage tone="error" action={<button type="button">Thử lại</button>}>
        Gửi thất bại.
      </StatusMessage>,
    );

    expect(html).toContain("Thử lại");
  });

  it("chuyển tiếp className và các div props khác", () => {
    const html = renderToStaticMarkup(
      <StatusMessage className="mt-4" id="submit-note">
        Ghi chú.
      </StatusMessage>,
    );

    expect(html).toContain("mt-4");
    expect(html).toContain('id="submit-note"');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --dir frontend test -- status-message`
Expected: FAIL — markup cũ không có `data-testid="status-message"` / `bg-infoSoft`

- [ ] **Step 3: Viết lại component**

Thay toàn bộ nội dung `frontend/src/components/ui/status-message.tsx`:

```tsx
import clsx from "clsx";
import React, { type HTMLAttributes, type ReactNode } from "react";

export type StatusMessageTone = "info" | "error" | "success";

export type StatusMessageProps = Omit<HTMLAttributes<HTMLDivElement>, "role"> & {
  tone?: StatusMessageTone;
  children: ReactNode;
  /** Hành động kèm theo (vd: nút Thử lại) — hiện bên phải nội dung. */
  action?: ReactNode;
};

const TONE_LABEL: Record<StatusMessageTone, string> = {
  info: "Thông tin",
  error: "Lỗi",
  success: "Thành công",
};

const TONE_CLASS: Record<StatusMessageTone, string> = {
  info: "bg-infoSoft text-onInfoSoft",
  error: "bg-dangerSoft text-onDangerSoft",
  success: "bg-successSoft text-onSuccessSoft",
};

export function StatusMessage({
  tone = "info",
  className,
  children,
  action,
  ...props
}: StatusMessageProps) {
  const role = tone === "error" ? "alert" : "status";

  return (
    <div
      {...props}
      role={role}
      data-testid="status-message"
      data-tone={tone}
      className={clsx(
        "flex items-center justify-between gap-3 rounded-field px-4 py-3 text-sm",
        TONE_CLASS[tone],
        className,
      )}
    >
      <p className="m-0">
        <strong className="font-bold">{TONE_LABEL[tone]}:</strong> {children}
      </p>
      {action ? <div className="flex-none">{action}</div> : null}
    </div>
  );
}
```

Thêm export types vào barrel `index.ts` (sau `StatCard`):

```ts
export {
  StatusMessage,
  type StatusMessageProps,
  type StatusMessageTone,
} from "./status-message";
```

- [ ] **Step 4: Chạy test status-message rồi chạy TOÀN BỘ suite**

Run: `pnpm --dir frontend test -- status-message`
Expected: PASS (5 test)

Run: `pnpm --dir frontend test`
Expected: PASS toàn bộ. Nếu test của màn khác (stories/auth/admin/finance) assert markup cũ của StatusMessage (vd chuỗi `status-message-card`), sửa **assertion trong test đó** sang markup mới (`data-testid="status-message"`) — không sửa component.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/status-message.tsx frontend/src/components/ui/status-message.test.tsx frontend/src/components/ui/index.ts
git commit -m "refactor(ui): viết lại StatusMessage thành primitive token-based, thêm slot action

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

Nếu Step 4 phải sửa test màn khác, add kèm các file test đó vào commit.

---

### Task 4: `SegmentedFilter` hỗ trợ chế độ link (sub-nav) + active style trắng theo spec

**Files:**
- Modify: `frontend/src/components/ui/segmented-filter.tsx`
- Modify: `frontend/src/components/ui/segmented-filter.test.tsx`

**Interfaces:**
- Consumes: `Button` primitive (pass-through `as`/`href` xuống HeroUI Button).
- Produces: `SegmentedFilterItem` mở rộng thành `{ key: string; label: string; href?: string }`. Có `href` → item render là link (`aria-current="page"` khi active); container thành `<nav>`. Không `href` → hành vi cũ giữ nguyên (button + `aria-current="true"`). Active style thống nhất theo spec mục 2.1: **nền trắng (`bg-surface`) + chữ `primaryStrong` + bóng soft** (cả hai chế độ). Task 7 (GlobalHeader) tiêu thụ chế độ link này.

- [ ] **Step 1: Thêm test fail cho chế độ link + style active mới**

Thêm vào cuối `describe("SegmentedFilter", ...)` trong `segmented-filter.test.tsx`:

```tsx
  it("item có href render thành link điều hướng trong nav", () => {
    const html = renderToStaticMarkup(
      <SegmentedFilter
        items={[
          { key: "/finance/dashboard", label: "Dashboard", href: "/finance/dashboard" },
          { key: "/finance/expenses", label: "Chi tiêu", href: "/finance/expenses" },
        ]}
        activeKey="/finance/expenses"
        ariaLabel="Điều hướng tài chính"
      />,
    );

    expect(html).toContain("<nav");
    expect(html).toContain('href="/finance/dashboard"');
    expect(html).toContain('href="/finance/expenses"');
    expect(html).toContain('aria-current="page"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("item active tô nền trắng chữ primaryStrong", () => {
    const html = renderToStaticMarkup(
      <SegmentedFilter
        items={items}
        activeKey="week"
        ariaLabel="Bộ lọc lịch sử chi tiêu"
      />,
    );

    expect(html).toContain("bg-surface");
    expect(html).toContain("text-primaryStrong");
    expect(html).toContain("shadow-soft");
  });
```

- [ ] **Step 2: Chạy test, xác nhận 2 test mới fail**

Run: `pnpm --dir frontend test -- segmented-filter`
Expected: FAIL — chưa có `<nav`, chưa có `bg-surface`/`text-primaryStrong`

- [ ] **Step 3: Sửa component**

Thay toàn bộ nội dung `frontend/src/components/ui/segmented-filter.tsx`:

```tsx
import clsx from "clsx";
import NextLink from "next/link";
import React from "react";

import { Button } from "./button";

export type SegmentedFilterItem = {
  key: string;
  label: string;
  /** Có href → item là link điều hướng (sub-nav); không có → nút lọc như cũ. */
  href?: string;
};

export type SegmentedFilterProps = {
  items: SegmentedFilterItem[];
  activeKey: string;
  onChange?: (key: string) => void;
  isDisabled?: boolean;
  /** Bắt buộc — nhóm cần nhãn để trình đọc màn hình biết đang lọc/điều hướng cái gì. */
  ariaLabel: string;
  className?: string;
};

const ACTIVE_CLASS = "bg-surface text-primaryStrong shadow-soft";

export function SegmentedFilter({
  items,
  activeKey,
  onChange,
  isDisabled,
  ariaLabel,
  className,
}: SegmentedFilterProps) {
  const isNav = items.some((item) => item.href);
  const Wrapper = isNav ? "nav" : "div";

  return (
    <Wrapper
      role={isNav ? undefined : "group"}
      aria-label={ariaLabel}
      data-testid="segmented-filter"
      className={`flex flex-wrap gap-1 rounded-pill bg-surfaceMuted p-1 ${className ?? ""}`}
    >
      {items.map((item) => {
        const isActive = item.key === activeKey;
        const activeClass = clsx(isActive && ACTIVE_CLASS);

        if (item.href) {
          return (
            <Button
              key={item.key}
              as={NextLink}
              href={item.href}
              size="sm"
              variant="ghost"
              aria-current={isActive ? "page" : undefined}
              isDisabled={isDisabled}
              className={activeClass}
            >
              {item.label}
            </Button>
          );
        }

        return (
          <Button
            key={item.key}
            type="button"
            size="sm"
            variant="ghost"
            aria-current={isActive ? true : undefined}
            isDisabled={isDisabled}
            onPress={onChange ? () => onChange(item.key) : undefined}
            className={activeClass}
          >
            {item.label}
          </Button>
        );
      })}
    </Wrapper>
  );
}
```

- [ ] **Step 4: Chạy test segmented-filter + toàn suite**

Run: `pnpm --dir frontend test -- segmented-filter`
Expected: PASS (5 test — 3 cũ + 2 mới). Test cũ "gắn aria-current cho đúng một item đang chọn" vẫn phải pass (chế độ button giữ `aria-current="true"`).

Run: `pnpm --dir frontend test`
Expected: PASS. Nếu test `finance-expenses` assert style active cũ của filter (variant primary), sửa assertion theo markup mới.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/segmented-filter.tsx frontend/src/components/ui/segmented-filter.test.tsx
git commit -m "feat(ui): SegmentedFilter chế độ link cho sub-nav, active trắng theo spec

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: `DataTable` biến thể thẻ mobile

**Files:**
- Modify: `frontend/src/components/ui/data-table.tsx`
- Modify: `frontend/src/components/ui/data-table.test.tsx`

**Interfaces:**
- Consumes: không đổi.
- Produces: prop mới `renderMobileCard?: (row: Row) => ReactNode`. Không truyền → markup **giữ nguyên như hiện tại** (test cũ không đổi). Có truyền → bảng ẩn dưới `md` (`hidden md:block`), thêm `<ul data-testid="data-table-cards" class="grid gap-3 md:hidden">` mỗi row một `<li>`. Đợt 2 dùng cho lịch sử Chi tiêu + bảng Nhóm.

- [ ] **Step 1: Thêm test fail**

Thêm vào cuối describe trong `data-table.test.tsx` (dùng lại fixture columns/rows sẵn có của file — nếu fixture trong file tên khác, dùng đúng tên đó):

```tsx
  it("không truyền renderMobileCard thì không render khối thẻ mobile", () => {
    const html = renderToStaticMarkup(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        caption="Bảng kiểm tra"
      />,
    );

    expect(html).not.toContain('data-testid="data-table-cards"');
    expect(html).not.toContain("md:block");
  });

  it("truyền renderMobileCard thì bảng ẩn dưới md và render thẻ cho từng row", () => {
    const html = renderToStaticMarkup(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        caption="Bảng kiểm tra"
        renderMobileCard={(row) => <span>thẻ-{row.id}</span>}
      />,
    );

    expect(html).toContain('data-testid="data-table-cards"');
    expect(html).toContain("md:block");
    expect(html).toContain("md:hidden");
    expect(html).toContain(`thẻ-${rows[0].id}`);
  });
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --dir frontend test -- data-table`
Expected: FAIL — prop `renderMobileCard` chưa tồn tại (lỗi TS) hoặc thiếu markup

- [ ] **Step 3: Sửa component**

Trong `data-table.tsx`: thêm vào `DataTableProps<Row>`:

```ts
  /** Có mặt → dưới breakpoint md bảng chuyển thành danh sách thẻ; mỗi row render bằng hàm này. */
  renderMobileCard?: (row: Row) => ReactNode;
```

Thêm `renderMobileCard` vào destructuring của `DataTable`, và thay nhánh return có rows bằng:

```tsx
  const table = (
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
  );

  if (!renderMobileCard) {
    return (
      <div className={clsx("overflow-x-auto", className)} data-testid="data-table">
        {table}
      </div>
    );
  }

  return (
    <div className={className} data-testid="data-table">
      <div className="hidden overflow-x-auto md:block">{table}</div>
      <ul className="grid gap-3 md:hidden" data-testid="data-table-cards">
        {rows.map((row) => (
          <li key={getRowKey(row)}>{renderMobileCard(row)}</li>
        ))}
      </ul>
    </div>
  );
```

- [ ] **Step 4: Chạy test data-table + toàn suite**

Run: `pnpm --dir frontend test -- data-table`
Expected: PASS toàn bộ (test cũ + 2 mới — nhánh không truyền prop giữ markup cũ nên test cũ không đổi)

Run: `pnpm --dir frontend test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/data-table.tsx frontend/src/components/ui/data-table.test.tsx
git commit -m "feat(ui): DataTable thêm biến thể thẻ mobile qua renderMobileCard

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Primitive `AppMenu` (nút ☰ + panel mobile)

**Files:**
- Create: `frontend/src/components/ui/app-menu.tsx`
- Create: `frontend/src/components/ui/app-menu.test.tsx`
- Modify: `frontend/src/components/ui/index.ts`

**Interfaces:**
- Consumes: `usePathname` (mock trong test), `lucide-react` (`Menu`, `X` — dep đã có), token Tailwind.
- Produces (Task 7 tiêu thụ `AppMenu`, `AppMenuSection`):

```ts
export type AppMenuSubItem = { href: string; label: string };
export type AppMenuSection = {
  href: string;
  label: string;
  isActive?: (pathname: string) => boolean;
  subItems?: AppMenuSubItem[];
};
export type AppMenuProps = {
  sections: AppMenuSection[];
  footer?: ReactNode;
  ariaLabel?: string; // mặc định "Menu điều hướng"
  defaultOpen?: boolean; // chỉ dùng cho test tĩnh
  className?: string;
};
```

Hành vi: khu active nền `primary` chữ trắng + tự xổ subItems (mục hiện tại nền `primarySoft` chữ `primaryStrong`); ESC/click-nền/click-link đóng menu; mở menu tự focus link đầu tiên. `data-testid`: `app-menu`, `app-menu-trigger`, `app-menu-panel`.

- [ ] **Step 1: Viết test fail** (test tĩnh — trạng thái mở dùng `defaultOpen`)

```tsx
// frontend/src/components/ui/app-menu.test.tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let mockedPathname = "/finance/expenses";

vi.mock("next/navigation", () => ({
  usePathname: () => mockedPathname,
}));

import { AppMenu, type AppMenuSection } from "./app-menu";

const sections: AppMenuSection[] = [
  { href: "/", label: "Home", isActive: (pathname) => pathname === "/" },
  {
    href: "/finance/dashboard",
    label: "Tài chính",
    isActive: (pathname) => pathname.startsWith("/finance"),
    subItems: [
      { href: "/finance/dashboard", label: "Dashboard" },
      { href: "/finance/expenses", label: "Chi tiêu" },
    ],
  },
  { href: "/movie", label: "Phim" },
];

describe("AppMenu", () => {
  beforeEach(() => {
    mockedPathname = "/finance/expenses";
  });

  it("đóng mặc định: chỉ có trigger, aria-expanded=false, không có panel", () => {
    const html = renderToStaticMarkup(<AppMenu sections={sections} />);

    expect(html).toContain('data-testid="app-menu-trigger"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="app-menu-panel"');
    expect(html).not.toContain('data-testid="app-menu-panel"');
  });

  it("mở: panel liệt kê khu vực, khu active xổ sub-items, mục hiện tại tô soft", () => {
    const html = renderToStaticMarkup(<AppMenu sections={sections} defaultOpen />);

    expect(html).toContain('data-testid="app-menu-panel"');
    expect(html).toContain('href="/movie"');
    expect(html).toContain("bg-primary");
    expect(html).toContain('href="/finance/expenses"');
    expect(html).toContain("bg-primarySoft");
    expect(html.match(/aria-current="page"/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("khu không active không xổ sub-items", () => {
    mockedPathname = "/movie";

    const html = renderToStaticMarkup(<AppMenu sections={sections} defaultOpen />);

    expect(html).not.toContain('href="/finance/expenses"');
  });

  it("render footer khi truyền vào", () => {
    const html = renderToStaticMarkup(
      <AppMenu sections={sections} defaultOpen footer={<span>Chào, Huy</span>} />,
    );

    expect(html).toContain("Chào, Huy");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --dir frontend test -- app-menu`
Expected: FAIL — `Cannot find module './app-menu'`

- [ ] **Step 3: Viết implementation**

```tsx
// frontend/src/components/ui/app-menu.tsx
"use client";

import clsx from "clsx";
import { Menu, X } from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useRef, useState, type ReactNode } from "react";

export type AppMenuSubItem = { href: string; label: string };

export type AppMenuSection = {
  href: string;
  label: string;
  /** Mặc định: pathname === href hoặc bắt đầu bằng `${href}/`. */
  isActive?: (pathname: string) => boolean;
  subItems?: AppMenuSubItem[];
};

export type AppMenuProps = {
  sections: AppMenuSection[];
  /** Khối cuối panel — thường là cụm tài khoản (tên user + Đăng xuất / Login + Register). */
  footer?: ReactNode;
  ariaLabel?: string;
  /** Chỉ dùng cho test tĩnh — mở sẵn panel. */
  defaultOpen?: boolean;
  className?: string;
};

function isSectionActive(section: AppMenuSection, pathname: string): boolean {
  if (section.isActive) {
    return section.isActive(pathname);
  }

  return pathname === section.href || pathname.startsWith(`${section.href}/`);
}

export function AppMenu({
  sections,
  footer,
  ariaLabel = "Menu điều hướng",
  defaultOpen = false,
  className,
}: AppMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Focus link đầu tiên khi mở để điều hướng được ngay bằng bàn phím.
    panelRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return (
    <div className={clsx("relative", className)} data-testid="app-menu">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls="app-menu-panel"
        aria-label={ariaLabel}
        data-testid="app-menu-trigger"
        onClick={() => setIsOpen((open) => !open)}
        className={clsx(
          "flex h-9 w-9 items-center justify-center rounded-pill border",
          isOpen ? "border-primary bg-primary text-white" : "border-border bg-surface text-text",
        )}
      >
        {isOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {isOpen ? (
        <>
          <div className="fixed inset-0 z-10 bg-text/30" aria-hidden="true" onClick={close} />
          <div
            ref={panelRef}
            id="app-menu-panel"
            data-testid="app-menu-panel"
            className="absolute right-0 z-20 mt-2 w-72 rounded-card border border-border bg-surface p-2 shadow-card"
          >
            <nav aria-label={ariaLabel} className="grid gap-1">
              {sections.map((section) => {
                const isActive = isSectionActive(section, pathname);

                return (
                  <React.Fragment key={section.href}>
                    <NextLink
                      href={section.href}
                      onClick={close}
                      aria-current={isActive ? "page" : undefined}
                      className={clsx(
                        "flex items-center justify-between rounded-field px-3 py-2 text-sm font-semibold",
                        isActive ? "bg-primary text-white" : "text-text hover:bg-surfaceMuted",
                      )}
                    >
                      {section.label}
                    </NextLink>
                    {isActive && section.subItems ? (
                      <div className="ml-3 grid gap-0.5 border-l-2 border-border pl-2">
                        {section.subItems.map((subItem) => {
                          const isCurrent =
                            pathname === subItem.href || pathname.startsWith(`${subItem.href}/`);

                          return (
                            <NextLink
                              key={subItem.href}
                              href={subItem.href}
                              onClick={close}
                              aria-current={isCurrent ? "page" : undefined}
                              className={clsx(
                                "rounded-field px-3 py-1.5 text-sm font-semibold",
                                isCurrent
                                  ? "bg-primarySoft text-primaryStrong"
                                  : "text-textMuted hover:bg-surfaceMuted",
                              )}
                            >
                              {subItem.label}
                            </NextLink>
                          );
                        })}
                      </div>
                    ) : null}
                  </React.Fragment>
                );
              })}
            </nav>
            {footer ? <div className="mt-2 border-t border-border pt-2">{footer}</div> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
```

Thêm vào barrel `index.ts` (đầu danh sách, trước `Button` cho đúng alphabet):

```ts
export {
  AppMenu,
  type AppMenuProps,
  type AppMenuSection,
  type AppMenuSubItem,
} from "./app-menu";
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `pnpm --dir frontend test -- app-menu`
Expected: PASS (4 test)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/app-menu.tsx frontend/src/components/ui/app-menu.test.tsx frontend/src/components/ui/index.ts
git commit -m "feat(ui): primitive AppMenu — nút menu mobile xổ khu vực + tab con

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Viết lại `GlobalHeader` — pill active, sub-nav trong header, AppMenu mobile

**Files:**
- Modify: `frontend/src/components/ui/global-header.tsx` (viết lại toàn bộ)
- Modify: `frontend/src/components/ui/global-header.test.tsx` (viết lại toàn bộ)

**Interfaces:**
- Consumes: `AppMenu`/`AppMenuSection` (Task 6), `SegmentedFilter` chế độ link (Task 4), `Button`, `useAuth`, `usePathname`.
- Produces: header là **khối sticky duy nhất chứa cả sub-nav** (desktop) — sub-nav "dính dưới header" tự nhiên, không cần magic number. Giữ nguyên logic module active hiện có (`isModuleActive`, gồm nhóm STORY_PATH_PREFIXES cho tab Truyện). Sub-nav CHỈ hiện ở khu Tài chính (`/finance*`) và khu Truyện (`/stories*`, `/recommendations`) — KHÔNG hiện ở `/login`, `/register` dù tab Truyện vẫn active ở đó. Task 8 dựa vào việc header đã có sub-nav để xoá `FinanceNav`.

- [ ] **Step 1: Viết lại test (fail trước khi sửa component)**

Thay toàn bộ nội dung `frontend/src/components/ui/global-header.test.tsx`:

```tsx
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

let mockedPathname = "/finance/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => mockedPathname,
}));

let mockedUser: unknown = null;
let mockedIsCheckingAuth = false;
let mockedIsRefreshingAuth = false;
const mockedLogout = vi.fn();

vi.mock("@/components/auth/auth-context", () => ({
  useAuth: () => ({
    user: mockedUser,
    isCheckingAuth: mockedIsCheckingAuth,
    isRefreshingAuth: mockedIsRefreshingAuth,
    logout: mockedLogout,
  }),
}));

import { GlobalHeader } from "./global-header";

describe("GlobalHeader", () => {
  beforeEach(() => {
    mockedPathname = "/finance/dashboard";
    mockedUser = null;
    mockedIsCheckingAuth = false;
    mockedIsRefreshingAuth = false;
    mockedLogout.mockClear();
  });

  it("module rail: tab active là pill nền primary, gắn aria-current", () => {
    const html = renderToStaticMarkup(<GlobalHeader />);

    expect(html).toContain("Hwimae");
    expect(html).toContain('data-testid="module-rail"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("bg-primary");
    expect(html).toContain('href="/finance/dashboard"');
    expect(html).not.toContain('href="/admin/users"');
  });

  it("khu Tài chính hiện sub-nav segmented với đủ 5 tab", () => {
    mockedPathname = "/finance/expenses";

    const html = renderToStaticMarkup(<GlobalHeader />);

    expect(html).toContain('data-testid="segmented-filter"');
    expect(html).toContain("Dashboard");
    expect(html).toContain("Chi tiêu");
    expect(html).toContain("Ngân sách");
    expect(html).toContain("AI Chat");
    expect(html).toContain("Nhóm");
    expect(html).toContain('href="/finance/groups"');
  });

  it("khu Truyện hiện sub-nav Danh sách + Gợi ý AI, kể cả ở trang chi tiết", () => {
    mockedPathname = "/stories/story-1";

    const html = renderToStaticMarkup(<GlobalHeader />);

    expect(html).toContain('data-testid="segmented-filter"');
    expect(html).toContain("Danh sách");
    expect(html).toContain("Gợi ý AI");
    expect(html).toContain('href="/recommendations"');
  });

  it("landing và trang auth không có sub-nav", () => {
    mockedPathname = "/";
    expect(renderToStaticMarkup(<GlobalHeader />)).not.toContain(
      'data-testid="segmented-filter"',
    );

    mockedPathname = "/login";
    expect(renderToStaticMarkup(<GlobalHeader />)).not.toContain(
      'data-testid="segmented-filter"',
    );
  });

  it("luôn render AppMenu trigger cho mobile", () => {
    const html = renderToStaticMarkup(<GlobalHeader />);

    expect(html).toContain('data-testid="app-menu-trigger"');
  });

  it("khách chưa đăng nhập thấy Login/Register, không thấy Đăng xuất", () => {
    const html = renderToStaticMarkup(<GlobalHeader />);

    expect(html).toContain('href="/login"');
    expect(html).toContain('href="/register"');
    expect(html).not.toContain("Đăng xuất");
  });

  it("user đã đăng nhập thấy tên + Đăng xuất, không thấy Login/Register", () => {
    mockedUser = {
      id: "user1",
      email: "user@example.com",
      name: "User",
      role: "USER",
      status: "APPROVED",
    };

    const html = renderToStaticMarkup(<GlobalHeader />);

    expect(html).toContain("Đăng xuất");
    expect(html).toContain("User");
    expect(html).not.toContain('href="/login"');
    expect(html).not.toContain('href="/register"');
  });

  it("giữ auth actions khi refresh nền", () => {
    mockedUser = {
      id: "user1",
      email: "user@example.com",
      name: "User",
      role: "USER",
      status: "APPROVED",
    };
    mockedIsCheckingAuth = false;
    mockedIsRefreshingAuth = true;

    const html = renderToStaticMarkup(<GlobalHeader />);

    expect(html).toContain("Đăng xuất");
  });

  it("admin đã duyệt thấy mục Admin", () => {
    mockedUser = {
      id: "admin1",
      email: "admin@example.com",
      name: "Admin",
      role: "ADMIN",
      status: "APPROVED",
    };

    const html = renderToStaticMarkup(<GlobalHeader />);

    expect(html.match(/href="\/admin\/users"/g)?.length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --dir frontend test -- global-header`
Expected: FAIL — chưa có `data-testid="module-rail"`, sub-nav, app-menu-trigger

- [ ] **Step 3: Viết lại component**

Thay toàn bộ nội dung `frontend/src/components/ui/global-header.tsx`:

```tsx
"use client";

import clsx from "clsx";
import { CircleUserRound } from "lucide-react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

import { useAuth } from "@/components/auth/auth-context";

import { AppMenu, type AppMenuSection } from "./app-menu";
import { Button } from "./button";
import { SegmentedFilter, type SegmentedFilterItem } from "./segmented-filter";
import { TextLink } from "./text-link";

const MODULE_LINKS = [
  { href: "/", label: "Home" },
  { href: "/stories", label: "Truyện" },
  { href: "/finance/dashboard", label: "Tài chính" },
  { href: "/movie", label: "Phim" },
] as const;

const STORY_PATH_PREFIXES = ["/stories", "/recommendations", "/login", "/register"];

const FINANCE_SUB_NAV: SegmentedFilterItem[] = [
  { key: "/finance/dashboard", label: "Dashboard", href: "/finance/dashboard" },
  { key: "/finance/expenses", label: "Chi tiêu", href: "/finance/expenses" },
  { key: "/finance/budgets", label: "Ngân sách", href: "/finance/budgets" },
  { key: "/finance/chat", label: "AI Chat", href: "/finance/chat" },
  { key: "/finance/groups", label: "Nhóm", href: "/finance/groups" },
];

const STORIES_SUB_NAV: SegmentedFilterItem[] = [
  { key: "/stories", label: "Danh sách", href: "/stories" },
  { key: "/recommendations", label: "Gợi ý AI", href: "/recommendations" },
];

function isModuleActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  if (href === "/finance/dashboard") {
    return pathname === "/finance" || pathname.startsWith("/finance/");
  }

  if (href === "/stories") {
    return STORY_PATH_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type SubNav = { ariaLabel: string; items: SegmentedFilterItem[] };

function getSubNav(pathname: string): SubNav | null {
  if (pathname === "/finance" || pathname.startsWith("/finance/")) {
    return { ariaLabel: "Điều hướng tài chính", items: FINANCE_SUB_NAV };
  }

  if (
    pathname === "/stories" ||
    pathname.startsWith("/stories/") ||
    pathname === "/recommendations"
  ) {
    return { ariaLabel: "Điều hướng truyện", items: STORIES_SUB_NAV };
  }

  return null;
}

function getActiveSubKey(pathname: string, items: SegmentedFilterItem[]): string {
  const match = [...items]
    .sort((a, b) => b.key.length - a.key.length)
    .find((item) => pathname === item.key || pathname.startsWith(`${item.key}/`));

  return match?.key ?? items[0].key;
}

function toSubItems(items: SegmentedFilterItem[]) {
  return items.flatMap((item) =>
    item.href ? [{ href: item.href, label: item.label }] : [],
  );
}

export function GlobalHeader() {
  const pathname = usePathname();
  const { user, isCheckingAuth, isRefreshingAuth, logout } = useAuth();
  const links =
    user?.role === "ADMIN" && user.status === "APPROVED"
      ? [...MODULE_LINKS, { href: "/admin/users", label: "Admin" }]
      : [...MODULE_LINKS];
  const shouldHideAuthActions = isCheckingAuth && !isRefreshingAuth;
  const subNav = getSubNav(pathname);

  const menuSections: AppMenuSection[] = links.map((item) => ({
    href: item.href,
    label: item.label,
    isActive: (current) => isModuleActive(current, item.href),
    subItems:
      item.href === "/finance/dashboard"
        ? toSubItems(FINANCE_SUB_NAV)
        : item.href === "/stories"
          ? toSubItems(STORIES_SUB_NAV)
          : undefined,
  }));

  const authActions = shouldHideAuthActions ? null : user ? (
    <>
      <span className="flex items-center gap-1.5 text-sm text-textMuted">
        <CircleUserRound size={16} />
        <span className="font-semibold text-text">{user.name}</span>
      </span>
      <Button size="sm" variant="ghost" onPress={logout}>
        Đăng xuất
      </Button>
    </>
  ) : (
    <>
      <Button as={NextLink} href="/login" size="sm" variant="ghost">
        Login
      </Button>
      <Button as={NextLink} href="/register" size="sm" variant="primary">
        Register
      </Button>
    </>
  );

  return (
    <header className="global-header">
      <div className="mx-auto grid w-full max-w-[78rem] gap-2 pb-2">
        <div className="flex items-center justify-between gap-3">
          <TextLink
            as={NextLink}
            href="/"
            tone="muted"
            className="text-lg font-extrabold tracking-tight text-text"
          >
            Hwimae
          </TextLink>

          <div className="hidden items-center gap-2 lg:flex">{authActions}</div>

          <div className="lg:hidden">
            <AppMenu
              sections={menuSections}
              footer={
                <div className="flex items-center justify-between gap-2 px-1">
                  {authActions}
                </div>
              }
            />
          </div>
        </div>

        <nav
          className="hidden flex-wrap gap-1.5 lg:flex"
          aria-label="Điều hướng chính"
          data-testid="module-rail"
        >
          {links.map((item) => {
            const isActive = isModuleActive(pathname, item.href);

            return (
              <NextLink
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={clsx(
                  "rounded-pill px-4 py-1.5 text-sm font-semibold transition-colors",
                  isActive ? "bg-primary text-white" : "text-textMuted hover:bg-surfaceMuted",
                )}
              >
                {item.label}
              </NextLink>
            );
          })}
        </nav>

        {subNav ? (
          <div className="hidden lg:block">
            <SegmentedFilter
              items={subNav.items}
              activeKey={getActiveSubKey(pathname, subNav.items)}
              ariaLabel={subNav.ariaLabel}
              className="w-fit"
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}
```

Ghi chú cho người thực thi:

- Class `global-header` GIỮ LẠI (sticky + padding + nền + border trong `globals.css`); mọi class `global-header-*` con không còn được tham chiếu sau task này — Task 9 xoá CSS.
- Lưu ý test "landing và trang auth không có sub-nav" + "khách thấy Login/Register": ở `/login` AppMenu vẫn render section Truyện KHÔNG kèm subItems mở (vì `getSubNav` không quyết định AppMenu; AppMenu tự xổ theo `isActive` của section Truyện — pathname `/login` khớp STORY_PATH_PREFIXES nên section Truyện active và xổ 2 sub-item của Truyện trong menu mobile; đây là hành vi chấp nhận được và test không assert điều ngược lại).

- [ ] **Step 4: Chạy test global-header + toàn suite + typecheck**

Run: `pnpm --dir frontend test -- global-header`
Expected: PASS (9 test)

Run: `pnpm --dir frontend test && pnpm --dir frontend typecheck`
Expected: PASS. Nếu test trang khác assert class cũ (`global-header-nav-link`, `global-header-module-rail`), cập nhật assertion theo markup mới (`data-testid="module-rail"`).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui/global-header.tsx frontend/src/components/ui/global-header.test.tsx
git commit -m "feat(ui): header mới — pill active, sub-nav segmented trong header, AppMenu mobile

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Gỡ nav khỏi `FinanceShell`, xoá `FinanceNav` + `WorkspaceTabs`

**Files:**
- Modify: `frontend/src/components/finance/finance-shell.tsx`
- Delete: `frontend/src/components/finance/finance-nav.tsx` (+ file test nếu tồn tại)
- Delete: `frontend/src/components/ui/workspace-tabs.tsx`, `frontend/src/components/ui/workspace-tabs.test.tsx`

**Interfaces:**
- Consumes: header đã render sub-nav tài chính (Task 7) — nav trong shell thành thừa (2 thanh trùng nhau).
- Produces: `FinanceShell({ children })` chỉ còn `PageShell` + khung content. Không còn file nào import `WorkspaceTabs`/`FinanceNav`.

- [ ] **Step 1: Xác nhận điểm tham chiếu trước khi xoá**

Run: `grep -rn "FinanceNav\|WorkspaceTabs\|workspace-tabs\|finance-nav" frontend/src --include="*.tsx" --include="*.ts"`
Expected: chỉ thấy `finance-shell.tsx`, `finance-nav.tsx`, `workspace-tabs.tsx` (+ test của chúng). Nếu có chỗ khác import → dừng, xử lý chỗ đó trước theo cùng cách (bỏ import, dùng header sub-nav).

- [ ] **Step 2: Sửa finance-shell.tsx**

Bỏ import `FinanceNav`, thay khối return trong `FinanceShell` bằng:

```tsx
  return (
    <PageShell
      title={copy.title}
      description={copy.description}
      eyebrow="Finance workspace"
      variant="workspace"
    >
      <div className="finance-shell-frame">
        <div className="finance-shell-content">{children}</div>
      </div>
    </PageShell>
  );
```

(`PAGE_COPY`/`DEFAULT_COPY` giữ nguyên. Div `finance-shell-nav-row` bị bỏ.)

- [ ] **Step 3: Xoá file**

```bash
git rm frontend/src/components/finance/finance-nav.tsx
git rm frontend/src/components/ui/workspace-tabs.tsx frontend/src/components/ui/workspace-tabs.test.tsx
# nếu tồn tại: git rm frontend/src/components/finance/finance-nav.test.tsx
```

- [ ] **Step 4: Chạy toàn suite + typecheck**

Run: `pnpm --dir frontend test && pnpm --dir frontend typecheck`
Expected: PASS. Nếu `finance-shell.test.tsx` tồn tại và assert nav (`workspace-nav-link`, `FinanceNav`), cập nhật assertion: shell không còn nav, chỉ còn content.

- [ ] **Step 5: Commit**

```bash
git add -A frontend/src
git commit -m "refactor(ui): gỡ FinanceNav/WorkspaceTabs — sub-nav tài chính đã nằm trong header

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Dọn `globals.css` — xoá class chết, hạ ratchet

**Files:**
- Modify: `frontend/src/app/globals.css`
- Modify: `frontend/src/app/globals.css.test.ts` (hạ `MAX_LINES`)

**Interfaces:**
- Consumes: Task 7–8 đã bỏ mọi tham chiếu tới class header/nav cũ.
- Produces: `globals.css` ngắn hơn, `MAX_LINES` = số dòng mới (không bao giờ cao hơn 2914).

- [ ] **Step 1: Liệt kê class ứng viên và xác nhận không còn tham chiếu**

Với TỪNG class dưới đây, grep xác nhận 0 kết quả trong code (ngoài chính `globals.css`) rồi mới xoá khối CSS tương ứng:

```bash
for c in global-header-shell global-header-topbar global-header-brand global-header-brand-mark \
         global-header-actions global-header-auth-actions global-header-account \
         global-header-account-name global-header-auth-button global-header-login-button \
         global-header-register-button global-header-menu global-header-module-rail \
         global-header-nav-link workspace-nav workspace-tabs workspace-nav-link \
         finance-nav finance-shell-nav-row; do
  echo "== $c =="; grep -rn "$c" frontend/src --include="*.tsx" --include="*.ts" | grep -v globals.css
done
```

Expected: mọi class in ra "== tên ==" và không có dòng code nào theo sau. Class nào còn tham chiếu → GIỮ LẠI khối CSS đó, ghi chú cho plan đợt sau.

Lưu ý: `.global-header` (không hậu tố), `.status-message*`, `.finance-shell-frame`, `.finance-shell-content` VẪN CÒN DÙNG — không xoá.

- [ ] **Step 2: Xoá các khối CSS chết**

Mở `frontend/src/app/globals.css`, xoá trọn rule của những class đã xác nhận 0 tham chiếu ở Step 1 — cả bản định nghĩa đầu file lẫn bản override ở nửa sau file (grep từng tên trong chính globals.css để không sót). Chạy `pnpm --dir frontend format` sau khi xoá.

- [ ] **Step 3: Đếm dòng mới và hạ ratchet**

Run: `grep -c "" frontend/src/app/globals.css`

Lấy số dòng in ra (gọi là `N`, kỳ vọng giảm ≥ 80 dòng so với 2913). Sửa `frontend/src/app/globals.css.test.ts`: `const MAX_LINES = N;` (giữ nguyên comment phía trên).

- [ ] **Step 4: Chạy toàn suite + typecheck + lint**

Run: `pnpm --dir frontend test && pnpm --dir frontend typecheck && pnpm --dir frontend lint`
Expected: PASS toàn bộ, gồm cả `globals.css.test.ts` với mốc mới.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/globals.css frontend/src/app/globals.css.test.ts
git commit -m "chore(ui): xoá CSS header/nav chết sau khi chuyển sang primitive, hạ ratchet

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Kiểm chứng end-to-end Đợt 1

**Files:** không sửa code (chỉ chạy kiểm tra; phát hiện lỗi thì quay lại task tương ứng sửa).

- [ ] **Step 1: Chạy full gate**

Run: `pnpm --dir frontend typecheck && pnpm --dir frontend test && pnpm --dir frontend lint && pnpm --dir frontend format:check`
Expected: PASS cả 4 lệnh.

- [ ] **Step 2: Kiểm tra bằng mắt trên dev server**

Run: `pnpm --dir frontend dev` (backend chạy song song `pnpm --dir backend dev` nếu muốn có dữ liệu; không có backend vẫn xem được khung):

1. Desktop `/finance/expenses`: header có pill "Tài chính" nền xanh; dưới header có segmented 5 tab, "Chi tiêu" nền trắng chữ xanh đậm; KHÔNG còn thanh nav thứ hai trong thân trang.
2. Desktop `/stories` và `/recommendations`: segmented "Danh sách · Gợi ý AI" hiện đúng tab active.
3. Desktop `/` và `/login`: không có segmented.
4. Thu cửa sổ < 1024px: rail + segmented biến mất, hiện nút ☰; bấm mở panel — khu Tài chính xổ 5 tab con, mục hiện tại tô xanh nhạt; footer panel có Login/Register (hoặc tên user + Đăng xuất); ESC và bấm nền ngoài đóng được panel.
5. Cuộn trang dài (vd `/stories`): header + segmented dính trên cùng, nội dung không bị che.

- [ ] **Step 3: Báo cáo kết quả cho user**

Tóm tắt: các gate xanh + checklist mắt ở Step 2 đạt mục nào, kèm ảnh chụp nếu có browser tooling. Không tự merge/push — chờ user quyết.

---

## Self-review (đã chạy khi viết plan)

1. **Spec coverage (phạm vi Đợt 1, spec mục 7):** header pill active → Task 7; sub-nav segmented sticky → Task 4 + 7 (sticky tự nhiên vì nằm trong header sticky); AppMenu ☰ → Task 6 + 7; Skeleton → Task 1; ProgressBar → Task 2; DataTable mobile-card → Task 5; StatusMessage mới → Task 3; ratchet giảm → Task 9. Spec 2.2 "focus trap khi mở" được thu hẹp thành focus-link-đầu + ESC + click-ngoài (ghi trong Task 6; trap vòng Tab đầy đủ bổ sung ở đợt sau nếu cần — nêu deviation này khi báo cáo).
2. **Placeholder scan:** không có TBD/"tương tự task N"; mọi step có code hoặc lệnh cụ thể; các nhánh "nếu test khác fail" chỉ rõ sửa assertion, không sửa component.
3. **Type consistency:** `SegmentedFilterItem.href?` (Task 4) khớp cách dùng ở Task 7 (`toSubItems` dùng `flatMap` tránh non-null assertion); `AppMenuSection`/`footer` (Task 6) khớp Task 7; `progressTone` export khớp test; barrel export khớp tên file kebab-case.
