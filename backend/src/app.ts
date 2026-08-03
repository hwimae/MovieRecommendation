import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import { createAdminRouter } from './identity/admin/admin.router';
import { createAuthRouter } from './identity/auth/auth.router';
import type { AppConfig } from './config';
import type { BackendDeps } from './dependencies';
import { createErrorHandler, notFound } from './errors';
import { createFinanceRouter } from './finance/finance.router';
import { createRecommendationsRouter } from './books/recommendations/recommendations.router';
import { createReviewsRouter } from './books/reviews/reviews.router';
import { createStoriesRouter } from './books/stories/stories.router';

export function createApp(config: AppConfig, deps: BackendDeps): Express {
  const app = express();

  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(express.json());
  app.use(rateLimit({ windowMs: 60_000, limit: 120 }));

  app.use('/auth', createAuthRouter(deps));
  app.use('/stories', createStoriesRouter(deps));
  app.use('/reviews', createReviewsRouter(deps));
  app.use('/recommendations', createRecommendationsRouter(deps));
  app.use('/finance', createFinanceRouter(deps));
  app.use('/admin', createAdminRouter(deps));

  app.use((_req, _res, next) => {
    next(notFound('Not found'));
  });
  app.use(createErrorHandler(deps.logger));

  return app;
}
