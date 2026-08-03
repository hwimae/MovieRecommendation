import type { Prisma, PrismaClient } from '@prisma/client';
import type { StoryWithCategory } from './stories.model';
import type { StoriesRepository } from './stories.repository';

const includeStoryCategory = { category: true } satisfies Prisma.StoryInclude;

type PrismaStoryWithCategory = Prisma.StoryGetPayload<{ include: typeof includeStoryCategory }>;

function toStoryWithCategory(story: PrismaStoryWithCategory): StoryWithCategory {
  return {
    id: story.id,
    productId: story.productId,
    title: story.title,
    authors: story.authors,
    originalPrice: story.originalPrice,
    currentPrice: story.currentPrice,
    quantity: story.quantity,
    categoryId: story.categoryId,
    averageRating: story.averageRating,
    reviewCount: story.reviewCount,
    externalAverageRating: story.externalAverageRating,
    externalReviewCount: story.externalReviewCount,
    userAverageRating: story.userAverageRating,
    userReviewCount: story.userReviewCount,
    pages: story.pages,
    manufacturer: story.manufacturer,
    coverUrl: story.coverUrl,
    discount: story.discount,
    contentPath: story.contentPath,
    contentHash: story.contentHash,
    contentUpdatedAt: story.contentUpdatedAt,
    contentIndexedAt: story.contentIndexedAt,
    createdAt: story.createdAt,
    updatedAt: story.updatedAt,
    category: { id: story.category.id, name: story.category.name },
  };
}

export function createPrismaStoriesRepository(prisma: PrismaClient): StoriesRepository {
  return {
    async searchStories(query) {
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

      const [items, total] = await prisma.$transaction([
        prisma.story.findMany({
          where,
          include: includeStoryCategory,
          orderBy: [{ externalReviewCount: 'desc' }, { externalAverageRating: 'desc' }, { title: 'asc' }],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        prisma.story.count({ where }),
      ]);

      return { items: items.map(toStoryWithCategory), total };
    },

    async findByIdWithCategory(id) {
      const story = await prisma.story.findUnique({ where: { id }, include: includeStoryCategory });
      return story ? toStoryWithCategory(story) : null;
    },

    async findContentMeta(id) {
      return prisma.story.findUnique({
        where: { id },
        select: { id: true, title: true, contentPath: true },
      });
    },
  };
}
