import { badRequest } from '../../errors';
import type {
  PopularStoryCandidate,
  RecommendationItem,
  RecommendationQuery,
  RecommendationsResponse,
  StoryAdvisorResponse,
  StoryChunkSearchRow,
} from './recommendations.model';
import type { RecommendationsRepository } from './recommendations.repository';
import type { SearchRecommendationsByVectorBody } from './recommendations.schema';

export type RecommendationsService = {
  listPopularRecommendations(query: RecommendationQuery): Promise<RecommendationsResponse>;
  listRecommendationsForUser(userId: string, query: RecommendationQuery): Promise<RecommendationsResponse>;
  searchStoryAdvisorByVector(input: SearchRecommendationsByVectorBody): Promise<StoryAdvisorResponse>;
};

export function createRecommendationsService(
  deps: { repository: RecommendationsRepository },
): RecommendationsService {
  async function listRecommendations(
    query: RecommendationQuery,
    excludedStoryIds: string[] = [],
  ): Promise<RecommendationsResponse> {
    const stories = await deps.repository.listPopularStories({
      limit: query.limit,
      excludeStoryIds: excludedStoryIds,
    });

    return {
      items: stories
        .filter(
          (story) =>
            story.userAverageRating > 0 && story.userReviewCount > 0 && !excludedStoryIds.includes(story.id),
        )
        .map(toRecommendationItem)
        .sort(compareRecommendationItems)
        .slice(0, query.limit),
    };
  }

  return {
    async listPopularRecommendations(query) {
      return listRecommendations(query);
    },

    async listRecommendationsForUser(userId, query) {
      const reviewedStoryIds = await deps.repository.listReviewedStoryIds(userId);
      return listRecommendations(query, reviewedStoryIds);
    },

    async searchStoryAdvisorByVector(input) {
      const rows = await deps.repository.searchStoryChunksByVector(input.embedding, input.limit);
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

function toRecommendationItem(story: PopularStoryCandidate): RecommendationItem {
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
