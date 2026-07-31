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

function createDepsMock(user: unknown): BackendDeps {
  return {
    prisma: {} as any,
    passwordHasher: { hash: jest.fn(), compare: jest.fn() },
    usersRepository: {
      findById: jest.fn().mockResolvedValue(user),
      findByEmail: jest.fn(),
      create: jest.fn(),
      listByStatus: jest.fn().mockResolvedValue([]),
      updateStatus: jest.fn(),
    },
    tokenService: { signAccessToken: jest.fn(), verifyAccessToken: jest.fn().mockReturnValue({ sub: 'admin1', email: 'admin@example.com' }) },
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

describe('admin router', () => {
  let server: Server | undefined;

  afterEach((done) => {
    if (!server) {
      done();
      return;
    }

    server.close(done);
    server = undefined;
  });

  it('returns pending users for approved admins', async () => {
    const app = createApp(
      createTestConfig(),
      createDepsMock({ id: 'admin1', email: 'admin@example.com', name: 'Admin', role: 'ADMIN', status: 'APPROVED' }),
    );
    const started = await listen(app);
    server = started.server;

    const response = await fetch(`${started.baseUrl}/admin/users?status=PENDING`, {
      headers: { Authorization: 'Bearer token' },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
  });

  it('rejects non-admin users', async () => {
    const app = createApp(
      createTestConfig(),
      createDepsMock({ id: 'user1', email: 'boo@example.com', name: 'Boo', role: 'USER', status: 'APPROVED' }),
    );
    const started = await listen(app);
    server = started.server;

    const response = await fetch(`${started.baseUrl}/admin/users?status=PENDING`, {
      headers: { Authorization: 'Bearer token' },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ message: 'Admin access required' });
  });
});
