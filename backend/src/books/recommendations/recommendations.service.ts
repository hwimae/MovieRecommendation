import { Prisma } from '@prisma/client';
import type { BackendDeps } from '../../dependencies';
import { badRequest } from '../../errors';
import type { SearchRecommendationsByVectorBody } from './recommendations.schema';
import { searchStoryChunksByVector, type StoryChunkSearchRow } from './story-vector-search.repository';

export type RecommendationQuery = {
  limit: number;
};

type StoryCandidate = Prisma.StoryGetPayload<{ include: { category: true } }>;

export type RecommendationItem = {
  storyId: string;
  title: string;
  authors: string;
  category: string;
  averageRating: number;
  reviewCount: number;
  score: number;
  reason: string;
};

export type RecommendationsResponse = {
  items: RecommendationItem[];
};

export type StoryAdvisorResponse = {
  answer: string;
  recommendations: RecommendationItem[];
};

export type RecommendationsService = {
  listPopularRecommendations(query: RecommendationQuery): Promise<RecommendationsResponse>;
  listRecommendationsForUser(userId: string, query: RecommendationQuery): Promise<RecommendationsResponse>;
  searchStoryAdvisorByVector(input: SearchRecommendationsByVectorBody): Promise<StoryAdvisorResponse>;
};

export function createRecommendationsService(deps: Pick<BackendDeps, 'prisma'>): RecommendationsService {
  return {
    async listPopularRecommendations(query) {
      return listRecommendations(deps, query);
    },

    async listRecommendationsForUser(userId, query) {
      const reviewedStories = await deps.prisma.userReview.findMany({
        where: { userId },
        select: { storyId: true },
      });

      return listRecommendations(
        deps,
        query,
        reviewedStories.map((review) => review.storyId),
      );
    },

    async searchStoryAdvisorByVector(input) {
      const rows = await searchStoryChunksByVector(deps.prisma, input.embedding, input.limit);
      const recommendations = toAdvisorRecommendations(rows, input.limit);

      if (recommendations.length === 0) {
        throw badRequest('Chưa có dữ liệu nội dung truyện để tư vấn. Hãy chạy script index story chunks ở máy local trước.');
      }

      return {
        answer: buildVectorSearchAnswer(input.query, recommendations.length),
        recommendations,
      };
    },
  };
}

function toAdvisorRecommendations(rows: StoryChunkSearchRow[], limit: number): RecommendationItem[] {
  const bestByStory = new Map<string, StoryChunkSearchRow>();

  for (const row of rows) {
    const current = bestByStory.get(row.storyId);
    if (!current || row.distance < current.distance) {
      bestByStory.set(row.storyId, row);
    }
  }

  return [...bestByStory.values()]
    .sort((a, b) => a.distance - b.distance || b.reviewCount - a.reviewCount || a.title.localeCompare(b.title, 'vi'))
    .slice(0, limit)
    .map((row) => ({
      storyId: row.storyId,
      title: row.title,
      authors: row.authors,
      category: row.category,
      averageRating: row.averageRating,
      reviewCount: row.reviewCount,
      score: Math.max(0, 1 - row.distance),
      reason: `Nội dung gần với yêu cầu của bạn qua đoạn: ${summarizeChunk(row.chunkContent)}`,
    }));
}

function summarizeChunk(content: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  return normalized.length <= 180 ? normalized : `${normalized.slice(0, 177)}…`;
}

function buildVectorSearchAnswer(query: string, count: number): string {
  return count > 0
    ? `Dựa trên mô tả "${query}", mình tìm được ${count} truyện có nội dung gần nhất trong kho truyện đã index.`
    : `Hiện chưa có truyện nào đủ gần với mô tả "${query}". Hãy thử thêm thể loại, nhân vật hoặc bối cảnh cụ thể hơn.`;
}

async function listRecommendations(
  deps: Pick<BackendDeps, 'prisma'>,
  query: RecommendationQuery,
  excludedStoryIds: string[] = [],
): Promise<RecommendationsResponse> {
  const stories = await deps.prisma.story.findMany({
    where: {
      userAverageRating: { gt: 0 },
      userReviewCount: { gt: 0 },
      ...(excludedStoryIds.length > 0 ? { id: { notIn: excludedStoryIds } } : {}),
    },
    include: { category: true },
    orderBy: [{ userReviewCount: 'desc' }, { userAverageRating: 'desc' }, { title: 'asc' }],
    take: query.limit,
  });

  return {
    items: stories
      .filter((story) => story.userAverageRating > 0 && story.userReviewCount > 0 && !excludedStoryIds.includes(story.id))
      .map(toRecommendationItem)
      .sort(compareRecommendationItems)
      .slice(0, query.limit),
  };
}

function toRecommendationItem(story: StoryCandidate): RecommendationItem {
  return {
    storyId: story.id,
    title: story.title,
    authors: story.authors,
    category: story.category.name,
    averageRating: story.userAverageRating,
    reviewCount: story.userReviewCount,
    score: story.userAverageRating * Math.log1p(story.userReviewCount),
    reason: `Truyện đạt ${story.userAverageRating.toFixed(1)}/5 từ ${story.userReviewCount.toLocaleString('vi-VN')} review từ người dùng app.`,
  };
}

function compareRecommendationItems(a: RecommendationItem, b: RecommendationItem): number {
  return (
    b.score - a.score ||
    b.reviewCount - a.reviewCount ||
    b.averageRating - a.averageRating ||
    a.title.localeCompare(b.title, 'vi')
  );
}
