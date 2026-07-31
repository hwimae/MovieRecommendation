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
