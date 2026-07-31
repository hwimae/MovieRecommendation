import { notFound } from '../../errors';
import type { StoryContentReader } from '../../storage/story-content-storage';
import type {
  ListStoriesResponse,
  StoryContentResponse,
  StoryResponse,
  StoryWithCategory,
} from './stories.model';
import type { StoriesRepository } from './stories.repository';
import type { ListStoriesQuery } from './stories.schema';

export type StoriesService = {
  listStories(query: ListStoriesQuery): Promise<ListStoriesResponse>;
  getStoryById(id: string): Promise<StoryResponse>;
  getStoryContentById(id: string): Promise<StoryContentResponse>;
};

function toStoryResponse(story: StoryWithCategory): StoryResponse {
  const { category, contentPath, ...publicStory } = story;
  return { ...publicStory, category: category.name, hasContent: contentPath !== null };
}

export function createStoriesService(
  deps: { repository: StoriesRepository; storyContentReader: StoryContentReader },
): StoriesService {
  return {
    async listStories(query) {
      const { items, total } = await deps.repository.searchStories({
        page: query.page,
        limit: query.limit,
        q: query.q,
        hasContent: query.hasContent,
      });

      return { items: items.map(toStoryResponse), total, page: query.page, limit: query.limit };
    },

    async getStoryById(id) {
      const story = await deps.repository.findByIdWithCategory(id);

      if (!story) {
        throw notFound('Story not found');
      }

      return toStoryResponse(story);
    },

    async getStoryContentById(id) {
      const story = await deps.repository.findContentMeta(id);

      if (!story || !story.contentPath) {
        throw notFound('Story content not found');
      }

      const content = await deps.storyContentReader.read(story.contentPath);

      if (content === null) {
        throw notFound('Story content not found');
      }

      return {
        storyId: story.id,
        title: story.title,
        content,
      };
    },
  };
}
