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
