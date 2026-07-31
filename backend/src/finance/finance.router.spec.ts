import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { createApp } from '../app';
import type { AppConfig } from '../config';
import type { BackendDeps } from '../dependencies';

function createTestConfig(): AppConfig {
  return {
    databaseUrl: 'postgresql://test:test@localhost:5432/test',
    jwtSecret: 'test-secret',
    port: 0,
    frontendUrl: 'http://localhost:3000',
    aiServiceUrl: 'http://localhost:8000',
  };
}

function createDepsMock(): BackendDeps {
  return {
    prisma: {} as BackendDeps['prisma'],
    passwordHasher: { hash: jest.fn(), compare: jest.fn() },
    usersRepository: {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      listByStatus: jest.fn(),
      updateStatus: jest.fn(),
    },
    tokenService: { signAccessToken: jest.fn(), verifyAccessToken: jest.fn() },
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

describe('finance router', () => {
  let server: Server | undefined;

  afterEach((done) => {
    if (!server) {
      done();
      return;
    }

    server.close(done);
    server = undefined;
  });

  it('mounts health endpoint under /finance', async () => {
    const app = createApp(createTestConfig(), createDepsMock());
    const started = await listen(app);
    server = started.server;

    const response = await fetch(`${started.baseUrl}/finance/health`);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });
});
