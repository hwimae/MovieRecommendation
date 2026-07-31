import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { BackendDeps } from '../../dependencies';
import { unauthorized } from '../../errors';
import type {
  RecommendationsQuery,
  SearchRecommendationsByVectorBody,
} from './recommendations.schema';
import type { RecommendationsService } from './recommendations.service';

export type RecommendationsController = {
  listPopularRecommendations: RequestHandler<Record<string, string>, unknown, unknown, RecommendationsQuery>;
  listMyRecommendations: RequestHandler<Record<string, string>, unknown, unknown, RecommendationsQuery>;
  searchStoryAdvisorByVector: RequestHandler<Record<string, string>, unknown, SearchRecommendationsByVectorBody>;
};

export function createRecommendationsController(
  recommendationsService: RecommendationsService,
  deps: Pick<BackendDeps, 'prisma' | 'tokenService'>,
): RecommendationsController {
  return {
    async listPopularRecommendations(req, res, next) {
      try {
        res.json(await recommendationsService.listPopularRecommendations(req.query));
      } catch (error) {
        next(error);
      }
    },

    async listMyRecommendations(req, res, next) {
      try {
        const userId = await getOptionalUserId(req, deps);
        const recommendations = userId
          ? await recommendationsService.listRecommendationsForUser(userId, req.query)
          : await recommendationsService.listPopularRecommendations(req.query);

        res.json(recommendations);
      } catch (error) {
        next(error);
      }
    },

    async searchStoryAdvisorByVector(req, res, next) {
      try {
        res.json(await recommendationsService.searchStoryAdvisorByVector(req.body));
      } catch (error) {
        next(error);
      }
    },
  };
}

async function getOptionalUserId(
  req: Pick<Request, 'header'>,
  deps: Pick<BackendDeps, 'prisma' | 'tokenService'>,
): Promise<string | undefined> {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  if (!token) {
    return undefined;
  }

  try {
    const payload = deps.tokenService.verifyAccessToken(token);
    const user = await deps.prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true } });

    if (!user) {
      throw unauthorized('Unauthorized');
    }

    return user.id;
  } catch {
    throw unauthorized('Unauthorized');
  }
}
