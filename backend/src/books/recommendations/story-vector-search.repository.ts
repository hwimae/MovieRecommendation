import type { PrismaClient } from '@prisma/client';
import { toStoryVectorLiteral } from './embedding-contract';

export type StoryChunkSearchRow = {
  storyId: string;
  title: string;
  authors: string;
  category: string;
  averageRating: number;
  reviewCount: number;
  chunkContent: string;
  distance: number;
};

export async function searchStoryChunksByVector(
  prisma: Pick<PrismaClient, '$queryRaw'>,
  embedding: number[],
  limit: number,
): Promise<StoryChunkSearchRow[]> {
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
}
