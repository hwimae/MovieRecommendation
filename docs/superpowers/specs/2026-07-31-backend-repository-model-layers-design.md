# Thiết kế: Thêm tầng Repository & Model cho toàn bộ backend

- **Ngày**: 2026-07-31
- **Trạng thái**: Đã duyệt cùng user qua phiên brainstorming
- **Phạm vi ảnh hưởng**: `backend/src` (12 module + middleware `requireAuth`), frontend (chỉ rà soát + bổ sung test), `CLAUDE.md`

## 1. Bối cảnh & mục tiêu

Backend hiện có 13 module theo pattern `router → service (gọi Prisma trực tiếp) → DB`. Module `finance/budgets` đã được refactor mẫu sang kiến trúc 5 tầng: model (domain types thuần) + repository (interface) + prisma.repository (implementation) + service + router.

Mục tiêu đợt refactor này:

1. Nhân rộng pattern budgets ra **tất cả** module còn lại, để service không còn phụ thuộc trực tiếp Prisma — dễ test, dễ thay đổi persistence, ranh giới tầng rõ ràng.
2. **Chuẩn hóa API contract** cho các field tiền tệ (quyết định của user): Decimal → JSON number trên wire.

## 2. Các quyết định đã chốt

| Quyết định | Lựa chọn |
|---|---|
| Phạm vi | 12 module còn lại + middleware `requireAuth` (budgets giữ làm mẫu, chỉ sửa phần chuẩn hóa) |
| API contract | Chuẩn hóa tiền tệ → number ngay đợt này; các phần khác giữ nguyên 100% |
| Tổ chức | Phương án 1: wiring per-module trong router (như budgets) + data-module `src/identity/users/` dùng chung cho auth/admin/middleware |
| Rollout | Từng module một, mỗi bước 1 commit, test xanh mới đi tiếp, trên branch `refactor/repository-model-layers` |
| Cấu trúc thư mục (bổ sung sau khi duyệt, 2026-07-31) | Gom module theo domain giống `finance/`: `identity/` chứa `users, auth, admin`; `books/` chứa `stories, reviews, recommendations`; `finance/` giữ nguyên. URL và mount trong `app.ts` không đổi (chỉ đổi import path), không tạo router cha mới |

Ngoài phạm vi: `scripts/` (import-books, import-comments, index-story-chunks, seed-admin — vẫn dùng Prisma trực tiếp), `storage/` (đã là abstraction riêng), frontend (không đổi logic — `parseMoney` trong `frontend/src/types/finance.ts` đã chấp nhận cả string lẫn number, types đã khai `number`).

## 3. Kiến trúc & quy ước chung

### 3.1. Cấu trúc tầng chuẩn mỗi module

```
<module>/
├── <module>.model.ts                   ← MỚI: domain types thuần (không import Prisma)
├── <module>.repository.ts              ← MỚI: interface persistence
├── <module>.prisma.repository.ts       ← MỚI: impl Prisma + mapper row→model
├── <module>.prisma.repository.spec.ts  ← MỚI: mock PrismaClient, assert query args + mapping
├── <module>.service.ts                 ← SỬA: chỉ phụ thuộc repository interface
├── <module>.service.spec.ts            ← SỬA: mock repository thay vì mock Prisma
├── <module>.controller.ts              ← GIỮ NGUYÊN
├── <module>.router.ts                  ← SỬA nhẹ: lắp ráp repo → service → controller
└── <module>.schema.ts                  ← GIỮ NGUYÊN (validate input bằng Zod)
```

Luồng dữ liệu: `request → router → validate → controller → service → repository (interface) → prisma.repository → DB`; chiều về: `row Prisma → mapper → model → res.json()`.

Chuẩn tham chiếu: bộ file `finance/budgets/` hiện có (naming, factory function style `createXxx`, mapper riêng từng entity, spec 2 tầng).

### 3.2. Data-module dùng chung `src/identity/users/`

Entity `User` có 3 consumer (auth, admin, middleware `requireAuth`) nên truy cập User gom về một chỗ:

- `users.model.ts`: `User` (không có passwordHash), `UserWithPasswordHash` (chỉ auth dùng để compare password), `UserRole`, `UserStatus`.
- `users.repository.ts`: interface `UsersRepository`:
  - `findById(id)` → `User | null` (middleware)
  - `findByEmail(email)` → `UserWithPasswordHash | null` (auth)
  - `create(data)` → `User`, dịch P2002 thành domain error `EmailAlreadyInUseError` (export từ file này)
  - `listByStatus(status?)` → `User[]` (admin)
  - `updateStatus(id, status)` → `User | null` (admin; P2025 → `null`)
- `users.prisma.repository.ts` + spec.
- `BackendDeps` thêm field `usersRepository`, khởi tạo trong `dependencies.ts`. Đây là repository **duy nhất** nằm trong `BackendDeps` (vì middleware cần dùng); các module khác wiring trong router của chính nó.
- `requireAuth` đổi deps thành `Pick<BackendDeps, 'usersRepository' | 'tokenService'>` — call sites `requireAuth(deps)` không phải sửa nhờ structural typing.
- `auth.service` deps → `{ usersRepository, passwordHasher, tokenService }`; `admin.service` deps → `{ usersRepository }`. Hai module này **không** tạo model/repository riêng — dùng chung `src/users/`.

**Quy ước cross-entity**: repository của module được phép query bảng ngoài entity chính khi đó là một phần use-case của module (như budgets đã query `financeCategory` qua `categoryExistsForUser`). Data-module `users` tồn tại vì User là entity **chính** của 3 consumer; còn lookup phụ (ví dụ groups tìm user theo email khi add member) nằm ngay trong repo của module đó.

### 3.3. Quy ước chuẩn hóa contract (phần wire thay đổi duy nhất)

- **Tiền tệ** (Prisma `Decimal`): mọi field `amount`, `limitAmount`, `totalAmount` → **JSON number**. Tiền VND nguyên, dưới `Number.MAX_SAFE_INTEGER` nên an toàn.
- **Ngày giờ**: model giữ `Date`, Express serialize thành ISO string như hiện tại → wire không đổi. Chỗ đang trả string sẵn (admin `toISOString`) giữ nguyên.
- **Không đổi tên field, không thêm/bớt field.**
- Danh sách endpoint có wire đổi (money string → number):
  - `GET/POST/PUT /finance/expenses` — `amount`
  - `GET/POST /finance/budgets` — `limitAmount` (kèm sửa module mẫu budgets)
  - `GET /finance/invoices`, `POST /finance/invoices/upload` — `totalAmount`
  - `GET /finance/groups/:id/members/:memberId/...` (dashboard/budgets/expenses lồng nhau)
  - Chat: `savedExpense.amount` đã là number từ trước — response không đổi; riêng payload context gửi AI service đổi kiểu tiền theo (xem Rủi ro 1)
  - `GET /finance/spending/summary` đã trả number sẵn (`summarizeExpenses` dùng `.toNumber()`) — không đổi

### 3.4. Quy ước xử lý lỗi & transaction

- **Lỗi Prisma không lọt qua repository**: P2002 → typed domain error hoặc giá trị trả về; P2025 / `updateMany` count=0 → `null`/`false`; P2034 → retry bên trong prisma.repository (reviews).
- **Service** dịch kết quả domain → `HttpError` (`conflict`/`notFound`/`forbidden`) với **message giữ nguyên từng chữ** để contract lỗi không đổi.
- **Transaction gói trọn trong một method repository** — service không điều phối transaction.

## 4. Thiết kế theo module

### 4.1. Chùm User

| Module | Thay đổi |
|---|---|
| `users` (mới) | Như mục 3.2 |
| `auth` | Service dùng `usersRepository`; flow register/login giữ nguyên semantics (check tồn tại → hash → create; bắt `EmailAlreadyInUseError` → `conflict('Email already exists')`) |
| `admin` | Service dùng `usersRepository.listByStatus/updateStatus`; `null` → `notFound('User not found')`; giữ check "admin không tự reject mình"; mapping `toAdminUserSummary` giữ ở service |
| `middleware/auth` | `requireAuth` dùng `usersRepository.findById`, giữ nguyên logic check `status !== 'APPROVED'` |

### 4.2. Chùm finance

| Module | Repository (phác thảo) | Model & ghi chú |
|---|---|---|
| `categories` | `listByUser`, `findDefaultsByNames`, `create` (P2002 → `DuplicateFinanceCategoryError`), `updateForUser` → model\|null (P2002 cùng error), `deleteForUser` → bool | `FinanceCategory` — không có Decimal, wire không đổi. `ensureDefaults` (danh sách mặc định + vòng lặp bỏ qua duplicate) giữ ở service |
| `expenses` | `listByUser`, `createForUser`, `updateForUser` (gói updateMany + findFirst, trả model\|null), `deleteForUser` → bool, `categoryExistsForUser` | `FinanceExpense` (`amount: number`, `spentAt: Date\|null`, nested category/invoice). Service map input (string → Date, sourceMetadata) thành domain data trước khi đưa repo, giống `UpsertFinanceBudgetData` của budgets |
| `spending` | `listExpensesWithCategoryByUser` | `SpendingSummary` + hàm pure `summarizeExpenses` chuyển vào `spending.model.ts`; groups đổi import theo |
| `groups` | `listMembershipsWithGroups`, `createGroupWithOwner` (transaction), `findGroupWithMembers`, `findMembership`, `findGroupOwnership`, `findUserByEmail`, `addMember`, `removeMember` → bool, `deleteGroupOwnedBy` → bool, `listMemberCategories/Budgets/Expenses`, `deleteMemberExpense/Budget` → bool | DTO hiện có trong service chuyển sang `groups.model.ts`. Nested expense/budget/category **import từ model của module tương ứng** (một nguồn sự thật). Authz helpers (`requireMembership/Owner/TargetMember`) giữ ở service |
| `chat` | `createSession`, `findSessionForUser`, `closeSessionForUser` → bool, `createUserMessage`, `createAssistantMessage`, `loadChatContext(userId, sessionId)` (gói 4 query Promise.all: categories, budgets, recentExpenses, chatHistory), `categoryExistsForUser`, `invoiceExistsForUser`, `createConfirmedExpense` | `chat.model.ts`: `FinanceSavedExpense` (amount đã là number), responses, hàm pure `parseStrictSpentAt`. `financeAiClient` vẫn là dep của service |
| `advice` | `listBudgetsWithCategory`, `listRecentExpenses(userId, take)`, `createInteractionLog` | `financeAiClient` ở service; model chứa types của context |
| `invoices` | `listByUser`, `createPending`, `markFailed`, `applyExtraction` | Hết kiểu `unknown`: `FinanceInvoice` (`totalAmount: number\|null`, `purchasedAt: Date\|null`, `extractedData: unknown` giữ), `FinanceInvoicePendingExpense`. Logic path-safety file giữ ở service |
| `budgets` | Đã có — không đổi interface | Chuẩn hóa: `limitAmount: string → number` trong model + mapper `.toNumber()` + cập nhật 2 spec |

### 4.3. Chùm stories / reviews / recommendations

| Module | Repository (phác thảo) | Model & ghi chú |
|---|---|---|
| `stories` | `searchStories(query)` → `{items, total}` (gói `$transaction` findMany+count), `findByIdWithCategory`, `findContentMeta` → `{id, title, contentPath}\|null` | `stories.model.ts`: Story types, `StoryResponse` (giữ shape Omit contentPath + `hasContent`). Cải tiến có chủ đích: bỏ fallback `createStoryContentReader()` trong service — luôn inject từ deps |
| `reviews` | `upsertForStoryAndRefreshRating(userId, input)` → model\|null (null = story không tồn tại; transaction serializable + retry P2034 **bên trong repo**), `listByUser(userId, {page, limit})` → `{items, total}` | `reviews.model.ts`: `UserReview`, `MyReview` (kèm story summary), `PaginatedMyReviews`. Service dịch null → `notFound('Story not found')` |
| `recommendations` | `listReviewedStoryIds`, `listPopularStories({limit, excludeIds})`, `searchStoryChunksByVector(embedding, limit)` | Gộp `story-vector-search.repository.ts` vào `recommendations.prisma.repository.ts`, SQL giữ nguyên văn, xóa file cũ. Scoring/mapping thuần giữ ở service; `recommendations.model.ts` chứa `RecommendationItem`, `StoryChunkSearchRow`... `embedding-contract` giữ nguyên |

## 5. Chiến lược test

- Mỗi module theo mẫu budgets: `service.spec` mock repository interface (`jest.Mocked`); `prisma.repository.spec` mock PrismaClient, assert đúng query args + mapping. Test case hiện có **chuyển sang đúng tầng**, không giảm coverage nhánh lỗi (P2002, P2025, P2034, count=0...).
- Router/integration specs giữ nguyên; assertion nào expect tiền dạng string đổi sang number **có chủ đích** (thuộc phần chuẩn hóa đã duyệt) — review kỹ từng diff.
- `middleware/auth.spec` đổi sang mock `usersRepository`.
- Frontend: chạy `pnpm test` + `pnpm typecheck`; bổ sung test `parseMoney` với input number nếu chưa có.
- Định nghĩa "xanh" sau **mỗi** module: `pnpm typecheck && pnpm test` pass ở cả `backend/` lẫn `frontend/`.

## 6. Lộ trình triển khai

Branch: `refactor/repository-model-layers` (từ `main`). Mỗi bước một commit độc lập:

| Bước | Nội dung |
|---|---|
| 0 | Commit phần budgets đang dang dở trong working tree làm baseline |
| 0b | Gom module vào domain: `git mv` auth/admin → `identity/`, stories/reviews/recommendations → `books/`; sửa import path; URL không đổi |
| 1 | Chùm User: `src/users/` + auth + admin + middleware `requireAuth` + `dependencies.ts` |
| 2–8 | Finance theo độ phức tạp tăng dần: categories → expenses → spending → groups → chat → advice → invoices |
| 9–11 | stories → reviews → recommendations |
| 12 | Budgets normalization (`limitAmount` → number) |
| 13 | Cập nhật `CLAUDE.md` (kiến trúc 5 tầng + quy ước, tiếng Việt) + rà/bổ sung test frontend |

Thứ tự có chủ đích: chùm User trước vì đụng middleware mà mọi router dùng; wire money đổi rải theo từng module là chấp nhận được vì frontend tolerant cả hai kiểu.

## 7. Rủi ro & biện pháp

1. **Payload gửi AI service đổi kiểu tiền** (chat/advice/invoices gửi context sang FastAPI): `ai/` hiện là placeholder nên rủi ro thấp; kiểm tra contract khi làm, cập nhật `ai-client.spec` tương ứng.
2. **Router specs assert tiền string**: đổi có chủ đích, không đổi gì khác ngoài kiểu tiền.
3. **reviews**: giữ nguyên semantics transaction (Serializable + retry tối đa 3 lần) — có spec riêng cho nhánh retry.
4. **groups repo interface lớn** (~13 methods): chấp nhận vì consumer-driven; nhóm method theo chức năng khi viết.
5. **Phạm vi rộng** (12 module × ~4 file): giảm thiểu bằng rollout tuần tự, mỗi module xanh mới sang module kế; không refactor 2 module trong 1 commit.

## 8. Tiêu chí hoàn thành

- [ ] 12 module + middleware đều đi qua repository interface; không còn `deps.prisma` trong bất kỳ `*.service.ts` nào (kiểm bằng grep).
- [ ] `*.model.ts` không import từ `@prisma/client` (ngoại lệ: types thuần enum nếu cần thì định nghĩa lại trong model).
- [ ] Mọi field tiền tệ trên wire là number; frontend typecheck + test xanh.
- [ ] `pnpm typecheck && pnpm test` xanh ở backend và frontend.
- [ ] `CLAUDE.md` mô tả đúng kiến trúc mới.
