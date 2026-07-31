import { Prisma } from '@prisma/client';
import type { BackendDeps } from '../../dependencies';
import { notFound } from '../../errors';
import { createStoryContentReader, type StoryContentReader } from '../../storage/story-content-storage';
import type { ListStoriesQuery } from './stories.schema';

type StoriesServiceDeps = Pick<BackendDeps, 'prisma'> & {
  storyContentReader?: StoryContentReader;
};

type StoryWithCategory = Prisma.StoryGetPayload<{ include: { category: true } }>;

export type StoryResponse = Omit<StoryWithCategory, 'category' | 'contentPath'> & {
  category: string;
  hasContent: boolean;
};

export type ListStoriesResponse = {
  items: StoryResponse[];
  total: number;
  page: number;
  limit: number;
};

export type StoryContentResponse = {
  storyId: string;
  title: string;
  content: string;
};

export type StoriesService = {
  listStories(query: ListStoriesQuery): Promise<ListStoriesResponse>;
  getStoryById(id: string): Promise<StoryResponse>;
  getStoryContentById(id: string): Promise<StoryContentResponse>;
};

export function createStoriesService(deps: StoriesServiceDeps): StoriesService {
  const storyContentReader: StoryContentReader = deps.storyContentReader ?? createStoryContentReader();

  return {
    async listStories(query) {
      const where: Prisma.StoryWhereInput = {
        ...(query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: 'insensitive' } },
                { authors: { contains: query.q, mode: 'insensitive' } },
                { category: { name: { contains: query.q, mode: 'insensitive' } } },
              ],
            }
          : {}),
        ...(query.hasContent === true ? { contentPath: { not: null } } : {}),
      };

      const [items, total] = await deps.prisma.$transaction([
        deps.prisma.story.findMany({
          where,
          include: { category: true },
          orderBy: [{ externalReviewCount: 'desc' }, { externalAverageRating: 'desc' }, { title: 'asc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        deps.prisma.story.count({ where }),
      ]);

      return { items: items.map(toStoryResponse), total, page: query.page, limit: query.limit };
    },

    async getStoryById(id) {
      const story = await deps.prisma.story.findUnique({ where: { id }, include: { category: true } });

      if (!story) {
        throw notFound('Story not found');
      }

      return toStoryResponse(story);
    },

    async getStoryContentById(id) {
      const story = await deps.prisma.story.findUnique({
        where: { id },
        select: { id: true, title: true, contentPath: true },
      });

      if (!story || !story.contentPath) {
        throw notFound('Story content not found');
      }

      const content = await storyContentReader.read(story.contentPath);

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

function toStoryResponse(story: StoryWithCategory): StoryResponse {
  const { category, contentPath, ...publicStory } = story;
  return { ...publicStory, category: category.name, hasContent: contentPath !== null };
}
