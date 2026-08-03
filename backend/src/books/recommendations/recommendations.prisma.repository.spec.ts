import type { PrismaClient } from '@prisma/client';
import { createPrismaRecommendationsRepository } from './recommendations.prisma.repository';

function createPrismaMock() {
  return {
    userReview: { findMany: jest.fn() },
    story: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  };
}

function createRepository(prisma: ReturnType<typeof createPrismaMock>) {
  return createPrismaRecommendationsRepository(prisma as unknown as PrismaClient);
}

describe('createPrismaRecommendationsRepository', () => {
  it('lists the story ids the user already reviewed', async () => {
    const prisma = createPrismaMock();
    prisma.userReview.findMany.mockResolvedValue([{ storyId: 'story1' }, { storyId: 'story2' }]);
    const repository = createRepository(prisma);

    await expect(repository.listReviewedStoryIds('user1')).resolves.toEqual(['story1', 'story2']);
    expect(prisma.userReview.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      select: { storyId: true },
    });
  });

  it('lists popular story candidates with optional exclusions', async () => {
    const prisma = createPrismaMock();
    prisma.story.findMany.mockResolvedValue([
      {
        id: 'story1',
        title: 'Tiên hiệp ký',
        authors: 'Tác giả A',
        userAverageRating: 4.8,
        userReviewCount: 5,
        category: { id: 'cat1', name: 'Tiên hiệp' },
      },
    ]);
    const repository = createRepository(prisma);

    const candidates = await repository.listPopularStories({ limit: 10, excludeStoryIds: ['story9'] });

    expect(prisma.story.findMany).toHaveBeenCalledWith({
      where: {
        userAverageRating: { gt: 0 },
        userReviewCount: { gt: 0 },
        id: { notIn: ['story9'] },
      },
      include: { category: true },
      orderBy: [{ userReviewCount: 'desc' }, { userAverageRating: 'desc' }, { title: 'asc' }],
      take: 10,
    });
    expect(candidates).toEqual([
      {
        id: 'story1',
        title: 'Tiên hiệp ký',
        authors: 'Tác giả A',
        userAverageRating: 4.8,
        userReviewCount: 5,
        category: { name: 'Tiên hiệp' },
      },
    ]);

    prisma.story.findMany.mockResolvedValue([]);
    await repository.listPopularStories({ limit: 10, excludeStoryIds: [] });
    expect(prisma.story.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { userAverageRating: { gt: 0 }, userReviewCount: { gt: 0 } } }),
    );
  });

  it('runs the vector search and returns the raw rows', async () => {
    const prisma = createPrismaMock();
    const rows = [
      {
        storyId: 'story1',
        title: 'Tiên hiệp ký',
        authors: 'Tác giả A',
        category: 'Tiên hiệp',
        averageRating: 4.8,
        reviewCount: 5,
        chunkContent: 'đoạn nội dung',
        distance: 0.12,
      },
    ];
    prisma.$queryRaw.mockResolvedValue(rows);
    const repository = createRepository(prisma);
    const embedding = Array.from({ length: 384 }, () => 0.1);

    await expect(repository.searchStoryChunksByVector(embedding, 5)).resolves.toEqual(rows);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('builds the vector search query with per-story ranking and freshness guards', async () => {
    const prisma = createPrismaMock();
    prisma.$queryRaw.mockResolvedValue([]);
    const repository = createRepository(prisma);
    const embedding = Array.from({ length: 384 }, () => 0.1);

    await repository.searchStoryChunksByVector(embedding, 5);

    const sql = (prisma.$queryRaw.mock.calls[0]?.[0] as unknown as TemplateStringsArray).join('?');
    expect(sql).toContain('ROW_NUMBER() OVER');
    expect(sql).toContain('PARTITION BY s.id');
    expect(sql).toContain('"storyRank" = 1');
    expect(sql).toContain('s."contentIndexedAt" >= s."contentUpdatedAt"');
  });
});
