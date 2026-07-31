# Kế hoạch triển khai: Tầng Repository & Model cho toàn bộ backend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mọi module backend đi qua tầng repository (interface) + model (domain types thuần), service không còn thấy Prisma; đồng thời chuẩn hóa mọi field tiền tệ trên wire từ Decimal-string → JSON number.

**Architecture:** Nhân rộng pattern có sẵn của `finance/budgets`: `*.model.ts` (types thuần) → `*.repository.ts` (interface) → `*.prisma.repository.ts` (impl + mapper) → service chỉ phụ thuộc interface → router lắp ráp. Entity User dùng chung data-module `src/users/` cho auth/admin/middleware, instance nằm trong `BackendDeps`.

**Tech Stack:** Express + TypeScript + Prisma (PostgreSQL), Jest, Zod. Spec gốc: `docs/superpowers/specs/2026-07-31-backend-repository-model-layers-design.md`.

## Global Constraints

- Message lỗi HTTP giữ **nguyên từng chữ** (vd `'Finance category not found'`, `'Email already exists'`, `'Unauthorized'`).
- Wire JSON: không đổi tên/thêm/bớt field. Thay đổi duy nhất được phép: field tiền tệ (`amount`, `limitAmount`, `totalAmount`) từ Decimal-string → **number**.
- `*.model.ts` **không import** `@prisma/client` (enum cần thiết thì định nghĩa lại bằng `as const`).
- `*.service.ts` **không tham chiếu** `deps.prisma` (kiểm bằng grep ở task cuối).
- Lỗi Prisma dịch tại repository: P2002 → typed domain error; P2025 / `updateMany count=0` → `null`/`false`; P2034 → retry trong repo. Transaction gói trọn trong 1 method repository.
- Sau **mỗi** task: `pnpm --dir backend typecheck && pnpm --dir backend test` xanh; task nào đổi wire thì thêm `pnpm --dir frontend typecheck && pnpm --dir frontend test`. Mỗi task 1 commit.
- Branch làm việc: `refactor/repository-model-layers` (tạo ở Task 0). Commit message tiếng Anh, kết bằng `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **Gom domain (user bổ sung sau khi duyệt spec):** `identity/` chứa `users, auth, admin`; `books/` chứa `stories, reviews, recommendations`; `finance/` giữ nguyên. URL mount trong `app.ts` **không đổi** — chỉ đổi import path, không tạo router cha mới. Thực hiện ở Task 0b, trước mọi task module.
- **Lệch nhẹ so với lộ trình spec (có chủ đích):** budgets normalization làm ở Task 6 (ngay sau categories, trước expenses/groups/chat) thay vì cuối, vì groups/chat tái dùng mapper `toFinanceBudget` (number) — tránh giai đoạn wire không nhất quán.

## Bản đồ file (toàn cục)

- **Di chuyển (Task 0b):** `auth/`, `admin/` → `identity/`; `stories/`, `reviews/`, `recommendations/` → `books/` (git mv + sửa import path, URL không đổi).
- **Tạo mới:** `src/identity/users/users.model.ts|users.repository.ts|users.prisma.repository.ts|users.prisma.repository.spec.ts`; với mỗi module `categories, expenses, spending, groups, chat, advice, invoices, stories, reviews, recommendations`: `<m>.model.ts`, `<m>.repository.ts`, `<m>.prisma.repository.ts`, `<m>.prisma.repository.spec.ts` (spending/invoices model có điều chỉnh — xem task tương ứng).
- **Sửa:** `dependencies.ts` (thêm `usersRepository`), `middleware/auth.ts` + spec, mọi `<m>.service.ts` + `<m>.service.spec.ts`, mọi `<m>.router.ts` (wiring), `finance/budgets/*` (normalization), xóa `recommendations/story-vector-search.repository.ts` (gộp vào prisma.repository), `CLAUDE.md`.
- **Không đụng:** `errors.ts`, `finance/http.ts`, `middleware/validate.ts`, mọi `*.controller.ts`, mọi `*.schema.ts`, `scripts/`, `storage/`, `prisma/schema.prisma`.

---

### Task 0: Baseline — commit budgets dang dở, tạo branch

**Files:** không sửa nội dung — chỉ git.

- [ ] **Step 1: Kiểm tra trạng thái**

Run: `git status --short`
Expected: các file `backend/src/finance/budgets/*` (M/??) và 2 file docs mới (spec + plan này). Nếu có file lạ khác → DỪNG, hỏi user.

- [ ] **Step 2: Chạy test baseline**

Run: `pnpm --dir backend typecheck && pnpm --dir backend test`
Expected: PASS toàn bộ (baseline xanh trước khi làm gì thêm).

- [ ] **Step 3: Tạo branch + commit baseline**

```bash
git checkout -b refactor/repository-model-layers
git add docs/superpowers/specs/2026-07-31-backend-repository-model-layers-design.md docs/superpowers/plans/2026-07-31-backend-repository-model-layers.md
git commit -m "docs: add repository/model layers refactor spec and plan

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git add backend/src/finance/budgets/
git commit -m "refactor(budgets): baseline repository/model layers for budgets module

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 0b: Gom module vào domain `identity/` và `books/`

**Files:** chỉ di chuyển thư mục + sửa import path — không đổi logic, không đổi URL, không đổi tên file.

**Interfaces:**
- Produces (mọi task sau dùng): đường dẫn mới `backend/src/identity/auth/`, `backend/src/identity/admin/`, `backend/src/books/stories/`, `backend/src/books/reviews/`, `backend/src/books/recommendations/`.

- [ ] **Step 1: Di chuyển bằng git mv**

```bash
mkdir -p backend/src/identity backend/src/books
git mv backend/src/auth backend/src/identity/auth
git mv backend/src/admin backend/src/identity/admin
git mv backend/src/stories backend/src/books/stories
git mv backend/src/reviews backend/src/books/reviews
git mv backend/src/recommendations backend/src/books/recommendations
```

- [ ] **Step 2: Sửa import ở các file KHÔNG bị di chuyển đang trỏ tới module vừa chuyển**

Trong `backend/src/app.ts` (5 dòng import):

```typescript
import { createAdminRouter } from './identity/admin/admin.router';
import { createAuthRouter } from './identity/auth/auth.router';
import { createRecommendationsRouter } from './books/recommendations/recommendations.router';
import { createReviewsRouter } from './books/reviews/reviews.router';
import { createStoriesRouter } from './books/stories/stories.router';
```

Trong `backend/src/middleware/auth.ts`:

```typescript
import type { AuthUser } from '../identity/auth/auth.schema';
```

Trong `backend/src/dependencies.ts`:

```typescript
import { createAiClient, type AiClient } from './books/recommendations/ai-client';
```

Quét phần còn sót (ví dụ `scripts/index-story-chunks.ts` trỏ `../recommendations/...` → `../books/recommendations/...`):

```bash
grep -rn "from '\.\./\(auth\|admin\|stories\|reviews\|recommendations\)/" backend/src
grep -rn "from '\./\(auth\|admin\|stories\|reviews\|recommendations\)/" backend/src
```

Sửa mọi kết quả theo đường dẫn mới.

- [ ] **Step 3: Sửa import BÊN TRONG 5 module vừa chuyển (sâu thêm 1 cấp)**

Quy tắc thay thế trong mọi file thuộc `identity/auth`, `identity/admin`, `books/stories`, `books/reviews`, `books/recommendations`:
- `'../dependencies'` → `'../../dependencies'`, `'../errors'` → `'../../errors'`, `'../prisma'` → `'../../prisma'`
- `'../middleware/…'` → `'../../middleware/…'`, `'../storage/…'` → `'../../storage/…'`
- Trong các `*.router.spec.ts`: `'../app'` → `'../../app'`, `'../config'` → `'../../config'`
- Import giữa 2 module **cùng domain** giữ nguyên (vd `identity/admin` import `'../auth/auth.schema'` vẫn đúng).

- [ ] **Step 4: Typecheck lặp tới sạch + full test**

Run: `pnpm --dir backend typecheck` — sửa từng lỗi import còn báo theo 2 quy tắc trên, lặp tới khi sạch.
Run: `pnpm --dir backend test` → Expected: PASS toàn bộ (không sửa test nào ngoài đường dẫn import nếu có).

- [ ] **Step 5: Commit**

```bash
git add backend/src
git commit -m "refactor: group backend modules into identity and books domains

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 1: Data-module `src/identity/users/` + wiring vào BackendDeps

**Files:**
- Create: `backend/src/identity/users/users.model.ts`
- Create: `backend/src/identity/users/users.repository.ts`
- Create: `backend/src/identity/users/users.prisma.repository.ts`
- Test: `backend/src/identity/users/users.prisma.repository.spec.ts`
- Modify: `backend/src/dependencies.ts`

**Interfaces:**
- Consumes: `PrismaClient` (bảng `user`).
- Produces (Task 2/3/4 dùng): type `User`, `UserWithPasswordHash`, `UserRole`, `UserStatus`, `CreateUserData` (users.model); interface `UsersRepository` + class `EmailAlreadyInUseError` (users.repository); `createPrismaUsersRepository(prisma: PrismaClient): UsersRepository`; field mới `BackendDeps.usersRepository: UsersRepository`.

- [ ] **Step 1: Tạo `users.model.ts`**

```typescript
export const USER_ROLES = ['USER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type UserWithPasswordHash = User & { passwordHash: string };

export type CreateUserData = {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  status: UserStatus;
};
```

- [ ] **Step 2: Tạo `users.repository.ts`**

```typescript
import type { CreateUserData, User, UserStatus, UserWithPasswordHash } from './users.model';

export class EmailAlreadyInUseError extends Error {
  constructor() {
    super('Email already in use');
    this.name = 'EmailAlreadyInUseError';
  }
}

export interface UsersRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<UserWithPasswordHash | null>;
  create(data: CreateUserData): Promise<User>;
  listByStatus(status: UserStatus): Promise<User[]>;
  updateStatus(id: string, status: Extract<UserStatus, 'APPROVED' | 'REJECTED'>): Promise<User | null>;
}
```

- [ ] **Step 3: Viết spec cho prisma repository (fail trước)**

Tạo `backend/src/identity/users/users.prisma.repository.spec.ts`:

```typescript
import { Prisma, type PrismaClient } from '@prisma/client';
import { EmailAlreadyInUseError } from './users.repository';
import { createPrismaUsersRepository } from './users.prisma.repository';

function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
}

function createUserRow(overrides: Record<string, unknown> = {}) {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  const updatedAt = new Date('2026-01-02T00:00:00.000Z');
  return {
    id: 'user1',
    email: 'boo@example.com',
    passwordHash: 'hash',
    name: 'Boo',
    role: 'USER',
    status: 'APPROVED',
    createdAt,
    updatedAt,
    ...overrides,
  };
}

function createRepository(prisma: ReturnType<typeof createPrismaMock>) {
  return createPrismaUsersRepository(prisma as unknown as PrismaClient);
}

describe('createPrismaUsersRepository', () => {
  it('finds a user by id and strips the password hash', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue(createUserRow());
    const repository = createRepository(prisma);

    const user = await repository.findById('user1');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user1' } });
    expect(user).toEqual({
      id: 'user1',
      email: 'boo@example.com',
      name: 'Boo',
      role: 'USER',
      status: 'APPROVED',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
  });

  it('returns null when the id does not exist', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(createRepository(prisma).findById('missing')).resolves.toBeNull();
  });

  it('finds a user by email including the password hash', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue(createUserRow());
    const repository = createRepository(prisma);

    const user = await repository.findByEmail('boo@example.com');

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'boo@example.com' } });
    expect(user).toMatchObject({ id: 'user1', passwordHash: 'hash' });
  });

  it('creates a user and translates P2002 into EmailAlreadyInUseError', async () => {
    const prisma = createPrismaMock();
    prisma.user.create.mockResolvedValue(createUserRow({ status: 'PENDING' }));
    const repository = createRepository(prisma);
    const data = {
      email: 'boo@example.com',
      passwordHash: 'hash',
      name: 'Boo',
      role: 'USER' as const,
      status: 'PENDING' as const,
    };

    await expect(repository.create(data)).resolves.toMatchObject({ id: 'user1', status: 'PENDING' });
    expect(prisma.user.create).toHaveBeenCalledWith({ data });

    prisma.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' }),
    );
    await expect(repository.create(data)).rejects.toBeInstanceOf(EmailAlreadyInUseError);
  });

  it('lists users by status ordered by creation time', async () => {
    const prisma = createPrismaMock();
    prisma.user.findMany.mockResolvedValue([createUserRow()]);
    const repository = createRepository(prisma);

    const users = await repository.listByStatus('PENDING');

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    expect(users).toHaveLength(1);
    expect(users[0]).not.toHaveProperty('passwordHash');
  });

  it('updates status and maps P2025 to null', async () => {
    const prisma = createPrismaMock();
    prisma.user.update.mockResolvedValue(createUserRow({ status: 'APPROVED' }));
    const repository = createRepository(prisma);

    await expect(repository.updateStatus('user1', 'APPROVED')).resolves.toMatchObject({ status: 'APPROVED' });
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'user1' }, data: { status: 'APPROVED' } });

    prisma.user.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('missing', { code: 'P2025', clientVersion: 'test' }),
    );
    await expect(repository.updateStatus('missing', 'REJECTED')).resolves.toBeNull();
  });
});
```

- [ ] **Step 4: Chạy spec, xác nhận fail**

Run: `pnpm --dir backend test -- users.prisma.repository.spec.ts`
Expected: FAIL — `Cannot find module './users.prisma.repository'`.

- [ ] **Step 5: Tạo `users.prisma.repository.ts`**

```typescript
import { Prisma, type PrismaClient, type User as PrismaUser } from '@prisma/client';
import type { User, UserWithPasswordHash } from './users.model';
import { EmailAlreadyInUseError, type UsersRepository } from './users.repository';

function toUser(user: PrismaUser): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function toUserWithPasswordHash(user: PrismaUser): UserWithPasswordHash {
  return { ...toUser(user), passwordHash: user.passwordHash };
}

function isKnownPrismaError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

export function createPrismaUsersRepository(prisma: PrismaClient): UsersRepository {
  return {
    async findById(id) {
      const user = await prisma.user.findUnique({ where: { id } });
      return user ? toUser(user) : null;
    },

    async findByEmail(email) {
      const user = await prisma.user.findUnique({ where: { email } });
      return user ? toUserWithPasswordHash(user) : null;
    },

    async create(data) {
      try {
        return toUser(await prisma.user.create({ data }));
      } catch (error) {
        if (isKnownPrismaError(error, 'P2002')) throw new EmailAlreadyInUseError();
        throw error;
      }
    },

    async listByStatus(status) {
      const users = await prisma.user.findMany({ where: { status }, orderBy: { createdAt: 'asc' } });
      return users.map(toUser);
    },

    async updateStatus(id, status) {
      try {
        return toUser(await prisma.user.update({ where: { id }, data: { status } }));
      } catch (error) {
        if (isKnownPrismaError(error, 'P2025')) return null;
        throw error;
      }
    },
  };
}
```

- [ ] **Step 6: Chạy spec, xác nhận pass**

Run: `pnpm --dir backend test -- users.prisma.repository.spec.ts`
Expected: PASS (6 test).

- [ ] **Step 7: Wire vào `dependencies.ts`**

Trong `backend/src/dependencies.ts`, thêm import và field:

```typescript
import { createPrismaUsersRepository } from './identity/users/users.prisma.repository';
import type { UsersRepository } from './identity/users/users.repository';
```

Thêm vào type `BackendDeps` (sau `prisma: PrismaClient;`):

```typescript
  usersRepository: UsersRepository;
```

Thêm vào object trả về của `createBackendDeps` (sau `prisma,`):

```typescript
    usersRepository: createPrismaUsersRepository(prisma),
```

- [ ] **Step 8: Bổ sung stub `usersRepository` vào 4 router spec đang mock BackendDeps**

`admin/admin.router.spec.ts`, `finance/finance.router.spec.ts`, `finance/groups/groups.router.spec.ts`, `recommendations/recommendations.router.spec.ts` — trong hàm `createDepsMock` của **mỗi** file, thêm field sau (đặt cạnh `passwordHasher`), nếu không sẽ fail typecheck vì thiếu field của `BackendDeps`:

```typescript
    usersRepository: {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      listByStatus: jest.fn(),
      updateStatus: jest.fn(),
    },
```

(Chưa đổi hành vi mock nào khác — `requireAuth` vẫn dùng `prisma.user.findUnique` cho tới Task 4.)

- [ ] **Step 9: Typecheck + full test + commit**

Run: `pnpm --dir backend typecheck && pnpm --dir backend test`
Expected: PASS toàn bộ (chưa module nào dùng field mới).

```bash
git add backend/src/identity/users backend/src/dependencies.ts
git commit -m "feat(users): add shared users data-module with prisma repository

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Module auth dùng usersRepository

**Files:**
- Modify: `backend/src/identity/auth/auth.service.ts` (viết lại toàn bộ)
- Test: `backend/src/identity/auth/auth.service.spec.ts` (viết lại toàn bộ)
- Không sửa: `auth.router.ts` (structural typing — `createAuthService(deps)` vẫn nhận `BackendDeps`), `auth.controller.ts`, `auth.schema.ts`.

**Interfaces:**
- Consumes: `UsersRepository`, `EmailAlreadyInUseError` (Task 1), `User` (users.model), `PasswordHasher`/`TokenService` (dependencies.ts).
- Produces: `AuthService` — signature **không đổi**: `register(input: RegisterInput): Promise<RegisterResponse>`, `login(input: LoginInput): Promise<AuthResponse>`.

- [ ] **Step 1: Viết lại `auth.service.spec.ts` (fail trước)**

Thay toàn bộ nội dung file bằng:

```typescript
import type { UserWithPasswordHash } from '../users/users.model';
import { EmailAlreadyInUseError, type UsersRepository } from '../users/users.repository';
import { createAuthService } from './auth.service';

function createUser(overrides: Partial<UserWithPasswordHash> = {}): UserWithPasswordHash {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'user1',
    email: 'boo@example.com',
    name: 'Boo',
    role: 'USER',
    status: 'APPROVED',
    passwordHash: 'stored-hash',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function createDeps() {
  const usersRepository: jest.Mocked<UsersRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    listByStatus: jest.fn(),
    updateStatus: jest.fn(),
  };

  return {
    usersRepository,
    passwordHasher: { hash: jest.fn(), compare: jest.fn() },
    tokenService: { signAccessToken: jest.fn(), verifyAccessToken: jest.fn() },
  };
}

describe('createAuthService', () => {
  describe('register', () => {
    it('creates a pending user and returns the public profile', async () => {
      const deps = createDeps();
      deps.usersRepository.findByEmail.mockResolvedValue(null);
      deps.passwordHasher.hash.mockResolvedValue('new-hash');
      deps.usersRepository.create.mockResolvedValue({
        id: 'user1',
        email: 'boo@example.com',
        name: 'Boo',
        role: 'USER',
        status: 'PENDING',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      const service = createAuthService(deps);

      const result = await service.register({ email: 'boo@example.com', password: 'password123', name: 'Boo' });

      expect(deps.usersRepository.create).toHaveBeenCalledWith({
        email: 'boo@example.com',
        passwordHash: 'new-hash',
        name: 'Boo',
        role: 'USER',
        status: 'PENDING',
      });
      expect(result).toEqual({
        user: { id: 'user1', email: 'boo@example.com', name: 'Boo', role: 'USER', status: 'PENDING' },
        message: 'Registration pending approval',
      });
    });

    it('rejects an email that already exists', async () => {
      const deps = createDeps();
      deps.usersRepository.findByEmail.mockResolvedValue(createUser());
      const service = createAuthService(deps);

      await expect(
        service.register({ email: 'boo@example.com', password: 'password123', name: 'Boo' }),
      ).rejects.toMatchObject({ statusCode: 409, message: 'Email already exists' });
      expect(deps.usersRepository.create).not.toHaveBeenCalled();
    });

    it('maps a duplicate-at-create race to the same conflict', async () => {
      const deps = createDeps();
      deps.usersRepository.findByEmail.mockResolvedValue(null);
      deps.passwordHasher.hash.mockResolvedValue('new-hash');
      deps.usersRepository.create.mockRejectedValue(new EmailAlreadyInUseError());
      const service = createAuthService(deps);

      await expect(
        service.register({ email: 'boo@example.com', password: 'password123', name: 'Boo' }),
      ).rejects.toMatchObject({ statusCode: 409, message: 'Email already exists' });
    });
  });

  describe('login', () => {
    it('rejects unknown emails', async () => {
      const deps = createDeps();
      deps.usersRepository.findByEmail.mockResolvedValue(null);
      const service = createAuthService(deps);

      await expect(
        service.login({ email: 'missing@example.com', password: 'password123' }),
      ).rejects.toMatchObject({ statusCode: 401, message: 'Invalid credentials' });
    });

    it('rejects wrong passwords', async () => {
      const deps = createDeps();
      deps.usersRepository.findByEmail.mockResolvedValue(createUser());
      deps.passwordHasher.compare.mockResolvedValue(false);
      const service = createAuthService(deps);

      await expect(
        service.login({ email: 'boo@example.com', password: 'wrong-pass' }),
      ).rejects.toMatchObject({ statusCode: 401, message: 'Invalid credentials' });
    });

    it('rejects pending accounts', async () => {
      const deps = createDeps();
      deps.usersRepository.findByEmail.mockResolvedValue(createUser({ status: 'PENDING' }));
      deps.passwordHasher.compare.mockResolvedValue(true);
      const service = createAuthService(deps);

      await expect(
        service.login({ email: 'boo@example.com', password: 'password123' }),
      ).rejects.toMatchObject({ statusCode: 403, message: 'Account pending approval' });
    });

    it('rejects rejected accounts', async () => {
      const deps = createDeps();
      deps.usersRepository.findByEmail.mockResolvedValue(createUser({ status: 'REJECTED' }));
      deps.passwordHasher.compare.mockResolvedValue(true);
      const service = createAuthService(deps);

      await expect(
        service.login({ email: 'boo@example.com', password: 'password123' }),
      ).rejects.toMatchObject({ statusCode: 403, message: 'Account rejected' });
    });

    it('returns the public user and an access token for approved accounts', async () => {
      const deps = createDeps();
      deps.usersRepository.findByEmail.mockResolvedValue(createUser());
      deps.passwordHasher.compare.mockResolvedValue(true);
      deps.tokenService.signAccessToken.mockReturnValue('access-token');
      const service = createAuthService(deps);

      const result = await service.login({ email: 'boo@example.com', password: 'password123' });

      expect(deps.passwordHasher.compare).toHaveBeenCalledWith('password123', 'stored-hash');
      expect(deps.tokenService.signAccessToken).toHaveBeenCalledWith({
        id: 'user1',
        email: 'boo@example.com',
        name: 'Boo',
        role: 'USER',
        status: 'APPROVED',
      });
      expect(result).toEqual({
        user: { id: 'user1', email: 'boo@example.com', name: 'Boo', role: 'USER', status: 'APPROVED' },
        accessToken: 'access-token',
      });
    });
  });
});
```

- [ ] **Step 2: Chạy spec, xác nhận fail**

Run: `pnpm --dir backend test -- auth.service.spec.ts`
Expected: FAIL (service hiện tại vẫn nhận `prisma`, gọi `deps.prisma.user...` trên mock không tồn tại).

- [ ] **Step 3: Viết lại `auth.service.ts`**

Thay toàn bộ nội dung file bằng:

```typescript
import type { BackendDeps } from '../../dependencies';
import { conflict, forbidden, unauthorized } from '../../errors';
import type { User } from '../users/users.model';
import { EmailAlreadyInUseError } from '../users/users.repository';
import type { AuthResponse, AuthUser, LoginInput, RegisterInput, RegisterResponse } from './auth.schema';

export type AuthService = {
  register(input: RegisterInput): Promise<RegisterResponse>;
  login(input: LoginInput): Promise<AuthResponse>;
};

type AuthServiceDeps = Pick<BackendDeps, 'usersRepository' | 'passwordHasher' | 'tokenService'>;

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
  };
}

export function createAuthService(deps: AuthServiceDeps): AuthService {
  return {
    async register(input) {
      const existing = await deps.usersRepository.findByEmail(input.email);
      if (existing) {
        throw conflict('Email already exists');
      }

      const passwordHash = await deps.passwordHasher.hash(input.password);

      try {
        const user = await deps.usersRepository.create({
          email: input.email,
          passwordHash,
          name: input.name,
          role: 'USER',
          status: 'PENDING',
        });

        return {
          user: toAuthUser(user),
          message: 'Registration pending approval',
        };
      } catch (error) {
        if (error instanceof EmailAlreadyInUseError) {
          throw conflict('Email already exists');
        }
        throw error;
      }
    },

    async login(input) {
      const user = await deps.usersRepository.findByEmail(input.email);
      if (!user) {
        throw unauthorized('Invalid credentials');
      }

      const valid = await deps.passwordHasher.compare(input.password, user.passwordHash);
      if (!valid) {
        throw unauthorized('Invalid credentials');
      }

      if (user.status === 'PENDING') {
        throw forbidden('Account pending approval');
      }

      if (user.status === 'REJECTED') {
        throw forbidden('Account rejected');
      }

      const authUser = toAuthUser(user);

      return {
        user: authUser,
        accessToken: deps.tokenService.signAccessToken(authUser),
      };
    },
  };
}
```

- [ ] **Step 4: Chạy spec, xác nhận pass**

Run: `pnpm --dir backend test -- auth.service.spec.ts`
Expected: PASS (8 test).

- [ ] **Step 5: Typecheck + full test + commit**

Run: `pnpm --dir backend typecheck && pnpm --dir backend test`
Expected: PASS toàn bộ.

```bash
git add backend/src/identity/auth
git commit -m "refactor(auth): route user persistence through shared users repository

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Module admin dùng usersRepository

**Files:**
- Modify: `backend/src/identity/admin/admin.service.ts` (viết lại toàn bộ)
- Test: `backend/src/identity/admin/admin.service.spec.ts` (viết lại toàn bộ)
- Modify: `backend/src/identity/admin/admin.router.spec.ts` (chỉ sửa stub `listByStatus`)
- Không sửa: `admin.router.ts`, `admin.controller.ts`, `admin.schema.ts`.

**Interfaces:**
- Consumes: `UsersRepository.listByStatus/updateStatus`, `User` (Task 1).
- Produces: `AdminService` — signature **không đổi**: `listUsers(query: ListAdminUsersQuery): Promise<AdminUserSummary[]>`, `approveUser(adminUserId, targetUserId): Promise<AdminUserSummary>`, `rejectUser(adminUserId, targetUserId): Promise<AdminUserSummary>`.

- [ ] **Step 1: Viết lại `admin.service.spec.ts` (fail trước)**

Thay toàn bộ nội dung file bằng:

```typescript
import type { User } from '../users/users.model';
import type { UsersRepository } from '../users/users.repository';
import { createAdminService } from './admin.service';

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user1',
    email: 'boo@example.com',
    name: 'Boo',
    role: 'USER',
    status: 'PENDING',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

function createDeps() {
  const usersRepository: jest.Mocked<UsersRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    listByStatus: jest.fn(),
    updateStatus: jest.fn(),
  };

  return { usersRepository };
}

describe('createAdminService', () => {
  it('lists users by status as ISO-dated summaries', async () => {
    const deps = createDeps();
    deps.usersRepository.listByStatus.mockResolvedValue([createUser()]);
    const service = createAdminService(deps);

    const users = await service.listUsers({ status: 'PENDING' });

    expect(deps.usersRepository.listByStatus).toHaveBeenCalledWith('PENDING');
    expect(users).toEqual([
      {
        id: 'user1',
        email: 'boo@example.com',
        name: 'Boo',
        role: 'USER',
        status: 'PENDING',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ]);
  });

  it('approves a user', async () => {
    const deps = createDeps();
    deps.usersRepository.updateStatus.mockResolvedValue(createUser({ status: 'APPROVED' }));
    const service = createAdminService(deps);

    await expect(service.approveUser('admin1', 'user1')).resolves.toMatchObject({ status: 'APPROVED' });
    expect(deps.usersRepository.updateStatus).toHaveBeenCalledWith('user1', 'APPROVED');
  });

  it('reports a missing user on approve', async () => {
    const deps = createDeps();
    deps.usersRepository.updateStatus.mockResolvedValue(null);
    const service = createAdminService(deps);

    await expect(service.approveUser('admin1', 'missing')).rejects.toMatchObject({
      statusCode: 404,
      message: 'User not found',
    });
  });

  it('rejects a user', async () => {
    const deps = createDeps();
    deps.usersRepository.updateStatus.mockResolvedValue(createUser({ status: 'REJECTED' }));
    const service = createAdminService(deps);

    await expect(service.rejectUser('admin1', 'user1')).resolves.toMatchObject({ status: 'REJECTED' });
    expect(deps.usersRepository.updateStatus).toHaveBeenCalledWith('user1', 'REJECTED');
  });

  it('blocks admins from rejecting their own account', async () => {
    const deps = createDeps();
    const service = createAdminService(deps);

    await expect(service.rejectUser('admin1', 'admin1')).rejects.toMatchObject({
      statusCode: 400,
      message: 'Admin cannot reject their own account',
    });
    expect(deps.usersRepository.updateStatus).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy spec, xác nhận fail**

Run: `pnpm --dir backend test -- admin.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Viết lại `admin.service.ts`**

Thay toàn bộ nội dung file bằng:

```typescript
import type { BackendDeps } from '../../dependencies';
import { badRequest, notFound } from '../../errors';
import type { User } from '../users/users.model';
import type { AdminUserSummary, ListAdminUsersQuery } from './admin.schema';

export type AdminService = {
  listUsers(query: ListAdminUsersQuery): Promise<AdminUserSummary[]>;
  approveUser(adminUserId: string, targetUserId: string): Promise<AdminUserSummary>;
  rejectUser(adminUserId: string, targetUserId: string): Promise<AdminUserSummary>;
};

function toAdminUserSummary(user: User): AdminUserSummary {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function createAdminService(deps: Pick<BackendDeps, 'usersRepository'>): AdminService {
  async function updateUserStatus(
    targetUserId: string,
    status: 'APPROVED' | 'REJECTED',
  ): Promise<AdminUserSummary> {
    const user = await deps.usersRepository.updateStatus(targetUserId, status);
    if (!user) {
      throw notFound('User not found');
    }

    return toAdminUserSummary(user);
  }

  return {
    async listUsers(query) {
      const users = await deps.usersRepository.listByStatus(query.status);
      return users.map(toAdminUserSummary);
    },

    async approveUser(_adminUserId, targetUserId) {
      return updateUserStatus(targetUserId, 'APPROVED');
    },

    async rejectUser(adminUserId, targetUserId) {
      if (adminUserId === targetUserId) {
        throw badRequest('Admin cannot reject their own account');
      }

      return updateUserStatus(targetUserId, 'REJECTED');
    },
  };
}
```

- [ ] **Step 4: Sửa stub trong `admin.router.spec.ts`**

Trong `createDepsMock`, đổi dòng `listByStatus: jest.fn(),` (đã thêm ở Task 1) thành:

```typescript
      listByStatus: jest.fn().mockResolvedValue([]),
```

(Test 200 của router expect body `[]` — service giờ đọc qua repository. Mock `prisma.user.findMany` cũ trở nên thừa nhưng giữ nguyên tới Task 4.)

- [ ] **Step 5: Chạy spec, xác nhận pass**

Run: `pnpm --dir backend test -- admin`
Expected: PASS cả `admin.service.spec.ts` lẫn `admin.router.spec.ts`.

- [ ] **Step 6: Typecheck + full test + commit**

Run: `pnpm --dir backend typecheck && pnpm --dir backend test`
Expected: PASS toàn bộ.

```bash
git add backend/src/identity/admin
git commit -m "refactor(admin): route user persistence through shared users repository

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Middleware requireAuth dùng usersRepository

**Files:**
- Modify: `backend/src/middleware/auth.ts` (chỉ hàm `requireAuth`)
- Test: `backend/src/middleware/auth.spec.ts` (viết lại phần deps mock)
- Modify: `backend/src/identity/admin/admin.router.spec.ts` (chuyển mock user sang `usersRepository.findById`, dọn mock prisma)
- Modify: `backend/src/finance/groups/groups.router.spec.ts` (chuyển mock auth sang `usersRepository.findById`)
- Không sửa: `requireAdmin` (không đụng DB), mọi router (structural typing).

**Interfaces:**
- Consumes: `UsersRepository.findById` (Task 1).
- Produces: `requireAuth(deps: Pick<BackendDeps, 'usersRepository' | 'tokenService'>)` — hành vi HTTP không đổi (401 khi thiếu token/token sai/user không tồn tại/status khác APPROVED; gắn `req.user` 5 field như cũ).

- [ ] **Step 1: Viết lại `middleware/auth.spec.ts` (fail trước)**

Thay toàn bộ nội dung file bằng:

```typescript
import { requireAdmin, requireAuth } from './auth';

function createResponseMock() {
  return {} as any;
}

function createNextMock() {
  return jest.fn();
}

function createDepsMock(user: unknown) {
  return {
    tokenService: {
      verifyAccessToken: jest.fn().mockReturnValue({ sub: 'user1', email: 'boo@example.com' }),
    },
    usersRepository: {
      findById: jest.fn().mockResolvedValue(user),
    },
  };
}

function createRequestMock(token = 'token') {
  return {
    header: jest.fn((name: string) => (name.toLowerCase() === 'authorization' ? `Bearer ${token}` : undefined)),
  } as any;
}

describe('requireAuth', () => {
  it('attaches approved user with role and status', async () => {
    const deps = createDepsMock({
      id: 'user1',
      email: 'boo@example.com',
      name: 'Boo',
      role: 'USER',
      status: 'APPROVED',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const req = createRequestMock();
    const next = createNextMock();

    await requireAuth(deps as any)(req, createResponseMock(), next);

    expect(deps.usersRepository.findById).toHaveBeenCalledWith('user1');
    expect(req.user).toEqual({
      id: 'user1',
      email: 'boo@example.com',
      name: 'Boo',
      role: 'USER',
      status: 'APPROVED',
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a valid token when the user is pending', async () => {
    const deps = createDepsMock({
      id: 'user1',
      email: 'boo@example.com',
      name: 'Boo',
      role: 'USER',
      status: 'PENDING',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const req = createRequestMock();
    const next = createNextMock();

    await requireAuth(deps as any)(req, createResponseMock(), next);

    expect(req.user).toBeUndefined();
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401, message: 'Unauthorized' });
  });

  it('rejects a valid token when the user no longer exists', async () => {
    const deps = createDepsMock(null);
    const req = createRequestMock();
    const next = createNextMock();

    await requireAuth(deps as any)(req, createResponseMock(), next);

    expect(req.user).toBeUndefined();
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 401, message: 'Unauthorized' });
  });
});

describe('requireAdmin', () => {
  it('allows approved admins', () => {
    const req = {
      user: { id: 'admin1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', status: 'APPROVED' },
    } as any;
    const next = createNextMock();

    requireAdmin()(req, createResponseMock(), next);

    expect(next).toHaveBeenCalledWith();
  });

  it('rejects approved non-admin users', () => {
    const req = {
      user: { id: 'user1', email: 'boo@example.com', name: 'Boo', role: 'USER', status: 'APPROVED' },
    } as any;
    const next = createNextMock();

    requireAdmin()(req, createResponseMock(), next);

    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403, message: 'Admin access required' });
  });
});
```

- [ ] **Step 2: Chạy spec, xác nhận fail**

Run: `pnpm --dir backend test -- middleware/auth.spec.ts`
Expected: FAIL (middleware vẫn gọi `deps.prisma.user.findUnique` — mock không có).

- [ ] **Step 3: Sửa `requireAuth` trong `middleware/auth.ts`**

Đổi signature deps và phần load user (giữ nguyên generic params, `requireAdmin`, khối try/catch):

```typescript
export function requireAuth<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = unknown,
  Locals extends Record<string, any> = Record<string, any>,
>(deps: Pick<BackendDeps, 'usersRepository' | 'tokenService'>): RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> {
  return async (req: Request<P, ResBody, ReqBody, ReqQuery, Locals>, _res: Response, next: NextFunction) => {
    try {
      const header = req.header('authorization');
      const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
      if (!token) {
        throw unauthorized('Unauthorized');
      }

      const payload = deps.tokenService.verifyAccessToken(token);
      const user = await deps.usersRepository.findById(payload.sub);
      if (!user || user.status !== 'APPROVED') {
        throw unauthorized('Unauthorized');
      }

      req.user = { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status };
      next();
    } catch {
      next(unauthorized('Unauthorized'));
    }
  };
}
```

- [ ] **Step 4: Chuyển mock auth trong `admin.router.spec.ts`**

Trong `createDepsMock(user)`: đổi block `prisma` thành `prisma: {} as any,` và đổi stub `findById: jest.fn(),` thành `findById: jest.fn().mockResolvedValue(user),`.

- [ ] **Step 5: Chuyển mock auth trong `groups.router.spec.ts`**

Hai chỗ đang gọi `prisma.user.findUnique.mockResolvedValue({ id: 'user1', ... })` (test "validates create group body" và "lists groups for approved user") thay bằng:

```typescript
    (deps.usersRepository.findById as jest.Mock).mockResolvedValue({
      id: 'user1',
      email: 'boo@example.com',
      name: 'Boo',
      role: 'USER',
      status: 'APPROVED',
      createdAt: new Date('2026-06-14T00:00:00.000Z'),
      updatedAt: new Date('2026-06-14T00:00:00.000Z'),
    });
```

(Biến `deps` đã có sẵn trong 2 test đó; xoá `user: { findUnique: jest.fn() }` khỏi `createPrismaMock` vì không còn chỗ dùng.)

- [ ] **Step 6: Chạy spec, xác nhận pass**

Run: `pnpm --dir backend test -- middleware admin.router groups.router`
Expected: PASS cả 3 file.

- [ ] **Step 7: Typecheck + full test + commit**

Run: `pnpm --dir backend typecheck && pnpm --dir backend test`
Expected: PASS toàn bộ. (`auth.router` dùng `requireAuth(deps)` với `BackendDeps` đầy đủ nên không phải sửa.)

```bash
git add backend/src/middleware backend/src/identity/admin/admin.router.spec.ts backend/src/finance/groups/groups.router.spec.ts
git commit -m "refactor(middleware): requireAuth loads users via shared users repository

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Module finance/categories

**Files:**
- Create: `backend/src/finance/categories/categories.model.ts`
- Create: `backend/src/finance/categories/categories.repository.ts`
- Create: `backend/src/finance/categories/categories.prisma.repository.ts`
- Test: `backend/src/finance/categories/categories.prisma.repository.spec.ts`
- Modify: `backend/src/finance/categories/categories.service.ts` (viết lại), `categories.service.spec.ts` (viết lại), `categories.router.ts` (wiring)

**Interfaces:**
- Produces (Task 6/7/9/10 dùng): type `FinanceCategory` (categories.model); hàm mapper **export** `toFinanceCategory(category: PrismaFinanceCategory): FinanceCategory` (categories.prisma.repository); interface `FinanceCategoriesRepository`; class `DuplicateFinanceCategoryError`.
- `FinanceCategoriesService` signature không đổi (5 method: `ensureDefaults`, `list`, `create`, `update`, `remove`) nhưng kiểu trả về đổi từ Prisma `FinanceCategory` sang model `FinanceCategory` (shape wire y hệt — không có Decimal).

- [ ] **Step 1: Tạo `categories.model.ts`**

```typescript
export type FinanceCategory = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isSystemCategory: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateFinanceCategoryData = {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
  isSystemCategory: boolean;
};

export type UpdateFinanceCategoryData = {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
};
```

- [ ] **Step 2: Tạo `categories.repository.ts`**

```typescript
import type { CreateFinanceCategoryData, FinanceCategory, UpdateFinanceCategoryData } from './categories.model';

export class DuplicateFinanceCategoryError extends Error {
  constructor() {
    super('Finance category name already exists for this user');
    this.name = 'DuplicateFinanceCategoryError';
  }
}

export interface FinanceCategoriesRepository {
  listByUser(userId: string): Promise<FinanceCategory[]>;
  findDefaultsByNames(userId: string, names: string[]): Promise<string[]>;
  create(userId: string, data: CreateFinanceCategoryData): Promise<FinanceCategory>;
  updateForUser(userId: string, id: string, data: UpdateFinanceCategoryData): Promise<FinanceCategory | null>;
  deleteForUser(userId: string, id: string): Promise<boolean>;
}
```

- [ ] **Step 3: Viết `categories.prisma.repository.spec.ts` (fail trước)**

```typescript
import { Prisma, type PrismaClient } from '@prisma/client';
import { DuplicateFinanceCategoryError } from './categories.repository';
import { createPrismaFinanceCategoriesRepository } from './categories.prisma.repository';

function createPrismaMock() {
  return {
    financeCategory: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

function createCategoryRow(overrides: Record<string, unknown> = {}) {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'cat1',
    userId: 'user1',
    name: 'Ăn uống',
    description: null,
    icon: '🍜',
    color: '#ef4444',
    isSystemCategory: true,
    displayOrder: 0,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function duplicateError() {
  return new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' });
}

function createRepository(prisma: ReturnType<typeof createPrismaMock>) {
  return createPrismaFinanceCategoriesRepository(prisma as unknown as PrismaClient);
}

describe('createPrismaFinanceCategoriesRepository', () => {
  it('lists user categories ordered by display order then name', async () => {
    const prisma = createPrismaMock();
    prisma.financeCategory.findMany.mockResolvedValue([createCategoryRow()]);
    const repository = createRepository(prisma);

    const categories = await repository.listByUser('user1');

    expect(prisma.financeCategory.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
    expect(categories).toEqual([expect.objectContaining({ id: 'cat1', name: 'Ăn uống' })]);
  });

  it('returns only the names that already exist for the user', async () => {
    const prisma = createPrismaMock();
    prisma.financeCategory.findMany.mockResolvedValue([{ name: 'Ăn uống' }]);
    const repository = createRepository(prisma);

    await expect(repository.findDefaultsByNames('user1', ['Ăn uống', 'Đi lại'])).resolves.toEqual(['Ăn uống']);
    expect(prisma.financeCategory.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1', name: { in: ['Ăn uống', 'Đi lại'] } },
      select: { name: true },
    });
  });

  it('creates a category for the user and translates P2002', async () => {
    const prisma = createPrismaMock();
    prisma.financeCategory.create.mockResolvedValue(createCategoryRow());
    const repository = createRepository(prisma);
    const data = { name: 'Ăn uống', icon: '🍜', color: '#ef4444', displayOrder: 0, isSystemCategory: true };

    await expect(repository.create('user1', data)).resolves.toMatchObject({ id: 'cat1' });
    expect(prisma.financeCategory.create).toHaveBeenCalledWith({ data: { ...data, userId: 'user1' } });

    prisma.financeCategory.create.mockRejectedValue(duplicateError());
    await expect(repository.create('user1', data)).rejects.toBeInstanceOf(DuplicateFinanceCategoryError);
  });

  it('updates scoped by user and returns null when nothing matched', async () => {
    const prisma = createPrismaMock();
    prisma.financeCategory.updateMany.mockResolvedValue({ count: 1 });
    prisma.financeCategory.findFirst.mockResolvedValue(createCategoryRow({ name: 'Cafe' }));
    const repository = createRepository(prisma);

    await expect(repository.updateForUser('user1', 'cat1', { name: 'Cafe' })).resolves.toMatchObject({ name: 'Cafe' });
    expect(prisma.financeCategory.updateMany).toHaveBeenCalledWith({
      where: { id: 'cat1', userId: 'user1' },
      data: { name: 'Cafe' },
    });

    prisma.financeCategory.updateMany.mockResolvedValue({ count: 0 });
    await expect(repository.updateForUser('user1', 'missing', { name: 'Cafe' })).resolves.toBeNull();

    prisma.financeCategory.updateMany.mockRejectedValue(duplicateError());
    await expect(repository.updateForUser('user1', 'cat1', { name: 'Cafe' })).rejects.toBeInstanceOf(
      DuplicateFinanceCategoryError,
    );
  });

  it('maps the delete count to a boolean', async () => {
    const prisma = createPrismaMock();
    prisma.financeCategory.deleteMany.mockResolvedValue({ count: 1 });
    const repository = createRepository(prisma);

    await expect(repository.deleteForUser('user1', 'cat1')).resolves.toBe(true);
    expect(prisma.financeCategory.deleteMany).toHaveBeenCalledWith({ where: { id: 'cat1', userId: 'user1' } });

    prisma.financeCategory.deleteMany.mockResolvedValue({ count: 0 });
    await expect(repository.deleteForUser('user1', 'missing')).resolves.toBe(false);
  });
});
```

Run: `pnpm --dir backend test -- categories.prisma.repository.spec.ts` → Expected: FAIL (module chưa tồn tại).

- [ ] **Step 4: Tạo `categories.prisma.repository.ts`**

```typescript
import { Prisma, type FinanceCategory as PrismaFinanceCategory, type PrismaClient } from '@prisma/client';
import type { FinanceCategory } from './categories.model';
import { DuplicateFinanceCategoryError, type FinanceCategoriesRepository } from './categories.repository';

export function toFinanceCategory(category: PrismaFinanceCategory): FinanceCategory {
  return {
    id: category.id,
    userId: category.userId,
    name: category.name,
    description: category.description,
    icon: category.icon,
    color: category.color,
    isSystemCategory: category.isSystemCategory,
    displayOrder: category.displayOrder,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export function createPrismaFinanceCategoriesRepository(prisma: PrismaClient): FinanceCategoriesRepository {
  return {
    async listByUser(userId) {
      const categories = await prisma.financeCategory.findMany({
        where: { userId },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      });

      return categories.map(toFinanceCategory);
    },

    async findDefaultsByNames(userId, names) {
      const categories = await prisma.financeCategory.findMany({
        where: { userId, name: { in: names } },
        select: { name: true },
      });

      return categories.map((category) => category.name);
    },

    async create(userId, data) {
      try {
        return toFinanceCategory(await prisma.financeCategory.create({ data: { ...data, userId } }));
      } catch (error) {
        if (isUniqueConstraintError(error)) throw new DuplicateFinanceCategoryError();
        throw error;
      }
    },

    async updateForUser(userId, id, data) {
      let result: { count: number };
      try {
        result = await prisma.financeCategory.updateMany({ where: { id, userId }, data });
      } catch (error) {
        if (isUniqueConstraintError(error)) throw new DuplicateFinanceCategoryError();
        throw error;
      }
      if (result.count === 0) return null;

      const category = await prisma.financeCategory.findFirst({ where: { id, userId } });
      return category ? toFinanceCategory(category) : null;
    },

    async deleteForUser(userId, id) {
      const result = await prisma.financeCategory.deleteMany({ where: { id, userId } });
      return result.count > 0;
    },
  };
}
```

Run: `pnpm --dir backend test -- categories.prisma.repository.spec.ts` → Expected: PASS (5 test).

- [ ] **Step 5: Viết lại `categories.service.spec.ts` (fail trước)**

Thay toàn bộ nội dung file bằng:

```typescript
import type { FinanceCategory } from './categories.model';
import { DuplicateFinanceCategoryError, type FinanceCategoriesRepository } from './categories.repository';
import { createFinanceCategoriesService, DEFAULT_FINANCE_CATEGORIES } from './categories.service';

function createCategory(overrides: Partial<FinanceCategory> = {}): FinanceCategory {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'cat1',
    userId: 'user1',
    name: 'Ăn uống',
    description: null,
    icon: '🍜',
    color: '#ef4444',
    isSystemCategory: false,
    displayOrder: 0,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function createRepositoryMock(): jest.Mocked<FinanceCategoriesRepository> {
  return {
    listByUser: jest.fn(),
    findDefaultsByNames: jest.fn(),
    create: jest.fn(),
    updateForUser: jest.fn(),
    deleteForUser: jest.fn(),
  };
}

const ALL_DEFAULT_NAMES = DEFAULT_FINANCE_CATEGORIES.map((category) => category.name);

describe('createFinanceCategoriesService', () => {
  it('seeds only the missing default categories with their display order', async () => {
    const repository = createRepositoryMock();
    repository.findDefaultsByNames.mockResolvedValue(ALL_DEFAULT_NAMES.slice(1));
    repository.create.mockResolvedValue(createCategory());
    const service = createFinanceCategoriesService({ repository });

    await service.ensureDefaults('user1');

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith('user1', {
      ...DEFAULT_FINANCE_CATEGORIES[0],
      displayOrder: 0,
      isSystemCategory: true,
    });
  });

  it('ignores duplicate errors while seeding defaults', async () => {
    const repository = createRepositoryMock();
    repository.findDefaultsByNames.mockResolvedValue([]);
    repository.create.mockRejectedValue(new DuplicateFinanceCategoryError());
    const service = createFinanceCategoriesService({ repository });

    await expect(service.ensureDefaults('user1')).resolves.toBeUndefined();
    expect(repository.create).toHaveBeenCalledTimes(DEFAULT_FINANCE_CATEGORIES.length);
  });

  it('lists categories after seeding defaults', async () => {
    const repository = createRepositoryMock();
    repository.findDefaultsByNames.mockResolvedValue(ALL_DEFAULT_NAMES);
    const categories = [createCategory()];
    repository.listByUser.mockResolvedValue(categories);
    const service = createFinanceCategoriesService({ repository });

    await expect(service.list('user1')).resolves.toEqual(categories);
    expect(repository.findDefaultsByNames).toHaveBeenCalledWith('user1', ALL_DEFAULT_NAMES);
    expect(repository.listByUser).toHaveBeenCalledWith('user1');
  });

  it('creates a non-system category and maps duplicates to 409', async () => {
    const repository = createRepositoryMock();
    repository.findDefaultsByNames.mockResolvedValue(ALL_DEFAULT_NAMES);
    repository.create.mockResolvedValue(createCategory({ name: 'Cafe' }));
    const service = createFinanceCategoriesService({ repository });

    await expect(service.create('user1', { name: 'Cafe' })).resolves.toMatchObject({ name: 'Cafe' });
    expect(repository.create).toHaveBeenCalledWith('user1', { name: 'Cafe', isSystemCategory: false });

    repository.create.mockRejectedValue(new DuplicateFinanceCategoryError());
    await expect(service.create('user1', { name: 'Cafe' })).rejects.toMatchObject({
      statusCode: 409,
      message: 'Finance category already exists',
    });
  });

  it('updates a category and reports 404 when it does not exist', async () => {
    const repository = createRepositoryMock();
    repository.updateForUser.mockResolvedValue(createCategory({ name: 'Cafe' }));
    const service = createFinanceCategoriesService({ repository });

    await expect(service.update('user1', 'cat1', { name: 'Cafe' })).resolves.toMatchObject({ name: 'Cafe' });
    expect(repository.updateForUser).toHaveBeenCalledWith('user1', 'cat1', { name: 'Cafe' });

    repository.updateForUser.mockResolvedValue(null);
    await expect(service.update('user1', 'missing', { name: 'Cafe' })).rejects.toMatchObject({
      statusCode: 404,
      message: 'Finance category not found',
    });

    repository.updateForUser.mockRejectedValue(new DuplicateFinanceCategoryError());
    await expect(service.update('user1', 'cat1', { name: 'Cafe' })).rejects.toMatchObject({
      statusCode: 409,
      message: 'Finance category already exists',
    });
  });

  it('removes a category and reports 404 when nothing was deleted', async () => {
    const repository = createRepositoryMock();
    repository.deleteForUser.mockResolvedValue(true);
    const service = createFinanceCategoriesService({ repository });

    await expect(service.remove('user1', 'cat1')).resolves.toBeUndefined();

    repository.deleteForUser.mockResolvedValue(false);
    await expect(service.remove('user1', 'missing')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Finance category not found',
    });
  });
});
```

Run: `pnpm --dir backend test -- categories.service.spec.ts` → Expected: FAIL.

- [ ] **Step 6: Viết lại `categories.service.ts`**

Thay toàn bộ nội dung file bằng (danh sách 10 category mặc định giữ **nguyên văn** từ file cũ, export thêm để spec dùng):

```typescript
import { conflict, notFound } from '../../errors';
import type { FinanceCategory } from './categories.model';
import { DuplicateFinanceCategoryError, type FinanceCategoriesRepository } from './categories.repository';
import type { CreateFinanceCategoryInput, UpdateFinanceCategoryInput } from './categories.schema';

export const DEFAULT_FINANCE_CATEGORIES = [
  { name: 'Ăn uống', description: 'Nhà hàng, cà phê, đồ ăn, siêu thị thực phẩm', icon: '🍜', color: '#ef4444' },
  { name: 'Đi lại', description: 'Grab, taxi, xăng xe, vé xe, bảo dưỡng', icon: '🚕', color: '#f97316' },
  { name: 'Nhà ở', description: 'Thuê nhà, điện, nước, internet', icon: '🏠', color: '#eab308' },
  { name: 'Mua sắm cá nhân', description: 'Quần áo, mỹ phẩm, thiết bị cá nhân', icon: '🛍️', color: '#22c55e' },
  { name: 'Giải trí & du lịch', description: 'Phim, game, khách sạn, vé máy bay', icon: '🎬', color: '#06b6d4' },
  { name: 'Giáo dục & học tập', description: 'Sách, khóa học, học phí', icon: '📚', color: '#3b82f6' },
  { name: 'Sức khỏe & thể thao', description: 'Thuốc, bệnh viện, gym, yoga', icon: '💊', color: '#8b5cf6' },
  { name: 'Gia đình & quà tặng', description: 'Quà tặng, lễ tết, sinh nhật', icon: '🎁', color: '#ec4899' },
  { name: 'Đầu tư & tiết kiệm', description: 'Gửi tiết kiệm, đầu tư, ngân hàng', icon: '💰', color: '#14b8a6' },
  { name: 'Khác', description: 'Chi phí chưa thuộc nhóm nào', icon: '📌', color: '#64748b' },
] as const;

const DEFAULT_CATEGORY_NAMES = DEFAULT_FINANCE_CATEGORIES.map((category) => category.name);

export type FinanceCategoriesService = {
  ensureDefaults(userId: string): Promise<void>;
  list(userId: string): Promise<FinanceCategory[]>;
  create(userId: string, input: CreateFinanceCategoryInput): Promise<FinanceCategory>;
  update(userId: string, id: string, input: UpdateFinanceCategoryInput): Promise<FinanceCategory>;
  remove(userId: string, id: string): Promise<void>;
};

export function createFinanceCategoriesService(
  deps: { repository: FinanceCategoriesRepository },
): FinanceCategoriesService {
  async function ensureDefaults(userId: string): Promise<void> {
    const existingNames = new Set(await deps.repository.findDefaultsByNames(userId, [...DEFAULT_CATEGORY_NAMES]));

    for (const [index, category] of DEFAULT_FINANCE_CATEGORIES.entries()) {
      if (existingNames.has(category.name)) continue;

      try {
        await deps.repository.create(userId, { ...category, displayOrder: index, isSystemCategory: true });
      } catch (error) {
        if (!(error instanceof DuplicateFinanceCategoryError)) {
          throw error;
        }
      }
    }
  }

  return {
    ensureDefaults,

    async list(userId) {
      await ensureDefaults(userId);
      return deps.repository.listByUser(userId);
    },

    async create(userId, input) {
      await ensureDefaults(userId);
      try {
        return await deps.repository.create(userId, { ...input, isSystemCategory: false });
      } catch (error) {
        if (error instanceof DuplicateFinanceCategoryError) {
          throw conflict('Finance category already exists');
        }
        throw error;
      }
    },

    async update(userId, id, input) {
      let category: FinanceCategory | null;
      try {
        category = await deps.repository.updateForUser(userId, id, input);
      } catch (error) {
        if (error instanceof DuplicateFinanceCategoryError) {
          throw conflict('Finance category already exists');
        }
        throw error;
      }
      if (!category) throw notFound('Finance category not found');
      return category;
    },

    async remove(userId, id) {
      const deleted = await deps.repository.deleteForUser(userId, id);
      if (!deleted) throw notFound('Finance category not found');
    },
  };
}
```

- [ ] **Step 7: Wiring trong `categories.router.ts`**

Đổi phần khởi tạo (thêm 2 import tương ứng, bỏ import không dùng):

```typescript
import { createPrismaFinanceCategoriesRepository } from './categories.prisma.repository';
```

```typescript
  const repository = createPrismaFinanceCategoriesRepository(deps.prisma);
  const controller = createFinanceCategoriesController(createFinanceCategoriesService({ repository }));
```

- [ ] **Step 8: Chạy test module + typecheck + full test**

Run: `pnpm --dir backend test -- categories` → PASS cả 2 spec.
Run: `pnpm --dir backend typecheck && pnpm --dir backend test` → PASS toàn bộ.

- [ ] **Step 9: Commit**

```bash
git add backend/src/finance/categories
git commit -m "refactor(finance/categories): add repository and model layers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Budgets normalization — `limitAmount` → number, tái dùng categories.model

**Bối cảnh:** budgets là module mẫu (đã có 5 tầng từ Task 0). Task này chỉ (1) chuẩn hóa `limitAmount: string → number`, (2) thay type category nội bộ bằng `FinanceCategory` của categories.model, (3) export mapper cho groups/chat tái dùng.

**Files:**
- Modify: `backend/src/finance/budgets/budgets.model.ts`, `budgets.prisma.repository.ts`, `budgets.prisma.repository.spec.ts`, `budgets.service.spec.ts`
- Không sửa: `budgets.repository.ts`, `budgets.service.ts`, `budgets.router.ts`, `budgets.controller.ts`, `budgets.schema.ts`.

**Interfaces:**
- Consumes: `FinanceCategory` + `toFinanceCategory` (Task 5).
- Produces (Task 9/10 dùng): `FinanceBudget` với `limitAmount: number`, `category: FinanceCategory`; **export** `toFinanceBudget(budget: PrismaFinanceBudget): FinanceBudget` và `includeBudgetRelations` từ `budgets.prisma.repository.ts`.

- [ ] **Step 1: Cập nhật 2 spec trước (fail trước)**

Trong `budgets.service.spec.ts`, hàm `createBudget()`: đổi `limitAmount: '1000000',` thành `limitAmount: 1_000_000,`.

Trong `budgets.prisma.repository.spec.ts`, test mapping: đổi `limitAmount: '1000000',` (trong `expect.objectContaining`) thành `limitAmount: 1_000_000,`.

Run: `pnpm --dir backend test -- budgets` → Expected: FAIL (mapper vẫn trả string / type mismatch).

- [ ] **Step 2: Sửa `budgets.model.ts`**

Thay toàn bộ nội dung file bằng:

```typescript
import type { FinanceCategory } from '../categories/categories.model';

export const FINANCE_BUDGET_PERIODS = ['weekly', 'monthly', 'yearly'] as const;

export type FinanceBudgetPeriod = (typeof FINANCE_BUDGET_PERIODS)[number];

export type FinanceBudget = {
  id: string;
  userId: string;
  categoryId: string;
  limitAmount: number;
  period: FinanceBudgetPeriod;
  alertThreshold: number;
  createdAt: Date;
  updatedAt: Date;
  category: FinanceCategory;
};

export type UpsertFinanceBudgetData = {
  categoryId: string;
  period: FinanceBudgetPeriod;
  limitAmount: number;
  alertThreshold: number;
};
```

(Type `FinanceBudgetCategory` bị xoá — nếu typecheck báo nơi khác đang import nó, đổi nơi đó sang `FinanceCategory` từ `categories.model`.)

- [ ] **Step 3: Sửa `budgets.prisma.repository.ts`**

Thay toàn bộ nội dung file bằng:

```typescript
import type { Prisma, PrismaClient } from '@prisma/client';
import { toFinanceCategory } from '../categories/categories.prisma.repository';
import {
  FINANCE_BUDGET_PERIODS,
  type FinanceBudget,
  type FinanceBudgetPeriod,
} from './budgets.model';
import type { FinanceBudgetsRepository } from './budgets.repository';

export const includeBudgetRelations = { category: true } satisfies Prisma.FinanceBudgetInclude;

export type PrismaFinanceBudget = Prisma.FinanceBudgetGetPayload<{ include: typeof includeBudgetRelations }>;

function toFinanceBudgetPeriod(value: string): FinanceBudgetPeriod {
  if (FINANCE_BUDGET_PERIODS.includes(value as FinanceBudgetPeriod)) {
    return value as FinanceBudgetPeriod;
  }

  throw new Error(`Unsupported finance budget period: ${value}`);
}

export function toFinanceBudget(budget: PrismaFinanceBudget): FinanceBudget {
  return {
    id: budget.id,
    userId: budget.userId,
    categoryId: budget.categoryId,
    limitAmount: budget.limitAmount.toNumber(),
    period: toFinanceBudgetPeriod(budget.period),
    alertThreshold: budget.alertThreshold,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
    category: toFinanceCategory(budget.category),
  };
}

export function createPrismaFinanceBudgetsRepository(prisma: PrismaClient): FinanceBudgetsRepository {
  return {
    async listByUser(userId) {
      const budgets = await prisma.financeBudget.findMany({
        where: { userId },
        include: includeBudgetRelations,
        orderBy: { createdAt: 'desc' },
      });

      return budgets.map(toFinanceBudget);
    },

    async categoryExistsForUser(userId, categoryId) {
      const category = await prisma.financeCategory.findFirst({
        where: { id: categoryId, userId },
        select: { id: true },
      });

      return category !== null;
    },

    async upsert(userId, input) {
      const budget = await prisma.financeBudget.upsert({
        where: {
          userId_categoryId_period: {
            userId,
            categoryId: input.categoryId,
            period: input.period,
          },
        },
        update: {
          limitAmount: input.limitAmount,
          alertThreshold: input.alertThreshold,
        },
        create: {
          userId,
          categoryId: input.categoryId,
          period: input.period,
          limitAmount: input.limitAmount,
          alertThreshold: input.alertThreshold,
        },
        include: includeBudgetRelations,
      });

      return toFinanceBudget(budget);
    },

    async deleteByIdForUser(userId, budgetId) {
      const result = await prisma.financeBudget.deleteMany({
        where: { id: budgetId, userId },
      });

      return result.count > 0;
    },
  };
}
```

- [ ] **Step 4: Chạy test + typecheck backend, rồi frontend (wire đổi)**

Run: `pnpm --dir backend test -- budgets` → PASS.
Run: `pnpm --dir backend typecheck && pnpm --dir backend test` → PASS.
Run: `pnpm --dir frontend typecheck && pnpm --dir frontend test` → PASS (`parseMoney` nhận number sẵn).

- [ ] **Step 5: Commit**

```bash
git add backend/src/finance/budgets
git commit -m "refactor(finance/budgets)!: serialize limitAmount as JSON number

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Module finance/expenses (+ model FinanceInvoice dùng chung)

**Files:**
- Create: `backend/src/finance/invoices/invoices.model.ts` (chỉ types — Task 12 dùng tiếp)
- Create: `backend/src/finance/expenses/expenses.model.ts`
- Create: `backend/src/finance/expenses/expenses.repository.ts`
- Create: `backend/src/finance/expenses/expenses.prisma.repository.ts`
- Test: `backend/src/finance/expenses/expenses.prisma.repository.spec.ts`
- Modify: `expenses.service.ts` (viết lại), `expenses.service.spec.ts` (viết lại), `expenses.router.ts` (wiring)

**Interfaces:**
- Consumes: `FinanceCategory`/`toFinanceCategory` (Task 5).
- Produces (Task 8/9/10/12 dùng): `FinanceInvoice` (invoices.model); `FinanceExpense`, `CreateFinanceExpenseData`, `UpdateFinanceExpenseData` (expenses.model); **export** `toFinanceExpense`, `toFinanceInvoice`, `includeExpenseRelations` (expenses.prisma.repository); interface `FinanceExpensesRepository`.

- [ ] **Step 1: Tạo `invoices/invoices.model.ts`**

```typescript
export type FinanceInvoice = {
  id: string;
  userId: string;
  filename: string;
  filePath: string;
  storeName: string | null;
  purchasedAt: Date | null;
  totalAmount: number | null;
  extractedData: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};
```

- [ ] **Step 2: Tạo `expenses.model.ts`**

```typescript
import type { FinanceCategory } from '../categories/categories.model';
import type { FinanceInvoice } from '../invoices/invoices.model';

export type FinanceExpense = {
  id: string;
  userId: string;
  invoiceId: string | null;
  categoryId: string | null;
  description: string | null;
  merchantName: string | null;
  amount: number;
  spentAt: Date | null;
  confirmedByUser: boolean;
  sourceType: string;
  sourceMetadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  category: FinanceCategory | null;
  invoice: FinanceInvoice | null;
};

export type CreateFinanceExpenseData = {
  invoiceId?: string;
  categoryId?: string;
  description?: string;
  merchantName?: string;
  amount: number;
  spentAt?: Date;
  confirmedByUser?: boolean;
  sourceType: string;
  sourceMetadata?: unknown;
};

export type UpdateFinanceExpenseData = Partial<CreateFinanceExpenseData>;
```

- [ ] **Step 3: Tạo `expenses.repository.ts`**

```typescript
import type { CreateFinanceExpenseData, FinanceExpense, UpdateFinanceExpenseData } from './expenses.model';

export interface FinanceExpensesRepository {
  listByUser(userId: string): Promise<FinanceExpense[]>;
  createForUser(userId: string, data: CreateFinanceExpenseData): Promise<FinanceExpense>;
  updateForUser(userId: string, id: string, data: UpdateFinanceExpenseData): Promise<FinanceExpense | null>;
  deleteForUser(userId: string, id: string): Promise<boolean>;
  categoryExistsForUser(userId: string, categoryId: string): Promise<boolean>;
}
```

- [ ] **Step 4: Viết `expenses.prisma.repository.spec.ts` (fail trước)**

```typescript
import { Prisma, type PrismaClient } from '@prisma/client';
import { createPrismaFinanceExpensesRepository } from './expenses.prisma.repository';

function createPrismaMock() {
  return {
    financeExpense: {
      findMany: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    financeCategory: {
      findFirst: jest.fn(),
    },
  };
}

function createExpenseRow(overrides: Record<string, unknown> = {}) {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'exp1',
    userId: 'user1',
    invoiceId: 'inv1',
    categoryId: 'cat1',
    description: 'Cơm trưa',
    merchantName: 'Quán A',
    amount: new Prisma.Decimal('125000'),
    spentAt: new Date('2026-06-01T00:00:00.000Z'),
    confirmedByUser: true,
    sourceType: 'manual',
    sourceMetadata: null,
    createdAt,
    updatedAt: createdAt,
    category: {
      id: 'cat1',
      userId: 'user1',
      name: 'Ăn uống',
      description: null,
      icon: null,
      color: null,
      isSystemCategory: true,
      displayOrder: 0,
      createdAt,
      updatedAt: createdAt,
    },
    invoice: {
      id: 'inv1',
      userId: 'user1',
      filename: 'bill.png',
      filePath: 'uploads/bill.png',
      storeName: 'Quán A',
      purchasedAt: new Date('2026-06-01T00:00:00.000Z'),
      totalAmount: new Prisma.Decimal('125000'),
      extractedData: null,
      status: 'processed',
      createdAt,
      updatedAt: createdAt,
    },
    ...overrides,
  };
}

function createRepository(prisma: ReturnType<typeof createPrismaMock>) {
  return createPrismaFinanceExpensesRepository(prisma as unknown as PrismaClient);
}

describe('createPrismaFinanceExpensesRepository', () => {
  it('lists user expenses newest-spent first and maps money to numbers', async () => {
    const prisma = createPrismaMock();
    prisma.financeExpense.findMany.mockResolvedValue([createExpenseRow()]);
    const repository = createRepository(prisma);

    const expenses = await repository.listByUser('user1');

    expect(prisma.financeExpense.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      include: { category: true, invoice: true },
      orderBy: { spentAt: 'desc' },
    });
    expect(expenses[0]).toMatchObject({
      id: 'exp1',
      amount: 125000,
      category: expect.objectContaining({ name: 'Ăn uống' }),
      invoice: expect.objectContaining({ totalAmount: 125000 }),
    });
  });

  it('creates an expense for the user with json metadata passthrough', async () => {
    const prisma = createPrismaMock();
    prisma.financeExpense.create.mockResolvedValue(createExpenseRow());
    const repository = createRepository(prisma);
    const spentAt = new Date('2026-06-01T00:00:00.000Z');

    await repository.createForUser('user1', {
      categoryId: 'cat1',
      amount: 125000,
      spentAt,
      sourceType: 'manual',
      sourceMetadata: { note: 'x' },
    });

    expect(prisma.financeExpense.create).toHaveBeenCalledWith({
      data: {
        categoryId: 'cat1',
        amount: 125000,
        spentAt,
        sourceType: 'manual',
        sourceMetadata: { note: 'x' },
        userId: 'user1',
      },
      include: { category: true, invoice: true },
    });
  });

  it('updates scoped by user and returns the refreshed expense', async () => {
    const prisma = createPrismaMock();
    prisma.financeExpense.updateMany.mockResolvedValue({ count: 1 });
    prisma.financeExpense.findFirst.mockResolvedValue(createExpenseRow({ description: 'Cơm tối' }));
    const repository = createRepository(prisma);

    await expect(repository.updateForUser('user1', 'exp1', { description: 'Cơm tối' })).resolves.toMatchObject({
      description: 'Cơm tối',
    });
    expect(prisma.financeExpense.updateMany).toHaveBeenCalledWith({
      where: { id: 'exp1', userId: 'user1' },
      data: { description: 'Cơm tối' },
    });
    expect(prisma.financeExpense.findFirst).toHaveBeenCalledWith({
      where: { id: 'exp1', userId: 'user1' },
      include: { category: true, invoice: true },
    });

    prisma.financeExpense.updateMany.mockResolvedValue({ count: 0 });
    await expect(repository.updateForUser('user1', 'missing', { description: 'x' })).resolves.toBeNull();
  });

  it('maps the delete count to a boolean', async () => {
    const prisma = createPrismaMock();
    prisma.financeExpense.deleteMany.mockResolvedValue({ count: 1 });
    const repository = createRepository(prisma);

    await expect(repository.deleteForUser('user1', 'exp1')).resolves.toBe(true);
    expect(prisma.financeExpense.deleteMany).toHaveBeenCalledWith({ where: { id: 'exp1', userId: 'user1' } });

    prisma.financeExpense.deleteMany.mockResolvedValue({ count: 0 });
    await expect(repository.deleteForUser('user1', 'missing')).resolves.toBe(false);
  });

  it('checks category ownership', async () => {
    const prisma = createPrismaMock();
    prisma.financeCategory.findFirst.mockResolvedValue({ id: 'cat1' });
    const repository = createRepository(prisma);

    await expect(repository.categoryExistsForUser('user1', 'cat1')).resolves.toBe(true);
    expect(prisma.financeCategory.findFirst).toHaveBeenCalledWith({
      where: { id: 'cat1', userId: 'user1' },
      select: { id: true },
    });

    prisma.financeCategory.findFirst.mockResolvedValue(null);
    await expect(repository.categoryExistsForUser('user1', 'missing')).resolves.toBe(false);
  });
});
```

Run: `pnpm --dir backend test -- expenses.prisma.repository.spec.ts` → Expected: FAIL.

- [ ] **Step 5: Tạo `expenses.prisma.repository.ts`**

```typescript
import type { FinanceInvoice as PrismaFinanceInvoice, Prisma, PrismaClient } from '@prisma/client';
import { toFinanceCategory } from '../categories/categories.prisma.repository';
import type { FinanceInvoice } from '../invoices/invoices.model';
import type { FinanceExpense } from './expenses.model';
import type { FinanceExpensesRepository } from './expenses.repository';

export const includeExpenseRelations = { category: true, invoice: true } satisfies Prisma.FinanceExpenseInclude;

export type PrismaFinanceExpense = Prisma.FinanceExpenseGetPayload<{ include: typeof includeExpenseRelations }>;

export function toFinanceInvoice(invoice: PrismaFinanceInvoice): FinanceInvoice {
  return {
    id: invoice.id,
    userId: invoice.userId,
    filename: invoice.filename,
    filePath: invoice.filePath,
    storeName: invoice.storeName,
    purchasedAt: invoice.purchasedAt,
    totalAmount: invoice.totalAmount === null ? null : invoice.totalAmount.toNumber(),
    extractedData: invoice.extractedData,
    status: invoice.status,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
}

export function toFinanceExpense(expense: PrismaFinanceExpense): FinanceExpense {
  return {
    id: expense.id,
    userId: expense.userId,
    invoiceId: expense.invoiceId,
    categoryId: expense.categoryId,
    description: expense.description,
    merchantName: expense.merchantName,
    amount: expense.amount.toNumber(),
    spentAt: expense.spentAt,
    confirmedByUser: expense.confirmedByUser,
    sourceType: expense.sourceType,
    sourceMetadata: expense.sourceMetadata,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
    category: expense.category ? toFinanceCategory(expense.category) : null,
    invoice: expense.invoice ? toFinanceInvoice(expense.invoice) : null,
  };
}

function toExpenseWriteData<T extends { sourceMetadata?: unknown }>(data: T) {
  return { ...data, sourceMetadata: data.sourceMetadata as Prisma.InputJsonValue | undefined };
}

export function createPrismaFinanceExpensesRepository(prisma: PrismaClient): FinanceExpensesRepository {
  return {
    async listByUser(userId) {
      const expenses = await prisma.financeExpense.findMany({
        where: { userId },
        include: includeExpenseRelations,
        orderBy: { spentAt: 'desc' },
      });

      return expenses.map(toFinanceExpense);
    },

    async createForUser(userId, data) {
      const expense = await prisma.financeExpense.create({
        data: { ...toExpenseWriteData(data), userId } as Prisma.FinanceExpenseUncheckedCreateInput,
        include: includeExpenseRelations,
      });

      return toFinanceExpense(expense);
    },

    async updateForUser(userId, id, data) {
      const result = await prisma.financeExpense.updateMany({
        where: { id, userId },
        data: toExpenseWriteData(data) as Prisma.FinanceExpenseUncheckedUpdateInput,
      });
      if (result.count === 0) return null;

      const expense = await prisma.financeExpense.findFirst({
        where: { id, userId },
        include: includeExpenseRelations,
      });

      return expense ? toFinanceExpense(expense) : null;
    },

    async deleteForUser(userId, id) {
      const result = await prisma.financeExpense.deleteMany({ where: { id, userId } });
      return result.count > 0;
    },

    async categoryExistsForUser(userId, categoryId) {
      const category = await prisma.financeCategory.findFirst({
        where: { id: categoryId, userId },
        select: { id: true },
      });

      return category !== null;
    },
  };
}
```

Run: `pnpm --dir backend test -- expenses.prisma.repository.spec.ts` → Expected: PASS (5 test).

- [ ] **Step 6: Viết lại `expenses.service.spec.ts` (fail trước)**

Thay toàn bộ nội dung file bằng:

```typescript
import type { FinanceExpense } from './expenses.model';
import type { FinanceExpensesRepository } from './expenses.repository';
import { createFinanceExpensesService } from './expenses.service';

function createExpense(overrides: Partial<FinanceExpense> = {}): FinanceExpense {
  const createdAt = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'exp1',
    userId: 'user1',
    invoiceId: null,
    categoryId: 'cat1',
    description: 'Cơm trưa',
    merchantName: null,
    amount: 125000,
    spentAt: new Date('2026-06-01T00:00:00.000Z'),
    confirmedByUser: true,
    sourceType: 'manual',
    sourceMetadata: null,
    createdAt,
    updatedAt: createdAt,
    category: null,
    invoice: null,
    ...overrides,
  };
}

function createRepositoryMock(): jest.Mocked<FinanceExpensesRepository> {
  return {
    listByUser: jest.fn(),
    createForUser: jest.fn(),
    updateForUser: jest.fn(),
    deleteForUser: jest.fn(),
    categoryExistsForUser: jest.fn(),
  };
}

describe('createFinanceExpensesService', () => {
  it('lists expenses through the repository', async () => {
    const repository = createRepositoryMock();
    const expenses = [createExpense()];
    repository.listByUser.mockResolvedValue(expenses);
    const service = createFinanceExpensesService({ repository });

    await expect(service.list('user1')).resolves.toEqual(expenses);
    expect(repository.listByUser).toHaveBeenCalledWith('user1');
  });

  it('creates an expense, converting spentAt to a Date', async () => {
    const repository = createRepositoryMock();
    repository.categoryExistsForUser.mockResolvedValue(true);
    repository.createForUser.mockResolvedValue(createExpense());
    const service = createFinanceExpensesService({ repository });

    await service.create('user1', {
      categoryId: 'cat1',
      amount: 125000,
      spentAt: '2026-06-01T00:00:00.000Z',
      sourceType: 'manual',
    });

    expect(repository.categoryExistsForUser).toHaveBeenCalledWith('user1', 'cat1');
    expect(repository.createForUser).toHaveBeenCalledWith('user1', {
      categoryId: 'cat1',
      amount: 125000,
      spentAt: new Date('2026-06-01T00:00:00.000Z'),
      sourceType: 'manual',
    });
  });

  it('rejects a create when the category is not owned by the user', async () => {
    const repository = createRepositoryMock();
    repository.categoryExistsForUser.mockResolvedValue(false);
    const service = createFinanceExpensesService({ repository });

    await expect(
      service.create('user1', { categoryId: 'cat9', amount: 1000, sourceType: 'manual' }),
    ).rejects.toMatchObject({ statusCode: 404, message: 'Finance category not found' });
    expect(repository.createForUser).not.toHaveBeenCalled();
  });

  it('skips the ownership check when no category is provided', async () => {
    const repository = createRepositoryMock();
    repository.createForUser.mockResolvedValue(createExpense({ categoryId: null }));
    const service = createFinanceExpensesService({ repository });

    await service.create('user1', { amount: 1000, sourceType: 'manual' });

    expect(repository.categoryExistsForUser).not.toHaveBeenCalled();
  });

  it('updates an expense and reports 404 when it does not exist', async () => {
    const repository = createRepositoryMock();
    repository.updateForUser.mockResolvedValue(createExpense({ description: 'Cơm tối' }));
    const service = createFinanceExpensesService({ repository });

    await expect(service.update('user1', 'exp1', { description: 'Cơm tối' })).resolves.toMatchObject({
      description: 'Cơm tối',
    });
    expect(repository.updateForUser).toHaveBeenCalledWith('user1', 'exp1', {
      description: 'Cơm tối',
      spentAt: undefined,
    });

    repository.updateForUser.mockResolvedValue(null);
    await expect(service.update('user1', 'missing', { description: 'x' })).rejects.toMatchObject({
      statusCode: 404,
      message: 'Finance expense not found',
    });
  });

  it('removes an expense and reports 404 when nothing was deleted', async () => {
    const repository = createRepositoryMock();
    repository.deleteForUser.mockResolvedValue(true);
    const service = createFinanceExpensesService({ repository });

    await expect(service.remove('user1', 'exp1')).resolves.toBeUndefined();
    expect(repository.deleteForUser).toHaveBeenCalledWith('user1', 'exp1');

    repository.deleteForUser.mockResolvedValue(false);
    await expect(service.remove('user1', 'missing')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Finance expense not found',
    });
  });
});
```

Run: `pnpm --dir backend test -- expenses.service.spec.ts` → Expected: FAIL.

- [ ] **Step 7: Viết lại `expenses.service.ts`**

Thay toàn bộ nội dung file bằng:

```typescript
import { notFound } from '../../errors';
import type { CreateFinanceExpenseData, FinanceExpense, UpdateFinanceExpenseData } from './expenses.model';
import type { FinanceExpensesRepository } from './expenses.repository';
import type { CreateFinanceExpenseInput, UpdateFinanceExpenseInput } from './expenses.schema';

export type FinanceExpensesService = {
  list(userId: string): Promise<FinanceExpense[]>;
  create(userId: string, input: CreateFinanceExpenseInput): Promise<FinanceExpense>;
  update(userId: string, id: string, input: UpdateFinanceExpenseInput): Promise<FinanceExpense>;
  remove(userId: string, id: string): Promise<void>;
};

function toCreateData(input: CreateFinanceExpenseInput): CreateFinanceExpenseData {
  return { ...input, spentAt: input.spentAt ? new Date(input.spentAt) : undefined };
}

function toUpdateData(input: UpdateFinanceExpenseInput): UpdateFinanceExpenseData {
  return { ...input, spentAt: input.spentAt ? new Date(input.spentAt) : undefined };
}

export function createFinanceExpensesService(
  deps: { repository: FinanceExpensesRepository },
): FinanceExpensesService {
  async function assertCategoryOwnership(userId: string, categoryId?: string): Promise<void> {
    if (!categoryId) return;
    const exists = await deps.repository.categoryExistsForUser(userId, categoryId);
    if (!exists) throw notFound('Finance category not found');
  }

  return {
    async list(userId) {
      return deps.repository.listByUser(userId);
    },

    async create(userId, input) {
      await assertCategoryOwnership(userId, input.categoryId);
      return deps.repository.createForUser(userId, toCreateData(input));
    },

    async update(userId, id, input) {
      await assertCategoryOwnership(userId, input.categoryId);
      const expense = await deps.repository.updateForUser(userId, id, toUpdateData(input));
      if (!expense) throw notFound('Finance expense not found');
      return expense;
    },

    async remove(userId, id) {
      const deleted = await deps.repository.deleteForUser(userId, id);
      if (!deleted) throw notFound('Finance expense not found');
    },
  };
}
```

(Lưu ý: type export cũ `FinanceExpenseWithRelations` biến mất — nếu typecheck báo file nào còn import nó từ `expenses.service`, đổi sang `FinanceExpense` từ `expenses.model`.)

- [ ] **Step 8: Wiring trong `expenses.router.ts`**

```typescript
import { createPrismaFinanceExpensesRepository } from './expenses.prisma.repository';
```

```typescript
  const repository = createPrismaFinanceExpensesRepository(deps.prisma);
  const controller = createFinanceExpensesController(createFinanceExpensesService({ repository }));
```

- [ ] **Step 9: Test + typecheck backend & frontend (wire đổi: amount → number)**

Run: `pnpm --dir backend test -- expenses` → PASS cả 2 spec.
Run: `pnpm --dir backend typecheck && pnpm --dir backend test` → PASS.
Run: `pnpm --dir frontend typecheck && pnpm --dir frontend test` → PASS.

- [ ] **Step 10: Commit**

```bash
git add backend/src/finance/expenses backend/src/finance/invoices/invoices.model.ts
git commit -m "refactor(finance/expenses)!: add repository/model layers, amount as JSON number

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Module finance/spending (chuyển `summarizeExpenses` vào model)

**Files:**
- Create: `backend/src/finance/spending/spending.model.ts`
- Create: `backend/src/finance/spending/spending.repository.ts`
- Create: `backend/src/finance/spending/spending.prisma.repository.ts`
- Test: `backend/src/finance/spending/spending.prisma.repository.spec.ts`
- Modify: `spending.service.ts` (viết lại), `spending.service.spec.ts` (viết lại), `spending.router.ts` (wiring)
- Modify: `backend/src/finance/groups/groups.service.ts` — **chỉ 1 dòng import** (xem Step 6)

**Interfaces:**
- Produces (Task 9 dùng): `SpendingSummary`, `SpendingExpense`, hàm pure `summarizeExpenses(expenses: SpendingExpense[]): SpendingSummary` (spending.model). `SpendingExpense.amount` chấp nhận `number | { toString(): string }` để trong giai đoạn chuyển tiếp groups (còn dùng Prisma Decimal tới Task 9) vẫn gọi được.
- `FinanceSpendingService.summary(userId): Promise<SpendingSummary>` — không đổi.

- [ ] **Step 1: Tạo `spending.model.ts`**

```typescript
export type SpendingExpense = {
  amount: number | { toString(): string };
  category: { id: string; name: string } | null;
};

export type SpendingSummary = {
  totalAmount: number;
  categories: Array<{ categoryId: string | null; categoryName: string; amount: number }>;
};

function toCents(amount: SpendingExpense['amount']): number {
  return Math.round(Number(amount.toString()) * 100);
}

export function summarizeExpenses(expenses: SpendingExpense[]): SpendingSummary {
  const totals = new Map<string, { categoryId: string | null; categoryName: string; amountCents: number }>();
  let totalCents = 0;

  for (const expense of expenses) {
    const cents = toCents(expense.amount);
    totalCents += cents;
    const categoryId = expense.category?.id ?? null;
    const key = categoryId ?? 'uncategorized';
    const current = totals.get(key) ?? {
      categoryId,
      categoryName: expense.category?.name ?? 'Chưa phân loại',
      amountCents: 0,
    };
    current.amountCents += cents;
    totals.set(key, current);
  }

  return {
    totalAmount: totalCents / 100,
    categories: [...totals.values()]
      .map(({ categoryId, categoryName, amountCents }) => ({ categoryId, categoryName, amount: amountCents / 100 }))
      .sort((a, b) => b.amount - a.amount),
  };
}
```

(Cộng theo "xu" số nguyên để giữ độ chính xác 2 chữ số thập phân như bản Decimal cũ, mà model không phải import Prisma.)

- [ ] **Step 2: Tạo `spending.repository.ts`**

```typescript
import type { SpendingExpense } from './spending.model';

export interface FinanceSpendingRepository {
  listExpensesWithCategoryByUser(userId: string): Promise<SpendingExpense[]>;
}
```

- [ ] **Step 3: Tạo spec + impl prisma repository**

`spending.prisma.repository.spec.ts`:

```typescript
import { Prisma, type PrismaClient } from '@prisma/client';
import { createPrismaFinanceSpendingRepository } from './spending.prisma.repository';

describe('createPrismaFinanceSpendingRepository', () => {
  it('loads user expenses with their category and maps money to numbers', async () => {
    const prisma = {
      financeExpense: {
        findMany: jest.fn().mockResolvedValue([
          {
            amount: new Prisma.Decimal('125000.50'),
            category: { id: 'cat1', name: 'Ăn uống', icon: '🍜' },
          },
          { amount: new Prisma.Decimal('40000'), category: null },
        ]),
      },
    };

    const repository = createPrismaFinanceSpendingRepository(prisma as unknown as PrismaClient);
    const expenses = await repository.listExpensesWithCategoryByUser('user1');

    expect(prisma.financeExpense.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      include: { category: true },
    });
    expect(expenses).toEqual([
      { amount: 125000.5, category: { id: 'cat1', name: 'Ăn uống' } },
      { amount: 40000, category: null },
    ]);
  });
});
```

Run fail → tạo `spending.prisma.repository.ts`:

```typescript
import type { PrismaClient } from '@prisma/client';
import type { FinanceSpendingRepository } from './spending.repository';

export function createPrismaFinanceSpendingRepository(prisma: PrismaClient): FinanceSpendingRepository {
  return {
    async listExpensesWithCategoryByUser(userId) {
      const expenses = await prisma.financeExpense.findMany({
        where: { userId },
        include: { category: true },
      });

      return expenses.map((expense) => ({
        amount: expense.amount.toNumber(),
        category: expense.category ? { id: expense.category.id, name: expense.category.name } : null,
      }));
    },
  };
}
```

Run: `pnpm --dir backend test -- spending.prisma.repository.spec.ts` → PASS.

- [ ] **Step 4: Viết lại `spending.service.spec.ts` (fail trước)**

Thay toàn bộ nội dung file bằng:

```typescript
import { summarizeExpenses } from './spending.model';
import type { FinanceSpendingRepository } from './spending.repository';
import { createFinanceSpendingService } from './spending.service';

describe('summarizeExpenses', () => {
  it('groups totals per category, sorted by amount descending', () => {
    const summary = summarizeExpenses([
      { amount: 100000, category: { id: 'cat1', name: 'Ăn uống' } },
      { amount: 50000.25, category: { id: 'cat1', name: 'Ăn uống' } },
      { amount: 400000, category: { id: 'cat2', name: 'Nhà ở' } },
      { amount: 9999.75, category: null },
    ]);

    expect(summary.totalAmount).toBe(560000);
    expect(summary.categories).toEqual([
      { categoryId: 'cat2', categoryName: 'Nhà ở', amount: 400000 },
      { categoryId: 'cat1', categoryName: 'Ăn uống', amount: 150000.25 },
      { categoryId: null, categoryName: 'Chưa phân loại', amount: 9999.75 },
    ]);
  });

  it('accepts decimal-like amounts during migration', () => {
    const summary = summarizeExpenses([{ amount: { toString: () => '125000.50' }, category: null }]);

    expect(summary.totalAmount).toBe(125000.5);
  });

  it('returns an empty summary for no expenses', () => {
    expect(summarizeExpenses([])).toEqual({ totalAmount: 0, categories: [] });
  });
});

describe('createFinanceSpendingService', () => {
  it('summarizes the expenses loaded from the repository', async () => {
    const repository: jest.Mocked<FinanceSpendingRepository> = {
      listExpensesWithCategoryByUser: jest.fn().mockResolvedValue([
        { amount: 100000, category: { id: 'cat1', name: 'Ăn uống' } },
      ]),
    };
    const service = createFinanceSpendingService({ repository });

    await expect(service.summary('user1')).resolves.toEqual({
      totalAmount: 100000,
      categories: [{ categoryId: 'cat1', categoryName: 'Ăn uống', amount: 100000 }],
    });
    expect(repository.listExpensesWithCategoryByUser).toHaveBeenCalledWith('user1');
  });
});
```

- [ ] **Step 5: Viết lại `spending.service.ts`**

Thay toàn bộ nội dung file bằng:

```typescript
import { summarizeExpenses, type SpendingSummary } from './spending.model';
import type { FinanceSpendingRepository } from './spending.repository';

export type FinanceSpendingService = {
  summary(userId: string): Promise<SpendingSummary>;
};

export function createFinanceSpendingService(
  deps: { repository: FinanceSpendingRepository },
): FinanceSpendingService {
  return {
    async summary(userId) {
      return summarizeExpenses(await deps.repository.listExpensesWithCategoryByUser(userId));
    },
  };
}
```

- [ ] **Step 6: Cập nhật import trong `groups.service.ts` (1 dòng)**

Đổi `import { summarizeExpenses } from '../spending/spending.service';` thành:

```typescript
import { summarizeExpenses } from '../spending/spending.model';
```

(Phần còn lại của groups giữ nguyên tới Task 9 — expense của groups vẫn là Prisma row có `amount.toString()`, khớp kiểu `SpendingExpense` chuyển tiếp. Dòng `summary: ReturnType<typeof summarizeExpenses>` trong DTO của groups vẫn compile.)

- [ ] **Step 7: Wiring `spending.router.ts`**

```typescript
import { createPrismaFinanceSpendingRepository } from './spending.prisma.repository';
```

```typescript
  const repository = createPrismaFinanceSpendingRepository(deps.prisma);
  const controller = createFinanceSpendingController(createFinanceSpendingService({ repository }));
```

- [ ] **Step 8: Test + typecheck + commit** (wire `/finance/spending/summary` vốn đã là number — không cần vòng frontend)

Run: `pnpm --dir backend test -- spending && pnpm --dir backend typecheck && pnpm --dir backend test` → PASS.

```bash
git add backend/src/finance/spending backend/src/finance/groups/groups.service.ts
git commit -m "refactor(finance/spending): add repository layer, move summarize into model

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Module finance/groups

**Files:**
- Create: `backend/src/finance/groups/groups.model.ts`
- Create: `backend/src/finance/groups/groups.repository.ts`
- Create: `backend/src/finance/groups/groups.prisma.repository.ts`
- Test: `backend/src/finance/groups/groups.prisma.repository.spec.ts`
- Modify: `groups.service.ts` (viết lại), `groups.service.spec.ts` (viết lại), `groups.router.ts` (wiring)

**Interfaces:**
- Consumes: `FinanceCategory`/`toFinanceCategory` (Task 5), `FinanceBudget`/`toFinanceBudget`/`includeBudgetRelations` (Task 6), `FinanceExpense`/`toFinanceExpense`/`includeExpenseRelations` (Task 7), `summarizeExpenses` (Task 8).
- Produces: `FinanceGroupsService` — 11 method giữ nguyên tên/tham số; DTO types chuyển sang `groups.model.ts`.

- [ ] **Step 1: Tạo `groups.model.ts`**

```typescript
import type { FinanceBudget } from '../budgets/budgets.model';
import type { FinanceCategory } from '../categories/categories.model';
import type { FinanceExpense } from '../expenses/expenses.model';
import type { SpendingSummary } from '../spending/spending.model';

export const FINANCE_GROUP_ROLES = ['OWNER', 'MEMBER'] as const;
export type FinanceGroupRole = (typeof FINANCE_GROUP_ROLES)[number];

export type FinanceGroupMemberDto = {
  userId: string;
  name: string;
  email: string;
  role: FinanceGroupRole;
  joinedAt: Date;
};

export type FinanceGroupSummaryDto = {
  id: string;
  name: string;
  ownerId: string;
  currentUserRole: FinanceGroupRole;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type FinanceGroupDetailDto = FinanceGroupSummaryDto & { members: FinanceGroupMemberDto[] };

export type FinanceGroupMemberDashboardDto = {
  member: { userId: string; name: string; email: string };
  categories: FinanceCategory[];
  budgets: FinanceBudget[];
  expenses: FinanceExpense[];
  summary: SpendingSummary;
};
```

- [ ] **Step 2: Tạo `groups.repository.ts`**

```typescript
import type { FinanceBudget } from '../budgets/budgets.model';
import type { FinanceCategory } from '../categories/categories.model';
import type { FinanceExpense } from '../expenses/expenses.model';
import type { FinanceGroupRole } from './groups.model';

export type FinanceGroupUserRef = { id: string; email: string; name: string };

export type FinanceGroupMembership = {
  groupId: string;
  userId: string;
  role: FinanceGroupRole;
  createdAt: Date;
  user: FinanceGroupUserRef;
};

export type FinanceGroupWithMembers = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  members: FinanceGroupMembership[];
};

export type FinanceGroupMembershipWithGroup = {
  role: FinanceGroupRole;
  group: {
    id: string;
    name: string;
    ownerId: string;
    memberCount: number;
    createdAt: Date;
    updatedAt: Date;
  };
};

export interface FinanceGroupsRepository {
  listMembershipsWithGroups(userId: string): Promise<FinanceGroupMembershipWithGroup[]>;
  createGroupWithOwner(userId: string, name: string): Promise<FinanceGroupWithMembers>;
  findGroupWithMembers(groupId: string): Promise<FinanceGroupWithMembers | null>;
  findMembership(groupId: string, userId: string): Promise<FinanceGroupMembership | null>;
  findGroupOwnership(groupId: string): Promise<{ id: string; ownerId: string } | null>;
  findUserByEmail(email: string): Promise<FinanceGroupUserRef | null>;
  addMember(groupId: string, userId: string): Promise<FinanceGroupMembership>;
  removeMember(groupId: string, memberUserId: string): Promise<boolean>;
  deleteGroupOwnedBy(groupId: string, ownerId: string): Promise<boolean>;
  listMemberCategories(memberUserId: string): Promise<FinanceCategory[]>;
  listMemberBudgets(memberUserId: string): Promise<FinanceBudget[]>;
  listMemberExpenses(memberUserId: string): Promise<FinanceExpense[]>;
  deleteMemberExpense(memberUserId: string, expenseId: string): Promise<boolean>;
  deleteMemberBudget(memberUserId: string, budgetId: string): Promise<boolean>;
}
```

- [ ] **Step 3: Viết `groups.prisma.repository.spec.ts` (fail trước)**

```typescript
import { Prisma, type PrismaClient } from '@prisma/client';
import { createPrismaFinanceGroupsRepository } from './groups.prisma.repository';

function createPrismaMock() {
  const prisma: any = {
    financeGroupMember: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
    financeGroup: { create: jest.fn(), findFirst: jest.fn(), deleteMany: jest.fn() },
    financeCategory: { findMany: jest.fn() },
    financeBudget: { findMany: jest.fn(), deleteMany: jest.fn() },
    financeExpense: { findMany: jest.fn(), deleteMany: jest.fn() },
    user: { findUnique: jest.fn() },
  };
  prisma.$transaction = jest.fn(async (callback: any) => callback(prisma));
  return prisma;
}

const createdAt = new Date('2026-06-14T00:00:00.000Z');

function createMembershipRow(overrides: Record<string, unknown> = {}) {
  return {
    groupId: 'group1',
    userId: 'user1',
    role: 'OWNER',
    createdAt,
    updatedAt: createdAt,
    user: { id: 'user1', email: 'boo@example.com', name: 'Boo' },
    ...overrides,
  };
}

function createGroupRow() {
  return {
    id: 'group1',
    name: 'Gia đình',
    ownerId: 'user1',
    createdAt,
    updatedAt: createdAt,
    members: [createMembershipRow()],
  };
}

function createRepository(prisma: ReturnType<typeof createPrismaMock>) {
  return createPrismaFinanceGroupsRepository(prisma as unknown as PrismaClient);
}

describe('createPrismaFinanceGroupsRepository', () => {
  it('lists memberships with group and member count', async () => {
    const prisma = createPrismaMock();
    prisma.financeGroupMember.findMany.mockResolvedValue([
      { role: 'OWNER', createdAt, group: { ...createGroupRow(), members: [{ userId: 'user1' }, { userId: 'user2' }] } },
    ]);
    const repository = createRepository(prisma);

    const memberships = await repository.listMembershipsWithGroups('user1');

    expect(prisma.financeGroupMember.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      include: { group: { include: { members: true } } },
      orderBy: { createdAt: 'desc' },
    });
    expect(memberships).toEqual([
      {
        role: 'OWNER',
        group: { id: 'group1', name: 'Gia đình', ownerId: 'user1', memberCount: 2, createdAt, updatedAt: createdAt },
      },
    ]);
  });

  it('creates a group with its owner membership inside a transaction', async () => {
    const prisma = createPrismaMock();
    prisma.financeGroup.create.mockResolvedValue(createGroupRow());
    const repository = createRepository(prisma);

    const group = await repository.createGroupWithOwner('user1', 'Gia đình');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.financeGroup.create).toHaveBeenCalledWith({
      data: { name: 'Gia đình', ownerId: 'user1', members: { create: { userId: 'user1', role: 'OWNER' } } },
      include: {
        members: {
          include: { user: { select: { id: true, email: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    expect(group.members[0]).toMatchObject({ userId: 'user1', role: 'OWNER' });
  });

  it('finds a membership scoped by group and user', async () => {
    const prisma = createPrismaMock();
    prisma.financeGroupMember.findUnique.mockResolvedValue(createMembershipRow());
    const repository = createRepository(prisma);

    await expect(repository.findMembership('group1', 'user1')).resolves.toMatchObject({ role: 'OWNER' });
    expect(prisma.financeGroupMember.findUnique).toHaveBeenCalledWith({
      where: { groupId_userId: { groupId: 'group1', userId: 'user1' } },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    prisma.financeGroupMember.findUnique.mockResolvedValue(null);
    await expect(repository.findMembership('group1', 'ghost')).resolves.toBeNull();
  });

  it('finds users by email with the minimal projection', async () => {
    const prisma = createPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ id: 'user2', email: 'mai@example.com', name: 'Mai' });
    const repository = createRepository(prisma);

    await expect(repository.findUserByEmail('mai@example.com')).resolves.toEqual({
      id: 'user2',
      email: 'mai@example.com',
      name: 'Mai',
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'mai@example.com' },
      select: { id: true, email: true, name: true },
    });
  });

  it('maps mutation counts to booleans', async () => {
    const prisma = createPrismaMock();
    const repository = createRepository(prisma);

    prisma.financeGroupMember.deleteMany.mockResolvedValue({ count: 1 });
    await expect(repository.removeMember('group1', 'user2')).resolves.toBe(true);
    expect(prisma.financeGroupMember.deleteMany).toHaveBeenCalledWith({
      where: { groupId: 'group1', userId: 'user2' },
    });

    prisma.financeGroup.deleteMany.mockResolvedValue({ count: 0 });
    await expect(repository.deleteGroupOwnedBy('group1', 'intruder')).resolves.toBe(false);
    expect(prisma.financeGroup.deleteMany).toHaveBeenCalledWith({
      where: { id: 'group1', ownerId: 'intruder' },
    });

    prisma.financeExpense.deleteMany.mockResolvedValue({ count: 0 });
    await expect(repository.deleteMemberExpense('user2', 'exp1')).resolves.toBe(false);
    expect(prisma.financeExpense.deleteMany).toHaveBeenCalledWith({ where: { id: 'exp1', userId: 'user2' } });

    prisma.financeBudget.deleteMany.mockResolvedValue({ count: 1 });
    await expect(repository.deleteMemberBudget('user2', 'bud1')).resolves.toBe(true);
    expect(prisma.financeBudget.deleteMany).toHaveBeenCalledWith({ where: { id: 'bud1', userId: 'user2' } });
  });

  it('loads member data with the module mappers (money as numbers)', async () => {
    const prisma = createPrismaMock();
    prisma.financeBudget.findMany.mockResolvedValue([
      {
        id: 'bud1',
        userId: 'user2',
        categoryId: 'cat1',
        limitAmount: new Prisma.Decimal('2000000'),
        period: 'monthly',
        alertThreshold: 0.8,
        createdAt,
        updatedAt: createdAt,
        category: {
          id: 'cat1',
          userId: 'user2',
          name: 'Ăn uống',
          description: null,
          icon: null,
          color: null,
          isSystemCategory: true,
          displayOrder: 0,
          createdAt,
          updatedAt: createdAt,
        },
      },
    ]);
    const repository = createRepository(prisma);

    const budgets = await repository.listMemberBudgets('user2');

    expect(prisma.financeBudget.findMany).toHaveBeenCalledWith({
      where: { userId: 'user2' },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(budgets[0]).toMatchObject({ id: 'bud1', limitAmount: 2000000 });
  });
});
```

Run: `pnpm --dir backend test -- groups.prisma.repository.spec.ts` → Expected: FAIL.

- [ ] **Step 4: Tạo `groups.prisma.repository.ts`**

```typescript
import type { Prisma, PrismaClient } from '@prisma/client';
import { includeBudgetRelations, toFinanceBudget } from '../budgets/budgets.prisma.repository';
import { toFinanceCategory } from '../categories/categories.prisma.repository';
import { includeExpenseRelations, toFinanceExpense } from '../expenses/expenses.prisma.repository';
import type {
  FinanceGroupMembership,
  FinanceGroupsRepository,
  FinanceGroupWithMembers,
} from './groups.repository';

const memberInclude = {
  user: { select: { id: true, email: true, name: true } },
} satisfies Prisma.FinanceGroupMemberInclude;

const groupInclude = {
  members: { include: memberInclude, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.FinanceGroupInclude;

type PrismaMembership = Prisma.FinanceGroupMemberGetPayload<{ include: typeof memberInclude }>;
type PrismaGroupWithMembers = Prisma.FinanceGroupGetPayload<{ include: typeof groupInclude }>;

function toMembership(membership: PrismaMembership): FinanceGroupMembership {
  return {
    groupId: membership.groupId,
    userId: membership.userId,
    role: membership.role,
    createdAt: membership.createdAt,
    user: { id: membership.user.id, email: membership.user.email, name: membership.user.name },
  };
}

function toGroupWithMembers(group: PrismaGroupWithMembers): FinanceGroupWithMembers {
  return {
    id: group.id,
    name: group.name,
    ownerId: group.ownerId,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    members: group.members.map(toMembership),
  };
}

export function createPrismaFinanceGroupsRepository(prisma: PrismaClient): FinanceGroupsRepository {
  return {
    async listMembershipsWithGroups(userId) {
      const memberships = await prisma.financeGroupMember.findMany({
        where: { userId },
        include: { group: { include: { members: true } } },
        orderBy: { createdAt: 'desc' },
      });

      return memberships.map((membership) => ({
        role: membership.role,
        group: {
          id: membership.group.id,
          name: membership.group.name,
          ownerId: membership.group.ownerId,
          memberCount: membership.group.members.length,
          createdAt: membership.group.createdAt,
          updatedAt: membership.group.updatedAt,
        },
      }));
    },

    async createGroupWithOwner(userId, name) {
      const group = await prisma.$transaction((tx) =>
        tx.financeGroup.create({
          data: { name, ownerId: userId, members: { create: { userId, role: 'OWNER' } } },
          include: groupInclude,
        }),
      );

      return toGroupWithMembers(group);
    },

    async findGroupWithMembers(groupId) {
      const group = await prisma.financeGroup.findFirst({ where: { id: groupId }, include: groupInclude });
      return group ? toGroupWithMembers(group) : null;
    },

    async findMembership(groupId, userId) {
      const membership = await prisma.financeGroupMember.findUnique({
        where: { groupId_userId: { groupId, userId } },
        include: memberInclude,
      });

      return membership ? toMembership(membership) : null;
    },

    async findGroupOwnership(groupId) {
      return prisma.financeGroup.findFirst({
        where: { id: groupId },
        select: { id: true, ownerId: true },
      });
    },

    async findUserByEmail(email) {
      return prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true },
      });
    },

    async addMember(groupId, userId) {
      const member = await prisma.financeGroupMember.create({
        data: { groupId, userId, role: 'MEMBER' },
        include: memberInclude,
      });

      return toMembership(member);
    },

    async removeMember(groupId, memberUserId) {
      const result = await prisma.financeGroupMember.deleteMany({
        where: { groupId, userId: memberUserId },
      });

      return result.count > 0;
    },

    async deleteGroupOwnedBy(groupId, ownerId) {
      const result = await prisma.financeGroup.deleteMany({ where: { id: groupId, ownerId } });
      return result.count > 0;
    },

    async listMemberCategories(memberUserId) {
      const categories = await prisma.financeCategory.findMany({
        where: { userId: memberUserId },
        orderBy: { displayOrder: 'asc' },
      });

      return categories.map(toFinanceCategory);
    },

    async listMemberBudgets(memberUserId) {
      const budgets = await prisma.financeBudget.findMany({
        where: { userId: memberUserId },
        include: includeBudgetRelations,
        orderBy: { createdAt: 'desc' },
      });

      return budgets.map(toFinanceBudget);
    },

    async listMemberExpenses(memberUserId) {
      const expenses = await prisma.financeExpense.findMany({
        where: { userId: memberUserId },
        include: includeExpenseRelations,
        orderBy: { spentAt: 'desc' },
      });

      return expenses.map(toFinanceExpense);
    },

    async deleteMemberExpense(memberUserId, expenseId) {
      const result = await prisma.financeExpense.deleteMany({
        where: { id: expenseId, userId: memberUserId },
      });

      return result.count > 0;
    },

    async deleteMemberBudget(memberUserId, budgetId) {
      const result = await prisma.financeBudget.deleteMany({
        where: { id: budgetId, userId: memberUserId },
      });

      return result.count > 0;
    },
  };
}
```

Run: `pnpm --dir backend test -- groups.prisma.repository.spec.ts` → Expected: PASS (6 test).

- [ ] **Step 5: Viết lại `groups.service.spec.ts` (fail trước)**

Thay toàn bộ nội dung file bằng:

```typescript
import type { FinanceGroupMembership, FinanceGroupsRepository, FinanceGroupWithMembers } from './groups.repository';
import { createFinanceGroupsService } from './groups.service';

const createdAt = new Date('2026-06-14T00:00:00.000Z');

function createMembership(overrides: Partial<FinanceGroupMembership> = {}): FinanceGroupMembership {
  return {
    groupId: 'group1',
    userId: 'user1',
    role: 'OWNER',
    createdAt,
    user: { id: 'user1', email: 'boo@example.com', name: 'Boo' },
    ...overrides,
  };
}

function createGroup(): FinanceGroupWithMembers {
  return {
    id: 'group1',
    name: 'Gia đình',
    ownerId: 'user1',
    createdAt,
    updatedAt: createdAt,
    members: [createMembership()],
  };
}

function createRepositoryMock(): jest.Mocked<FinanceGroupsRepository> {
  return {
    listMembershipsWithGroups: jest.fn(),
    createGroupWithOwner: jest.fn(),
    findGroupWithMembers: jest.fn(),
    findMembership: jest.fn(),
    findGroupOwnership: jest.fn(),
    findUserByEmail: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    deleteGroupOwnedBy: jest.fn(),
    listMemberCategories: jest.fn(),
    listMemberBudgets: jest.fn(),
    listMemberExpenses: jest.fn(),
    deleteMemberExpense: jest.fn(),
    deleteMemberBudget: jest.fn(),
  };
}

describe('createFinanceGroupsService', () => {
  it('lists group summaries for the current user', async () => {
    const repository = createRepositoryMock();
    repository.listMembershipsWithGroups.mockResolvedValue([
      {
        role: 'OWNER',
        group: { id: 'group1', name: 'Gia đình', ownerId: 'user1', memberCount: 2, createdAt, updatedAt: createdAt },
      },
    ]);
    const service = createFinanceGroupsService({ repository });

    await expect(service.list('user1')).resolves.toEqual([
      {
        id: 'group1',
        name: 'Gia đình',
        ownerId: 'user1',
        currentUserRole: 'OWNER',
        memberCount: 2,
        createdAt,
        updatedAt: createdAt,
      },
    ]);
  });

  it('creates a group with a trimmed name and owner role', async () => {
    const repository = createRepositoryMock();
    repository.createGroupWithOwner.mockResolvedValue(createGroup());
    const service = createFinanceGroupsService({ repository });

    const detail = await service.create('user1', { name: '  Gia đình  ' });

    expect(repository.createGroupWithOwner).toHaveBeenCalledWith('user1', 'Gia đình');
    expect(detail).toMatchObject({
      id: 'group1',
      currentUserRole: 'OWNER',
      memberCount: 1,
      members: [{ userId: 'user1', name: 'Boo', email: 'boo@example.com', role: 'OWNER', joinedAt: createdAt }],
    });
  });

  it('blocks non-members from group detail', async () => {
    const repository = createRepositoryMock();
    repository.findMembership.mockResolvedValue(null);
    const service = createFinanceGroupsService({ repository });

    await expect(service.detail('intruder', 'group1')).rejects.toMatchObject({
      statusCode: 403,
      message: 'Finance group access required',
    });
  });

  it('reports a missing group on detail', async () => {
    const repository = createRepositoryMock();
    repository.findMembership.mockResolvedValue(createMembership({ role: 'MEMBER' }));
    repository.findGroupWithMembers.mockResolvedValue(null);
    const service = createFinanceGroupsService({ repository });

    await expect(service.detail('user1', 'group1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Finance group not found',
    });
  });

  it('adds a member as the owner', async () => {
    const repository = createRepositoryMock();
    repository.findGroupOwnership.mockResolvedValue({ id: 'group1', ownerId: 'user1' });
    repository.findUserByEmail.mockResolvedValue({ id: 'user2', email: 'mai@example.com', name: 'Mai' });
    repository.findMembership.mockResolvedValue(null);
    repository.addMember.mockResolvedValue(
      createMembership({ userId: 'user2', role: 'MEMBER', user: { id: 'user2', email: 'mai@example.com', name: 'Mai' } }),
    );
    const service = createFinanceGroupsService({ repository });

    await expect(service.addMember('user1', 'group1', { email: ' mai@example.com ' })).resolves.toEqual({
      userId: 'user2',
      name: 'Mai',
      email: 'mai@example.com',
      role: 'MEMBER',
      joinedAt: createdAt,
    });
    expect(repository.findUserByEmail).toHaveBeenCalledWith('mai@example.com');
  });

  it('rejects addMember for non-owners and unknown users and duplicates', async () => {
    const repository = createRepositoryMock();
    const service = createFinanceGroupsService({ repository });

    repository.findGroupOwnership.mockResolvedValue({ id: 'group1', ownerId: 'someone-else' });
    await expect(service.addMember('user1', 'group1', { email: 'mai@example.com' })).rejects.toMatchObject({
      statusCode: 403,
      message: 'Finance group owner access required',
    });

    repository.findGroupOwnership.mockResolvedValue({ id: 'group1', ownerId: 'user1' });
    repository.findUserByEmail.mockResolvedValue(null);
    await expect(service.addMember('user1', 'group1', { email: 'ghost@example.com' })).rejects.toMatchObject({
      statusCode: 404,
      message: 'User not found',
    });

    repository.findUserByEmail.mockResolvedValue({ id: 'user2', email: 'mai@example.com', name: 'Mai' });
    repository.findMembership.mockResolvedValue(createMembership({ userId: 'user2', role: 'MEMBER' }));
    await expect(service.addMember('user1', 'group1', { email: 'mai@example.com' })).rejects.toMatchObject({
      statusCode: 409,
      message: 'User is already a finance group member',
    });
  });

  it('blocks removing the owner membership', async () => {
    const repository = createRepositoryMock();
    repository.findGroupOwnership.mockResolvedValue({ id: 'group1', ownerId: 'user1' });
    repository.findMembership.mockResolvedValue(createMembership());
    const service = createFinanceGroupsService({ repository });

    await expect(service.removeMember('user1', 'group1', 'user1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'Finance group owner cannot be removed as a member',
    });
  });

  it('removes members and reports missing deletions', async () => {
    const repository = createRepositoryMock();
    repository.findGroupOwnership.mockResolvedValue({ id: 'group1', ownerId: 'user1' });
    repository.findMembership.mockResolvedValue(
      createMembership({ userId: 'user2', role: 'MEMBER', user: { id: 'user2', email: 'mai@example.com', name: 'Mai' } }),
    );
    repository.removeMember.mockResolvedValue(false);
    const service = createFinanceGroupsService({ repository });

    await expect(service.removeMember('user1', 'group1', 'user2')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Finance group member not found',
    });
  });

  it('deletes a group only for its owner', async () => {
    const repository = createRepositoryMock();
    repository.findGroupOwnership.mockResolvedValue({ id: 'group1', ownerId: 'user1' });
    repository.deleteGroupOwnedBy.mockResolvedValue(true);
    const service = createFinanceGroupsService({ repository });

    await expect(service.removeGroup('user1', 'group1')).resolves.toBeUndefined();
    expect(repository.deleteGroupOwnedBy).toHaveBeenCalledWith('group1', 'user1');
  });

  it('assembles the member dashboard with a spending summary', async () => {
    const repository = createRepositoryMock();
    repository.findMembership
      .mockResolvedValueOnce(createMembership())
      .mockResolvedValueOnce(
        createMembership({ userId: 'user2', role: 'MEMBER', user: { id: 'user2', email: 'mai@example.com', name: 'Mai' } }),
      );
    repository.listMemberCategories.mockResolvedValue([]);
    repository.listMemberBudgets.mockResolvedValue([]);
    repository.listMemberExpenses.mockResolvedValue([
      {
        id: 'exp1',
        userId: 'user2',
        invoiceId: null,
        categoryId: 'cat1',
        description: null,
        merchantName: null,
        amount: 150000,
        spentAt: createdAt,
        confirmedByUser: true,
        sourceType: 'manual',
        sourceMetadata: null,
        createdAt,
        updatedAt: createdAt,
        category: {
          id: 'cat1',
          userId: 'user2',
          name: 'Ăn uống',
          description: null,
          icon: null,
          color: null,
          isSystemCategory: true,
          displayOrder: 0,
          createdAt,
          updatedAt: createdAt,
        },
        invoice: null,
      },
    ]);
    const service = createFinanceGroupsService({ repository });

    const dashboard = await service.memberDashboard('user1', 'group1', 'user2');

    expect(dashboard.member).toEqual({ userId: 'user2', name: 'Mai', email: 'mai@example.com' });
    expect(dashboard.summary).toEqual({
      totalAmount: 150000,
      categories: [{ categoryId: 'cat1', categoryName: 'Ăn uống', amount: 150000 }],
    });
  });

  it('maps member expense/budget deletions to 404 when nothing matched', async () => {
    const repository = createRepositoryMock();
    repository.findGroupOwnership.mockResolvedValue({ id: 'group1', ownerId: 'user1' });
    repository.findMembership.mockResolvedValue(
      createMembership({ userId: 'user2', role: 'MEMBER', user: { id: 'user2', email: 'mai@example.com', name: 'Mai' } }),
    );
    repository.deleteMemberExpense.mockResolvedValue(false);
    repository.deleteMemberBudget.mockResolvedValue(false);
    const service = createFinanceGroupsService({ repository });

    await expect(service.deleteMemberExpense('user1', 'group1', 'user2', 'exp1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Finance expense not found',
    });
    await expect(service.deleteMemberBudget('user1', 'group1', 'user2', 'bud1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Finance budget not found',
    });
  });
});
```

Run: `pnpm --dir backend test -- groups.service.spec.ts` → Expected: FAIL.

- [ ] **Step 6: Viết lại `groups.service.ts`**

Thay toàn bộ nội dung file bằng:

```typescript
import { conflict, forbidden, notFound } from '../../errors';
import type { FinanceBudget } from '../budgets/budgets.model';
import type { FinanceExpense } from '../expenses/expenses.model';
import { summarizeExpenses } from '../spending/spending.model';
import type {
  FinanceGroupDetailDto,
  FinanceGroupMemberDashboardDto,
  FinanceGroupMemberDto,
  FinanceGroupSummaryDto,
} from './groups.model';
import type {
  FinanceGroupMembership,
  FinanceGroupsRepository,
  FinanceGroupWithMembers,
} from './groups.repository';
import type { AddFinanceGroupMemberInput, CreateFinanceGroupInput } from './groups.schema';

export type FinanceGroupsService = {
  list(userId: string): Promise<FinanceGroupSummaryDto[]>;
  create(userId: string, input: CreateFinanceGroupInput): Promise<FinanceGroupDetailDto>;
  detail(userId: string, groupId: string): Promise<FinanceGroupDetailDto>;
  addMember(userId: string, groupId: string, input: AddFinanceGroupMemberInput): Promise<FinanceGroupMemberDto>;
  removeMember(userId: string, groupId: string, memberUserId: string): Promise<void>;
  removeGroup(userId: string, groupId: string): Promise<void>;
  memberDashboard(userId: string, groupId: string, memberUserId: string): Promise<FinanceGroupMemberDashboardDto>;
  memberExpenses(userId: string, groupId: string, memberUserId: string): Promise<FinanceExpense[]>;
  memberBudgets(userId: string, groupId: string, memberUserId: string): Promise<FinanceBudget[]>;
  deleteMemberExpense(userId: string, groupId: string, memberUserId: string, expenseId: string): Promise<void>;
  deleteMemberBudget(userId: string, groupId: string, memberUserId: string, budgetId: string): Promise<void>;
};

function toMemberDto(membership: FinanceGroupMembership): FinanceGroupMemberDto {
  return {
    userId: membership.userId,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role,
    joinedAt: membership.createdAt,
  };
}

function toGroupDetailDto(
  group: FinanceGroupWithMembers,
  currentUserRole: FinanceGroupMembership['role'],
): FinanceGroupDetailDto {
  return {
    id: group.id,
    name: group.name,
    ownerId: group.ownerId,
    currentUserRole,
    memberCount: group.members.length,
    members: group.members.map(toMemberDto),
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

export function createFinanceGroupsService(
  deps: { repository: FinanceGroupsRepository },
): FinanceGroupsService {
  async function requireMembership(groupId: string, userId: string): Promise<FinanceGroupMembership> {
    const membership = await deps.repository.findMembership(groupId, userId);
    if (!membership) throw forbidden('Finance group access required');
    return membership;
  }

  async function requireOwner(groupId: string, userId: string): Promise<void> {
    const group = await deps.repository.findGroupOwnership(groupId);
    if (!group) throw notFound('Finance group not found');
    if (group.ownerId !== userId) throw forbidden('Finance group owner access required');
  }

  async function requireTargetMember(groupId: string, memberUserId: string): Promise<FinanceGroupMembership> {
    const membership = await deps.repository.findMembership(groupId, memberUserId);
    if (!membership) throw notFound('Finance group member not found');
    return membership;
  }

  return {
    async list(userId) {
      const memberships = await deps.repository.listMembershipsWithGroups(userId);

      return memberships.map((membership) => ({
        id: membership.group.id,
        name: membership.group.name,
        ownerId: membership.group.ownerId,
        currentUserRole: membership.role,
        memberCount: membership.group.memberCount,
        createdAt: membership.group.createdAt,
        updatedAt: membership.group.updatedAt,
      }));
    },

    async create(userId, input) {
      const group = await deps.repository.createGroupWithOwner(userId, input.name.trim());
      return toGroupDetailDto(group, 'OWNER');
    },

    async detail(userId, groupId) {
      const membership = await requireMembership(groupId, userId);
      const group = await deps.repository.findGroupWithMembers(groupId);
      if (!group) throw notFound('Finance group not found');
      return toGroupDetailDto(group, membership.role);
    },

    async addMember(userId, groupId, input) {
      await requireOwner(groupId, userId);
      const user = await deps.repository.findUserByEmail(input.email.trim());
      if (!user) throw notFound('User not found');
      const existing = await deps.repository.findMembership(groupId, user.id);
      if (existing) throw conflict('User is already a finance group member');
      const member = await deps.repository.addMember(groupId, user.id);
      return toMemberDto(member);
    },

    async removeMember(userId, groupId, memberUserId) {
      await requireOwner(groupId, userId);
      const target = await requireTargetMember(groupId, memberUserId);
      if (target.role === 'OWNER') throw conflict('Finance group owner cannot be removed as a member');
      const removed = await deps.repository.removeMember(groupId, memberUserId);
      if (!removed) throw notFound('Finance group member not found');
    },

    async removeGroup(userId, groupId) {
      await requireOwner(groupId, userId);
      const deleted = await deps.repository.deleteGroupOwnedBy(groupId, userId);
      if (!deleted) throw notFound('Finance group not found');
    },

    async memberDashboard(userId, groupId, memberUserId) {
      await requireMembership(groupId, userId);
      const target = await requireTargetMember(groupId, memberUserId);
      const [categories, budgets, expenses] = await Promise.all([
        deps.repository.listMemberCategories(memberUserId),
        deps.repository.listMemberBudgets(memberUserId),
        deps.repository.listMemberExpenses(memberUserId),
      ]);

      return {
        member: { userId: target.userId, name: target.user.name, email: target.user.email },
        categories,
        budgets,
        expenses,
        summary: summarizeExpenses(expenses),
      };
    },

    async memberExpenses(userId, groupId, memberUserId) {
      await requireMembership(groupId, userId);
      await requireTargetMember(groupId, memberUserId);
      return deps.repository.listMemberExpenses(memberUserId);
    },

    async memberBudgets(userId, groupId, memberUserId) {
      await requireMembership(groupId, userId);
      await requireTargetMember(groupId, memberUserId);
      return deps.repository.listMemberBudgets(memberUserId);
    },

    async deleteMemberExpense(userId, groupId, memberUserId, expenseId) {
      await requireOwner(groupId, userId);
      await requireTargetMember(groupId, memberUserId);
      const deleted = await deps.repository.deleteMemberExpense(memberUserId, expenseId);
      if (!deleted) throw notFound('Finance expense not found');
    },

    async deleteMemberBudget(userId, groupId, memberUserId, budgetId) {
      await requireOwner(groupId, userId);
      await requireTargetMember(groupId, memberUserId);
      const deleted = await deps.repository.deleteMemberBudget(memberUserId, budgetId);
      if (!deleted) throw notFound('Finance budget not found');
    },
  };
}
```

(Các type export cũ `FinanceExpenseWithRelations`, `FinanceBudgetWithCategory` của groups.service biến mất — nếu typecheck báo nơi khác import, đổi sang `FinanceExpense`/`FinanceBudget` từ model tương ứng.)

- [ ] **Step 7: Wiring `groups.router.ts`**

```typescript
import { createPrismaFinanceGroupsRepository } from './groups.prisma.repository';
```

```typescript
  const repository = createPrismaFinanceGroupsRepository(deps.prisma);
  const controller = createFinanceGroupsController(createFinanceGroupsService({ repository }));
```

- [ ] **Step 8: Test + typecheck backend & frontend (wire đổi: money lồng trong dashboard/budgets/expenses của group)**

Run: `pnpm --dir backend test -- groups` → PASS cả 3 spec (service, prisma.repository, router — router spec giữ nguyên vì repo phát ra đúng query cũ).
Run: `pnpm --dir backend typecheck && pnpm --dir backend test` → PASS.
Run: `pnpm --dir frontend typecheck && pnpm --dir frontend test` → PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/src/finance/groups
git commit -m "refactor(finance/groups)!: add repository/model layers, nested money as numbers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Module finance/chat

**Files:**
- Create: `backend/src/finance/chat/chat.model.ts`
- Create: `backend/src/finance/chat/chat.repository.ts`
- Create: `backend/src/finance/chat/chat.prisma.repository.ts`
- Test: `backend/src/finance/chat/chat.prisma.repository.spec.ts`
- Modify: `chat.service.ts` (viết lại), `chat.service.spec.ts` (viết lại), `chat.router.ts` (wiring)

**Interfaces:**
- Consumes: `toFinanceCategory` (Task 5), `toFinanceBudget`/`includeBudgetRelations` (Task 6), `toFinanceExpense`/`includeExpenseRelations` + `FinanceExpense` (Task 7), `FinanceAiClient` (`finance/ai-client.ts`, giữ nguyên).
- Produces: `FinanceChatService` — 4 method giữ nguyên tên (`start`, `sendMessage`, `history`, `close`); `history` đổi kiểu khai báo từ `Promise<unknown[]>` → `Promise<FinanceChatMessage[]>` (wire không đổi).
- **Lưu ý rủi ro đã duyệt:** payload gửi AI service (`chatRespond`) giờ chứa model objects → tiền là number thay vì Decimal-string.

- [ ] **Step 1: Tạo `chat.model.ts`** (hàm `parseStrictSpentAt` chuyển **nguyên văn** từ `chat.service.ts` hiện tại sang đây)

```typescript
import { validationError } from '../../errors';
import type { FinanceBudget } from '../budgets/budgets.model';
import type { FinanceCategory } from '../categories/categories.model';
import type { FinanceExpense } from '../expenses/expenses.model';

export type FinanceChatSession = {
  id: string;
  userId: string;
  sessionTitle: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type FinanceChatMessage = {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  metadata: unknown;
  createdAt: Date;
};

export type FinanceChatContext = {
  categories: FinanceCategory[];
  budgets: FinanceBudget[];
  recentExpenses: FinanceExpense[];
  chatHistory: FinanceChatMessage[];
};

export type FinanceSavedExpense = {
  id: string;
  userId: string;
  invoiceId: string | null;
  categoryId: string | null;
  description: string | null;
  merchantName: string | null;
  amount: number;
  spentAt: string | null;
  confirmedByUser: boolean;
  sourceType: string;
  createdAt: string;
  updatedAt: string;
};

export type StartFinanceChatResponse = { sessionId: string; initialMessage: string };

export type CreateConfirmedFinanceExpenseData = {
  userId: string;
  invoiceId?: string;
  categoryId?: string;
  description?: string;
  merchantName?: string;
  amount: number;
  spentAt?: Date;
  confirmedByUser: true;
  sourceType: 'text';
  sourceMetadata: { confirmedFromChat: true };
};

export function parseStrictSpentAt(value: string): Date {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnlyMatch) {
    const [, yearText, monthText, dayText] = dateOnlyMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day
    ) {
      throw validationError('Invalid expense spentAt');
    }

    return date;
  }

  const dateTimeMatch =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.(\d{1,3}))?)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!dateTimeMatch) {
    throw validationError('Invalid expense spentAt');
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , millisecondText, zone, offsetSign, offsetHourText, offsetMinuteText] =
    dateTimeMatch;

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = secondText ? Number(secondText) : 0;
  const millisecond = millisecondText ? Number(millisecondText.padEnd(3, '0')) : 0;
  const offsetHours = offsetHourText ? Number(offsetHourText) : 0;
  const offsetMinutesPart = offsetMinuteText ? Number(offsetMinuteText) : 0;

  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59 || offsetHours > 23 || offsetMinutesPart > 59) {
    throw validationError('Invalid expense spentAt');
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw validationError('Invalid expense spentAt');
  }

  const offsetMinutes =
    zone === 'Z' ? 0 : (offsetSign === '-' ? -1 : 1) * (offsetHours * 60 + offsetMinutesPart);
  const localTime = new Date(date.getTime() + offsetMinutes * 60_000);

  if (
    localTime.getUTCFullYear() !== year ||
    localTime.getUTCMonth() + 1 !== month ||
    localTime.getUTCDate() !== day ||
    localTime.getUTCHours() !== hour ||
    localTime.getUTCMinutes() !== minute ||
    localTime.getUTCSeconds() !== second ||
    localTime.getUTCMilliseconds() !== millisecond
  ) {
    throw validationError('Invalid expense spentAt');
  }

  return date;
}
```

- [ ] **Step 2: Tạo `chat.repository.ts`**

```typescript
import type { FinanceExpense } from '../expenses/expenses.model';
import type {
  CreateConfirmedFinanceExpenseData,
  FinanceChatContext,
  FinanceChatMessage,
  FinanceChatSession,
} from './chat.model';

export interface FinanceChatRepository {
  createSession(userId: string, sessionTitle: string): Promise<FinanceChatSession>;
  findSessionForUser(userId: string, sessionId: string): Promise<FinanceChatSession | null>;
  closeSessionForUser(userId: string, sessionId: string): Promise<boolean>;
  createUserMessage(sessionId: string, content: string): Promise<void>;
  createAssistantMessage(sessionId: string, content: string, metadata: unknown): Promise<void>;
  listSessionMessages(sessionId: string): Promise<FinanceChatMessage[]>;
  loadChatContext(userId: string, sessionId: string): Promise<FinanceChatContext>;
  categoryExistsForUser(userId: string, categoryId: string): Promise<boolean>;
  invoiceExistsForUser(userId: string, invoiceId: string): Promise<boolean>;
  createConfirmedExpense(data: CreateConfirmedFinanceExpenseData): Promise<FinanceExpense>;
}
```

- [ ] **Step 3: Viết `chat.prisma.repository.spec.ts` (fail trước)**

```typescript
import { Prisma, type PrismaClient } from '@prisma/client';
import { createPrismaFinanceChatRepository } from './chat.prisma.repository';

function createPrismaMock() {
  return {
    financeChatSession: { create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
    financeChatMessage: { create: jest.fn(), findMany: jest.fn() },
    financeCategory: { findMany: jest.fn(), findFirst: jest.fn() },
    financeBudget: { findMany: jest.fn() },
    financeExpense: { findMany: jest.fn(), create: jest.fn() },
    financeInvoice: { findFirst: jest.fn() },
  };
}

const createdAt = new Date('2026-06-01T00:00:00.000Z');

function createSessionRow() {
  return { id: 'ses1', userId: 'user1', sessionTitle: 'Chat', status: 'active', createdAt, updatedAt: createdAt };
}

function createExpenseRow() {
  return {
    id: 'exp1',
    userId: 'user1',
    invoiceId: null,
    categoryId: 'cat1',
    description: 'Cơm trưa',
    merchantName: null,
    amount: new Prisma.Decimal('125000'),
    spentAt: createdAt,
    confirmedByUser: true,
    sourceType: 'text',
    sourceMetadata: { confirmedFromChat: true },
    createdAt,
    updatedAt: createdAt,
    category: {
      id: 'cat1',
      userId: 'user1',
      name: 'Ăn uống',
      description: null,
      icon: null,
      color: null,
      isSystemCategory: true,
      displayOrder: 0,
      createdAt,
      updatedAt: createdAt,
    },
    invoice: null,
  };
}

function createRepository(prisma: ReturnType<typeof createPrismaMock>) {
  return createPrismaFinanceChatRepository(prisma as unknown as PrismaClient);
}

describe('createPrismaFinanceChatRepository', () => {
  it('creates and finds sessions scoped by user', async () => {
    const prisma = createPrismaMock();
    prisma.financeChatSession.create.mockResolvedValue(createSessionRow());
    prisma.financeChatSession.findFirst.mockResolvedValue(createSessionRow());
    const repository = createRepository(prisma);

    await expect(repository.createSession('user1', 'Chat')).resolves.toMatchObject({ id: 'ses1' });
    expect(prisma.financeChatSession.create).toHaveBeenCalledWith({
      data: { userId: 'user1', sessionTitle: 'Chat' },
    });

    await expect(repository.findSessionForUser('user1', 'ses1')).resolves.toMatchObject({ id: 'ses1' });
    expect(prisma.financeChatSession.findFirst).toHaveBeenCalledWith({ where: { id: 'ses1', userId: 'user1' } });
  });

  it('maps close updateMany count to a boolean', async () => {
    const prisma = createPrismaMock();
    prisma.financeChatSession.updateMany.mockResolvedValue({ count: 0 });
    const repository = createRepository(prisma);

    await expect(repository.closeSessionForUser('user1', 'ses1')).resolves.toBe(false);
    expect(prisma.financeChatSession.updateMany).toHaveBeenCalledWith({
      where: { id: 'ses1', userId: 'user1' },
      data: { status: 'completed' },
    });
  });

  it('persists user and assistant messages', async () => {
    const prisma = createPrismaMock();
    const repository = createRepository(prisma);

    await repository.createUserMessage('ses1', 'xin chào');
    expect(prisma.financeChatMessage.create).toHaveBeenCalledWith({
      data: { sessionId: 'ses1', role: 'user', content: 'xin chào' },
    });

    await repository.createAssistantMessage('ses1', 'chào bạn', { assistantMessage: 'chào bạn' });
    expect(prisma.financeChatMessage.create).toHaveBeenCalledWith({
      data: { sessionId: 'ses1', role: 'assistant', content: 'chào bạn', metadata: { assistantMessage: 'chào bạn' } },
    });
  });

  it('loads the chat context with the original four queries', async () => {
    const prisma = createPrismaMock();
    prisma.financeCategory.findMany.mockResolvedValue([]);
    prisma.financeBudget.findMany.mockResolvedValue([]);
    prisma.financeExpense.findMany.mockResolvedValue([createExpenseRow()]);
    prisma.financeChatMessage.findMany.mockResolvedValue([]);
    const repository = createRepository(prisma);

    const context = await repository.loadChatContext('user1', 'ses1');

    expect(prisma.financeCategory.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
    expect(prisma.financeBudget.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(prisma.financeExpense.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      include: { category: true, invoice: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    expect(prisma.financeChatMessage.findMany).toHaveBeenCalledWith({
      where: { sessionId: 'ses1' },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });
    expect(context.recentExpenses[0]).toMatchObject({ amount: 125000 });
  });

  it('creates a confirmed expense with relations and maps it to the model', async () => {
    const prisma = createPrismaMock();
    prisma.financeExpense.create.mockResolvedValue(createExpenseRow());
    const repository = createRepository(prisma);
    const data = {
      userId: 'user1',
      categoryId: 'cat1',
      amount: 125000,
      confirmedByUser: true as const,
      sourceType: 'text' as const,
      sourceMetadata: { confirmedFromChat: true as const },
    };

    await expect(repository.createConfirmedExpense(data)).resolves.toMatchObject({ amount: 125000 });
    expect(prisma.financeExpense.create).toHaveBeenCalledWith({
      data,
      include: { category: true, invoice: true },
    });
  });
});
```

Run: `pnpm --dir backend test -- chat.prisma.repository.spec.ts` → Expected: FAIL.

- [ ] **Step 4: Tạo `chat.prisma.repository.ts`**

```typescript
import type {
  FinanceChatMessage as PrismaFinanceChatMessage,
  FinanceChatSession as PrismaFinanceChatSession,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { includeBudgetRelations, toFinanceBudget } from '../budgets/budgets.prisma.repository';
import { toFinanceCategory } from '../categories/categories.prisma.repository';
import { includeExpenseRelations, toFinanceExpense } from '../expenses/expenses.prisma.repository';
import type { FinanceChatMessage, FinanceChatSession } from './chat.model';
import type { FinanceChatRepository } from './chat.repository';

function toFinanceChatSession(session: PrismaFinanceChatSession): FinanceChatSession {
  return {
    id: session.id,
    userId: session.userId,
    sessionTitle: session.sessionTitle,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function toFinanceChatMessage(message: PrismaFinanceChatMessage): FinanceChatMessage {
  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role,
    content: message.content,
    metadata: message.metadata,
    createdAt: message.createdAt,
  };
}

export function createPrismaFinanceChatRepository(prisma: PrismaClient): FinanceChatRepository {
  return {
    async createSession(userId, sessionTitle) {
      const session = await prisma.financeChatSession.create({ data: { userId, sessionTitle } });
      return toFinanceChatSession(session);
    },

    async findSessionForUser(userId, sessionId) {
      const session = await prisma.financeChatSession.findFirst({ where: { id: sessionId, userId } });
      return session ? toFinanceChatSession(session) : null;
    },

    async closeSessionForUser(userId, sessionId) {
      const result = await prisma.financeChatSession.updateMany({
        where: { id: sessionId, userId },
        data: { status: 'completed' },
      });

      return result.count > 0;
    },

    async createUserMessage(sessionId, content) {
      await prisma.financeChatMessage.create({ data: { sessionId, role: 'user', content } });
    },

    async createAssistantMessage(sessionId, content, metadata) {
      await prisma.financeChatMessage.create({
        data: { sessionId, role: 'assistant', content, metadata: metadata as Prisma.InputJsonValue },
      });
    },

    async listSessionMessages(sessionId) {
      const messages = await prisma.financeChatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
      });

      return messages.map(toFinanceChatMessage);
    },

    async loadChatContext(userId, sessionId) {
      const [categories, budgets, recentExpenses, chatHistory] = await Promise.all([
        prisma.financeCategory.findMany({
          where: { userId },
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        }),
        prisma.financeBudget.findMany({
          where: { userId },
          include: includeBudgetRelations,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.financeExpense.findMany({
          where: { userId },
          include: includeExpenseRelations,
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.financeChatMessage.findMany({
          where: { sessionId },
          orderBy: { createdAt: 'asc' },
          take: 30,
        }),
      ]);

      return {
        categories: categories.map(toFinanceCategory),
        budgets: budgets.map(toFinanceBudget),
        recentExpenses: recentExpenses.map(toFinanceExpense),
        chatHistory: chatHistory.map(toFinanceChatMessage),
      };
    },

    async categoryExistsForUser(userId, categoryId) {
      const category = await prisma.financeCategory.findFirst({
        where: { id: categoryId, userId },
        select: { id: true },
      });

      return category !== null;
    },

    async invoiceExistsForUser(userId, invoiceId) {
      const invoice = await prisma.financeInvoice.findFirst({
        where: { id: invoiceId, userId },
        select: { id: true },
      });

      return invoice !== null;
    },

    async createConfirmedExpense(data) {
      const expense = await prisma.financeExpense.create({
        data: { ...data, sourceMetadata: data.sourceMetadata as Prisma.InputJsonValue },
        include: includeExpenseRelations,
      });

      return toFinanceExpense(expense);
    },
  };
}
```

Run: `pnpm --dir backend test -- chat.prisma.repository.spec.ts` → Expected: PASS (5 test). Lưu ý test "creates a confirmed expense" expect `data` được truyền nguyên trạng (spread + cast không đổi giá trị runtime).

- [ ] **Step 5: Viết lại `chat.service.spec.ts` (fail trước)**

Thay toàn bộ nội dung file bằng:

```typescript
import type { FinanceChatAiResponse } from '../ai-client';
import type { FinanceExpense } from '../expenses/expenses.model';
import { parseStrictSpentAt, type FinanceChatSession } from './chat.model';
import type { FinanceChatRepository } from './chat.repository';
import { createFinanceChatService } from './chat.service';

const createdAt = new Date('2026-06-01T00:00:00.000Z');

function createSession(): FinanceChatSession {
  return { id: 'ses1', userId: 'user1', sessionTitle: 'Chat', status: 'active', createdAt, updatedAt: createdAt };
}

function createExpense(): FinanceExpense {
  return {
    id: 'exp1',
    userId: 'user1',
    invoiceId: null,
    categoryId: 'cat1',
    description: 'Cơm trưa',
    merchantName: null,
    amount: 125000,
    spentAt: createdAt,
    confirmedByUser: true,
    sourceType: 'text',
    sourceMetadata: { confirmedFromChat: true },
    createdAt,
    updatedAt: createdAt,
    category: null,
    invoice: null,
  };
}

function createAiResponse(overrides: Partial<FinanceChatAiResponse> = {}): FinanceChatAiResponse {
  return {
    assistantMessage: 'Đã ghi nhận',
    extractedExpense: null,
    budgetWarning: null,
    advice: null,
    requiresConfirmation: false,
    askingConfirmation: false,
    interrupted: false,
    ...overrides,
  };
}

function createRepositoryMock(): jest.Mocked<FinanceChatRepository> {
  return {
    createSession: jest.fn(),
    findSessionForUser: jest.fn(),
    closeSessionForUser: jest.fn(),
    createUserMessage: jest.fn(),
    createAssistantMessage: jest.fn(),
    listSessionMessages: jest.fn(),
    loadChatContext: jest.fn(),
    categoryExistsForUser: jest.fn(),
    invoiceExistsForUser: jest.fn(),
    createConfirmedExpense: jest.fn(),
  };
}

function createDeps() {
  return {
    repository: createRepositoryMock(),
    financeAiClient: {
      extractExpenseText: jest.fn(),
      extractInvoiceImage: jest.fn(),
      generateAdvice: jest.fn(),
      chatRespond: jest.fn(),
    },
  };
}

const emptyContext = { categories: [], budgets: [], recentExpenses: [], chatHistory: [] };

describe('parseStrictSpentAt', () => {
  it('parses date-only values as UTC midnight', () => {
    expect(parseStrictSpentAt('2026-06-01').toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });

  it('parses offset datetimes preserving the instant', () => {
    expect(parseStrictSpentAt('2026-06-01T10:15:00.000+07:00').toISOString()).toBe('2026-06-01T03:15:00.000Z');
  });

  it('rejects impossible calendar dates and malformed input', () => {
    expect(() => parseStrictSpentAt('2026-02-30')).toThrow('Invalid expense spentAt');
    expect(() => parseStrictSpentAt('hôm qua')).toThrow('Invalid expense spentAt');
  });
});

describe('createFinanceChatService', () => {
  it('starts a session with the default title', async () => {
    const deps = createDeps();
    deps.repository.createSession.mockResolvedValue(createSession());
    const service = createFinanceChatService(deps);

    const result = await service.start('user1', {});

    expect(deps.repository.createSession).toHaveBeenCalledWith('user1', 'Finance Chat Session');
    expect(result).toEqual({
      sessionId: 'ses1',
      initialMessage: 'Xin chào! Tôi là trợ lý AI quản lý chi tiêu. Bạn có thể nhập chi tiêu hoặc tải ảnh hóa đơn.',
    });
  });

  it('rejects messages for a session the user does not own', async () => {
    const deps = createDeps();
    deps.repository.findSessionForUser.mockResolvedValue(null);
    const service = createFinanceChatService(deps);

    await expect(
      service.sendMessage('user1', 'ghost', { content: 'hi', messageType: 'text', isConfirmationResponse: false }),
    ).rejects.toMatchObject({ statusCode: 404, message: 'Finance chat session not found' });
  });

  it('sends the message with full context and stores both chat messages', async () => {
    const deps = createDeps();
    deps.repository.findSessionForUser.mockResolvedValue(createSession());
    deps.repository.loadChatContext.mockResolvedValue(emptyContext);
    const aiResponse = createAiResponse();
    deps.financeAiClient.chatRespond.mockResolvedValue(aiResponse);
    const service = createFinanceChatService(deps);

    const result = await service.sendMessage('user1', 'ses1', {
      content: 'ăn trưa 125k',
      messageType: 'text',
      isConfirmationResponse: false,
    });

    expect(deps.repository.createUserMessage).toHaveBeenCalledWith('ses1', 'ăn trưa 125k');
    expect(deps.financeAiClient.chatRespond).toHaveBeenCalledWith({
      sessionId: 'ses1',
      message: 'ăn trưa 125k',
      messageType: 'text',
      isConfirmationResponse: false,
      pendingExpense: null,
      categories: [],
      budgets: [],
      recentExpenses: [],
      chatHistory: [],
      locale: 'vi-VN',
    });
    expect(result).toEqual({ ...aiResponse, savedExpense: null });
    expect(deps.repository.createAssistantMessage).toHaveBeenCalledWith('ses1', 'Đã ghi nhận', {
      ...aiResponse,
      savedExpense: null,
    });
  });

  it('saves the confirmed expense after checking ownership', async () => {
    const deps = createDeps();
    deps.repository.findSessionForUser.mockResolvedValue(createSession());
    deps.repository.loadChatContext.mockResolvedValue(emptyContext);
    deps.repository.categoryExistsForUser.mockResolvedValue(true);
    deps.repository.createConfirmedExpense.mockResolvedValue(createExpense());
    deps.financeAiClient.chatRespond.mockResolvedValue(
      createAiResponse({ extractedExpense: { amount: 125000, categoryId: 'cat1', spentAt: '2026-06-01' } }),
    );
    const service = createFinanceChatService(deps);

    const result = await service.sendMessage('user1', 'ses1', {
      content: 'đúng rồi',
      messageType: 'text',
      isConfirmationResponse: true,
      pendingExpense: { description: 'Cơm trưa' },
    });

    expect(deps.repository.categoryExistsForUser).toHaveBeenCalledWith('user1', 'cat1');
    expect(deps.repository.createConfirmedExpense).toHaveBeenCalledWith({
      userId: 'user1',
      invoiceId: undefined,
      categoryId: 'cat1',
      description: 'Cơm trưa',
      merchantName: undefined,
      amount: 125000,
      spentAt: new Date('2026-06-01T00:00:00.000Z'),
      confirmedByUser: true,
      sourceType: 'text',
      sourceMetadata: { confirmedFromChat: true },
    });
    expect(result.savedExpense).toEqual({
      id: 'exp1',
      userId: 'user1',
      invoiceId: null,
      categoryId: 'cat1',
      description: 'Cơm trưa',
      merchantName: null,
      amount: 125000,
      spentAt: '2026-06-01T00:00:00.000Z',
      confirmedByUser: true,
      sourceType: 'text',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    });
  });

  it('rejects a confirmed expense with an invalid amount', async () => {
    const deps = createDeps();
    deps.repository.findSessionForUser.mockResolvedValue(createSession());
    deps.repository.loadChatContext.mockResolvedValue(emptyContext);
    deps.financeAiClient.chatRespond.mockResolvedValue(
      createAiResponse({ extractedExpense: { amount: 0 } }),
    );
    const service = createFinanceChatService(deps);

    await expect(
      service.sendMessage('user1', 'ses1', { content: 'ok', messageType: 'text', isConfirmationResponse: true }),
    ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid expense amount' });
    expect(deps.repository.createConfirmedExpense).not.toHaveBeenCalled();
  });

  it('rejects a confirmed expense with a foreign category', async () => {
    const deps = createDeps();
    deps.repository.findSessionForUser.mockResolvedValue(createSession());
    deps.repository.loadChatContext.mockResolvedValue(emptyContext);
    deps.repository.categoryExistsForUser.mockResolvedValue(false);
    deps.financeAiClient.chatRespond.mockResolvedValue(
      createAiResponse({ extractedExpense: { amount: 1000, categoryId: 'cat9' } }),
    );
    const service = createFinanceChatService(deps);

    await expect(
      service.sendMessage('user1', 'ses1', { content: 'ok', messageType: 'text', isConfirmationResponse: true }),
    ).rejects.toMatchObject({ statusCode: 400, message: 'Finance category not found' });
  });

  it('does not save when the AI still requires confirmation', async () => {
    const deps = createDeps();
    deps.repository.findSessionForUser.mockResolvedValue(createSession());
    deps.repository.loadChatContext.mockResolvedValue(emptyContext);
    deps.financeAiClient.chatRespond.mockResolvedValue(
      createAiResponse({ requiresConfirmation: true, extractedExpense: { amount: 1000 } }),
    );
    const service = createFinanceChatService(deps);

    const result = await service.sendMessage('user1', 'ses1', {
      content: 'ăn trưa',
      messageType: 'text',
      isConfirmationResponse: true,
    });

    expect(result.savedExpense).toBeNull();
    expect(deps.repository.createConfirmedExpense).not.toHaveBeenCalled();
  });

  it('lists history for an owned session', async () => {
    const deps = createDeps();
    deps.repository.findSessionForUser.mockResolvedValue(createSession());
    const messages = [{ id: 'msg1', sessionId: 'ses1', role: 'user', content: 'hi', metadata: null, createdAt }];
    deps.repository.listSessionMessages.mockResolvedValue(messages);
    const service = createFinanceChatService(deps);

    await expect(service.history('user1', 'ses1')).resolves.toEqual(messages);
  });

  it('reports a missing session on close', async () => {
    const deps = createDeps();
    deps.repository.closeSessionForUser.mockResolvedValue(false);
    const service = createFinanceChatService(deps);

    await expect(service.close('user1', 'ghost')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Finance chat session not found',
    });
  });
});
```

Run: `pnpm --dir backend test -- chat.service.spec.ts` → Expected: FAIL.

- [ ] **Step 6: Viết lại `chat.service.ts`**

Thay toàn bộ nội dung file bằng:

```typescript
import { notFound, validationError } from '../../errors';
import type { FinanceAiClient, FinanceChatAiResponse } from '../ai-client';
import type { FinanceExpense } from '../expenses/expenses.model';
import {
  parseStrictSpentAt,
  type CreateConfirmedFinanceExpenseData,
  type FinanceChatMessage,
  type FinanceSavedExpense,
  type StartFinanceChatResponse,
} from './chat.model';
import type { FinanceChatRepository } from './chat.repository';
import type { PendingFinanceExpenseInput, SendFinanceChatMessageInput, StartFinanceChatInput } from './chat.schema';

export type SendFinanceChatResponse = FinanceChatAiResponse & {
  savedExpense: FinanceSavedExpense | null;
};

export type FinanceChatServiceDeps = {
  repository: FinanceChatRepository;
  financeAiClient: FinanceAiClient;
};

export type FinanceChatService = {
  start(userId: string, input: StartFinanceChatInput): Promise<StartFinanceChatResponse>;
  sendMessage(userId: string, sessionId: string, input: SendFinanceChatMessageInput): Promise<SendFinanceChatResponse>;
  history(userId: string, sessionId: string): Promise<FinanceChatMessage[]>;
  close(userId: string, sessionId: string): Promise<void>;
};

export function createFinanceChatService(deps: FinanceChatServiceDeps): FinanceChatService {
  async function assertSession(userId: string, sessionId: string): Promise<void> {
    const session = await deps.repository.findSessionForUser(userId, sessionId);
    if (!session) throw notFound('Finance chat session not found');
  }

  async function assertCategoryOwnership(userId: string, categoryId?: string | null): Promise<void> {
    if (!categoryId) return;
    const exists = await deps.repository.categoryExistsForUser(userId, categoryId);
    if (!exists) throw validationError('Finance category not found');
  }

  async function assertInvoiceOwnership(userId: string, invoiceId?: string | null): Promise<void> {
    if (!invoiceId) return;
    const exists = await deps.repository.invoiceExistsForUser(userId, invoiceId);
    if (!exists) throw validationError('Finance invoice not found');
  }

  function toExpenseCreateData(userId: string, pending: PendingFinanceExpenseInput): CreateConfirmedFinanceExpenseData {
    if (typeof pending.amount !== 'number' || pending.amount <= 0) {
      throw validationError('Invalid expense amount');
    }

    const spentAt = pending.spentAt ? parseStrictSpentAt(pending.spentAt) : undefined;

    return {
      userId,
      invoiceId: pending.invoiceId ?? undefined,
      categoryId: pending.categoryId ?? undefined,
      description: pending.description ?? undefined,
      merchantName: pending.merchantName ?? undefined,
      amount: pending.amount,
      spentAt,
      confirmedByUser: true,
      sourceType: 'text',
      sourceMetadata: { confirmedFromChat: true },
    };
  }

  function toSavedExpenseResponse(expense: FinanceExpense): FinanceSavedExpense {
    return {
      id: expense.id,
      userId: expense.userId,
      invoiceId: expense.invoiceId,
      categoryId: expense.categoryId,
      description: expense.description,
      merchantName: expense.merchantName,
      amount: expense.amount,
      spentAt: expense.spentAt?.toISOString() ?? null,
      confirmedByUser: expense.confirmedByUser,
      sourceType: expense.sourceType,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }

  async function saveIfConfirmed(
    userId: string,
    input: SendFinanceChatMessageInput,
    aiResponse: FinanceChatAiResponse,
  ): Promise<FinanceSavedExpense | null> {
    if (!input.isConfirmationResponse || aiResponse.requiresConfirmation || !aiResponse.extractedExpense) {
      return null;
    }

    const pendingExpense = {
      ...(input.pendingExpense ?? {}),
      ...aiResponse.extractedExpense,
    } as PendingFinanceExpenseInput;

    await assertCategoryOwnership(userId, pendingExpense.categoryId ?? null);
    await assertInvoiceOwnership(userId, pendingExpense.invoiceId ?? null);

    const expense = await deps.repository.createConfirmedExpense(toExpenseCreateData(userId, pendingExpense));

    return toSavedExpenseResponse(expense);
  }

  return {
    async start(userId, input) {
      const session = await deps.repository.createSession(userId, input.sessionTitle ?? 'Finance Chat Session');

      return {
        sessionId: session.id,
        initialMessage: 'Xin chào! Tôi là trợ lý AI quản lý chi tiêu. Bạn có thể nhập chi tiêu hoặc tải ảnh hóa đơn.',
      };
    },

    async sendMessage(userId, sessionId, input) {
      await assertSession(userId, sessionId);

      await deps.repository.createUserMessage(sessionId, input.content);

      const { categories, budgets, recentExpenses, chatHistory } = await deps.repository.loadChatContext(
        userId,
        sessionId,
      );

      const aiResponse = await deps.financeAiClient.chatRespond({
        sessionId,
        message: input.content,
        messageType: input.messageType,
        isConfirmationResponse: input.isConfirmationResponse,
        pendingExpense: input.pendingExpense ?? null,
        categories,
        budgets,
        recentExpenses,
        chatHistory,
        locale: 'vi-VN',
      });

      const savedExpense = await saveIfConfirmed(userId, input, aiResponse);
      const response: SendFinanceChatResponse = { ...aiResponse, savedExpense };

      await deps.repository.createAssistantMessage(sessionId, aiResponse.assistantMessage, response);

      return response;
    },

    async history(userId, sessionId) {
      await assertSession(userId, sessionId);
      return deps.repository.listSessionMessages(sessionId);
    },

    async close(userId, sessionId) {
      const closed = await deps.repository.closeSessionForUser(userId, sessionId);
      if (!closed) throw notFound('Finance chat session not found');
    },
  };
}
```

Run: `pnpm --dir backend test -- chat.service.spec.ts` → Expected: PASS.

- [ ] **Step 7: Wiring `chat.router.ts`**

Thay khối khởi tạo controller bằng:

```typescript
import { createPrismaFinanceChatRepository } from './chat.prisma.repository';
```

```typescript
  const repository = createPrismaFinanceChatRepository(deps.prisma);
  const controller = createFinanceChatController(createFinanceChatService({
    repository,
    financeAiClient: deps.financeAiClient,
  }));
```

- [ ] **Step 8: Test + typecheck backend & frontend + commit**

Run: `pnpm --dir backend test -- chat && pnpm --dir backend typecheck && pnpm --dir backend test` → PASS.
Run: `pnpm --dir frontend typecheck && pnpm --dir frontend test` → PASS (savedExpense.amount vốn đã number).

```bash
git add backend/src/finance/chat
git commit -m "refactor(finance/chat): add repository/model layers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 11: Module finance/advice

**Files:**
- Create: `backend/src/finance/advice/advice.model.ts`
- Create: `backend/src/finance/advice/advice.repository.ts`
- Create: `backend/src/finance/advice/advice.prisma.repository.ts`
- Test: `backend/src/finance/advice/advice.prisma.repository.spec.ts`
- Modify: `advice.service.ts` (viết lại), `advice.service.spec.ts` (viết lại), `advice.router.ts` (wiring)

**Interfaces:**
- Consumes: `FinanceBudget`/`toFinanceBudget`/`includeBudgetRelations` (Task 6), `FinanceExpense`/`toFinanceExpense`/`includeExpenseRelations` (Task 7), `FinanceAiClient`.
- Produces: `FinanceAdviceService.generate(userId, period)` — không đổi.
- **Lưu ý (đã chấp nhận):** query expenses cũ chỉ `include: { category: true }`; repo mới dùng `includeExpenseRelations` (thêm `invoice`) để tái dùng mapper chuẩn → payload gửi AI và `inputData` log thêm field `invoice` (null/object) và tiền thành number. HTTP response không đổi (passthrough từ AI).

- [ ] **Step 1: Tạo `advice.model.ts`**

```typescript
export type CreateFinanceAiInteractionData = {
  userId: string;
  interactionType: 'financial_advice';
  inputData: unknown;
  aiResponse: unknown;
};
```

- [ ] **Step 2: Tạo `advice.repository.ts`**

```typescript
import type { FinanceBudget } from '../budgets/budgets.model';
import type { FinanceExpense } from '../expenses/expenses.model';
import type { CreateFinanceAiInteractionData } from './advice.model';

export interface FinanceAdviceRepository {
  listBudgetsWithCategory(userId: string): Promise<FinanceBudget[]>;
  listRecentExpenses(userId: string, take: number): Promise<FinanceExpense[]>;
  createInteractionLog(data: CreateFinanceAiInteractionData): Promise<void>;
}
```

- [ ] **Step 3: Viết `advice.prisma.repository.spec.ts` (fail) rồi impl**

Spec:

```typescript
import { Prisma, type PrismaClient } from '@prisma/client';
import { createPrismaFinanceAdviceRepository } from './advice.prisma.repository';

const createdAt = new Date('2026-06-01T00:00:00.000Z');

function createPrismaMock() {
  return {
    financeBudget: { findMany: jest.fn() },
    financeExpense: { findMany: jest.fn() },
    financeAIInteraction: { create: jest.fn() },
  };
}

describe('createPrismaFinanceAdviceRepository', () => {
  it('loads budgets with category, money as numbers', async () => {
    const prisma = createPrismaMock();
    prisma.financeBudget.findMany.mockResolvedValue([
      {
        id: 'bud1',
        userId: 'user1',
        categoryId: 'cat1',
        limitAmount: new Prisma.Decimal('2000000'),
        period: 'monthly',
        alertThreshold: 0.8,
        createdAt,
        updatedAt: createdAt,
        category: {
          id: 'cat1',
          userId: 'user1',
          name: 'Ăn uống',
          description: null,
          icon: null,
          color: null,
          isSystemCategory: true,
          displayOrder: 0,
          createdAt,
          updatedAt: createdAt,
        },
      },
    ]);
    const repository = createPrismaFinanceAdviceRepository(prisma as unknown as PrismaClient);

    const budgets = await repository.listBudgetsWithCategory('user1');

    expect(prisma.financeBudget.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      include: { category: true },
    });
    expect(budgets[0]).toMatchObject({ limitAmount: 2000000 });
  });

  it('loads recent expenses newest first with the requested take', async () => {
    const prisma = createPrismaMock();
    prisma.financeExpense.findMany.mockResolvedValue([]);
    const repository = createPrismaFinanceAdviceRepository(prisma as unknown as PrismaClient);

    await repository.listRecentExpenses('user1', 200);

    expect(prisma.financeExpense.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      include: { category: true, invoice: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  });

  it('persists the AI interaction log', async () => {
    const prisma = createPrismaMock();
    const repository = createPrismaFinanceAdviceRepository(prisma as unknown as PrismaClient);

    await repository.createInteractionLog({
      userId: 'user1',
      interactionType: 'financial_advice',
      inputData: { period: 'monthly' },
      aiResponse: { advice: 'Tiết kiệm hơn' },
    });

    expect(prisma.financeAIInteraction.create).toHaveBeenCalledWith({
      data: {
        userId: 'user1',
        interactionType: 'financial_advice',
        inputData: { period: 'monthly' },
        aiResponse: { advice: 'Tiết kiệm hơn' },
      },
    });
  });
});
```

Impl `advice.prisma.repository.ts`:

```typescript
import type { Prisma, PrismaClient } from '@prisma/client';
import { includeBudgetRelations, toFinanceBudget } from '../budgets/budgets.prisma.repository';
import { includeExpenseRelations, toFinanceExpense } from '../expenses/expenses.prisma.repository';
import type { FinanceAdviceRepository } from './advice.repository';

export function createPrismaFinanceAdviceRepository(prisma: PrismaClient): FinanceAdviceRepository {
  return {
    async listBudgetsWithCategory(userId) {
      const budgets = await prisma.financeBudget.findMany({
        where: { userId },
        include: includeBudgetRelations,
      });

      return budgets.map(toFinanceBudget);
    },

    async listRecentExpenses(userId, take) {
      const expenses = await prisma.financeExpense.findMany({
        where: { userId },
        include: includeExpenseRelations,
        orderBy: { createdAt: 'desc' },
        take,
      });

      return expenses.map(toFinanceExpense);
    },

    async createInteractionLog(data) {
      await prisma.financeAIInteraction.create({
        data: {
          userId: data.userId,
          interactionType: data.interactionType,
          inputData: data.inputData as Prisma.InputJsonValue,
          aiResponse: data.aiResponse as Prisma.InputJsonValue,
        },
      });
    },
  };
}
```

Run: `pnpm --dir backend test -- advice.prisma.repository.spec.ts` → PASS (3 test).

- [ ] **Step 4: Viết lại `advice.service.spec.ts` (fail trước)**

Thay toàn bộ nội dung file bằng:

```typescript
import type { FinanceAdviceRepository } from './advice.repository';
import { createFinanceAdviceService } from './advice.service';

function createDeps() {
  const repository: jest.Mocked<FinanceAdviceRepository> = {
    listBudgetsWithCategory: jest.fn(),
    listRecentExpenses: jest.fn(),
    createInteractionLog: jest.fn(),
  };

  return {
    repository,
    financeAiClient: {
      extractExpenseText: jest.fn(),
      extractInvoiceImage: jest.fn(),
      generateAdvice: jest.fn(),
      chatRespond: jest.fn(),
    },
  };
}

describe('createFinanceAdviceService', () => {
  it('generates advice from the user context and logs the interaction', async () => {
    const deps = createDeps();
    deps.repository.listBudgetsWithCategory.mockResolvedValue([]);
    deps.repository.listRecentExpenses.mockResolvedValue([]);
    const aiResponse = { advice: 'Giảm ăn ngoài', highlights: [], warnings: [] };
    deps.financeAiClient.generateAdvice.mockResolvedValue(aiResponse);
    const service = createFinanceAdviceService(deps);

    const result = await service.generate('user1', 'monthly');

    expect(deps.repository.listRecentExpenses).toHaveBeenCalledWith('user1', 200);
    expect(deps.financeAiClient.generateAdvice).toHaveBeenCalledWith({
      period: 'monthly',
      budgets: [],
      expenses: [],
      locale: 'vi-VN',
    });
    expect(deps.repository.createInteractionLog).toHaveBeenCalledWith({
      userId: 'user1',
      interactionType: 'financial_advice',
      inputData: { period: 'monthly', budgets: [], expenses: [] },
      aiResponse,
    });
    expect(result).toBe(aiResponse);
  });

  it('propagates AI failures without logging an interaction', async () => {
    const deps = createDeps();
    deps.repository.listBudgetsWithCategory.mockResolvedValue([]);
    deps.repository.listRecentExpenses.mockResolvedValue([]);
    deps.financeAiClient.generateAdvice.mockRejectedValue(new Error('ai down'));
    const service = createFinanceAdviceService(deps);

    await expect(service.generate('user1', 'weekly')).rejects.toThrow('ai down');
    expect(deps.repository.createInteractionLog).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Viết lại `advice.service.ts`**

Thay toàn bộ nội dung file bằng:

```typescript
import type { FinanceAiClient } from '../ai-client';
import type { FinanceAdviceRepository } from './advice.repository';

export type FinanceAdviceService = {
  generate(userId: string, period: 'weekly' | 'monthly' | 'yearly'): Promise<unknown>;
};

export function createFinanceAdviceService(
  deps: { repository: FinanceAdviceRepository; financeAiClient: FinanceAiClient },
): FinanceAdviceService {
  return {
    async generate(userId, period) {
      const [budgets, expenses] = await Promise.all([
        deps.repository.listBudgetsWithCategory(userId),
        deps.repository.listRecentExpenses(userId, 200),
      ]);

      const response = await deps.financeAiClient.generateAdvice({ period, budgets, expenses, locale: 'vi-VN' });

      await deps.repository.createInteractionLog({
        userId,
        interactionType: 'financial_advice',
        inputData: { period, budgets, expenses },
        aiResponse: response,
      });

      return response;
    },
  };
}
```

- [ ] **Step 6: Wiring `advice.router.ts`**

```typescript
import { createPrismaFinanceAdviceRepository } from './advice.prisma.repository';
```

```typescript
  const repository = createPrismaFinanceAdviceRepository(deps.prisma);
  const controller = createFinanceAdviceController(createFinanceAdviceService({
    repository,
    financeAiClient: deps.financeAiClient,
  }));
```

- [ ] **Step 7: Test + typecheck + commit** (HTTP response passthrough — không cần vòng frontend)

Run: `pnpm --dir backend test -- advice && pnpm --dir backend typecheck && pnpm --dir backend test` → PASS.

```bash
git add backend/src/finance/advice
git commit -m "refactor(finance/advice): add repository/model layers

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 12: Module finance/invoices

**Files:**
- Modify: `backend/src/finance/invoices/invoices.model.ts` (thêm `FinanceInvoicePendingExpense` — file đã tạo ở Task 7)
- Create: `backend/src/finance/invoices/invoices.repository.ts`
- Create: `backend/src/finance/invoices/invoices.prisma.repository.ts`
- Test: `backend/src/finance/invoices/invoices.prisma.repository.spec.ts`
- Modify: `invoices.service.ts` (viết lại), `invoices.service.spec.ts` (viết lại), `invoices.router.ts` (wiring)
- Không sửa: `invoices.storage.ts`, `invoices.controller.ts`, `invoices.router.spec.ts` (chỉ test cấu hình upload).

**Interfaces:**
- Consumes: `toFinanceInvoice` (Task 7 — export từ `expenses.prisma.repository`), `FinanceInvoice` (invoices.model), `FinanceAiClient.extractInvoiceImage`.
- Produces: `FinanceInvoicesService` — `list(userId): Promise<FinanceInvoice[]>`, `processUpload(userId, file): Promise<{ invoice: FinanceInvoice; pendingExpense: FinanceInvoicePendingExpense | null }>` (hết kiểu `unknown`; wire không đổi trừ `totalAmount` → number).

- [ ] **Step 1: Thêm type vào `invoices.model.ts`**

Thêm vào cuối file:

```typescript
export type FinanceInvoicePendingExpense = {
  invoiceId: string;
  merchantName: string | null;
  description: string;
  amount: number;
  spentAt: string | null;
  sourceType: 'image';
};
```

- [ ] **Step 2: Tạo `invoices.repository.ts`**

```typescript
import type { FinanceInvoice } from './invoices.model';

export type ApplyFinanceInvoiceExtractionData = {
  status: string;
  storeName?: string;
  purchasedAt?: Date;
  totalAmount?: number;
  extractedData: unknown;
};

export interface FinanceInvoicesRepository {
  listByUser(userId: string): Promise<FinanceInvoice[]>;
  createPending(userId: string, data: { filename: string; filePath: string }): Promise<FinanceInvoice>;
  markFailed(id: string): Promise<FinanceInvoice>;
  applyExtraction(id: string, data: ApplyFinanceInvoiceExtractionData): Promise<FinanceInvoice>;
}
```

- [ ] **Step 3: Viết `invoices.prisma.repository.spec.ts` (fail) rồi impl**

Spec:

```typescript
import { Prisma, type PrismaClient } from '@prisma/client';
import { createPrismaFinanceInvoicesRepository } from './invoices.prisma.repository';

const createdAt = new Date('2026-06-01T00:00:00.000Z');

function createInvoiceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv1',
    userId: 'user1',
    filename: 'bill.png',
    filePath: 'uploads/finance-invoices/bill.png',
    storeName: null,
    purchasedAt: null,
    totalAmount: new Prisma.Decimal('99000'),
    extractedData: null,
    status: 'pending',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function createPrismaMock() {
  return { financeInvoice: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() } };
}

function createRepository(prisma: ReturnType<typeof createPrismaMock>) {
  return createPrismaFinanceInvoicesRepository(prisma as unknown as PrismaClient);
}

describe('createPrismaFinanceInvoicesRepository', () => {
  it('lists user invoices newest first with money as numbers', async () => {
    const prisma = createPrismaMock();
    prisma.financeInvoice.findMany.mockResolvedValue([createInvoiceRow()]);
    const repository = createRepository(prisma);

    const invoices = await repository.listByUser('user1');

    expect(prisma.financeInvoice.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(invoices[0]).toMatchObject({ id: 'inv1', totalAmount: 99000 });
  });

  it('creates a pending invoice', async () => {
    const prisma = createPrismaMock();
    prisma.financeInvoice.create.mockResolvedValue(createInvoiceRow({ totalAmount: null }));
    const repository = createRepository(prisma);

    const invoice = await repository.createPending('user1', {
      filename: 'bill.png',
      filePath: 'uploads/finance-invoices/bill.png',
    });

    expect(prisma.financeInvoice.create).toHaveBeenCalledWith({
      data: {
        userId: 'user1',
        filename: 'bill.png',
        filePath: 'uploads/finance-invoices/bill.png',
        status: 'pending',
      },
    });
    expect(invoice.totalAmount).toBeNull();
  });

  it('marks an invoice as failed', async () => {
    const prisma = createPrismaMock();
    prisma.financeInvoice.update.mockResolvedValue(createInvoiceRow({ status: 'failed' }));
    const repository = createRepository(prisma);

    await expect(repository.markFailed('inv1')).resolves.toMatchObject({ status: 'failed' });
    expect(prisma.financeInvoice.update).toHaveBeenCalledWith({
      where: { id: 'inv1' },
      data: { status: 'failed' },
    });
  });

  it('applies extraction results', async () => {
    const prisma = createPrismaMock();
    prisma.financeInvoice.update.mockResolvedValue(createInvoiceRow({ status: 'processed' }));
    const repository = createRepository(prisma);
    const purchasedAt = new Date('2026-06-01T00:00:00.000Z');

    await repository.applyExtraction('inv1', {
      status: 'processed',
      storeName: 'Quán A',
      purchasedAt,
      totalAmount: 99000,
      extractedData: { items: [] },
    });

    expect(prisma.financeInvoice.update).toHaveBeenCalledWith({
      where: { id: 'inv1' },
      data: {
        status: 'processed',
        storeName: 'Quán A',
        purchasedAt,
        totalAmount: 99000,
        extractedData: { items: [] },
      },
    });
  });
});
```

Impl `invoices.prisma.repository.ts`:

```typescript
import type { Prisma, PrismaClient } from '@prisma/client';
import { toFinanceInvoice } from '../expenses/expenses.prisma.repository';
import type { FinanceInvoicesRepository } from './invoices.repository';

export function createPrismaFinanceInvoicesRepository(prisma: PrismaClient): FinanceInvoicesRepository {
  return {
    async listByUser(userId) {
      const invoices = await prisma.financeInvoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return invoices.map(toFinanceInvoice);
    },

    async createPending(userId, data) {
      const invoice = await prisma.financeInvoice.create({
        data: { userId, filename: data.filename, filePath: data.filePath, status: 'pending' },
      });

      return toFinanceInvoice(invoice);
    },

    async markFailed(id) {
      const invoice = await prisma.financeInvoice.update({ where: { id }, data: { status: 'failed' } });
      return toFinanceInvoice(invoice);
    },

    async applyExtraction(id, data) {
      const invoice = await prisma.financeInvoice.update({
        where: { id },
        data: { ...data, extractedData: data.extractedData as Prisma.InputJsonValue },
      });

      return toFinanceInvoice(invoice);
    },
  };
}
```

Run: `pnpm --dir backend test -- invoices.prisma.repository.spec.ts` → PASS (4 test).

- [ ] **Step 4: Viết lại `invoices.service.spec.ts` (fail trước)**

Thay toàn bộ nội dung file bằng:

```typescript
import path from 'path';
import { HttpError } from '../../errors';
import type { FinanceInvoice } from './invoices.model';
import type { FinanceInvoicesRepository } from './invoices.repository';
import { createFinanceInvoicesService } from './invoices.service';
import { FINANCE_INVOICE_UPLOAD_ROOT } from './invoices.storage';

const createdAt = new Date('2026-06-01T00:00:00.000Z');

function createInvoice(overrides: Partial<FinanceInvoice> = {}): FinanceInvoice {
  return {
    id: 'inv1',
    userId: 'user1',
    filename: 'bill.png',
    filePath: path.join(FINANCE_INVOICE_UPLOAD_ROOT, 'bill.png'),
    storeName: null,
    purchasedAt: null,
    totalAmount: null,
    extractedData: null,
    status: 'pending',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function createFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'bill.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 4,
    buffer: Buffer.from('data'),
    destination: FINANCE_INVOICE_UPLOAD_ROOT,
    filename: 'bill.png',
    path: path.join(FINANCE_INVOICE_UPLOAD_ROOT, 'bill.png'),
    stream: undefined as never,
    ...overrides,
  };
}

function createRepositoryMock(): jest.Mocked<FinanceInvoicesRepository> {
  return {
    listByUser: jest.fn(),
    createPending: jest.fn(),
    markFailed: jest.fn(),
    applyExtraction: jest.fn(),
  };
}

function createDeps() {
  return {
    repository: createRepositoryMock(),
    financeAiClient: {
      extractExpenseText: jest.fn(),
      extractInvoiceImage: jest.fn(),
      generateAdvice: jest.fn(),
      chatRespond: jest.fn(),
    },
  };
}

describe('createFinanceInvoicesService', () => {
  it('lists invoices through the repository', async () => {
    const deps = createDeps();
    const invoices = [createInvoice()];
    deps.repository.listByUser.mockResolvedValue(invoices);
    const service = createFinanceInvoicesService(deps);

    await expect(service.list('user1')).resolves.toEqual(invoices);
    expect(deps.repository.listByUser).toHaveBeenCalledWith('user1');
  });

  it('rejects uploads whose stored path escapes the upload root', async () => {
    const deps = createDeps();
    const service = createFinanceInvoicesService(deps);

    await expect(
      service.processUpload('user1', createFile({ path: '/etc/passwd' })),
    ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid finance invoice upload path' });
    expect(deps.repository.createPending).not.toHaveBeenCalled();
  });

  it('processes an upload end-to-end and returns the pending expense', async () => {
    const deps = createDeps();
    deps.repository.createPending.mockResolvedValue(createInvoice());
    deps.repository.applyExtraction.mockResolvedValue(
      createInvoice({ status: 'processed', storeName: 'Quán A', totalAmount: 99000 }),
    );
    deps.financeAiClient.extractInvoiceImage.mockResolvedValue({
      storeName: 'Quán A',
      totalAmount: 99000,
      purchasedAt: '2026-06-01T00:00:00.000Z',
      rawText: 'hóa đơn 99k',
      extractedData: { items: [] },
      assistantMessage: 'Đã đọc hóa đơn',
    });
    const service = createFinanceInvoicesService(deps);

    const result = await service.processUpload('user1', createFile());

    expect(deps.repository.createPending).toHaveBeenCalledWith('user1', {
      filename: 'bill.png',
      filePath: path.join(FINANCE_INVOICE_UPLOAD_ROOT, 'bill.png'),
    });
    expect(deps.repository.applyExtraction).toHaveBeenCalledWith('inv1', {
      status: 'processed',
      storeName: 'Quán A',
      purchasedAt: new Date('2026-06-01T00:00:00.000Z'),
      totalAmount: 99000,
      extractedData: { items: [] },
    });
    expect(result.invoice).toMatchObject({ status: 'processed', totalAmount: 99000 });
    expect(result.pendingExpense).toEqual({
      invoiceId: 'inv1',
      merchantName: 'Quán A',
      description: 'hóa đơn 99k',
      amount: 99000,
      spentAt: '2026-06-01T00:00:00.000Z',
      sourceType: 'image',
    });
  });

  it('returns a null pending expense when the AI finds no total amount', async () => {
    const deps = createDeps();
    deps.repository.createPending.mockResolvedValue(createInvoice());
    deps.repository.applyExtraction.mockResolvedValue(createInvoice());
    deps.financeAiClient.extractInvoiceImage.mockResolvedValue({
      storeName: null,
      totalAmount: null,
      purchasedAt: null,
      rawText: null,
      extractedData: {},
      assistantMessage: 'Không đọc được tổng tiền',
    });
    const service = createFinanceInvoicesService(deps);

    const result = await service.processUpload('user1', createFile());

    expect(deps.repository.applyExtraction).toHaveBeenCalledWith('inv1', {
      status: 'pending',
      storeName: undefined,
      purchasedAt: undefined,
      totalAmount: undefined,
      extractedData: {},
    });
    expect(result.pendingExpense).toBeNull();
  });

  it('marks the invoice failed when the AI OCR gateway fails', async () => {
    const deps = createDeps();
    deps.repository.createPending.mockResolvedValue(createInvoice());
    deps.repository.markFailed.mockResolvedValue(createInvoice({ status: 'failed' }));
    deps.financeAiClient.extractInvoiceImage.mockRejectedValue(new HttpError(502, 'AI down'));
    const service = createFinanceInvoicesService(deps);

    const result = await service.processUpload('user1', createFile());

    expect(deps.repository.markFailed).toHaveBeenCalledWith('inv1');
    expect(result).toEqual({ invoice: expect.objectContaining({ status: 'failed' }), pendingExpense: null });
  });

  it('rethrows non-gateway AI errors', async () => {
    const deps = createDeps();
    deps.repository.createPending.mockResolvedValue(createInvoice());
    deps.financeAiClient.extractInvoiceImage.mockRejectedValue(new Error('boom'));
    const service = createFinanceInvoicesService(deps);

    await expect(service.processUpload('user1', createFile())).rejects.toThrow('boom');
    expect(deps.repository.markFailed).not.toHaveBeenCalled();
  });
});
```

Run: `pnpm --dir backend test -- invoices.service.spec.ts` → Expected: FAIL.

- [ ] **Step 5: Viết lại `invoices.service.ts`**

Thay toàn bộ nội dung file bằng (các helper path-safety giữ **nguyên văn** logic cũ):

```typescript
import { readFile, realpath } from 'fs/promises';
import path from 'path';
import { HttpError, validationError } from '../../errors';
import type { FinanceAiClient, FinanceInvoiceExtractResponse } from '../ai-client';
import type { FinanceInvoice, FinanceInvoicePendingExpense } from './invoices.model';
import type { FinanceInvoicesRepository } from './invoices.repository';
import { FINANCE_INVOICE_UPLOAD_ROOT } from './invoices.storage';

export type FinanceInvoicesService = {
  list(userId: string): Promise<FinanceInvoice[]>;
  processUpload(
    userId: string,
    file: Express.Multer.File,
  ): Promise<{ invoice: FinanceInvoice; pendingExpense: FinanceInvoicePendingExpense | null }>;
};

export function createFinanceInvoicesService(
  deps: { repository: FinanceInvoicesRepository; financeAiClient: FinanceAiClient },
): FinanceInvoicesService {
  function parsePurchasedAt(value?: string | null): Date | undefined {
    if (!value) return undefined;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }

  function toPendingExpense(
    invoiceId: string,
    result: FinanceInvoiceExtractResponse,
  ): FinanceInvoicePendingExpense | null {
    if (typeof result.totalAmount !== 'number') {
      return null;
    }

    return {
      invoiceId,
      merchantName: result.storeName ?? null,
      description: result.rawText ?? result.assistantMessage,
      amount: result.totalAmount,
      spentAt: result.purchasedAt ?? null,
      sourceType: 'image',
    };
  }

  function isPathWithinRoot(candidatePath: string, rootPath: string): boolean {
    const normalizedCandidate = process.platform === 'win32' ? candidatePath.toLowerCase() : candidatePath;
    const normalizedRoot = process.platform === 'win32' ? rootPath.toLowerCase() : rootPath;
    const relative = path.relative(normalizedRoot, normalizedCandidate);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  }

  async function resolveUploadRootPath(): Promise<string> {
    try {
      return await realpath(FINANCE_INVOICE_UPLOAD_ROOT);
    } catch {
      return FINANCE_INVOICE_UPLOAD_ROOT;
    }
  }

  async function resolveSafeStoredFilePath(file: Express.Multer.File): Promise<string> {
    const uploadRootPath = await resolveUploadRootPath();

    if (!file.path) {
      const fallbackPath = path.resolve(uploadRootPath, file.filename || file.originalname);
      if (!isPathWithinRoot(fallbackPath, uploadRootPath)) {
        throw validationError('Invalid finance invoice upload path');
      }

      return path.normalize(fallbackPath);
    }

    const resolvedPath = path.resolve(file.path);
    if (!isPathWithinRoot(resolvedPath, uploadRootPath)) {
      throw validationError('Invalid finance invoice upload path');
    }

    let canonicalPath = resolvedPath;
    try {
      canonicalPath = await realpath(resolvedPath);
    } catch {
      canonicalPath = resolvedPath;
    }

    if (!isPathWithinRoot(canonicalPath, uploadRootPath)) {
      throw validationError('Invalid finance invoice upload path');
    }

    return path.normalize(canonicalPath);
  }

  async function ensureFileBuffer(file: Express.Multer.File): Promise<Express.Multer.File> {
    if (file.buffer?.length) {
      return file;
    }

    const safePath = await resolveSafeStoredFilePath(file);
    const buffer = await readFile(safePath);
    return { ...file, path: safePath, buffer };
  }

  function isAiOcrFailure(error: unknown): error is HttpError {
    return error instanceof HttpError && error.statusCode === 502;
  }

  return {
    async list(userId) {
      return deps.repository.listByUser(userId);
    },

    async processUpload(userId, file) {
      const storedFilePath = await resolveSafeStoredFilePath(file);
      const invoice = await deps.repository.createPending(userId, {
        filename: file.originalname,
        filePath: storedFilePath,
      });

      const uploadFile = await ensureFileBuffer({ ...file, path: storedFilePath });

      let extraction: FinanceInvoiceExtractResponse;
      try {
        extraction = await deps.financeAiClient.extractInvoiceImage(uploadFile);
      } catch (error) {
        if (!isAiOcrFailure(error)) {
          throw error;
        }

        const failedInvoice = await deps.repository.markFailed(invoice.id);

        return {
          invoice: failedInvoice,
          pendingExpense: null,
        };
      }

      const purchasedAt = parsePurchasedAt(extraction.purchasedAt);
      const updatedInvoice = await deps.repository.applyExtraction(invoice.id, {
        status: typeof extraction.totalAmount === 'number' ? 'processed' : 'pending',
        storeName: extraction.storeName ?? undefined,
        purchasedAt,
        totalAmount: extraction.totalAmount ?? undefined,
        extractedData: extraction.extractedData,
      });

      return {
        invoice: updatedInvoice,
        pendingExpense: toPendingExpense(invoice.id, extraction),
      };
    },
  };
}
```

(Import `FINANCE_INVOICE_UPLOAD_DIR` cũ không còn dùng trong service — bỏ.)

Run: `pnpm --dir backend test -- invoices.service.spec.ts` → Expected: PASS.

- [ ] **Step 6: Wiring `invoices.router.ts`**

```typescript
import { createPrismaFinanceInvoicesRepository } from './invoices.prisma.repository';
```

```typescript
  const repository = createPrismaFinanceInvoicesRepository(deps.prisma);
  const controller = createFinanceInvoicesController(createFinanceInvoicesService({
    repository,
    financeAiClient: deps.financeAiClient,
  }));
```

- [ ] **Step 7: Test + typecheck backend & frontend (wire đổi: totalAmount → number) + commit**

Run: `pnpm --dir backend test -- invoices && pnpm --dir backend typecheck && pnpm --dir backend test` → PASS.
Run: `pnpm --dir frontend typecheck && pnpm --dir frontend test` → PASS (`parseFinanceInvoice` chấp nhận cả string lẫn number).

```bash
git add backend/src/finance/invoices
git commit -m "refactor(finance/invoices)!: add repository/model layers, totalAmount as JSON number

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 13: Module stories

**Files:**
- Create: `backend/src/books/stories/stories.model.ts`
- Create: `backend/src/books/stories/stories.repository.ts`
- Create: `backend/src/books/stories/stories.prisma.repository.ts`
- Test: `backend/src/books/stories/stories.prisma.repository.spec.ts`
- Modify: `stories.service.ts` (viết lại), `stories.service.spec.ts` (viết lại), `stories.router.ts` (wiring)

**Interfaces:**
- Consumes: `StoryContentReader` (`storage/story-content-storage.ts` — giữ nguyên), `ListStoriesQuery` (stories.schema).
- Produces (Task 15 dùng `StoryWithCategory`): types trong stories.model; interface `StoriesRepository`. `StoriesService` — 3 method giữ nguyên. **Cải tiến có chủ đích:** bỏ fallback `createStoryContentReader()` trong service — reader luôn inject từ `deps.storyContentReader`.

- [ ] **Step 1: Tạo `stories.model.ts`**

```typescript
export type StoryCategory = { id: string; name: string };

export type Story = {
  id: string;
  productId: number;
  title: string;
  authors: string;
  originalPrice: number | null;
  currentPrice: number | null;
  quantity: number | null;
  categoryId: string;
  averageRating: number;
  reviewCount: number;
  externalAverageRating: number;
  externalReviewCount: number;
  userAverageRating: number;
  userReviewCount: number;
  pages: number | null;
  manufacturer: string | null;
  coverUrl: string | null;
  discount: number | null;
  contentPath: string | null;
  contentHash: string | null;
  contentUpdatedAt: Date | null;
  contentIndexedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StoryWithCategory = Story & { category: StoryCategory };

export type StorySearchQuery = {
  page: number;
  limit: number;
  q?: string;
  hasContent?: boolean;
};

export type StoryResponse = Omit<StoryWithCategory, 'category' | 'contentPath'> & {
  category: string;
  hasContent: boolean;
};

export type ListStoriesResponse = {
  items: StoryResponse[];
  total: number;
  page: number;
  limit: number;
};

export type StoryContentResponse = {
  storyId: string;
  title: string;
  content: string;
};
```

- [ ] **Step 2: Tạo `stories.repository.ts`**

```typescript
import type { StorySearchQuery, StoryWithCategory } from './stories.model';

export type StoryContentMeta = { id: string; title: string; contentPath: string | null };

export interface StoriesRepository {
  searchStories(query: StorySearchQuery): Promise<{ items: StoryWithCategory[]; total: number }>;
  findByIdWithCategory(id: string): Promise<StoryWithCategory | null>;
  findContentMeta(id: string): Promise<StoryContentMeta | null>;
}
```

- [ ] **Step 3: Viết `stories.prisma.repository.spec.ts` (fail) rồi impl**

Spec:

```typescript
import type { PrismaClient } from '@prisma/client';
import { createPrismaStoriesRepository } from './stories.prisma.repository';

const createdAt = new Date('2026-01-01T00:00:00.000Z');

function createStoryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'story1',
    productId: 1,
    title: 'Tiên hiệp ký',
    authors: 'Tác giả A',
    originalPrice: 100000,
    currentPrice: 90000,
    quantity: 10,
    categoryId: 'cat1',
    averageRating: 4.5,
    reviewCount: 10,
    externalAverageRating: 4.2,
    externalReviewCount: 120,
    userAverageRating: 4.8,
    userReviewCount: 5,
    pages: 300,
    manufacturer: null,
    coverUrl: null,
    discount: 0.1,
    contentPath: 'storage/stories/1.txt',
    contentHash: 'hash',
    contentUpdatedAt: createdAt,
    contentIndexedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
    category: { id: 'cat1', name: 'Tiên hiệp' },
    ...overrides,
  };
}

function createPrismaMock() {
  const prisma: any = {
    story: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
  };
  prisma.$transaction = jest.fn(async (operations: unknown) =>
    Array.isArray(operations) ? Promise.all(operations) : (operations as (tx: unknown) => unknown)(prisma),
  );
  return prisma;
}

function createRepository(prisma: ReturnType<typeof createPrismaMock>) {
  return createPrismaStoriesRepository(prisma as unknown as PrismaClient);
}

describe('createPrismaStoriesRepository', () => {
  it('searches stories with text filter, content filter, and pagination in one transaction', async () => {
    const prisma = createPrismaMock();
    prisma.story.findMany.mockResolvedValue([createStoryRow()]);
    prisma.story.count.mockResolvedValue(1);
    const repository = createRepository(prisma);

    const result = await repository.searchStories({ page: 2, limit: 20, q: 'tiên', hasContent: true });

    const expectedWhere = {
      OR: [
        { title: { contains: 'tiên', mode: 'insensitive' } },
        { authors: { contains: 'tiên', mode: 'insensitive' } },
        { category: { name: { contains: 'tiên', mode: 'insensitive' } } },
      ],
      contentPath: { not: null },
    };
    expect(prisma.story.findMany).toHaveBeenCalledWith({
      where: expectedWhere,
      include: { category: true },
      orderBy: [{ externalReviewCount: 'desc' }, { externalAverageRating: 'desc' }, { title: 'asc' }],
      skip: 20,
      take: 20,
    });
    expect(prisma.story.count).toHaveBeenCalledWith({ where: expectedWhere });
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({ id: 'story1', category: { id: 'cat1', name: 'Tiên hiệp' } });
  });

  it('searches without filters when q/hasContent are absent', async () => {
    const prisma = createPrismaMock();
    prisma.story.findMany.mockResolvedValue([]);
    prisma.story.count.mockResolvedValue(0);
    const repository = createRepository(prisma);

    await repository.searchStories({ page: 1, limit: 20 });

    expect(prisma.story.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, skip: 0, take: 20 }),
    );
  });

  it('finds a story by id with its category', async () => {
    const prisma = createPrismaMock();
    prisma.story.findUnique.mockResolvedValue(createStoryRow());
    const repository = createRepository(prisma);

    await expect(repository.findByIdWithCategory('story1')).resolves.toMatchObject({ id: 'story1' });
    expect(prisma.story.findUnique).toHaveBeenCalledWith({
      where: { id: 'story1' },
      include: { category: true },
    });

    prisma.story.findUnique.mockResolvedValue(null);
    await expect(repository.findByIdWithCategory('missing')).resolves.toBeNull();
  });

  it('finds the content meta projection', async () => {
    const prisma = createPrismaMock();
    prisma.story.findUnique.mockResolvedValue({ id: 'story1', title: 'Tiên hiệp ký', contentPath: 'storage/stories/1.txt' });
    const repository = createRepository(prisma);

    await expect(repository.findContentMeta('story1')).resolves.toEqual({
      id: 'story1',
      title: 'Tiên hiệp ký',
      contentPath: 'storage/stories/1.txt',
    });
    expect(prisma.story.findUnique).toHaveBeenCalledWith({
      where: { id: 'story1' },
      select: { id: true, title: true, contentPath: true },
    });
  });
});
```

Impl `stories.prisma.repository.ts`:

```typescript
import type { Prisma, PrismaClient } from '@prisma/client';
import type { StoryWithCategory } from './stories.model';
import type { StoriesRepository } from './stories.repository';

const includeStoryCategory = { category: true } satisfies Prisma.StoryInclude;

type PrismaStoryWithCategory = Prisma.StoryGetPayload<{ include: typeof includeStoryCategory }>;

function toStoryWithCategory(story: PrismaStoryWithCategory): StoryWithCategory {
  return {
    id: story.id,
    productId: story.productId,
    title: story.title,
    authors: story.authors,
    originalPrice: story.originalPrice,
    currentPrice: story.currentPrice,
    quantity: story.quantity,
    categoryId: story.categoryId,
    averageRating: story.averageRating,
    reviewCount: story.reviewCount,
    externalAverageRating: story.externalAverageRating,
    externalReviewCount: story.externalReviewCount,
    userAverageRating: story.userAverageRating,
    userReviewCount: story.userReviewCount,
    pages: story.pages,
    manufacturer: story.manufacturer,
    coverUrl: story.coverUrl,
    discount: story.discount,
    contentPath: story.contentPath,
    contentHash: story.contentHash,
    contentUpdatedAt: story.contentUpdatedAt,
    contentIndexedAt: story.contentIndexedAt,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
    category: { id: story.category.id, name: story.category.name },
  };
}

export function createPrismaStoriesRepository(prisma: PrismaClient): StoriesRepository {
  return {
    async searchStories(query) {
      const where: Prisma.StoryWhereInput = {
        ...(query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: 'insensitive' } },
                { authors: { contains: query.q, mode: 'insensitive' } },
                { category: { name: { contains: query.q, mode: 'insensitive' } } },
              ],
            }
          : {}),
        ...(query.hasContent === true ? { contentPath: { not: null } } : {}),
      };

      const [items, total] = await prisma.$transaction([
        prisma.story.findMany({
          where,
          include: includeStoryCategory,
          orderBy: [{ externalReviewCount: 'desc' }, { externalAverageRating: 'desc' }, { title: 'asc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        prisma.story.count({ where }),
      ]);

      return { items: items.map(toStoryWithCategory), total };
    },

    async findByIdWithCategory(id) {
      const story = await prisma.story.findUnique({ where: { id }, include: includeStoryCategory });
      return story ? toStoryWithCategory(story) : null;
    },

    async findContentMeta(id) {
      return prisma.story.findUnique({
        where: { id },
        select: { id: true, title: true, contentPath: true },
      });
    },
  };
}
```

Run: `pnpm --dir backend test -- stories.prisma.repository.spec.ts` → PASS (4 test).

- [ ] **Step 4: Viết lại `stories.service.spec.ts` (fail trước)**

Thay toàn bộ nội dung file bằng:

```typescript
import type { StoryWithCategory } from './stories.model';
import type { StoriesRepository } from './stories.repository';
import { createStoriesService } from './stories.service';

const createdAt = new Date('2026-01-01T00:00:00.000Z');

function createStory(overrides: Partial<StoryWithCategory> = {}): StoryWithCategory {
  return {
    id: 'story1',
    productId: 1,
    title: 'Tiên hiệp ký',
    authors: 'Tác giả A',
    originalPrice: 100000,
    currentPrice: 90000,
    quantity: 10,
    categoryId: 'cat1',
    averageRating: 4.5,
    reviewCount: 10,
    externalAverageRating: 4.2,
    externalReviewCount: 120,
    userAverageRating: 4.8,
    userReviewCount: 5,
    pages: 300,
    manufacturer: null,
    coverUrl: null,
    discount: 0.1,
    contentPath: 'storage/stories/1.txt',
    contentHash: 'hash',
    contentUpdatedAt: createdAt,
    contentIndexedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
    category: { id: 'cat1', name: 'Tiên hiệp' },
    ...overrides,
  };
}

function createRepositoryMock(): jest.Mocked<StoriesRepository> {
  return {
    searchStories: jest.fn(),
    findByIdWithCategory: jest.fn(),
    findContentMeta: jest.fn(),
  };
}

function createDeps() {
  return { repository: createRepositoryMock(), storyContentReader: { read: jest.fn() } };
}

describe('createStoriesService', () => {
  it('lists stories as public responses with pagination echo', async () => {
    const deps = createDeps();
    deps.repository.searchStories.mockResolvedValue({ items: [createStory()], total: 41 });
    const service = createStoriesService(deps);

    const result = await service.listStories({ page: 2, limit: 20 });

    expect(deps.repository.searchStories).toHaveBeenCalledWith({ page: 2, limit: 20 });
    expect(result.total).toBe(41);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(20);
    expect(result.items[0]).toMatchObject({ id: 'story1', category: 'Tiên hiệp', hasContent: true });
    expect(result.items[0]).not.toHaveProperty('contentPath');
  });

  it('reports a missing story', async () => {
    const deps = createDeps();
    deps.repository.findByIdWithCategory.mockResolvedValue(null);
    const service = createStoriesService(deps);

    await expect(service.getStoryById('missing')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Story not found',
    });
  });

  it('reads story content through the injected reader', async () => {
    const deps = createDeps();
    deps.repository.findContentMeta.mockResolvedValue({
      id: 'story1',
      title: 'Tiên hiệp ký',
      contentPath: 'storage/stories/1.txt',
    });
    deps.storyContentReader.read.mockResolvedValue('Ngày xửa ngày xưa...');
    const service = createStoriesService(deps);

    await expect(service.getStoryContentById('story1')).resolves.toEqual({
      storyId: 'story1',
      title: 'Tiên hiệp ký',
      content: 'Ngày xửa ngày xưa...',
    });
    expect(deps.storyContentReader.read).toHaveBeenCalledWith('storage/stories/1.txt');
  });

  it('reports missing content when the story has no content path or the reader misses', async () => {
    const deps = createDeps();
    deps.repository.findContentMeta.mockResolvedValue({ id: 'story1', title: 'Tiên hiệp ký', contentPath: null });
    const service = createStoriesService(deps);

    await expect(service.getStoryContentById('story1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Story content not found',
    });

    deps.repository.findContentMeta.mockResolvedValue({
      id: 'story1',
      title: 'Tiên hiệp ký',
      contentPath: 'storage/stories/1.txt',
    });
    deps.storyContentReader.read.mockResolvedValue(null);
    await expect(service.getStoryContentById('story1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Story content not found',
    });
  });
});
```

Run: `pnpm --dir backend test -- stories.service.spec.ts` → Expected: FAIL.

- [ ] **Step 5: Viết lại `stories.service.ts`**

Thay toàn bộ nội dung file bằng:

```typescript
import { notFound } from '../../errors';
import type { StoryContentReader } from '../../storage/story-content-storage';
import type {
  ListStoriesResponse,
  StoryContentResponse,
  StoryResponse,
  StoryWithCategory,
} from './stories.model';
import type { StoriesRepository } from './stories.repository';
import type { ListStoriesQuery } from './stories.schema';

export type StoriesService = {
  listStories(query: ListStoriesQuery): Promise<ListStoriesResponse>;
  getStoryById(id: string): Promise<StoryResponse>;
  getStoryContentById(id: string): Promise<StoryContentResponse>;
};

function toStoryResponse(story: StoryWithCategory): StoryResponse {
  const { category, contentPath, ...publicStory } = story;
  return { ...publicStory, category: category.name, hasContent: contentPath !== null };
}

export function createStoriesService(
  deps: { repository: StoriesRepository; storyContentReader: StoryContentReader },
): StoriesService {
  return {
    async listStories(query) {
      const { items, total } = await deps.repository.searchStories({
        page: query.page,
        limit: query.limit,
        q: query.q,
        hasContent: query.hasContent,
      });

      return { items: items.map(toStoryResponse), total, page: query.page, limit: query.limit };
    },

    async getStoryById(id) {
      const story = await deps.repository.findByIdWithCategory(id);

      if (!story) {
        throw notFound('Story not found');
      }

      return toStoryResponse(story);
    },

    async getStoryContentById(id) {
      const story = await deps.repository.findContentMeta(id);

      if (!story || !story.contentPath) {
        throw notFound('Story content not found');
      }

      const content = await deps.storyContentReader.read(story.contentPath);

      if (content === null) {
        throw notFound('Story content not found');
      }

      return {
        storyId: story.id,
        title: story.title,
        content,
      };
    },
  };
}
```

Lưu ý: test "lists stories" gọi `searchStories({ page: 2, limit: 20 })` nhưng service truyền `{ page, limit, q: undefined, hasContent: undefined }` — nếu assertion fail vì key `undefined`, đổi assertion thành `expect.objectContaining({ page: 2, limit: 20 })`.

- [ ] **Step 6: Wiring `stories.router.ts`**

```typescript
import { createPrismaStoriesRepository } from './stories.prisma.repository';
```

```typescript
  const repository = createPrismaStoriesRepository(deps.prisma);
  const controller = createStoriesController(createStoriesService({
    repository,
    storyContentReader: deps.storyContentReader,
  }));
```

- [ ] **Step 7: Test + typecheck + commit** (wire không đổi — ratings vốn là Float/number)

Run: `pnpm --dir backend test -- stories && pnpm --dir backend typecheck && pnpm --dir backend test` → PASS.

```bash
git add backend/src/books/stories
git commit -m "refactor(stories): add repository/model layers, always inject content reader

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 14: Module reviews (transaction + retry nằm trong repository)

**Files:**
- Create: `backend/src/books/reviews/reviews.model.ts`
- Create: `backend/src/books/reviews/reviews.repository.ts`
- Create: `backend/src/books/reviews/reviews.prisma.repository.ts`
- Test: `backend/src/books/reviews/reviews.prisma.repository.spec.ts`
- Modify: `reviews.service.ts` (viết lại), `reviews.service.spec.ts` (viết lại), `reviews.router.ts` (wiring)

**Interfaces:**
- Produces: `ReviewsService` — `reviewStory(userId, input): Promise<UserReview>`, `listMyReviews(userId, query): Promise<PaginatedMyReviews>` (giữ nguyên). Repo trả `null` khi story không tồn tại → service ném `notFound('Story not found')`. Retry P2034 (tối đa 3 lần, isolation Serializable) nằm **trọn trong prisma.repository**.

- [ ] **Step 1: Tạo `reviews.model.ts`**

```typescript
export type UserReview = {
  id: string;
  userId: string;
  storyId: string;
  rating: number;
  title: string;
  content: string;
  reviewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type MyReviewStory = {
  id: string;
  title: string;
  authors: string;
  externalAverageRating: number;
  externalReviewCount: number;
  userAverageRating: number;
  userReviewCount: number;
};

export type MyReview = UserReview & { story: MyReviewStory };

export type PaginatedMyReviews = {
  items: MyReview[];
  total: number;
  page: number;
  limit: number;
};

export type UpsertUserReviewData = {
  storyId: string;
  rating: number;
  title: string;
  content: string;
};
```

- [ ] **Step 2: Tạo `reviews.repository.ts`**

```typescript
import type { MyReview, UpsertUserReviewData, UserReview } from './reviews.model';

export interface ReviewsRepository {
  upsertForStoryAndRefreshRating(userId: string, input: UpsertUserReviewData): Promise<UserReview | null>;
  listByUser(userId: string, pagination: { page: number; limit: number }): Promise<{ items: MyReview[]; total: number }>;
}
```

- [ ] **Step 3: Viết `reviews.prisma.repository.spec.ts` (fail) rồi impl**

Spec:

```typescript
import { Prisma, type PrismaClient } from '@prisma/client';
import { createPrismaReviewsRepository } from './reviews.prisma.repository';

const reviewedAt = new Date('2026-06-01T00:00:00.000Z');

function createReviewRow() {
  return {
    id: 'rev1',
    userId: 'user1',
    storyId: 'story1',
    rating: 4.5,
    title: 'Hay',
    content: 'Đáng đọc',
    reviewedAt,
    createdAt: reviewedAt,
    updatedAt: reviewedAt,
  };
}

function createPrismaMock() {
  const tx = {
    story: { findUnique: jest.fn(), update: jest.fn() },
    userReview: { upsert: jest.fn(), aggregate: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  };
  const prisma: any = {
    ...tx,
    $transaction: jest.fn(async (arg: unknown, _options?: unknown) =>
      Array.isArray(arg) ? Promise.all(arg) : (arg as (t: typeof tx) => unknown)(tx),
    ),
  };
  return { prisma, tx };
}

function createRepository(prisma: any) {
  return createPrismaReviewsRepository(prisma as PrismaClient);
}

function serializationConflict() {
  return new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: 'test' });
}

const input = { storyId: 'story1', rating: 4.5, title: 'Hay', content: 'Đáng đọc' };

describe('createPrismaReviewsRepository', () => {
  it('upserts the review and refreshes the story rating in one serializable transaction', async () => {
    const { prisma, tx } = createPrismaMock();
    tx.story.findUnique.mockResolvedValue({ id: 'story1' });
    tx.userReview.upsert.mockResolvedValue(createReviewRow());
    tx.userReview.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: { _all: 3 } });
    const repository = createRepository(prisma);

    const review = await repository.upsertForStoryAndRefreshRating('user1', input);

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(tx.userReview.upsert).toHaveBeenCalledWith({
      where: { userId_storyId: { userId: 'user1', storyId: 'story1' } },
      update: { rating: 4.5, title: 'Hay', content: 'Đáng đọc', reviewedAt: expect.any(Date) },
      create: { userId: 'user1', storyId: 'story1', rating: 4.5, title: 'Hay', content: 'Đáng đọc' },
    });
    expect(tx.story.update).toHaveBeenCalledWith({
      where: { id: 'story1' },
      data: { userAverageRating: 4.5, userReviewCount: 3 },
    });
    expect(review).toMatchObject({ id: 'rev1', rating: 4.5 });
  });

  it('returns null without writing when the story does not exist', async () => {
    const { prisma, tx } = createPrismaMock();
    tx.story.findUnique.mockResolvedValue(null);
    const repository = createRepository(prisma);

    await expect(repository.upsertForStoryAndRefreshRating('user1', input)).resolves.toBeNull();
    expect(tx.userReview.upsert).not.toHaveBeenCalled();
  });

  it('defaults the aggregate to zero when no reviews remain', async () => {
    const { prisma, tx } = createPrismaMock();
    tx.story.findUnique.mockResolvedValue({ id: 'story1' });
    tx.userReview.upsert.mockResolvedValue(createReviewRow());
    tx.userReview.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: { _all: 0 } });
    const repository = createRepository(prisma);

    await repository.upsertForStoryAndRefreshRating('user1', input);

    expect(tx.story.update).toHaveBeenCalledWith({
      where: { id: 'story1' },
      data: { userAverageRating: 0, userReviewCount: 0 },
    });
  });

  it('retries serialization conflicts up to three attempts', async () => {
    const { prisma, tx } = createPrismaMock();
    tx.story.findUnique.mockResolvedValue({ id: 'story1' });
    tx.userReview.upsert.mockResolvedValue(createReviewRow());
    tx.userReview.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: { _all: 1 } });
    prisma.$transaction
      .mockRejectedValueOnce(serializationConflict())
      .mockRejectedValueOnce(serializationConflict());
    const repository = createRepository(prisma);

    await expect(repository.upsertForStoryAndRefreshRating('user1', input)).resolves.toMatchObject({ id: 'rev1' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('gives up after three serialization conflicts', async () => {
    const { prisma } = createPrismaMock();
    prisma.$transaction.mockRejectedValue(serializationConflict());
    const repository = createRepository(prisma);

    await expect(repository.upsertForStoryAndRefreshRating('user1', input)).rejects.toMatchObject({ code: 'P2034' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('lists my reviews with the story projection and total', async () => {
    const { prisma, tx } = createPrismaMock();
    const storySelect = {
      id: true,
      title: true,
      authors: true,
      externalAverageRating: true,
      externalReviewCount: true,
      userAverageRating: true,
      userReviewCount: true,
    };
    tx.userReview.findMany.mockResolvedValue([
      {
        ...createReviewRow(),
        story: {
          id: 'story1',
          title: 'Tiên hiệp ký',
          authors: 'Tác giả A',
          externalAverageRating: 4.2,
          externalReviewCount: 120,
          userAverageRating: 4.8,
          userReviewCount: 5,
        },
      },
    ]);
    tx.userReview.count.mockResolvedValue(1);
    const repository = createRepository(prisma);

    const result = await repository.listByUser('user1', { page: 1, limit: 20 });

    expect(tx.userReview.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      include: { story: { select: storySelect } },
      orderBy: { reviewedAt: 'desc' },
      skip: 0,
      take: 20,
    });
    expect(tx.userReview.count).toHaveBeenCalledWith({ where: { userId: 'user1' } });
    expect(result.total).toBe(1);
    expect(result.items[0].story).toMatchObject({ title: 'Tiên hiệp ký' });
  });
});
```

Impl `reviews.prisma.repository.ts`:

```typescript
import { Prisma, type PrismaClient, type UserReview as PrismaUserReview } from '@prisma/client';
import type { MyReview, UserReview } from './reviews.model';
import type { ReviewsRepository } from './reviews.repository';

const myReviewStorySelect = {
  id: true,
  title: true,
  authors: true,
  externalAverageRating: true,
  externalReviewCount: true,
  userAverageRating: true,
  userReviewCount: true,
} satisfies Prisma.StorySelect;

type PrismaMyReview = Prisma.UserReviewGetPayload<{ include: { story: { select: typeof myReviewStorySelect } } }>;

function toUserReview(review: PrismaUserReview): UserReview {
  return {
    id: review.id,
    userId: review.userId,
    storyId: review.storyId,
    rating: review.rating,
    title: review.title,
    content: review.content,
    reviewedAt: review.reviewedAt,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

function toMyReview(review: PrismaMyReview): MyReview {
  return {
    ...toUserReview(review),
    story: {
      id: review.story.id,
      title: review.story.title,
      authors: review.story.authors,
      externalAverageRating: review.story.externalAverageRating,
      externalReviewCount: review.story.externalReviewCount,
      userAverageRating: review.story.userAverageRating,
      userReviewCount: review.story.userReviewCount,
    },
  };
}

export function createPrismaReviewsRepository(prisma: PrismaClient): ReviewsRepository {
  return {
    async upsertForStoryAndRefreshRating(userId, input) {
      const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          return await prisma.$transaction(
            async (tx): Promise<UserReview | null> => {
              const story = await tx.story.findUnique({ where: { id: input.storyId }, select: { id: true } });

              if (!story) {
                return null;
              }

              const review = await tx.userReview.upsert({
                where: { userId_storyId: { userId, storyId: input.storyId } },
                update: {
                  rating: input.rating,
                  title: input.title,
                  content: input.content,
                  reviewedAt: new Date(),
                },
                create: {
                  userId,
                  storyId: input.storyId,
                  rating: input.rating,
                  title: input.title,
                  content: input.content,
                },
              });

              const aggregate = await tx.userReview.aggregate({
                where: { storyId: input.storyId },
                _avg: { rating: true },
                _count: { _all: true },
              });

              await tx.story.update({
                where: { id: input.storyId },
                data: { userAverageRating: aggregate._avg.rating ?? 0, userReviewCount: aggregate._count._all },
              });

              return toUserReview(review);
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
          );
        } catch (error) {
          const isRetryableConflict =
            error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';

          if (!isRetryableConflict || attempt === maxAttempts) {
            throw error;
          }
        }
      }

      throw new Error('Unreachable retry state in upsertForStoryAndRefreshRating');
    },

    async listByUser(userId, pagination) {
      const where = { userId };
      const skip = (pagination.page - 1) * pagination.limit;

      const [items, total] = await prisma.$transaction([
        prisma.userReview.findMany({
          where,
          include: { story: { select: myReviewStorySelect } },
          orderBy: { reviewedAt: 'desc' },
          skip,
          take: pagination.limit,
        }),
        prisma.userReview.count({ where }),
      ]);

      return { items: items.map(toMyReview), total };
    },
  };
}
```

Run: `pnpm --dir backend test -- reviews.prisma.repository.spec.ts` → PASS (6 test).

- [ ] **Step 4: Viết lại `reviews.service.spec.ts` (fail trước)**

Thay toàn bộ nội dung file bằng:

```typescript
import type { MyReview, UserReview } from './reviews.model';
import type { ReviewsRepository } from './reviews.repository';
import { createReviewsService } from './reviews.service';

const reviewedAt = new Date('2026-06-01T00:00:00.000Z');

function createReview(): UserReview {
  return {
    id: 'rev1',
    userId: 'user1',
    storyId: 'story1',
    rating: 4.5,
    title: 'Hay',
    content: 'Đáng đọc',
    reviewedAt,
    createdAt: reviewedAt,
    updatedAt: reviewedAt,
  };
}

function createMyReview(): MyReview {
  return {
    ...createReview(),
    story: {
      id: 'story1',
      title: 'Tiên hiệp ký',
      authors: 'Tác giả A',
      externalAverageRating: 4.2,
      externalReviewCount: 120,
      userAverageRating: 4.8,
      userReviewCount: 5,
    },
  };
}

function createRepositoryMock(): jest.Mocked<ReviewsRepository> {
  return {
    upsertForStoryAndRefreshRating: jest.fn(),
    listByUser: jest.fn(),
  };
}

describe('createReviewsService', () => {
  it('reviews a story through the repository', async () => {
    const repository = createRepositoryMock();
    repository.upsertForStoryAndRefreshRating.mockResolvedValue(createReview());
    const service = createReviewsService({ repository });
    const input = { storyId: 'story1', rating: 4.5, title: 'Hay', content: 'Đáng đọc' };

    await expect(service.reviewStory('user1', input)).resolves.toMatchObject({ id: 'rev1' });
    expect(repository.upsertForStoryAndRefreshRating).toHaveBeenCalledWith('user1', input);
  });

  it('reports a missing story', async () => {
    const repository = createRepositoryMock();
    repository.upsertForStoryAndRefreshRating.mockResolvedValue(null);
    const service = createReviewsService({ repository });

    await expect(
      service.reviewStory('user1', { storyId: 'missing', rating: 4, title: 'x', content: 'y' }),
    ).rejects.toMatchObject({ statusCode: 404, message: 'Story not found' });
  });

  it('lists my reviews with pagination echo', async () => {
    const repository = createRepositoryMock();
    repository.listByUser.mockResolvedValue({ items: [createMyReview()], total: 7 });
    const service = createReviewsService({ repository });

    await expect(service.listMyReviews('user1', { page: 2, limit: 5 })).resolves.toEqual({
      items: [createMyReview()],
      total: 7,
      page: 2,
      limit: 5,
    });
    expect(repository.listByUser).toHaveBeenCalledWith('user1', { page: 2, limit: 5 });
  });
});
```

- [ ] **Step 5: Viết lại `reviews.service.ts`**

Thay toàn bộ nội dung file bằng:

```typescript
import { notFound } from '../../errors';
import type { PaginatedMyReviews, UserReview } from './reviews.model';
import type { ReviewsRepository } from './reviews.repository';
import type { ListMyReviewsQuery, ReviewStoryInput } from './reviews.schema';

export type ReviewsService = {
  reviewStory(userId: string, input: ReviewStoryInput): Promise<UserReview>;
  listMyReviews(userId: string, query: ListMyReviewsQuery): Promise<PaginatedMyReviews>;
};

export function createReviewsService(deps: { repository: ReviewsRepository }): ReviewsService {
  return {
    async reviewStory(userId, input) {
      const review = await deps.repository.upsertForStoryAndRefreshRating(userId, input);
      if (!review) {
        throw notFound('Story not found');
      }

      return review;
    },

    async listMyReviews(userId, query) {
      const { items, total } = await deps.repository.listByUser(userId, {
        page: query.page,
        limit: query.limit,
      });

      return { items, total, page: query.page, limit: query.limit };
    },
  };
}
```

- [ ] **Step 6: Wiring `reviews.router.ts`**

```typescript
import { createPrismaReviewsRepository } from './reviews.prisma.repository';
```

```typescript
  const repository = createPrismaReviewsRepository(deps.prisma);
  const controller = createReviewsController(createReviewsService({ repository }));
```

- [ ] **Step 7: Test + typecheck + commit** (rating là Float — wire không đổi)

Run: `pnpm --dir backend test -- reviews && pnpm --dir backend typecheck && pnpm --dir backend test` → PASS.

```bash
git add backend/src/books/reviews
git commit -m "refactor(reviews): add repository/model layers, keep serializable retry in repository

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 15: Module recommendations (gộp vector-search repository)

**Files:**
- Create: `backend/src/books/recommendations/recommendations.model.ts`
- Create: `backend/src/books/recommendations/recommendations.repository.ts`
- Create: `backend/src/books/recommendations/recommendations.prisma.repository.ts`
- Test: `backend/src/books/recommendations/recommendations.prisma.repository.spec.ts`
- Modify: `recommendations.service.ts` (viết lại), `recommendations.service.spec.ts` (viết lại), `recommendations.router.ts` (wiring)
- Delete: `backend/src/books/recommendations/story-vector-search.repository.ts` (SQL chuyển nguyên văn sang prisma.repository)
- Không sửa: `embedding-contract.ts`, `ai-client.ts`, `story-chunker.ts`, `recommendations.controller.ts`, `recommendations.router.spec.ts` (deps mock `$queryRaw`/`story.findMany`/`userReview.findMany` vẫn khớp vì repo phát ra đúng query cũ).

**Interfaces:**
- Produces: `RecommendationsService` — 3 method giữ nguyên. Types `RecommendationItem`, `RecommendationsResponse`, `StoryAdvisorResponse`, `RecommendationQuery`, `StoryChunkSearchRow`, `PopularStoryCandidate` chuyển vào recommendations.model. Mọi file đang import `StoryChunkSearchRow` từ file cũ phải đổi sang model.

- [ ] **Step 1: Tạo `recommendations.model.ts`**

```typescript
export type RecommendationQuery = { limit: number };

export type RecommendationItem = {
  storyId: string;
  title: string;
  authors: string;
  category: string;
  averageRating: number;
  reviewCount: number;
  score: number;
  reason: string;
};

export type RecommendationsResponse = { items: RecommendationItem[] };

export type StoryAdvisorResponse = { answer: string; recommendations: RecommendationItem[] };

export type PopularStoryCandidate = {
  id: string;
  title: string;
  authors: string;
  userAverageRating: number;
  userReviewCount: number;
  category: { name: string };
};

export type StoryChunkSearchRow = {
  storyId: string;
  title: string;
  authors: string;
  category: string;
  averageRating: number;
  reviewCount: number;
  chunkContent: string;
  distance: number;
};
```

- [ ] **Step 2: Tạo `recommendations.repository.ts`**

```typescript
import type { PopularStoryCandidate, StoryChunkSearchRow } from './recommendations.model';

export interface RecommendationsRepository {
  listReviewedStoryIds(userId: string): Promise<string[]>;
  listPopularStories(params: { limit: number; excludeStoryIds: string[] }): Promise<PopularStoryCandidate[]>;
  searchStoryChunksByVector(embedding: number[], limit: number): Promise<StoryChunkSearchRow[]>;
}
```

- [ ] **Step 3: Viết `recommendations.prisma.repository.spec.ts` (fail) rồi impl**

Spec:

```typescript
import type { PrismaClient } from '@prisma/client';
import { createPrismaRecommendationsRepository } from './recommendations.prisma.repository';

function createPrismaMock() {
  return {
    userReview: { findMany: jest.fn() },
    story: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };
}

function createRepository(prisma: ReturnType<typeof createPrismaMock>) {
  return createPrismaRecommendationsRepository(prisma as unknown as PrismaClient);
}

describe('createPrismaRecommendationsRepository', () => {
  it('lists the story ids the user already reviewed', async () => {
    const prisma = createPrismaMock();
    prisma.userReview.findMany.mockResolvedValue([{ storyId: 'story1' }, { storyId: 'story2' }]);
    const repository = createRepository(prisma);

    await expect(repository.listReviewedStoryIds('user1')).resolves.toEqual(['story1', 'story2']);
    expect(prisma.userReview.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      select: { storyId: true },
    });
  });

  it('lists popular story candidates with optional exclusions', async () => {
    const prisma = createPrismaMock();
    prisma.story.findMany.mockResolvedValue([
      {
        id: 'story1',
        title: 'Tiên hiệp ký',
        authors: 'Tác giả A',
        userAverageRating: 4.8,
        userReviewCount: 5,
        category: { id: 'cat1', name: 'Tiên hiệp' },
      },
    ]);
    const repository = createRepository(prisma);

    const candidates = await repository.listPopularStories({ limit: 10, excludeStoryIds: ['story9'] });

    expect(prisma.story.findMany).toHaveBeenCalledWith({
      where: {
        userAverageRating: { gt: 0 },
        userReviewCount: { gt: 0 },
        id: { notIn: ['story9'] },
      },
      include: { category: true },
      orderBy: [{ userReviewCount: 'desc' }, { userAverageRating: 'desc' }, { title: 'asc' }],
      take: 10,
    });
    expect(candidates).toEqual([
      {
        id: 'story1',
        title: 'Tiên hiệp ký',
        authors: 'Tác giả A',
        userAverageRating: 4.8,
        userReviewCount: 5,
        category: { name: 'Tiên hiệp' },
      },
    ]);

    prisma.story.findMany.mockResolvedValue([]);
    await repository.listPopularStories({ limit: 10, excludeStoryIds: [] });
    expect(prisma.story.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { userAverageRating: { gt: 0 }, userReviewCount: { gt: 0 } } }),
    );
  });

  it('runs the vector search and returns the raw rows', async () => {
    const prisma = createPrismaMock();
    const rows = [
      {
        storyId: 'story1',
        title: 'Tiên hiệp ký',
        authors: 'Tác giả A',
        category: 'Tiên hiệp',
        averageRating: 4.8,
        reviewCount: 5,
        chunkContent: 'đoạn nội dung',
        distance: 0.12,
      },
    ];
    prisma.$queryRaw.mockResolvedValue(rows);
    const repository = createRepository(prisma);
    const embedding = Array.from({ length: 384 }, () => 0.1);

    await expect(repository.searchStoryChunksByVector(embedding, 5)).resolves.toEqual(rows);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
```

Impl `recommendations.prisma.repository.ts` — **khối SQL trong `searchStoryChunksByVector` copy nguyên văn từ `story-vector-search.repository.ts` hiện tại** (giữ từng dòng, chỉ đổi `prisma` thành biến closure):

```typescript
import type { PrismaClient } from '@prisma/client';
import { toStoryVectorLiteral } from './embedding-contract';
import type { PopularStoryCandidate, StoryChunkSearchRow } from './recommendations.model';
import type { RecommendationsRepository } from './recommendations.repository';

export function createPrismaRecommendationsRepository(prisma: PrismaClient): RecommendationsRepository {
  return {
    async listReviewedStoryIds(userId) {
      const reviews = await prisma.userReview.findMany({
        where: { userId },
        select: { storyId: true },
      });

      return reviews.map((review) => review.storyId);
    },

    async listPopularStories({ limit, excludeStoryIds }) {
      const stories = await prisma.story.findMany({
        where: {
          userAverageRating: { gt: 0 },
          userReviewCount: { gt: 0 },
          ...(excludeStoryIds.length > 0 ? { id: { notIn: excludeStoryIds } } : {}),
        },
        include: { category: true },
        orderBy: [{ userReviewCount: 'desc' }, { userAverageRating: 'desc' }, { title: 'asc' }],
        take: limit,
      });

      return stories.map((story): PopularStoryCandidate => ({
        id: story.id,
        title: story.title,
        authors: story.authors,
        userAverageRating: story.userAverageRating,
        userReviewCount: story.userReviewCount,
        category: { name: story.category.name },
      }));
    },

    async searchStoryChunksByVector(embedding, limit) {
      const vector = toStoryVectorLiteral(embedding);

      return prisma.$queryRaw<StoryChunkSearchRow[]>`
        WITH ranked_story_chunks AS (
          SELECT
            s.id AS "storyId",
            s.title AS "title",
            s.authors AS "authors",
            c.name AS "category",
            s."userAverageRating" AS "averageRating",
            s."userReviewCount" AS "reviewCount",
            sc.content AS "chunkContent",
            sc.embedding <=> ${vector}::vector AS "distance",
            ROW_NUMBER() OVER (
              PARTITION BY s.id
              ORDER BY sc.embedding <=> ${vector}::vector, sc."chunkIndex" ASC
            ) AS "storyRank"
          FROM "story_chunks" sc
          INNER JOIN "stories" s ON s.id = sc."storyId"
          INNER JOIN "categories" c ON c.id = s."categoryId"
          WHERE s."contentPath" IS NOT NULL
            AND s."contentIndexedAt" IS NOT NULL
            AND s."contentUpdatedAt" IS NOT NULL
            AND s."contentIndexedAt" >= s."contentUpdatedAt"
        )
        SELECT
          "storyId",
          "title",
          "authors",
          "category",
          "averageRating",
          "reviewCount",
          "chunkContent",
          "distance"
        FROM ranked_story_chunks
        WHERE "storyRank" = 1
        ORDER BY "distance" ASC, "reviewCount" DESC, "title" ASC
        LIMIT ${limit}
      `;
    },
  };
}
```

Run: `pnpm --dir backend test -- recommendations.prisma.repository.spec.ts` → PASS (3 test).

- [ ] **Step 4: Viết lại `recommendations.service.spec.ts` (fail trước)**

Thay toàn bộ nội dung file bằng:

```typescript
import type { PopularStoryCandidate, StoryChunkSearchRow } from './recommendations.model';
import type { RecommendationsRepository } from './recommendations.repository';
import { createRecommendationsService } from './recommendations.service';

function createCandidate(overrides: Partial<PopularStoryCandidate> = {}): PopularStoryCandidate {
  return {
    id: 'story1',
    title: 'Tiên hiệp ký',
    authors: 'Tác giả A',
    userAverageRating: 4.8,
    userReviewCount: 5,
    category: { name: 'Tiên hiệp' },
    ...overrides,
  };
}

function createRow(overrides: Partial<StoryChunkSearchRow> = {}): StoryChunkSearchRow {
  return {
    storyId: 'story1',
    title: 'Tiên hiệp ký',
    authors: 'Tác giả A',
    category: 'Tiên hiệp',
    averageRating: 4.8,
    reviewCount: 5,
    chunkContent: 'đoạn nội dung tu tiên',
    distance: 0.2,
    ...overrides,
  };
}

function createRepositoryMock(): jest.Mocked<RecommendationsRepository> {
  return {
    listReviewedStoryIds: jest.fn(),
    listPopularStories: jest.fn(),
    searchStoryChunksByVector: jest.fn(),
  };
}

describe('createRecommendationsService', () => {
  it('lists popular recommendations with the rating-weighted score', async () => {
    const repository = createRepositoryMock();
    repository.listPopularStories.mockResolvedValue([createCandidate()]);
    const service = createRecommendationsService({ repository });

    const result = await service.listPopularRecommendations({ limit: 10 });

    expect(repository.listPopularStories).toHaveBeenCalledWith({ limit: 10, excludeStoryIds: [] });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      storyId: 'story1',
      category: 'Tiên hiệp',
      averageRating: 4.8,
      reviewCount: 5,
      score: 4.8 * Math.log1p(5),
    });
    expect(result.items[0].reason).toContain('4.8/5');
  });

  it('excludes already-reviewed stories for the current user', async () => {
    const repository = createRepositoryMock();
    repository.listReviewedStoryIds.mockResolvedValue(['story9']);
    repository.listPopularStories.mockResolvedValue([createCandidate()]);
    const service = createRecommendationsService({ repository });

    await service.listRecommendationsForUser('user1', { limit: 10 });

    expect(repository.listReviewedStoryIds).toHaveBeenCalledWith('user1');
    expect(repository.listPopularStories).toHaveBeenCalledWith({ limit: 10, excludeStoryIds: ['story9'] });
  });

  it('deduplicates vector rows per story keeping the closest chunk', async () => {
    const repository = createRepositoryMock();
    repository.searchStoryChunksByVector.mockResolvedValue([
      createRow({ distance: 0.5, chunkContent: 'đoạn xa' }),
      createRow({ distance: 0.1, chunkContent: 'đoạn gần' }),
      createRow({ storyId: 'story2', title: 'Truyện B', distance: 0.3 }),
    ]);
    const service = createRecommendationsService({ repository });
    const embedding = Array.from({ length: 384 }, () => 0.1);

    const result = await service.searchStoryAdvisorByVector({ query: 'tu tiên', embedding, limit: 5 });

    expect(repository.searchStoryChunksByVector).toHaveBeenCalledWith(embedding, 5);
    expect(result.recommendations).toHaveLength(2);
    expect(result.recommendations[0]).toMatchObject({ storyId: 'story1', score: 0.9 });
    expect(result.recommendations[0].reason).toContain('đoạn gần');
    expect(result.answer).toContain('tu tiên');
    expect(result.answer).toContain('2 truyện');
  });

  it('rejects a vector search with no indexed content', async () => {
    const repository = createRepositoryMock();
    repository.searchStoryChunksByVector.mockResolvedValue([]);
    const service = createRecommendationsService({ repository });
    const embedding = Array.from({ length: 384 }, () => 0.1);

    await expect(
      service.searchStoryAdvisorByVector({ query: 'tu tiên', embedding, limit: 5 }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Chưa có dữ liệu nội dung truyện để tư vấn. Hãy chạy script index story chunks ở máy local trước.',
    });
  });
});
```

Run: `pnpm --dir backend test -- recommendations.service.spec.ts` → Expected: FAIL.

- [ ] **Step 5: Viết lại `recommendations.service.ts`**

Thay toàn bộ nội dung file bằng (các hàm pure giữ nguyên logic cũ, chỉ đổi nguồn dữ liệu):

```typescript
import { badRequest } from '../../errors';
import type {
  PopularStoryCandidate,
  RecommendationItem,
  RecommendationQuery,
  RecommendationsResponse,
  StoryAdvisorResponse,
  StoryChunkSearchRow,
} from './recommendations.model';
import type { RecommendationsRepository } from './recommendations.repository';
import type { SearchRecommendationsByVectorBody } from './recommendations.schema';

export type RecommendationsService = {
  listPopularRecommendations(query: RecommendationQuery): Promise<RecommendationsResponse>;
  listRecommendationsForUser(userId: string, query: RecommendationQuery): Promise<RecommendationsResponse>;
  searchStoryAdvisorByVector(input: SearchRecommendationsByVectorBody): Promise<StoryAdvisorResponse>;
};

export function createRecommendationsService(
  deps: { repository: RecommendationsRepository },
): RecommendationsService {
  async function listRecommendations(
    query: RecommendationQuery,
    excludedStoryIds: string[] = [],
  ): Promise<RecommendationsResponse> {
    const stories = await deps.repository.listPopularStories({
      limit: query.limit,
      excludeStoryIds: excludedStoryIds,
    });

    return {
      items: stories
        .filter(
          (story) =>
            story.userAverageRating > 0 && story.userReviewCount > 0 && !excludedStoryIds.includes(story.id),
        )
        .map(toRecommendationItem)
        .sort(compareRecommendationItems)
        .slice(0, query.limit),
    };
  }

  return {
    async listPopularRecommendations(query) {
      return listRecommendations(query);
    },

    async listRecommendationsForUser(userId, query) {
      const reviewedStoryIds = await deps.repository.listReviewedStoryIds(userId);
      return listRecommendations(query, reviewedStoryIds);
    },

    async searchStoryAdvisorByVector(input) {
      const rows = await deps.repository.searchStoryChunksByVector(input.embedding, input.limit);
      const recommendations = toAdvisorRecommendations(rows, input.limit);

      if (recommendations.length === 0) {
        throw badRequest('Chưa có dữ liệu nội dung truyện để tư vấn. Hãy chạy script index story chunks ở máy local trước.');
      }

      return {
        answer: buildVectorSearchAnswer(input.query, recommendations.length),
        recommendations,
      };
    },
  };
}

function toAdvisorRecommendations(rows: StoryChunkSearchRow[], limit: number): RecommendationItem[] {
  const bestByStory = new Map<string, StoryChunkSearchRow>();

  for (const row of rows) {
    const current = bestByStory.get(row.storyId);
    if (!current || row.distance < current.distance) {
      bestByStory.set(row.storyId, row);
    }
  }

  return [...bestByStory.values()]
    .sort((a, b) => a.distance - b.distance || b.reviewCount - a.reviewCount || a.title.localeCompare(b.title, 'vi'))
    .slice(0, limit)
    .map((row) => ({
      storyId: row.storyId,
      title: row.title,
      authors: row.authors,
      category: row.category,
      averageRating: row.averageRating,
      reviewCount: row.reviewCount,
      score: Math.max(0, 1 - row.distance),
      reason: `Nội dung gần với yêu cầu của bạn qua đoạn: ${summarizeChunk(row.chunkContent)}`,
    }));
}

function summarizeChunk(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  return normalized.length <= 180 ? normalized : `${normalized.slice(0, 177)}…`;
}

function buildVectorSearchAnswer(query: string, count: number): string {
  return count > 0
    ? `Dựa trên mô tả "${query}", mình tìm được ${count} truyện có nội dung gần nhất trong kho truyện đã index.`
    : `Hiện chưa có truyện nào đủ gần với mô tả "${query}". Hãy thử thêm thể loại, nhân vật hoặc bối cảnh cụ thể hơn.`;
}

function toRecommendationItem(story: PopularStoryCandidate): RecommendationItem {
  return {
    storyId: story.id,
    title: story.title,
    authors: story.authors,
    category: story.category.name,
    averageRating: story.userAverageRating,
    reviewCount: story.userReviewCount,
    score: story.userAverageRating * Math.log1p(story.userReviewCount),
    reason: `Truyện đạt ${story.userAverageRating.toFixed(1)}/5 từ ${story.userReviewCount.toLocaleString('vi-VN')} review từ người dùng app.`,
  };
}

function compareRecommendationItems(a: RecommendationItem, b: RecommendationItem): number {
  return (
    b.score - a.score ||
    b.reviewCount - a.reviewCount ||
    b.averageRating - a.averageRating ||
    a.title.localeCompare(b.title, 'vi')
  );
}
```

- [ ] **Step 6: Xóa file cũ + wiring router**

```bash
git rm backend/src/books/recommendations/story-vector-search.repository.ts
```

Nếu `grep -rn "story-vector-search" backend/src` còn kết quả nào khác (ví dụ script hoặc spec import `StoryChunkSearchRow`), đổi import đó sang `./recommendations.model` (hoặc `../recommendations/recommendations.model`).

`recommendations.router.ts`:

```typescript
import { createPrismaRecommendationsRepository } from './recommendations.prisma.repository';
```

```typescript
  const repository = createPrismaRecommendationsRepository(deps.prisma);
  const controller = createRecommendationsController(createRecommendationsService({ repository }), deps);
```

- [ ] **Step 7: Test + typecheck + commit**

Run: `pnpm --dir backend test -- recommendations && pnpm --dir backend typecheck && pnpm --dir backend test` → PASS.

```bash
git add backend/src/books/recommendations
git commit -m "refactor(recommendations): add repository/model layers, absorb vector-search repository

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 16: Hoàn tất — CLAUDE.md, rà frontend, kiểm tra toàn cục

**Files:**
- Modify: `CLAUDE.md` (mục kiến trúc backend)
- Modify (nếu thiếu case): `frontend/src/types/finance.test.ts`

- [ ] **Step 1: Kiểm tra bất biến kiến trúc bằng grep**

```bash
grep -rn "deps\.prisma" backend/src --include="*.service.ts"
grep -rn "@prisma/client" backend/src --include="*.model.ts"
grep -n "prisma" backend/src/middleware/auth.ts
```

Expected: cả 3 lệnh **không có output**. Nếu có → quay lại task của module tương ứng sửa cho sạch.

- [ ] **Step 2: Cập nhật `CLAUDE.md`**

Trong mục `### Backend architecture (Express)`, thay bullet `- Domain modules theo pattern router/service/schema:` (và các dòng con của nó) bằng:

```markdown
- Module backend gom theo domain: `identity/` (users, auth, admin), `books/` (stories, reviews, recommendations), `finance/` (budgets, categories, expenses, groups, spending, chat, advice, invoices). URL mount không đổi.
- Domain modules theo pattern 5 tầng `router/controller/service/repository/model` (chuẩn tham chiếu: `finance/budgets`):
  - `<module>.model.ts`: domain types thuần, không import `@prisma/client`.
  - `<module>.repository.ts`: interface persistence; lỗi Prisma được dịch tại đây (P2002 → domain error, P2025/count=0 → null/false, P2034 → retry trong repo); transaction gói trọn trong một method.
  - `<module>.prisma.repository.ts`: implementation Prisma + mapper row→model (mapper dùng chung được export: `toFinanceCategory`, `toFinanceBudget`, `toFinanceExpense`, `toFinanceInvoice`).
  - `<module>.service.ts`: business logic, chỉ phụ thuộc repository interface (không thấy Prisma).
  - `<module>.router.ts`: nơi lắp ráp repository → service → controller.
  - Entity User dùng data-module chung `src/users/` (không router); instance `usersRepository` nằm trong `BackendDeps` cho auth, admin và middleware `requireAuth` dùng chung.
```

Trong mục `## Lưu ý khi phát triển`, thêm 2 bullet:

```markdown
- Mọi field tiền tệ (`amount`, `limitAmount`, `totalAmount`) trả về qua API là JSON number (đã chuẩn hóa từ Decimal-string vào 2026-07); parser frontend (`parseMoney`) chấp nhận cả hai nhưng backend luôn phát number.
- Khi thêm module backend mới, tạo đủ 5 tầng theo chuẩn `finance/budgets`; service spec mock repository interface, prisma.repository spec mock PrismaClient.
```

- [ ] **Step 3: Rà test frontend cho money-number**

Mở `frontend/src/types/finance.test.ts`, tìm case parse amount/limitAmount với **giá trị number**. Nếu chưa có, thêm vào cuối file:

```typescript
it("parses numeric money fields from the normalized API", () => {
  const expense = parseFinanceExpense({ id: "e1", amount: 125000 });
  expect(expense.amount).toBe(125000);

  const budget = parseFinanceBudget({
    id: "b1",
    categoryId: "c1",
    limitAmount: 2000000,
    period: "monthly",
    alertThreshold: 0.8,
  });
  expect(budget.limitAmount).toBe(2000000);
});
```

(Nếu file dùng `describe` block, đặt case vào block phù hợp và tái dùng import sẵn có của `parseFinanceExpense`/`parseFinanceBudget`.)

- [ ] **Step 4: Chạy toàn bộ kiểm tra 2 workspace**

```bash
pnpm --dir backend typecheck && pnpm --dir backend test
pnpm --dir frontend typecheck && pnpm --dir frontend test && pnpm --dir frontend lint
```

Expected: PASS toàn bộ.

- [ ] **Step 5: Commit cuối**

```bash
git add CLAUDE.md frontend/src/types/finance.test.ts
git commit -m "docs: document repository/model layer architecture and money normalization

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Ghi chú cho người thực thi

- Mỗi task độc lập và kết thúc bằng test xanh + 1 commit; **không gộp 2 module vào 1 commit**.
- Nếu một bước "Expected: FAIL" lại pass (hoặc ngược lại), DỪNG và điều tra trước khi đi tiếp — có thể trạng thái repo lệch so với giả định của plan.
- Các fixture trong plan dùng dữ liệu tổng hợp; giữ nguyên các message lỗi/HTTP status trong assertion vì đó là contract.
- Router specs hiện có là "harness hồi quy" của wire format — không sửa expectation trừ khi diff là money string→number (phần chuẩn hóa đã duyệt).

