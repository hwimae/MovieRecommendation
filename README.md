# Nền tảng gợi ý truyện cá nhân hoá

Dự án full-stack cho bài toán khám phá và gợi ý truyện chữ.

Hệ thống hiện gồm:

- **Frontend**: Next.js App Router + React + TypeScript.
- **Backend**: Express + TypeScript + Prisma.
- **AI service**: Python FastAPI dùng cho stories indexing ở local và các AI flow khác ngoài phạm vi stories runtime hiện tại.
- **Database**: PostgreSQL + pgvector.
- **Dữ liệu**: metadata truyện, review/comment và nội dung truyện local.

## Cấu trúc thư mục

| Thư mục | Vai trò |
|---|---|
| `frontend/` | Ứng dụng web Next.js. |
| `backend/` | API Express, Prisma schema, import scripts, recommendation APIs. |
| `ai/` | FastAPI service cho stories indexing ở local và các AI flow khác trong repo. |
| `data/raw/` | Dữ liệu thô truyện/sách. |
| `data/processed/` | Dữ liệu đã xử lý. |
| `docs/` | Tài liệu thiết kế, setup và ghi chú kỹ thuật. |

Tài liệu lịch sử của AI Story Advisor v1 nằm ở:

```text
docs/AI_STORY_ADVISOR_V1.md
```

Tài liệu setup, cách chạy và endpoint chi tiết của AI service nằm ở:

```text
ai/README.md
```

## AI module layout

AI service được chia theo domain sản phẩm:

- `ai/app/modules/story` — phục vụ stories indexing ở local và các thành phần AI liên quan ngoài runtime Render-safe hiện tại.
- `ai/app/modules/finance` — trích chi tiêu, tư vấn, chat tài chính và OCR hóa đơn.
- `ai/app/modules/movie` — module boundary dự phòng; chưa triển khai recommendation phim.

Lưu ý cho stories scope hiện tại:
- Runtime gợi ý truyện đang dùng flow Render-safe: frontend tự tạo query embedding trong browser rồi gọi `POST /recommendations/search-by-vector`.
- Các route như `/embed` và `/answer` không còn là request path runtime của stories flow hiện tại trên Render.
- Những AI flow khác trong repo vẫn có thể có cách vận hành riêng ngoài phạm vi phần stories này.

## Frontend UI policy

Frontend hiện tạm dùng UI mặc định theo hướng Next.js: semantic HTML, React/Next components, `next/link`, và CSS trong project. Thư mục `frontend/src/components/ui/` là nền ban đầu để sau này mở rộng thành bộ UI dùng chung cho toàn bộ dự án; không coi các dependency UI hiện có là bị cấm vĩnh viễn.

## Frontend route layout

Header chung của toàn bộ app chỉ có 3 khu vực cấp cao:

- **Tài chính** (`/finance`) — bên trong có các tab con `Dashboard`, `AI`, `Chi tiêu`, `Ngân sách`.
- **Truyện** (`/stories`) — giữ các chức năng truyện hiện có, gồm danh sách truyện, chi tiết truyện, review, AI tư vấn truyện, đăng nhập và đăng ký.
- **Phim** (`/movie`) — hiện là route placeholder để mở rộng sau.

Các chức năng con không đưa lên header cấp cao; chúng nằm trong nội dung hoặc navigation riêng của từng khu vực.

## Yêu cầu môi trường

- Node.js 20+
- pnpm 9+
- Python 3.10 khuyến nghị nếu bạn cần chạy AI service local cho stories indexing hoặc các AI flow khác
- PostgreSQL local có extension `pgvector`
- Với stories flow hiện tại, không cần Gemini runtime trên Render để trả kết quả gợi ý truyện; các AI flow khác có thể có yêu cầu riêng ngoài phạm vi phần này

## Biến môi trường

### Backend: `backend/.env`

Tạo file:

```text
backend/.env
```

Nội dung mẫu:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/story_recommendation?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=4000
FRONTEND_URL="http://localhost:3000"
AI_SERVICE_URL="http://localhost:8000"
```

| Biến | Bắt buộc | Ghi chú |
|---|---:|---|
| `DATABASE_URL` | Có | Chuỗi kết nối PostgreSQL. |
| `JWT_SECRET` | Có | Secret ký JWT, nên dùng chuỗi dài và ngẫu nhiên. |
| `PORT` | Không | Backend mặc định chạy ở `4000`. |
| `FRONTEND_URL` | Không | Origin frontend cho CORS. |
| `AI_SERVICE_URL` | Không | Với stories scope, biến này dùng cho local indexing `index:story-chunks`; stories runtime Render-safe hiện tại không gọi AI service theo request path. |

### AI service: `ai/.env`

Tạo file khi bạn cần chạy AI service local cho stories indexing hoặc các AI flow khác trong repo:

```text
ai/.env
```

Nội dung mẫu:

```env
GEMINI_API_KEY=
GEMINI_API_URL="https://generativelanguage.googleapis.com/v1beta"
GEMINI_MODEL="gemini-2.5-flash"
EMBEDDING_MODEL="intfloat/multilingual-e5-small"
```

| Biến | Bắt buộc | Ghi chú |
|---|---:|---|
| `GEMINI_API_KEY` | Không | Với stories flow Render-safe hiện tại, runtime backend không cần key này để trả recommendation. Một số AI flow khác hoặc local workflows vẫn có thể cần key. Không commit key thật. |
| `GEMINI_API_URL` | Không | Giữ mặc định nếu một AI flow tương ứng trong repo cần Gemini API public. |
| `GEMINI_MODEL` | Không | Chỉ còn liên quan tới các luồng thật sự dùng Gemini ngoài stories runtime Render-safe hiện tại. |
| `EMBEDDING_MODEL` | Không | Model embedding local mặc định `intfloat/multilingual-e5-small`, dùng cho stories indexing local. |

Không đưa Gemini key vào `backend/.env`, vì stories runtime backend hiện tại không gọi Gemini trực tiếp theo request path.

## Setup lần đầu

Các bước trong phần này thường chỉ cần làm một lần cho một môi trường local mới, hoặc làm lại khi xoá `node_modules`, xoá venv, đổi dependency, đổi database.

### 1. Cài dependency Node.js

Tại thư mục gốc:

```powershell
pnpm install
```

Hoặc cài riêng từng package:

```powershell
pnpm --dir backend install
pnpm --dir frontend install
```

### 2. Tạo Python venv cho AI service

```powershell
py -3.10 -m venv ai/.venv
.\ai\.venv\Scripts\Activate.ps1
pip install -r ai/requirements.txt
```

Nếu PowerShell chặn activate script:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
.\ai\.venv\Scripts\Activate.ps1
```

Thoát venv:

```powershell
deactivate
```

### 3. Chuẩn bị PostgreSQL + pgvector

Database cần PostgreSQL và extension `vector`.

Lưu ý: thư mục `backend/prisma/migrations/` đã được squash lại thành 5 phase:

1. `platform-foundation`
2. `movie-foundation`
3. `story-foundation`
4. `story-ai-retrieval`
5. `story-content-storage-state`

Local PostgreSQL bắt buộc phải có extension `pgvector` để migration phase 4 `story-ai-retrieval` chạy thành công.

Nếu dùng Docker, nên dùng image có sẵn pgvector thay vì image `postgres` thường. Ví dụ:

```powershell
docker run --name story-recommendation-postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=story_recommendation `
  -p 5432:5432 `
  -d pgvector/pgvector:pg16
```

Nếu PostgreSQL đã có sẵn, đảm bảo database trong `DATABASE_URL` tồn tại và hỗ trợ:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 4. Tạo file env local

Tạo:

```text
backend/.env
ai/.env
```

Theo mẫu ở phần **Biến môi trường**.

### 5. Apply migration và generate Prisma client

Nếu local database của bạn trước đây đang dùng migration history cũ trước khi squash, hãy reset local database trước:

```powershell
pnpm --dir backend exec prisma migrate reset --force
```

Sau đó chạy:

```powershell
pnpm --dir backend prisma:migrate
pnpm --dir backend prisma:generate
```

Nếu Prisma hỏi reset schema:

```text
Do you want to continue? All data will be lost.
```

Chỉ chọn `y` nếu bạn chấp nhận xoá toàn bộ dữ liệu local. Nếu cần giữ dữ liệu, chọn `N`.

### 6. Import dữ liệu truyện

Đặt dữ liệu raw tại:

```text
data/raw/books/book_data.csv
data/raw/books/book_id.csv
data/raw/books/prepared_data_book.csv
data/raw/books/comments.csv
data/raw/books/output/*.txt
```

Sau đó chạy:

```powershell
pnpm --dir backend import:stories
pnpm --dir backend import:comments
```

Chỉ cần chạy lại khi dữ liệu raw thay đổi hoặc bạn reset database.

### 7. Index nội dung truyện cho AI search

Đây là bước chuẩn bị dữ liệu stories ở local. Flow này không phải request-time runtime path trên Render.

Script index dùng metadata trên `Story` để biết chunks RAG đang stale hay fresh:

- `contentHash`: SHA-256 của file nội dung truyện.
- `contentUpdatedAt`: thời điểm nội dung file thay đổi.
- `contentIndexedAt`: thời điểm chunks/embedding được index thành công.

Truyện được xem là cần index/re-index khi chưa có `contentIndexedAt`, thiếu `contentUpdatedAt`, hoặc `contentUpdatedAt > contentIndexedAt`.

Kiểm tra truyện nào cần index/re-index mà không gọi AI service và không ghi DB:

```powershell
pnpm --dir backend index:story-chunks -- --dry-run
```

Index các truyện stale/chưa index. Bước này cần AI service đang chạy ở terminal khác vì script sẽ gọi `POST /embed`:

```powershell
pnpm --dir backend index:story-chunks
```

Force re-index cả truyện đã có chunks, kể cả khi metadata đang fresh:

```powershell
pnpm --dir backend index:story-chunks -- --force
```

Chạy batch lớn hơn:

```powershell
pnpm --dir backend index:story-chunks -- --limit 100
```

Chạy tiếp từ cursor đã log:

```powershell
pnpm --dir backend index:story-chunks -- --limit 100 --after <storyId>
```

Không cần chạy bước này mỗi lần mở app. Chỉ chạy khi:

- lần đầu chuẩn bị dữ liệu AI;
- import thêm truyện mới;
- nội dung truyện thay đổi;
- `--dry-run` báo có truyện stale/chưa index;
- muốn index thêm batch;
- đổi embedding model;
- muốn re-index bằng `--force`.

## Chạy dự án mỗi lần phát triển

Với stories flow hiện tại, mỗi lần bắt đầu làm việc bạn luôn cần backend và frontend. AI service local chỉ cần bật khi muốn chạy stories indexing hoặc kiểm tra một AI flow khác ngoài runtime stories hiện tại.

### Terminal 1: Backend

```powershell
pnpm --dir backend dev
```

Backend chạy ở:

```text
http://localhost:4000
```

### Terminal 2: Frontend

```powershell
pnpm --dir frontend dev
```

Frontend chạy ở:

```text
http://localhost:3000
```

Trang AI tư vấn truyện:

```text
http://localhost:3000/recommendations
```

### Terminal 3: AI service local khi cần stories indexing

```powershell
.\ai\.venv\Scripts\Activate.ps1
uvicorn app.main:app --app-dir ai --host 127.0.0.1 --port 8000
```

Kiểm tra:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Kết quả mong đợi:

```json
{"status":"ok"}
```

## Luồng AI tư vấn truyện

### Chuẩn bị dữ liệu

```text
Máy local
  -> backend index-story-chunks script
  -> story-chunker chia nội dung thành chunk
  -> AI service local tạo embedding passage
  -> PostgreSQL story_chunks lưu vector
```

### User hỏi AI

```text
Frontend /recommendations
  -> browser tạo query embedding (multilingual-e5-small)
  -> Backend POST /recommendations/search-by-vector
  -> backend validate vector 384 chiều
  -> pgvector search trong story_chunks
  -> backend gom kết quả theo truyện
  -> backend trả answer deterministic + recommendation cards
```

## API chính

### `POST /recommendations/search-by-vector`

Request:

```json
{
  "query": "Tôi thích truyện tu tiên, main yếu thành mạnh",
  "embedding": [/* vector 384 chiều do browser tạo */],
  "limit": 3
}
```

Ghi chú:
- `embedding` thực tế là vector 384 chiều do browser tạo trước khi gọi API.
- Stories runtime hiện tại không tạo query embedding trong backend theo request path.

Response:

```json
{
  "answer": "...",
  "recommendations": [
    {
      "storyId": "...",
      "title": "...",
      "authors": "...",
      "category": "...",
      "averageRating": 4.8,
      "reviewCount": 120,
      "score": 0.91,
      "reason": "..."
    }
  ]
}
```

Kiểm tra tay:

- Cách đúng và thực tế nhất là mở giao diện `/recommendations` để browser tự tạo embedding rồi gửi request đúng contract tới `POST /recommendations/search-by-vector`.
- Nếu muốn test API trực tiếp ngoài UI, bạn cần tự cung cấp đủ `embedding` 384 chiều hợp lệ theo đúng model family của stories flow hiện tại.

## Các lệnh thường dùng

### Root workspace

| Lệnh | Mục đích | Khi nào chạy |
|---|---|---|
| `pnpm install` | Cài dependency workspace | Lần đầu hoặc khi dependency đổi |
| `pnpm dev` | Chạy frontend + backend song song | Mỗi lần dev nếu không cần tách terminal |
| `pnpm build` | Build toàn workspace | Trước khi kiểm tra release |
| `pnpm lint` | Chạy lint các package có cấu hình | Trước khi commit |
| `pnpm test` | Chạy test toàn workspace | Trước khi commit |
| `pnpm format` | Format code | Khi cần format toàn repo |

### Backend

| Lệnh | Mục đích | Khi nào chạy |
|---|---|---|
| `pnpm --dir backend dev` | Chạy backend dev | Mỗi lần dev |
| `pnpm --dir backend build` | Build backend | Trước release hoặc kiểm tra build |
| `pnpm --dir backend start` | Chạy backend đã build | Sau khi build |
| `pnpm --dir backend typecheck` | Typecheck backend | Sau khi sửa TypeScript |
| `pnpm --dir backend test` | Chạy test backend | Sau khi sửa backend |
| `pnpm --dir backend prisma:generate` | Generate Prisma client | Sau migration/schema change |
| `pnpm --dir backend prisma:migrate` | Apply/create migration dev | Khi schema DB thay đổi |
| `pnpm --dir backend import:stories` | Import metadata/nội dung truyện | Khi setup data hoặc data đổi |
| `pnpm --dir backend import:comments` | Import comments/reviews | Khi setup data hoặc data đổi |
| `pnpm --dir backend index:story-chunks` | Index nội dung truyện cho AI | Lần đầu hoặc khi cần index thêm |

### Frontend

| Lệnh | Mục đích | Khi nào chạy |
|---|---|---|
| `pnpm --dir frontend dev` | Chạy frontend dev | Mỗi lần dev |
| `pnpm --dir frontend build` | Build frontend | Trước release hoặc kiểm tra build |
| `pnpm --dir frontend start` | Chạy frontend đã build | Sau khi build |
| `pnpm --dir frontend typecheck` | Typecheck frontend | Sau khi sửa TypeScript |
| `pnpm --dir frontend test` | Chạy test frontend | Sau khi sửa frontend |
| `pnpm --dir frontend lint` | Lint frontend | Trước commit |
| `pnpm --dir frontend format:check` | Kiểm tra format frontend | Trước commit nếu cần |

### AI service

| Lệnh | Mục đích | Khi nào chạy |
|---|---|---|
| `py -3.10 -m venv ai/.venv` | Tạo Python venv | Lần đầu hoặc khi xoá venv |
| `.\ai\.venv\Scripts\Activate.ps1` | Activate venv | Mỗi terminal chạy AI |
| `pip install -r ai/requirements.txt` | Cài dependency Python | Lần đầu hoặc khi requirements đổi |
| `uvicorn app.main:app --app-dir ai --host 127.0.0.1 --port 8000` | Chạy AI service | Mỗi lần dev cần AI |
| `py -3.10 -m pytest -c ai/pytest.ini ai/tests -q` | Chạy test AI | Sau khi sửa AI service |

## Kiểm tra trước khi kết thúc thay đổi

```powershell
py -3.10 -m pytest -c ai/pytest.ini ai/tests -q
pnpm --dir backend test
pnpm --dir backend typecheck
pnpm --dir frontend test
pnpm --dir frontend typecheck
pnpm --dir frontend lint
```

## Ghi chú bảo mật

- Không commit `backend/.env`.
- Không commit `ai/.env`.
- Không đưa Gemini API key thật vào tài liệu, issue, commit message hoặc log public.
- Nếu lỡ lộ key, hãy revoke key cũ và tạo key mới.

## Trạng thái hiện tại

- Backend/frontend nền tảng đã có auth, stories, reviews và recommendation routes.
- Stories runtime hiện dùng flow Render-safe: browser tạo query embedding, backend chỉ search pgvector và trả answer deterministic.
- AI service FastAPI vẫn phục vụ stories indexing ở local và các AI flow khác ngoài phạm vi stories runtime hiện tại.
- Frontend có header chung cho 3 khu vực: Tài chính, Truyện và Phim.
- Frontend có trang `/recommendations` cho AI tư vấn truyện trong khu Truyện.
- Semantic recommendation chỉ dùng các truyện đã được index vào bảng `story_chunks`.
