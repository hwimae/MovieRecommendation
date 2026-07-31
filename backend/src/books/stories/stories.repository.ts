import type { StorySearchQuery, StoryWithCategory } from './stories.model';

export type StoryContentMeta = { id: string; title: string; contentPath: string | null };

export interface StoriesRepository {
  searchStories(query: StorySearchQuery): Promise<{ items: StoryWithCategory[]; total: number }>;
  findByIdWithCategory(id: string): Promise<StoryWithCategory | null>;
  findContentMeta(id: string): Promise<StoryContentMeta | null>;
}
