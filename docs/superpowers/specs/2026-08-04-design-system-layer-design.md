# Design: Tầng giao diện dùng chung cho frontend (đợt nền + màn pilot)

- Ngày: 2026-08-04
- Phạm vi: `frontend/`
- Trạng thái: đã chốt với user, chờ lập implementation plan

## 1. Vấn đề

Yêu cầu của user: những thành phần giao diện dùng chung được cho toàn dự án (nút, form, card...) phải lấy mặc định từ thư viện, rồi style lại tại **một khu vực dùng chung**, để sửa một chỗ là toàn dự án đổi theo.

Hiện trạng không đạt điều đó. Style đang nằm rải ở ba nơi độc lập:

1. `frontend/src/app/globals.css` — 3275 dòng CSS bespoke đặt tên theo từng feature (`.finance-expenses-hero-stat-label`, `.story-advisor-quick-prompt`...). Trong đó có một vùng `/* 2026-06-30 neutral UI overrides */` (dòng 2519-3275) ghi đè lại vùng gốc phía trên.
2. `frontend/tailwind.config.ts` — HeroUI theme khai `primary` = `#0284c7` (xanh ocean).
3. Props inline tại call site — `color="primary" variant="flat" radius="full"` lặp ở khoảng 15 chỗ, mỗi chỗ một tổ hợp khác nhau.

Số liệu đo được từ `globals.css`:

- 65 lượt viết mã màu hex trực tiếp, gồm 31 mã màu khác nhau. `#111111` viết tay 9 lần; màu trắng viết 2 kiểu (`#fff` 4 lần, `#ffffff` 5 lần).
- 17 giá trị `border-radius` khác nhau: `1rem` (17 lần), `1.25rem` (8), rồi `0.9rem`, `0.95rem`, `1.1rem`, `1.2rem`, `1.6rem`, `1.75rem`, `2rem`... Chỉ 12/57 chỗ dùng `var(--radius-lg)`, còn lại hardcode.
- Ba loại card đang có ba độ bo góc khác nhau (`.finance-stat-card` 1rem, `.story-catalog-card` 1.25rem, `.finance-category-card` 0.9rem) — không phải chủ ý thiết kế.
- Biến trong `:root` đã mất tác dụng phân biệt: `--primary`, `--success`, `--warning`, `--error`, `--info` đều bằng `#111111`.

Ngoài ra: 31 chỗ dùng raw `<button>` / `<input>` / `<select>` / `<table>` (chủ yếu trong `components/finance/`) nên không nhận được style của thư viện, và không có gì ngăn việc import `@heroui/react` trực tiếp rồi tự set props.

## 2. Quyết định đã chốt

| Quyết định | Lựa chọn |
|---|---|
| Mức độ thay đổi hình ảnh | Redesign look & feel mới |
| Ngôn ngữ thị giác | Hướng **Soft & Friendly**: bo góc lớn, nút pill, đổ bóng mềm, nền xanh rất nhạt, màu trạng thái rõ |
| Chia việc | Spec này = **nền dùng chung + 1 màn pilot**. 14 màn còn lại là các spec sau |
| Dark mode | Không làm. Xóa `darkMode: "class"` khỏi `tailwind.config.ts` |
| Màn pilot | `/finance/expenses` |
| Chrome dùng chung (nền body, header, page-shell) | Đổi luôn trong đợt này |
| Kiến trúc | Nguồn giá trị ở TypeScript → Tailwind + HeroUI theme → wrapper mỏng |
| ESLint chặn import HeroUI trực tiếp | Bật ngay, migrate luôn 16 file bị ảnh hưởng |

### Các hướng đã cân nhắc và loại

- **Dùng `extendVariants` của HeroUI, không tạo wrapper.** Loại vì vẫn phải có module trung gian để export cái đã extend (tức vẫn là wrapper), và không giải quyết được cấu trúc label/hint/error của form, bảng dữ liệu, empty state — HeroUI không có hoặc không đủ. Kết quả nửa vời.
- **Bỏ HeroUI, tự build primitive trên Tailwind + CVA.** Loại vì mất a11y sẵn có từ React Aria (focus trap, keyboard nav, aria cho Select/Modal), phải tự viết lại rất tốn và dễ sai; đồng thời đi ngược stack đã chốt trong CLAUDE.md.
- **Sinh CSS variables từ file TS bằng script** (`tokens.generated.css` + `generate-tokens.ts` + test sync). Loại vì ba file đó chỉ tồn tại để cho CSS bespoke cũ ăn được màu mới — mà việc đó không cần thiết: redesign đi từng màn, màn chưa tới lượt cứ giữ giao diện cũ.

## 3. Kiến trúc

### 3.1 Nguồn giá trị giao diện

Giá trị thô nằm ở TypeScript, không phải CSS. Lý do: plugin HeroUI cần màu **literal** để tự sinh foreground/hover/opacity của nó — truyền `var(--x)` vào là parse lỗi.

```
frontend/src/components/ui/style/
  colors.ts    bảng màu dùng chung: nền, chữ, viền, primary, màu trạng thái
  radius.ts    độ bo góc của card / input / nút
  shadows.ts   các mức đổ bóng
  index.ts     gom 3 file trên cho tailwind.config import
```

Đặt trong `components/ui/` vì CLAUDE.md đã ghi *"khi sửa giao diện, ưu tiên chỉnh trong `frontend/src/components/ui/`"* — chỉ cần nhớ một đường dẫn cho mọi việc liên quan giao diện. Tên file nói đúng nội dung, không dùng thuật ngữ "token".

`frontend/tailwind.config.ts` import `./src/components/ui/style` và map vào **cả hai** chỗ:

- `theme.extend.colors` / `borderRadius` / `boxShadow` → sinh ra utility class (`bg-surface`, `rounded-card`, `shadow-card`)
- `heroui({ layout, themes.light.colors })` → component HeroUI nhận cùng giá trị

Nhờ vậy utility Tailwind và component HeroUI không bao giờ lệch nhau.

**Không đưa vào đợt này:** `chart-colors.ts` (màn pilot không có biểu đồ; màu recharts đang nằm trong `expense-chart.tsx` và `budget-usage-chart.tsx`, cả hai không bị đụng — chốt màu chart khi làm dashboard). `spacing.ts` và `typography.ts` (scale mặc định của Tailwind đang dùng được; thêm vào chỉ là tầng trung gian vô ích).

### 3.2 Bảng màu

Mọi cặp màu chữ/nền dưới đây đã được tính tỉ lệ tương phản theo công thức WCAG.

**Nền và chữ**

| Tên | Giá trị | Tương phản | Dùng cho |
|---|---|---|---|
| `background` | `#f6f9fc` | — | Nền trang (`body`) |
| `surface` | `#ffffff` | — | Nền card |
| `surfaceMuted` | `#f1f5f9` | — | Nền input, hàng bảng |
| `text` | `#0f172a` | 17.85:1 trên trắng | Tiêu đề, số tiền |
| `textMuted` | `#64748b` | 4.76:1 trên trắng · 4.50:1 trên nền trang | Nhãn, mô tả |
| `textPlaceholder` | `#5f6b7a` | 4.95:1 trên `surfaceMuted` | Placeholder |
| `border` | `#e2e8f0` | — | Viền trang trí, đường kẻ bảng |
| `borderField` | `#8492a4` | 3.17:1 trên trắng | Viền input / select / nút secondary |
| `trackMuted` | `#e8eef6` | — | Rãnh progress bar |

**Primary và màu trạng thái**

| Tên | Giá trị | Tương phản | Dùng cho |
|---|---|---|---|
| `primary` | `#0369a1` | chữ trắng 5.93:1 · làm chữ trên trắng 5.93:1 | Nút chính, link |
| `primaryStrong` | `#075985` | 7.56:1 | Hover / active |
| `primarySoft` / `onPrimarySoft` | `#e0f2fe` / `#0369a1` | 5.17:1 | Chip primary |
| `success` | `#15803d` | 5.02:1 trên trắng | Trạng thái tốt |
| `successSoft` / `onSuccessSoft` | `#dcfce7` / `#166534` | 6.49:1 | Chip "Đang kiểm soát" |
| `warning` | `#b45309` | 5.02:1 trên trắng | Sắp vượt hạn mức |
| `warningSoft` / `onWarningSoft` | `#fef3c7` / `#92400e` | 6.37:1 | Chip "Sắp vượt" |
| `danger` | `#b91c1c` | 6.47:1 trên trắng | Lỗi, vượt hạn mức |
| `dangerSoft` / `onDangerSoft` | `#fee2e2` / `#991b1b` | 6.80:1 | Thông báo lỗi |
| `info` / `infoSoft` / `onInfoSoft` | `#0369a1` / `#e0f2fe` / `#0369a1` | 5.17:1 | Thông báo thông tin |

Focus ring: 2px `primary`, offset 2px — 5.93:1 trên trắng, 5.62:1 trên nền trang.

**Hai lỗi tương phản của thiết kế hiện tại, đã sửa trong bảng trên:**

1. `primary` cũ `#0284c7` cho chữ trắng chỉ **4.10:1**, dưới ngưỡng 4.5:1 của WCAG AA cho chữ thường. Mọi nút primary hiện tại đang không đọc đủ rõ. → đổi sang `#0369a1` (5.93:1), cùng họ xanh ocean, đậm hơn một bậc.
2. Kiểu input "tô nền, không viền" của hướng Soft & Friendly vi phạm WCAG 1.4.11 (ranh giới control cần 3:1 so với nền kề): `#f1f5f9` so với card trắng chỉ **1.09:1**, placeholder `#94a3b8` chỉ 2.56:1. → giữ nền xám nhưng thêm viền `borderField` `#8492a4` (3.17:1), placeholder đổi sang `#5f6b7a` (4.95:1).

### 3.3 Bo góc và đổ bóng

```ts
radius  = { card: "1.25rem", field: "0.875rem", pill: "999px", small: "0.5rem" }
shadows = {
  soft:    "0 4px 14px rgba(15,23,42,.05)",
  card:    "0 10px 26px rgba(15,23,42,.07)",
  primary: "0 6px 16px rgba(3,105,161,.24)",
}
```

Bốn giá trị bo góc thay cho 17 giá trị rời rạc hiện tại. Map vào HeroUI `layout.radius`: `small` → `0.5rem`, `medium` → `0.875rem`, `large` → `1.25rem`.

### 3.4 Bộ primitive

Chín primitive trong `frontend/src/components/ui/`:

| Primitive | Trạng thái | Thay thế |
|---|---|---|
| `Button` | mới | 15 call site set props rời + raw `<button>` |
| `FormField` | mở rộng | hiện chỉ có input/textarea, thêm select + radio + error + required |
| `CardSurface` | mới, thay `FormSurface` | `.workspace-card`, `.glass-card`, `.form-surface`, `Card`+`CardBody` inline |
| `Chip` | chuẩn hóa từ `MetricPill` | `.finance-expenses-category-pill`, `Chip` inline |
| `TextLink` | mới | `Link` của HeroUI, và rule global `a { }` trong `globals.css` |
| `DataTable` | mới | raw `<table>` + `.table-wrap` |
| `StatCard` | mới | `.finance-expenses-summary-card`, `.finance-stat-card` |
| `SegmentedFilter` | mới | `.finance-expenses-filter` |
| `EmptyState` | restyle | `StatusMessage` / `PageState` ở trạng thái rỗng |

Bộ primitive phải phủ **đủ** mọi component HeroUI đang được import ngoài `components/ui/`, nếu không thì bật ESLint rule sẽ fail lint mà không có chỗ để chuyển sang. Đối chiếu thực tế:

| Component HeroUI đang dùng ngoài `ui/` | Chuyển sang |
|---|---|
| `Button` | `Button` |
| `Card` / `CardBody` / `CardHeader` | `CardSurface` |
| `Chip` | `Chip` |
| `Textarea` | `FormField kind="textarea"` |
| `Radio` / `RadioGroup` (chỉ `review-form.tsx`) | `FormField kind="radio"` |
| `Link` (chỉ `app/page.tsx`) | `TextLink` |
| `HeroUIProvider` (`ui/providers.tsx`) | giữ nguyên — nằm trong vùng được phép |

Modal, Tabs, Pagination, Tooltip **không làm** trong đợt này — thêm khi có màn cần thật.

API:

```ts
Button        variant: "primary" | "secondary" | "ghost" | "danger" = "primary"
              size: "sm" | "md" = "md"; isLoading
              // không nhận color / radius / variant của HeroUI

FormField     kind: "input" | "textarea" | "select" | "radio" = "input"
              id, label, hint?, error?, required?
              options?: { value: string; label: string }[]   // với kind="select" | "radio"

CardSurface   title?, description?, action?      // gói luôn pattern .section-heading-row
              padding: "md" | "lg" = "md"; as?: "section" | "div" | "form"
              className?                          // giữ để 5 call site của FormSurface đổi tối thiểu

Chip          tone: "neutral" | "primary" | "success" | "warning" | "danger" | "info"

TextLink      href; as?: typeof NextLink; tone: "primary" | "muted" = "primary"

DataTable     columns: { key; header; align?: "left" | "right"; render(row) }[]
              rows, getRowKey, caption, emptyContent?
              // align="right" tự thêm tabular-nums; header tự có scope="col"

StatCard      label, value, delta?, tone?

SegmentedFilter  items: { key; label }[], activeKey, onChange?, isDisabled?

EmptyState    title, description?, action?, tone?
```

Mỗi primitive tự phát `data-testid` (`"button"`, `"form-field"`, `"card-surface"`, `"chip"`, `"text-link"`, `"data-table"`, `"stat-card"`, `"segmented-filter"`, `"empty-state"`) để test bám vào đó thay vì bám tên class.

**Hai component `ui/` hiện có, xử lý khác nhau:**

- `form-surface.tsx` — **xóa**, `CardSurface` thay thế. 5 call site đổi tên component và giữ nguyên `className` đang truyền (`"auth-card"`, `"workspace-card story-advisor-card"`): `app/login/page.tsx`, `app/register/page.tsx`, `components/review-form.tsx`, `components/story-advisor-form.tsx`, `components/story-advisor-panel.tsx`.
- `metric-pill.tsx` — **giữ**, nhưng viết lại phần ruột để dùng `Chip` bên trong. API `label` + `value` không đổi nên `app/stories/[id]/page.tsx` không phải sửa; nó tự nhận style mới.

### 3.5 Cưỡng chế kỷ luật bằng lint

ESLint `no-restricted-imports` chặn `@heroui/react` ở mọi nơi **trừ** `src/components/ui/**`. Vi phạm làm fail `pnpm lint` (đang chạy `--max-warnings=0`).

Đây là điểm khiến mục tiêu "sửa một chỗ, toàn dự án đổi theo" thành hiện thực thay vì trông vào tự giác. Không có rule này, mỗi call site vẫn tự set props riêng.

## 4. Phạm vi thay đổi

### 4.1 Chrome dùng chung

`body { background }`, `color`, màu link, `:focus-visible`, `.global-header*`, `.page-shell*` đổi sang bảng màu mới. Đây là các rule global nên **mọi trang đổi phần khung**, trong khi ruột màn chưa migrate vẫn cũ — giai đoạn chuyển tiếp sẽ hơi pha trộn. Đã chấp nhận, đổi lấy việc không phải làm header hai lần.

Không thuộc phạm vi: `finance-shell` (khung workspace riêng của khu Tài chính, gồm sidebar + nav) — thuộc spec migrate khu Tài chính.

### 4.2 Mười bảy file phải sửa

**16 file import `@heroui/react` trực tiếp** → fail lint ngay khi bật rule:

| File | Đang import | Chuyển sang |
|---|---|---|
| `app/admin/users/page.tsx` | Button, Card, CardBody, CardHeader, Chip | Button, CardSurface, Chip |
| `app/stories/[id]/page.tsx` | Button, Card, CardBody, CardHeader, Chip | Button, CardSurface, Chip |
| `app/page.tsx` | Card, CardBody, CardHeader, **Link** | CardSurface, **TextLink** |
| `app/movie/page.tsx` | Button, Chip | Button, Chip |
| `app/login/page.tsx` | Button | Button |
| `app/register/page.tsx` | Button | Button |
| `components/review-form.tsx` | Button, **Radio, RadioGroup** | Button, **FormField kind="radio"** |
| `components/story-advisor-form.tsx` | Button, Textarea | Button, FormField kind="textarea" |
| `components/story-list-controls.tsx` | Button | Button |
| `components/stories/advisor-quick-prompts.tsx` | Button | Button |
| `components/stories/story-catalog-card.tsx` | Chip | Chip |
| `components/stories/story-recommendation-showcase.tsx` | Chip | Chip |
| `components/finance/recent-transaction.tsx` | Card, CardBody | CardSurface |
| `components/finance/category-card.tsx` | Card, CardBody | CardSurface |
| `components/finance/finance-groups-panel.tsx` | Button | Button |
| `components/finance/finance-member-selector.tsx` | Button | Button |

**1 file thêm** vì `form-surface.tsx` bị xóa: `components/story-advisor-panel.tsx` (không import HeroUI, chỉ dùng `FormSurface`).

Phần lớn là đổi tên import và bỏ props đã chốt sẵn trong wrapper (`color="primary" variant="flat" radius="full"`). Ba chỗ cần đổi cấu trúc markup chứ không chỉ đổi import:

- `Card` + `CardBody` + `CardHeader` → một `CardSurface` (dùng `title` / `description` thay `CardHeader`)
- `RadioGroup` + `Radio` trong `review-form.tsx` → `FormField kind="radio"` với `options`
- `Textarea` trong `story-advisor-form.tsx` → `FormField kind="textarea"`; bỏ `classNames` bespoke `story-advisor-textarea-*`

**Không redesign ruột các màn đó.** Sau bước này, sửa `ui/button.tsx` một lần là cả 17 file đổi theo.

`components/ui/providers.tsx` giữ nguyên import `HeroUIProvider` — nằm trong vùng được phép.

### 4.3 Màn pilot `/finance/expenses`

`components/finance/finance-expenses-content.tsx` (197 dòng) viết lại:

| Hiện tại | Sau |
|---|---|
| 2 × `<div class="finance-expenses-summary-card">` | 2 × `StatCard` |
| 4 `<input>` + 1 `<select>` + 1 `<textarea>` trong `<label class="form-field">` | 6 × `FormField` |
| `<button type="submit">` raw | `Button` với `isLoading` |
| `.finance-expenses-secondary-button` | `Button variant="secondary" isDisabled` |
| 3 × `.finance-expenses-filter` | 1 × `SegmentedFilter` |
| `<table>` + `.table-wrap` + `.finance-expenses-table-wrap` | `DataTable` |
| `.finance-expenses-category-pill` | `Chip tone="primary"` |
| 4 × `.workspace-card` | 4 × `CardSurface` |
| `StatusMessage` khi danh sách rỗng | `EmptyState` |
| `.finance-expenses-form-grid` | Tailwind utility (`grid gap-4 sm:grid-cols-2`) |

`components/finance/finance-expenses.tsx` (container) chỉ đổi kiểu của `submitMessage` (xem 4.4). Không đổi logic fetch, không đổi API contract.

### 4.4 Sửa một bug thật lộ ra ở màn pilot

`finance-expenses-content.tsx:121` đang đoán tone thông báo bằng tiền tố chuỗi tiếng Việt:

```tsx
<StatusMessage tone={submitMessage.startsWith("Đã") ? "success" : "error"}>
```

Hệ quả có thật: `finance-expenses.tsx:113` set `"Hệ thống đang chậm, đang tải lại dữ liệu chi tiêu..."` — thông báo đang-thử-lại, nhưng vì không bắt đầu bằng "Đã" nên hiển thị màu đỏ như lỗi. Người dùng tưởng thao tác thất bại trong khi nó đang chạy.

Sửa: `submitMessage: string | null` → `submitMessage: { tone: "success" | "error" | "info"; text: string } | null`, tone do container quyết định tại chỗ set (`finance-expenses.tsx` dòng 88, 108, 113, 116, 124).

### 4.5 Chiến lược với `globals.css`

`globals.css` có hai vùng: vùng gốc (dòng 105-2518) và vùng `/* neutral UI overrides */` (2519-3275) ghi đè lên vùng gốc. Xóa vùng override ngay sẽ làm 14 màn chưa migrate quay về giao diện cũ hơn nữa — regression. Nên:

- **Đợt này chỉ sửa 3 nhóm rule**: global (`body`, `a`, `:focus-visible`), `.global-header*`, `.page-shell*` — sửa ở **cả hai vùng**.
- Xóa toàn bộ `.finance-expenses-*` ở cả hai vùng (màn pilot đã migrate).
- Xóa `.form-surface`, `.form-surface-body`, `.form-surface-stack`, `.form-surface-heading` — chết theo `form-surface.tsx`.
- Xét lại `.form-field`, `.form-field-input-wrapper`, `.form-field-input-element`, `.form-field-label`, `.form-field-hint`, `.form-field-description` — `FormField` sau khi viết lại sẽ style qua theme HeroUI + utility Tailwind, các class này chết. Xóa nếu grep xác nhận không còn chỗ dùng (lưu ý `finance-expenses-content.tsx` và một số form khác đang mượn `.form-field` cho `<label>` raw).
- **Không xóa `.table-wrap`** — còn được `budget-settings-content`, `expense-chart`, `finance-member-dashboard` dùng. Nguyên tắc chung: chỉ xóa class sau khi grep xác nhận không còn chỗ nào dùng.
- Class của màn chưa tới lượt: không đụng một dòng.
- Các spec sau: mỗi màn migrate thì xóa class của màn đó ở cả hai vùng. Hết 15 màn thì `globals.css` chỉ còn `@tailwind` + vài rule reset.

## 5. Test

Frontend không có `@testing-library/react`; test dùng `renderToStaticMarkup` + `expect(html).toContain(...)`. Hệ quả: 29 file test đang assert vào tên class CSS (~88 assertion) — style và test dính chặt, đổi class là vỡ test dù hành vi không đổi.

**Không cài `@testing-library/react` trong đợt này.** Đó là một cuộc đổi hạ tầng test riêng, không nằm trong yêu cầu, và làm chung sẽ che mất nguyên nhân khi có test đỏ.

Kế hoạch test:

1. **Mỗi primitive một `*.test.tsx`** — render đủ variant, assert `data-testid`, nội dung, và thuộc tính a11y: `aria-invalid` + `aria-describedby` khi `FormField` có `error`, `required`, `scope="col"` trên header của `DataTable`, `aria-busy` khi `Button` loading.

2. **`colors.test.ts` — kiểm tương phản WCAG bằng test.** Tính tỉ lệ tương phản từ giá trị trong `colors.ts` và assert:
   - mọi cặp chữ/nền ≥ 4.5:1 (WCAG AA, chữ thường)
   - `borderField` so với `surface` ≥ 3:1 và focus ring so với `background` ≥ 3:1 (WCAG 1.4.11)

   Ai đổi màu làm tụt tương phản thì test đỏ ngay, không phải nhớ đi kiểm tay. Đây là hạng mục giá trị nhất trong đợt: nó biến quy tắc a11y thành thứ máy canh giúp.

3. **Ratchet `globals.css`** — assert số dòng ≤ 3275 (mốc hiện tại). Chỉ được giảm. Chặn việc lén thêm class mới vào `globals.css` thay vì dùng primitive.

4. **Sửa assertion class → `data-testid`** ở các file test bị đụng. Ước lượng 11-15 file, ~40 assertion:

   | File test | Assertion class | Ghi chú |
   |---|---|---|
   | `ui/page-shell.test.tsx` | 7 | chrome |
   | `ui/global-header.test.tsx` | 7 | chrome |
   | `ui/form-field.test.tsx` | 6 | FormField viết lại |
   | `ui/form-surface.test.tsx` | 4 | **xóa**, thay bằng `ui/card-surface.test.tsx` mới |
   | `ui/status-message.test.tsx` | 4 | EmptyState |
   | `ui/page-state.test.tsx` | 3 | EmptyState |
   | `story-advisor-form.test.tsx` | 5 | Textarea → FormField, mất `story-advisor-textarea-*` |
   | `review-form.test.tsx` | 1 | RadioGroup → FormField kind="radio" |
   | `finance/finance-expenses.test.tsx` | 1 | container pilot |
   | `app/register/page.test.tsx` | 1 | FormSurface → CardSurface |
   | `stories/advisor-quick-prompts.test.tsx` | 1 | Button |

   `finance/finance-expenses-content.test.tsx` không assert class nào (chỉ assert text) nhưng phải sửa theo `submitMessage` đổi kiểu. Con số chính xác chốt khi implement — file nào không thực sự bị đổi markup thì không sửa test.

Không thuộc phạm vi test đợt này: 29 - ~13 = ~16 file test còn lại vẫn assert tên class của những màn chưa migrate. Chúng được xử lý ở spec của màn tương ứng.

## 6. Trạng thái và lỗi

- `FormField` có `error` → viền `danger`, chữ lỗi `onDangerSoft` trên `dangerSoft`, kèm `aria-invalid="true"` và `aria-describedby` trỏ tới id của message. Form Chi tiêu hiện chỉ có `required` trên ô số tiền và không hiện lỗi tại field — sau sẽ hiện tại field.
- `Button isLoading` → giữ nguyên nhãn + spinner + `aria-busy`, **không đổi chiều rộng**. Lỗi hiện tại: nhãn đổi từ "Thêm khoản chi" sang "Đang thêm..." làm nút co lại, layout nhảy.
- `DataTable` rỗng → render `emptyContent`, không render `<table>` trống.
- `EmptyState` phân biệt rõ ba tone: `info` (chưa có dữ liệu), `error` (tải lỗi), `success` — thay cho việc đoán tone theo chuỗi.

## 7. Định nghĩa hoàn thành

- [ ] `components/ui/style/{colors,radius,shadows,index}.ts` tồn tại, là nơi duy nhất chứa giá trị màu / bo góc / đổ bóng của tầng dùng chung
- [ ] `tailwind.config.ts` import từ đó, map vào cả `theme.extend` và `heroui()`; đã xóa `darkMode: "class"`
- [ ] 9 primitive trong `components/ui/`, mỗi cái có test riêng
- [ ] `form-surface.tsx` đã xóa; `metric-pill.tsx` viết lại trên `Chip`, API không đổi
- [ ] ESLint `no-restricted-imports` bật; `pnpm --dir frontend lint` xanh — nghĩa là không còn file nào ngoài `components/ui/` import `@heroui/react`
- [ ] 17 file đã chuyển sang dùng primitive
- [ ] `/finance/expenses` không còn raw `<input>` / `<select>` / `<button>` / `<table>`
- [ ] `submitMessage` đã có tone tường minh; thông báo "Hệ thống đang chậm" hiển thị tone `info`, không phải đỏ
- [ ] `colors.test.ts` xanh — mọi cặp màu đạt ngưỡng WCAG
- [ ] Ratchet test `globals.css` xanh; đã xóa toàn bộ `.finance-expenses-*`
- [ ] `pnpm --dir frontend typecheck`, `test`, `lint`, `format:check` đều xanh

## 8. Ngoài phạm vi (spec sau)

- Migrate + redesign 14 màn còn lại: khu Tài chính (dashboard, budgets, chat, groups, settings), khu Truyện (`/stories`, `/stories/[id]`, `/recommendations`), auth (`/login`, `/register`), `/admin/users`, landing `/`, `/movie`
- `finance-shell` (sidebar + nav của khu Tài chính)
- Màu biểu đồ recharts (`chart-colors.ts`) — chốt khi làm dashboard
- Dark mode
- `spacing.ts` / `typography.ts`
- Cài `@testing-library/react` để assert theo role thay vì `data-testid`
- Primitive Modal / Tabs / Pagination / Tooltip
