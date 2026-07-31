import type { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { AppConfig } from './config';
import { createFinanceAiClient, type FinanceAiClient } from './finance/ai-client';
import { createAiClient, type AiClient } from './books/recommendations/ai-client';
import { prisma } from './prisma';
import { createR2StoryContentReader, getR2StoryContentConfig } from './storage/story-content-r2';
import { createStoryContentReader, type StoryContentReader } from './storage/story-content-storage';

export type AccessTokenPayload = {
  sub: string;
  email: string;
};

export type PasswordHasher = {
  hash(password: string): Promise<string>;
  compare(password: string, passwordHash: string): Promise<boolean>;
};

export type TokenService = {
  signAccessToken(user: { id: string; email: string }): string;
  verifyAccessToken(token: string): AccessTokenPayload;
};

export type Logger = {
  error(error: unknown): void;
};

export type BackendDeps = {
  prisma: PrismaClient;
  passwordHasher: PasswordHasher;
  tokenService: TokenService;
  aiClient: AiClient;
  financeAiClient: FinanceAiClient;
  storyContentReader: StoryContentReader;
  logger: Logger;
};

export function createBackendDeps(config: AppConfig): BackendDeps {
  const r2Config = getR2StoryContentConfig(config);
  const r2Reader = r2Config ? createR2StoryContentReader(r2Config) : null;

  return {
    prisma,
    passwordHasher: {
      hash: (password) => bcrypt.hash(password, 10),
      compare: (password, passwordHash) => bcrypt.compare(password, passwordHash),
    },
    tokenService: {
      signAccessToken: (user) =>
        jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
          algorithm: 'HS256',
          expiresIn: '7d',
        }),
      verifyAccessToken: (token) =>
        jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as AccessTokenPayload,
    },
    aiClient: createAiClient(config.aiServiceUrl),
    financeAiClient: createFinanceAiClient(config.aiServiceUrl),
    storyContentReader: createStoryContentReader({ r2Reader, logger: console }),
    logger: console,
  };
}
