import { Prisma, UserReview } from '@prisma/client';
import type { BackendDeps } from '../../dependencies';
import { notFound } from '../../errors';
import type { ListMyReviewsQuery, ReviewStoryInput } from './reviews.schema';

export type MyReview = Prisma.UserReviewGetPayload<{
  include: {
    story: {
      select: {
        id: true;
        title: true;
        authors: true;
        externalAverageRating: true;
        externalReviewCount: true;
        userAverageRating: true;
        userReviewCount: true;
      };
    };
  };
}>;

export type PaginatedMyReviews = {
  items: MyReview[];
  total: number;
  page: number;
  limit: number;
};

export type ReviewsService = {
  reviewStory(userId: string, input: ReviewStoryInput): Promise<UserReview>;
  listMyReviews(userId: string, query: ListMyReviewsQuery): Promise<PaginatedMyReviews>;
};

export function createReviewsService(deps: Pick<BackendDeps, 'prisma'>): ReviewsService {
  return {
    async reviewStory(userId, input) {
      const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          return await deps.prisma.$transaction(
            async (tx): Promise<UserReview> => {
              const story = await tx.story.findUnique({ where: { id: input.storyId }, select: { id: true } });

              if (!story) {
                throw notFound('Story not found');
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

              return review;
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
          );
        } catch (error) {
          const isRetryableConflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';

          if (!isRetryableConflict || attempt === maxAttempts) {
            throw error;
          }
        }
      }

      throw new Error('Unreachable retry state in reviewStory');
    },

    async listMyReviews(userId, query) {
      const where = { userId };
      const { page, limit } = query;
      const skip = (page - 1) * limit;

      const [items, total] = await deps.prisma.$transaction([
        deps.prisma.userReview.findMany({
          where,
          include: {
            story: {
              select: {
                id: true,
                title: true,
                authors: true,
                externalAverageRating: true,
                externalReviewCount: true,
                userAverageRating: true,
                userReviewCount: true,
              },
            },
          },
          orderBy: { reviewedAt: 'desc' },
          skip,
          take: limit,
        }),
        deps.prisma.userReview.count({ where }),
      ]);

      return { items, total, page, limit };
    },
  };
}
