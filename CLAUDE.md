# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Ngôn ngữ làm việc

- Mỗi lần trả lời user, luôn bắt đầu bằng lời chào có tên `boo`.
- Luôn làm việc và trao đổi với user bằng tiếng Việt.
- Tạo/cập nhật tài liệu hướng người dùng bằng tiếng Việt, trừ khi user yêu cầu ngôn ngữ khác.

## Trạng thái hiện tại của repo

- Dự án đã có code cho 2 phần:
  - `backend/`: Express + TypeScript + Prisma (PostgreSQL).
  - `frontend/`: Next.js App Router + TypeScript.
- `ai/` hiện mới là placeholder (chưa có service FastAPI chạy thực tế).
- Không có script monorepo phức tạp ở root; nếu cần lệnh package cụ thể, ưu tiên chạy theo từng thư mục con bằng `pnpm --dir <folder> ...`.

## Lệnh thường dùng

### Backend (`backend/`)

```powershell
pnpm dev
pnpm build
pnpm start
pnpm typecheck
pnpm test
pnpm test -- import-books.spec.ts
pnpm test -- import-comments.spec.ts
pnpm prisma:generate
pnpm prisma:migrate -- --name <migration-name>
pnpm import:stories
pnpm import:comments
```

### Frontend (`frontend/`)

```powershell
pnpm dev
pnpm build
pnpm start
pnpm typecheck
pnpm test
pnpm lint
pnpm format:check
```

### AI (`ai/`)

Hiện chỉ có tài liệu mô tả định hướng, chưa có lệnh runtime/test chính thức.

## Biến môi trường quan trọng

### Backend

- `DATABASE_URL` (bắt buộc)
- `JWT_SECRET` (bắt buộc)
- `PORT` (mặc định `4000`)
- `FRONTEND_URL` (mặc định `http://localhost:3000`)

### Frontend

- `NEXT_PUBLIC_API_URL` (mặc định `http://localhost:4000`)

## Kiến trúc tổng quan

### Backend architecture (Express)

- Entry point: `backend/src/main.ts`.
- App composition: `backend/src/app.ts`:
  - `cors`, `express.json`, global rate-limit.
  - Gắn router theo domain: `/auth`, `/stories`, `/reviews`, `/recommendations`, `/finance`, `/admin`.
  - 404 + error handler tập trung (`backend/src/errors.ts`).
- Cấu hình runtime: `backend/src/config.ts` (đọc env, validate giá trị bắt buộc).
- Truy cập DB: `backend/src/prisma.ts` tạo singleton `PrismaClient`.
- Module backend gom theo domain: `identity/` (users, auth, admin), `books/` (stories, reviews, recommendations), `finance/` (budgets, categories, expenses, groups, spending, chat, advice, invoices). URL mount không đổi.
- Domain modules theo pattern 5 tầng `router/controller/service/repository/model` (chuẩn tham chiếu: `finance/budgets`):
  - `<module>.model.ts`: domain types thuần, không import `@prisma/client`.
  - `<module>.repository.ts`: interface persistence; lỗi Prisma được dịch tại đây (P2002 → domain error, P2025/count=0 → null/false, P2034 → retry trong repo); transaction gói trọn trong một method.
  - `<module>.prisma.repository.ts`: implementation Prisma + mapper row→model (mapper dùng chung được export: `toFinanceCategory`, `toFinanceBudget`, `toFinanceExpense`, `toFinanceInvoice`).
  - `<module>.service.ts`: business logic, chỉ phụ thuộc repository interface (không thấy Prisma).
  - `<module>.router.ts`: nơi lắp ráp repository → service → controller.
  - Entity User dùng data-module chung `identity/users/` (không router); instance `usersRepository` nằm trong `BackendDeps` cho auth, admin và middleware `requireAuth` dùng chung.
- Middleware dùng chung:
  - `middleware/validate.ts`: validate request bằng Zod.
  - `middleware/auth.ts`: verify JWT, gắn `req.user`.
- Script nhập dữ liệu truyện/sách:
  - `backend/src/scripts/import-books.ts`: import metadata truyện từ `prepared_data_book.csv`, lưu `contentPath` tới file trong `output/`.
  - `backend/src/scripts/import-comments.ts`: import review/comment từ `comments.csv`.
  - Test parser/import: `backend/src/scripts/import-books.spec.ts`, `backend/src/scripts/import-comments.spec.ts`.

### Database model (Prisma)

- Schema ở `backend/prisma/schema.prisma`.
- Core entities:
  - `User`
  - `Story`
  - `Category`
  - `Review` (unique theo cặp `userId + storyId` cho review user; review import dùng `externalCommentId`)
- Migration history ở `backend/prisma/migrations/`.

### Frontend architecture (Next.js App Router)

- App routes trong `frontend/src/app/`:
  - `/` danh sách truyện.
  - `/stories/[id]` chi tiết truyện + form review.
  - `/login`, `/register` cho auth flow.
- `frontend/src/lib/api.ts`: wrapper gọi API backend (`apiGet`, `apiPost`).
- `frontend/src/lib/auth.ts`: parse payload auth + lưu/lấy access token từ `localStorage`.
- Component chính cho review UI: `frontend/src/components/review-form.tsx`.
- Type parsing cho story payload nằm trong `frontend/src/types/story.ts` để kiểm soát dữ liệu nhận từ API.

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
- Giao diện frontend sử dụng mặc định theo cấu trúc và cách tổ chức UI của Next.js hiện có trong repo.
- Khi sửa giao diện, ưu tiên chỉnh trong thư mục `ui` để đồng bộ giao diện trên toàn bộ dự án.
- Khi thay đổi API contract (auth/stories/reviews), cần cập nhật đồng bộ parser/type phía frontend để tránh lệch payload runtime.
- Không chỉnh `backend/.env` thật nếu không được yêu cầu; chỉ cập nhật `.env.example` hoặc hướng dẫn cấu hình.
- Mọi field tiền tệ (`amount`, `limitAmount`, `totalAmount`) trả về qua API là JSON number (đã chuẩn hóa từ Decimal-string vào 2026-07); parser frontend (`parseMoney`) chấp nhận cả hai nhưng backend luôn phát number.
- Khi thêm module backend mới, tạo đủ 5 tầng theo chuẩn `finance/budgets`; service spec mock repository interface, prisma.repository spec mock PrismaClient.
