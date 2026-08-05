# Spec: Redesign bố cục từng trang trên tầng giao diện dùng chung

- **Ngày:** 2026-08-05
- **Trạng thái:** Đã duyệt qua brainstorming (6 màn hình visual companion, user chốt từng phần)
- **Spec nền:** `2026-08-04-design-system-layer-design.md` (tầng primitive + màn pilot `/finance/expenses`)

## 1. Mục tiêu & ràng buộc

**Mục tiêu** (theo thứ tự user chốt):

1. **Đồng bộ mọi trang** trên cùng một ngôn ngữ thị giác — hiện chỉ 1/15 màn (`/finance/expenses`) đạt chuẩn primitive, 14 màn còn dùng CSS bespoke cũ, tạo ra hai ngôn ngữ chồng nhau.
2. Gu thẩm mỹ: **phẳng sạch + đúng MỘT điểm nhấn thị giác mỗi trang** (ký hiệu ★ trong spec).
3. Tối ưu cho **dùng cá nhân hằng ngày trên cả desktop lẫn mobile**.
4. Thứ tự ưu tiên: **Finance → Stories → Landing/Auth/Admin/Movie**.

**Ràng buộc cứng:**

- Không thêm token màu / bo góc / bóng mới — chỉ dùng `components/ui/style/{colors,radius,shadows}.ts` hiện có.
- Không viết class CSS bespoke mới cho ruột trang — chỉ lắp primitive + Tailwind utility.
- `globals.css` chỉ được giảm (ratchet hiện tại 2913 dòng, xuống dần theo từng đợt).
- Không dark mode. Không đổi API/backend — mọi màn chỉ dùng endpoint sẵn có.

## 2. Khung app (app shell)

### 2.1 Desktop (≥ lg)

- Header sticky 2 hàng giữ cấu trúc hiện tại: **topbar** (brand "Hwimae" + cụm auth) và **module rail** (Home / Truyện / Tài chính / Phim / Admin-nếu-có-quyền).
- Module rail: mục **active = pill nền `primary` chữ trắng**; mục khác chữ `textMuted`, hover nền `surfaceMuted`. Thay cơ chế "đổi màu chữ nhẹ" hiện tại.
- **Sub-nav theo khu**: hàng tab dạng segmented (pill chọn nền trắng + bóng soft, chữ `primaryStrong`) **dính ngay dưới header khi cuộn**:
  - Tài chính: Dashboard · Chi tiêu · Ngân sách · AI Chat · Nhóm
  - Truyện: Danh sách · Gợi ý AI
  - Các khu khác không có sub-nav.
- `WorkspaceTabs` + class `.workspace-nav-link`, `.global-header-*` bespoke bị thay thế và xoá dần.

### 2.2 Mobile (< lg) — phương án đã chốt: menu ☰ chứa tất cả

- Header chỉ còn **brand + nút ☰** (pill tròn viền `border`). Không còn hàng điều hướng ngang, không còn segmented bar cố định.
- Bấm ☰ mở **AppMenu** — panel xổ từ dưới header:
  - Danh sách khu vực; khu active nền `primary` chữ trắng.
  - Khu đang đứng tự xổ **sub-items thụt lề** (viền trái mảnh); mục hiện tại nền `primarySoft` chữ `primaryStrong`.
  - Footer panel: tên user + nút Đăng xuất (guest: Login + Register).
  - Nền phía sau mờ đi; bấm ra ngoài hoặc ESC để đóng; focus trap khi mở.
- Nút ☰ khi menu mở đổi thành nền `primary` icon trắng (trạng thái toggle rõ ràng).

## 3. Bộ khuôn trang (4 khuôn chính + 1 khuôn phụ)

Mọi trang lắp vào đúng một khuôn. Trên mobile mọi khuôn dồn về 1 cột theo thứ tự đọc.

| Khuôn | Cấu trúc desktop | Trang áp dụng | Điểm nhấn ★ |
|---|---|---|---|
| **T1 · Tổng quan** | Tiêu đề + filter → hàng 3 StatCard → 2 cột `2fr/1fr` (chart / insight) → danh sách gần đây | `finance/dashboard`; dashboard thành viên trong Nhóm (bản thu gọn) | Con số tổng lớn màu primary |
| **T2 · Quản lý** | Card tóm tắt → 2 cột `2fr/1fr` (form chính / aside) → card bảng + filter | `finance/expenses` (đã đạt), `finance/budgets`, `admin/users` | Số liệu tóm tắt / progress |
| **T2·MD · Master–detail** (biến thể T2) | 2 cột `minmax(16rem,20rem)/1fr`: trái danh sách chọn, phải chi tiết; mobile tách 2 bước có nút ← | `finance/groups` | Item active tô primarySoft |
| **T3 · Hội thoại** | Khung chat cao cố định (`100dvh` trừ header) — log cuộn bên trong, composer dính đáy | `finance/chat` | Composer dính đáy |
| **T4 · Danh mục** | Hero gọn (tiêu đề + search/CTA) → grid card (1 featured lớn) → phân trang | `stories`, `recommendations`, landing `/`, `movie` (rút gọn) | 1 featured card lớn / hero |
| **T4·R · Đọc** (biến thể T4) | Nút ← → card thông tin → cột đọc hẹp căn giữa → review | `stories/[id]` | Cột đọc ~68ch |
| **+F · Focus** | 1 card duy nhất căn giữa, max-width ~28rem | `login`, `register` | Card duy nhất |

**Luật chung mọi khuôn:**

1. Khoảng cách giữa các section thống nhất một giá trị (`gap-5`).
2. Mỗi trang mở đầu bằng tiêu đề trang cùng cỡ chữ.
3. Trạng thái dùng một hệ duy nhất (mục 5).
4. Mỗi trang đúng **một** điểm nhấn ★.
5. Không class CSS mới cho ruột trang.

## 4. Bố cục từng trang (đã duyệt từng màn)

### 4.1 Khu Tài chính

**Dashboard (T1)** — giữ cấu trúc hiện tại, thay ruột:

- Hàng tiêu đề + SegmentedFilter thời gian (Tháng này / 3 tháng / Năm) — chỉ bật các mốc mà endpoint spending hiện có hỗ trợ; mốc chưa có dữ liệu để `isDisabled` (giống filter lịch sử ở Chi tiêu), tuyệt đối không mở scope backend.
- 3 `StatCard`: Tổng chi (★ accent primary) · Ngân sách · Còn lại (màu success/danger theo dấu). Xoá `FinanceStatCard` riêng.
- 2 cột `2fr/1fr`: card biểu đồ (recharts giữ nguyên) / card "Cảnh báo ngân sách" — mỗi dòng một `Chip` tone (danger "Vượt", warning "Gần chạm", success "Ổn").
- 2 cột `1fr/1fr`: "Chi theo danh mục" — mỗi danh mục 1 hàng tên + `ProgressBar` màu theo mức dùng (xem mục 6) thay grid 4 cột; / "Giao dịch gần đây" — 5 hàng + `TextLink` "Xem tất cả →" sang Chi tiêu.

**Chi tiêu (T2)** — đã đạt chuẩn, chỉ còn 2 việc: thay `EmptyState` đang dùng làm thông báo submit bằng `StatusMessage` mới (mục 5); bật `SegmentedFilter` lịch sử (đang disabled) khi có logic lọc.

**Ngân sách (T2)** — bỏ bảng raw:

- Card tóm tắt ★: "Đã phân bổ X ₫ · đã chi Y ₫" + ProgressBar tổng.
- Card "Hạn mức theo danh mục": mỗi danh mục 1 hàng — tên + ProgressBar (đã chi/hạn mức) + `FormField` input số bên phải; mobile dồn dọc.
- Footer card: `Button` "Lưu thay đổi" (isLoading giữ bề rộng); thông báo kết quả `StatusMessage` inline ngay trên nút.

**AI Chat (T3)** — thay đổi lớn nhất:

- ★ Khung chat cao cố định (`100dvh` − header), log cuộn bên trong (`role=log`, `aria-live` giữ), **composer dính đáy**: nút đính ảnh (ghost, icon) + `FormField` textarea auto-grow + `Button` Gửi.
- Bong bóng: AI trái nền `surfaceMuted`; user phải nền `primary` chữ trắng; ảnh hoá đơn = thumbnail trong bong bóng; preview ảnh chờ gửi hiện trên composer, có nút xoá.
- Kết quả hệ thống (đã lưu / cảnh báo ngân sách / lời khuyên) = **chip giữa dòng** đúng tone thay khối StatusMessage to.
- Lỗi gửi: chip danger + nút "Thử lại" nhỏ tại chỗ (không banner đầu trang). Phiên mới: `EmptyState` + 3 quick prompt bấm nhanh.

**Nhóm (T2·MD)**:

- Trái: card "Nhóm của bạn" — list item (avatar chữ cái + tên + số thành viên), active nền `primarySoft`; nút "+ Tạo nhóm" (form tạo mở ngay trong card).
- Phải: header nhóm (tên + thành viên dạng `Chip` + form mời email inline `FormField` + `Button`); `SegmentedFilter` chọn thành viên (thay dãy nút rời); dashboard thành viên tái dùng khuôn T1 thu gọn (2 StatCard + chart + giao dịch).
- Mobile: 2 bước — danh sách nhóm → chi tiết (nút ← quay lại).
- Xoá nhóm/thành viên: **inline confirm 2 nhịp** (bấm lần 1 nút đổi thành "Chắc chắn xoá?") thay `window.confirm`.

**`/finance` và `/finance/settings`**: giữ redirect, không có UI.

### 4.2 Khu Truyện

Ý tưởng xuyên suốt: **"bìa chữ" (`StoryCover`)** — vì không có ảnh bìa thật: khối bo góc nền soft đổi màu theo thể loại (chỉ dùng các cặp `*Soft`/`on*Soft` đã qua test WCAG) + chữ cái đầu tên truyện. Dùng cho mọi card truyện toàn app.

**Danh sách truyện (T4)**:

- Hàng tiêu đề "Truyện" + ô tìm kiếm (`FormField` search) trên cùng.
- ★ Khối "Nổi bật tuần": 1 truyện lớn (bìa chữ + tên + chips thể loại/điểm + `Button` "Đọc ngay") + 3 hàng compact bên phải. Thay showcase cũ, bỏ vỏ `workspace-card`.
- Grid `StoryCard` 2→5 cột theo breakpoint.
- Phân trang gọn: `Button` ghost ← / → + "Trang 3/12". Bỏ pagination bespoke.

**Chi tiết & đọc truyện (T4·R)**:

- Nút ← Quay lại (`Button` ghost).
- Card thông tin 1 khối: bìa chữ lớn + tên/tác giả + chips (thể loại, `MetricPill` điểm, số đánh giá) + tóm tắt. **Bỏ lớp `glass-card` chồng trên CardSurface.**
- ★ Cột đọc hẹp căn giữa ~68ch, cỡ chữ 17–18px, line-height 1.8, tách đoạn rõ; chưa có nội dung → `EmptyState`.
- Review: giữ `ReviewForm` đã migrate (FormField radio + textarea), bỏ class di sản `form-surface-heading`.

**Gợi ý AI (T4 + hero AI)**:

- ★ Hero AI (CardSurface viền `primarySoft`): `FormField` textarea mô tả gu + **quick prompt dạng `Chip` bấm được** + `Button` "Gợi ý cho tôi".
- Kết quả: card tóm tắt câu trả lời AI tone info; grid truyện dùng **chung `StoryCard`** với trang danh sách (hợp nhất `RecommendationStoryCard` + `StoryCatalogCard`), thêm chip success "% hợp".
- Đang phân tích: skeleton + dòng "đang phân tích gu đọc…"; rỗng/lỗi: `EmptyState` (bỏ `.empty-state-card` tự chế).

### 4.3 Landing · Auth · Admin · Phim

**Landing `/` (T4 marketing)**:

- Hero 2 cột: trái tiêu đề lớn (từ khoá tô `primary`) + mô tả + 2 `Button` (primary "Vào Tài chính", ghost "Khám phá Truyện"); phải ★ card "Hôm nay của bạn".
- Card "Hôm nay của bạn": khi đã đăng nhập hiển thị **số liệu thật từ endpoint sẵn có** (tối thiểu: tổng chi tháng + ngân sách còn lại từ finance API; các số liệu khác chỉ thêm nếu đã có endpoint — không mở scope backend); guest thấy 3 dòng giới thiệu tính năng + nút Đăng ký. Xoá 3 số "0" hard-code.
- Grid 3 module card: icon + tên + mô tả + `TextLink` "Vào khu →" — heading tách khỏi link (sửa semantics link-ôm-heading).
- Footer: năm render động, bỏ "© 2024".

**Đăng nhập / Đăng ký (+F)**:

- ★ Một `CardSurface` căn giữa max-width ~28rem: tiêu đề, `FormField` email/password (+ name ở đăng ký), `Button` full-width (loading giữ label + spinner), `TextLink` chuyển trang còn lại.
- Lỗi hiện một chỗ duy nhất ngay trên nút (bỏ cặp aria-live + StatusMessage trùng).
- Xoá `.auth-layout` 2 cột + `-compact`.
- Sau đăng ký thành công: `EmptyState` tone info "Tài khoản đang chờ admin duyệt" (khớp flow PENDING → APPROVED).

**Admin duyệt tài khoản (T2)**:

- Hàng tiêu đề + ★ `Chip` warning đếm "N đang chờ".
- Card-grid giữ nguyên cấu trúc, bỏ vỏ `glass-card`; mỗi card: tên, email, ngày, chip trạng thái, `Button` Duyệt (primary) + Từ chối (danger ghost).
- Rỗng: `EmptyState` "Hết người chờ duyệt 🎉"; lỗi: `EmptyState` error + nút Thử lại; tải: skeleton card.

**Phim (T4 rút gọn)**:

- Đúng **một** `EmptyState`: icon 🎬 + "Khu Phim đang hoàn thiện" + mô tả + 2 nút (primary "Về trang chủ", ghost "Đọc truyện trước"). Xoá khối trạng thái trùng thứ hai.

## 5. Hệ trạng thái duy nhất

| Tình huống | Component | Ghi chú |
|---|---|---|
| Đang tải trang/khối | `Skeleton` (mới) | Khối mờ pulse giữ đúng khung layout thật; mọi trang bỏ chữ "Đang tải…" |
| Rỗng / lỗi cả khối | `EmptyState` (có sẵn) | Tone info/error/success; lỗi kèm nút Thử lại khi có hành động |
| Thông báo inline sau hành động | `StatusMessage` (viết lại) | Tone + icon + action tuỳ chọn; thay chỗ Chi tiêu đang mượn EmptyState làm thông báo submit |
| Kết quả hệ thống trong chat | `Chip` giữa dòng | Tone theo loại (saved=success, cảnh báo=warning, lỗi=danger) |

Bị thay thế & xoá dần: `PageState`, `WorkspaceTabs`, `module-card`, `landing-hero`, `app-nav`, class `glass-card`, `workspace-card`, `form-surface-*`, `.empty-state-card`, pagination bespoke.

## 6. Delta cần xây (không có gì ngoài danh sách này)

**Primitive mới** (mỗi cái kèm test + `data-testid`):

1. `Skeleton` — variant text/block/card, prop chiều cao.
2. `ProgressBar` — màu tự động theo mức: `success` < 70%, `warning` 70–100%, `danger` > 100%.
3. `StoryCover` — bìa chữ: màu theo thể loại từ cặp soft đã kiểm WCAG.
4. `StoryCard` — hợp nhất `StoryCatalogCard` + `RecommendationStoryCard`; slot chip phụ ("% hợp").
5. `AppMenu` — nút ☰ + panel mobile (mục 2.2).

**Nâng cấp primitive có sẵn:**

- `DataTable`: biến thể mobile-card (mỗi hàng thành thẻ: tiêu đề + phụ đề + chip + giá trị phải).
- `SegmentedFilter`: hỗ trợ chế độ link điều hướng (dùng làm sub-nav) bên cạnh chế độ filter.
- `StatusMessage`: viết lại thành primitive chuẩn (tone + icon + action).
- Global header: pill active + tích hợp sub-nav + AppMenu.

## 7. Thứ tự triển khai (4 đợt)

| Đợt | Nội dung | Ghi chú |
|---|---|---|
| 1 · Khung + nền | Header pill active, sub-nav segmented sticky, AppMenu ☰ mobile; `Skeleton`, `ProgressBar`, `DataTable` mobile-card, `StatusMessage` mới | Mọi trang hưởng lợi ngay |
| 2 · Finance | Ngân sách (nhỏ nhất) → Dashboard → AI Chat → Nhóm (nặng nhất) | Ưu tiên số 1 của user |
| 3 · Truyện | `StoryCover`/`StoryCard` → Danh sách → Chi tiết/đọc → Gợi ý AI | |
| 4 · Còn lại + tổng dọn dẹp | Landing, Auth, Admin, Phim; xoá toàn bộ class/primitive di sản, hạ ratchet lần cuối | |

**Định nghĩa hoàn thành mỗi trang:** dùng đúng khuôn + primitive, không import class di sản; `pnpm --dir frontend typecheck` + `vitest` xanh; class chết xoá khỏi `globals.css` và hạ mốc ratchet trong cùng commit.

## 8. Kiểm chứng

- Primitive mới: test đơn vị như 9 primitive hiện có (render, variant, aria, `data-testid`).
- `StoryCover` chỉ dùng cặp màu đã qua `colors.test.ts` (WCAG); mapping thể loại→màu là deterministic và có test.
- `AppMenu`: test mở/đóng, focus trap, ESC, active state.
- Mỗi trang migrate: test render + interaction chính (submit form, lọc, phân trang) bằng Vitest + Testing Library như các màn đã migrate.

## 9. Ngoài phạm vi

- Không đổi backend/API, không endpoint mới (card "Hôm nay" chỉ dùng dữ liệu sẵn có).
- Không dark mode; không đổi bảng token; không trang mới; khu Phim chỉ là EmptyState.
- Không sidebar desktop / bottom-nav mobile (hướng C đã cân nhắc và loại — có thể xem lại khi khu Tài chính phình to).
