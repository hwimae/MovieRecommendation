import type { PopularStoryCandidate, StoryChunkSearchRow } from './recommendations.model';

export interface RecommendationsRepository {
  listReviewedStoryIds(userId: string): Promise<string[]>;
  listPopularStories(params: { limit: number; excludeStoryIds: string[] }): Promise<PopularStoryCandidate[]>;
  searchStoryChunksByVector(embedding: number[], limit: number): Promise<StoryChunkSearchRow[]>;
}
