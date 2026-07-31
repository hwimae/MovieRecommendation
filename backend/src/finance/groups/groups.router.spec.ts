import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { createApp } from '../../app';
import type { AppConfig } from '../../config';
import type { BackendDeps } from '../../dependencies';

function createTestConfig(): AppConfig {
  return {
    databaseUrl: 'postgresql://test:test@localhost:5432/test',
    jwtSecret: 'test-secret',
    port: 0,
    frontendUrl: 'http://localhost:3000',
    aiServiceUrl: 'http://localhost:8000',
  };
}

function createPrismaMock(): any {
  return {
    $transaction: jest.fn(async (callback: any) => callback(prisma)),
    financeGroupMember: { findMany: jest.fn(), findUnique: jest.fn() },
    financeGroup: { create: jest.fn(), findFirst: jest.fn(), deleteMany: jest.fn() },
    financeCategory: { findMany: jest.fn() },
    financeBudget: { findMany: jest.fn(), deleteMany: jest.fn() },
    financeExpense: { findMany: jest.fn(), deleteMany: jest.fn() },
  };
}

let prisma: any;

function createDepsMock(): BackendDeps {
  prisma = createPrismaMock();
  return {
    prisma: prisma as BackendDeps['prisma'],
    passwordHasher: { hash: jest.fn(), compare: jest.fn() },
    usersRepository: {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      listByStatus: jest.fn(),
      updateStatus: jest.fn(),
    },
    tokenService: { signAccessToken: jest.fn(), verifyAccessToken: jest.fn(() => ({ sub: 'user1', email: 'boo@example.com' })) },
    aiClient: {} as BackendDeps['aiClient'],
    financeAiClient: {} as BackendDeps['financeAiClient'],
    storyContentReader: { read: jest.fn() },
    logger: { error: jest.fn() },
  };
}

function listen(app: ReturnType<typeof createApp>): Promise<{ baseUrl: string; server: Server }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address() as AddressInfo;
      resolve({ baseUrl: `http://127.0.0.1:${address.port}`, server });
    });
  });
}

describe('finance groups router', () => {
  let server: Server | undefined;

  afterEach((done) => {
    if (!server) {
      done();
      return;
    }

    server.close(done);
    server = undefined;
  });

  it('requires auth for finance groups', async () => {
    const app = createApp(createTestConfig(), createDepsMock());
    const started = await listen(app);
    server = started.server;

    const response = await fetch(`${started.baseUrl}/finance/groups`);

    expect(response.status).toBe(401);
  });

  it('validates create group body', async () => {
    const deps = createDepsMock();
    (deps.usersRepository.findById as jest.Mock).mockResolvedValue({
      id: 'user1',
      email: 'boo@example.com',
      name: 'Boo',
      role: 'USER',
      status: 'APPROVED',
      createdAt: new Date('2026-06-14T00:00:00.000Z'),
      updatedAt: new Date('2026-06-14T00:00:00.000Z'),
    });
    const app = createApp(createTestConfig(), deps);
    const started = await listen(app);
    server = started.server;

    const response = await fetch(`${started.baseUrl}/finance/groups`, {
      method: 'POST',
      headers: { authorization: 'Bearer token', 'content-type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });

    expect(response.status).toBe(400);
  });

  it('lists groups for approved user', async () => {
    const deps = createDepsMock();
    (deps.usersRepository.findById as jest.Mock).mockResolvedValue({
      id: 'user1',
      email: 'boo@example.com',
      name: 'Boo',
      role: 'USER',
      status: 'APPROVED',
      createdAt: new Date('2026-06-14T00:00:00.000Z'),
      updatedAt: new Date('2026-06-14T00:00:00.000Z'),
    });
    prisma.financeGroupMember.findMany.mockResolvedValue([
      {
        role: 'OWNER',
        group: {
          id: 'group1',
          name: 'Gia đình',
          ownerId: 'user1',
          members: [{ userId: 'user1' }],
          createdAt: new Date('2026-06-14T00:00:00.000Z'),
          updatedAt: new Date('2026-06-14T00:00:00.000Z'),
        },
      },
    ]);
    const app = createApp(createTestConfig(), deps);
    const started = await listen(app);
    server = started.server;

    const response = await fetch(`${started.baseUrl}/finance/groups`, { headers: { authorization: 'Bearer token' } });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        id: 'group1',
        name: 'Gia đình',
        ownerId: 'user1',
        currentUserRole: 'OWNER',
        memberCount: 1,
        createdAt: '2026-06-14T00:00:00.000Z',
        updatedAt: '2026-06-14T00:00:00.000Z',
      },
    ]);
  });
});
