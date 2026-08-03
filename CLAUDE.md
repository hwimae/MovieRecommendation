# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ngôn ngữ làm việc

- Mỗi lần trả lời user, luôn bắt đầu bằng lời chào có tên `boo`.
- Luôn làm việc và trao đổi với user bằng tiếng Việt.
- Tạo/cập nhật tài liệu hướng người dùng bằng tiếng Việt, trừ khi user yêu cầu ngôn ngữ khác.

## Tổng quan repo

pnpm workspace (`pnpm-workspace.yaml`) gồm 3 phần chạy độc lập:

- `backend/`: Express + TypeScript + Prisma (PostgreSQL + pgvector). Test bằng Jest, file `*.spec.ts` đặt cạnh source.
- `frontend/`: Next.js App Router + TypeScript + Tailwind + HeroUI. Test bằng Vitest, file `*.test.ts(x)` đặt cạnh source.
- `ai/`: FastAPI (Python) — service nội bộ cho embedding/RAG truyện và các endpoint finance AI. Test bằng pytest.

Database local bắt buộc có extension `pgvector` (migration `story_ai_retrieval` sẽ fail nếu thiếu; nếu dùng Docker, dùng image `pgvector/pgvector:pg16`).

## Lệnh thường dùng

### Root workspace

```bash
pnpm dev          # chạy song song frontend + backend (không gồm ai/)
pnpm build        # build toàn workspace
pnpm lint         # lint các package có cấu hình lint
pnpm test         # test toàn workspace
pnpm format       # prettier toàn repo
```

### Backend (`backend/`)

```bash
pnpm --dir backend dev
pnpm --dir backend typecheck
pnpm --dir backend test                              # Jest
pnpm --dir backend test -- budgets.service.spec.ts   # chạy 1 file test (match theo tên file)
pnpm --dir backend prisma:generate
pnpm --dir backend prisma:migrate -- --name <migration-name>
pnpm --dir backend import:stories                    # import metadata truyện từ CSV
pnpm --dir backend import:comments                   # import review/comment từ CSV
pnpm --dir backend index:story-chunks                # index chunks + embedding (cần AI service đang chạy)
pnpm --dir backend index:story-chunks -- --dry-run   # xem truyện nào stale, không gọi AI, không ghi DB
pnpm --dir backend index:story-chunks -- --force     # re-index cả truyện fresh; hỗ trợ --limit N --after <storyId>
pnpm --dir backend seed:admin                        # upsert admin APPROVED; cần env ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
```

### Frontend (`frontend/`)

```bash
pnpm --dir frontend dev
pnpm --dir frontend typecheck
pnpm --dir frontend test                     # Vitest
pnpm --dir frontend test -- finance-chat     # chạy test theo filter tên file
pnpm --dir frontend lint
pnpm --dir frontend format:check
```

### AI service (`ai/`)

```bash
python -m venv ai/.venv && source ai/.venv/bin/activate    # Windows: .\ai\.venv\Scripts\Activate.ps1
pip install -r ai/requirements.txt
uvicorn app.main:app --app-dir ai --host 127.0.0.1 --port 8000
python -m pytest -c ai/pytest.ini ai/tests -v              # test AI; không cần Gemini key thật
```

## Biến môi trường

### Backend (`backend/.env`)

- `DATABASE_URL` (bắt buộc), `JWT_SECRET` (bắt buộc)
- `PORT` (mặc định `4000`), `FRONTEND_URL` (mặc định `http://localhost:3000`)
- `AI_SERVICE_URL` (mặc định `http://localhost:8000`) — backend gọi AI service qua URL này
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (tuỳ chọn) — bật đọc nội dung truyện từ Cloudflare R2; thiếu thì fallback đọc file local theo `Story.contentPath`

### Frontend

- `NEXT_PUBLIC_API_URL` (mặc định `http://localhost:4000`)

### AI service (`ai/.env`)

- `GEMINI_API_KEY` (tuỳ chọn — finance endpoints có deterministic fallback khi thiếu key), `GEMINI_API_URL`, `GEMINI_MODEL`
- `EMBEDDING_MODEL` (mặc định `intfloat/multilingual-e5-small`; request `/embed` đầu tiên sẽ tải model về cache)

## Kiến trúc tổng quan

### Backend architecture (Express)

- Composition root: `main.ts` → `loadConfig()` (`config.ts`) → `createBackendDeps(config)` (`dependencies.ts`) → `createApp(config, deps)` (`app.ts`).
- `app.ts`: `cors`, `express.json`, global rate-limit; gắn router theo domain: `/auth`, `/stories`, `/reviews`, `/recommendations`, `/finance`, `/admin`; 404 + error handler tập trung (`errors.ts`).
- `BackendDeps` (DI thủ công, không framework): `prisma`, `usersRepository`, `passwordHasher` (bcrypt), `tokenService` (JWT HS256, 7d), `aiClient` (stories), `financeAiClient`, `storyContentReader`, `logger`. Router factory nhận deps — service không tự import singleton.
- Module gom theo domain: `identity/` (auth, admin, users), `books/` (stories, reviews, recommendations), `finance/` (categories, expenses, budgets, invoices, groups, spending, chat, advice + `finance.router.ts` tổng hợp).
- Domain modules theo pattern 5 tầng `router/controller/service/repository/model` (chuẩn tham chiếu: `finance/budgets`):
  - `<module>.model.ts`: domain types thuần, không import `@prisma/client`.
  - `<module>.repository.ts`: interface persistence; lỗi Prisma được dịch tại đây (P2002 → domain error, P2025/count=0 → null/false, P2034 → retry trong repo); transaction gói trọn trong một method.
  - `<module>.prisma.repository.ts`: implementation Prisma + mapper row→model (mapper dùng chung được export: `toFinanceCategory`, `toFinanceBudget`, `toFinanceExpense`, `toFinanceInvoice`).
  - `<module>.service.ts`: business logic, chỉ phụ thuộc repository interface (không thấy Prisma).
  - `<module>.router.ts`: nơi lắp ráp repository → service → controller.
  - Entity User dùng data-module chung `identity/users/` (không router); instance `usersRepository` nằm trong `BackendDeps` cho auth, admin và middleware `requireAuth` dùng chung.
- `storage/`: `story-content-storage.ts` đọc nội dung truyện — ưu tiên Cloudflare R2 (`story-content-r2.ts`, S3 SDK) khi có config, fallback đọc file local.
- Middleware dùng chung: `middleware/validate.ts` (Zod), `middleware/auth.ts` (verify JWT, gắn `req.user`).
- User approval flow: `User` có `role` (USER/ADMIN) và `status` (PENDING/APPROVED/REJECTED); user đăng ký mới ở PENDING, admin duyệt qua `/admin`.
- Scripts (`backend/src/scripts/`): `import-books.ts` (metadata truyện từ `prepared_data_book.csv`, lưu `contentPath`), `import-comments.ts` (review từ `comments.csv`), `index-story-chunks.ts` (chunk + embedding cho AI search), `seed-admin.ts`. Mỗi script có `*.spec.ts` tương ứng.

### Database model (Prisma)

- Schema ở `backend/prisma/schema.prisma`; migrations đã squash thành 5 phase nền (`platform_foundation`, `movie_foundation`, `story_foundation`, `story_ai_retrieval`, `story_content_storage_state`) + các migration finance/user-approval về sau.
- Models:
  - `User` (+ enums `UserRole`, `UserStatus`)
  - `Movie`, `Genre`, `MovieGenre`, `Rating` — nền cho khu Phim, chưa có API runtime
  - `Story`, `Category`, `StoryChunk` (embedding `vector(384)` qua `Unsupported`, map bảng `story_chunks`)
  - `UserReview` (unique theo cặp `userId + storyId` cho review user; review import dùng `externalCommentId`)
  - Nhóm model `Finance*` (11 models): `FinanceCategory`, `FinanceInvoice`, `FinanceExpense`, `FinanceBudget`, `FinanceGroup`, `FinanceGroupMember`, `FinanceChatSession`, `FinanceChatMessage`, `FinanceAIInteraction`, `FinanceCategorizationRule`, `FinanceCategorizationFeedback` (+ enum `FinanceGroupRole`)
- `Story` giữ content-state metadata: `contentPath`, `contentHash`, `contentUpdatedAt`, `contentIndexedAt` — script `index:story-chunks` dựa vào đó để quyết định chunks stale/fresh.

### Luồng AI gợi ý truyện (Render-safe)

- Chuẩn bị dữ liệu (local, chạy khi cần): `import:stories` → `index:story-chunks` — script gọi `POST /embed` của AI service, chia chunk bằng `books/recommendations/story-chunker.ts`, lưu vector vào `story_chunks`.
- Runtime: browser tự tạo query embedding 384 chiều (`frontend/src/lib/story-query-embedding.ts`, `@xenova/transformers`, model `multilingual-e5-small`) → `POST /recommendations/search-by-vector` → backend validate vector (`embedding-contract.ts`) → pgvector search → trả answer deterministic + recommendation cards. Backend KHÔNG gọi Gemini/AI service trong request path này.
- Muốn test API này ngoài UI phải tự cung cấp embedding 384 chiều hợp lệ; cách thực tế nhất là dùng trang `/recommendations`.

### AI service (FastAPI)

- Layout theo domain: `ai/app/modules/story` (embed/answer RAG), `ai/app/modules/finance` (extract chi tiêu, advice, chat, OCR hóa đơn — backend Express gọi nội bộ qua `finance/ai-client.ts`), `ai/app/modules/movie` (stub boundary).
- AI service không sở hữu auth/database — backend gửi context đã xác thực và tự lưu kết quả bằng Prisma.
- Chi tiết endpoint và cách chạy: `ai/README.md`.

### Frontend architecture (Next.js App Router)

- Header chung 3 khu vực cấp cao (`components/ui/global-header.tsx`): **Tài chính** (`/finance` + tabs dashboard/expenses/budgets/chat/groups/settings), **Truyện** (`/stories`, `/stories/[id]`, `/recommendations`, `/login`, `/register`), **Phim** (`/movie` placeholder). Ngoài ra: `/` là landing tổng, `/admin/users` cho admin duyệt user.
- `lib/`: `api.ts` (wrapper `apiGet`/`apiPost`), `auth.ts` (token trong `localStorage`), `finance-api.ts`, `admin-api.ts`, `story-query-embedding.ts` (embedding trong browser), `story-recommendations.ts`.
- `types/`: parser kiểm soát payload nhận từ API (`story.ts`, `finance.ts`, `recommendation.ts`).
- Components gom theo domain: `components/auth/` (auth-context, auth-gate), `components/finance/`, `components/stories/`, `components/ui/` (UI dùng chung).
- Stack UI: Tailwind CSS + HeroUI + framer-motion + lucide-react + recharts.

## Dữ liệu truyện/sách

- Dữ liệu local dự kiến nằm ở: `data/raw/books/`.
- Các file/thư mục chính:
  - `data/raw/books/book_data.csv`
  - `data/raw/books/book_id.csv`
  - `data/raw/books/prepared_data_book.csv`
  - `data/raw/books/comments.csv`
  - `data/raw/books/output/*.txt`
- `output/*.txt` chỉ lưu đường dẫn vào `Story.contentPath`, không import full text vào database.

## Lưu ý khi phát triển

- Repo hiện dùng ExpressJS cho backend (không phải NestJS).
- Khi sửa giao diện, ưu tiên chỉnh trong thư mục `frontend/src/components/ui/` để đồng bộ giao diện trên toàn bộ dự án.
- Khi thay đổi API contract (auth/stories/reviews/finance), cần cập nhật đồng bộ parser/type phía frontend để tránh lệch payload runtime.
- Không chỉnh `backend/.env` / `ai/.env` thật nếu không được yêu cầu; chỉ cập nhật `.env.example` hoặc hướng dẫn cấu hình.
- Mọi field tiền tệ (`amount`, `limitAmount`, `totalAmount`) trả về qua API là JSON number (đã chuẩn hóa từ Decimal-string vào 2026-07); parser frontend (`parseMoney`) chấp nhận cả hai nhưng backend luôn phát number.
- Khi thêm module backend mới, tạo đủ 5 tầng theo chuẩn `finance/budgets`; service spec mock repository interface, prisma.repository spec mock PrismaClient.
