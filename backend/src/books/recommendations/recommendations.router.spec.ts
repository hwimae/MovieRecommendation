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

function createDepsMock(): BackendDeps {
  return {
    prisma: {
      $queryRaw: jest.fn().mockResolvedValue([]),
      story: { findMany: jest.fn().mockResolvedValue([]) },
      userReview: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    } as any,
    passwordHasher: { hash: jest.fn(), compare: jest.fn() },
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

describe('recommendations router', () => {
  let server: Server | undefined;

  afterEach((done) => {
    if (!server) {
      done();
      return;
    }

    server.close(done);
    server = undefined;
  });

  it('rejects embeddings that are not 384 dimensions long', async () => {
    const started = await listen(createApp(createTestConfig(), createDepsMock()));
    server = started.server;

    const response = await fetch(`${started.baseUrl}/recommendations/search-by-vector`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'tu tiên', embedding: [0.1, 0.2], limit: 5 }),
    });

    expect(response.status).toBe(400);
  });
});
