import type { PrismaClient } from '@prisma/client';
import { createPrismaStoriesRepository } from './stories.prisma.repository';

const createdAt = new Date('2026-01-01T00:00:00.000Z');

function createStoryRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'story1',
    productId: 1,
    title: 'Tiên hiệp ký',
    authors: 'Tác giả A',
    originalPrice: 100000,
    currentPrice: 90000,
    quantity: 10,
    categoryId: 'cat1',
    averageRating: 4.5,
    reviewCount: 10,
    externalAverageRating: 4.2,
    externalReviewCount: 120,
    userAverageRating: 4.8,
    userReviewCount: 5,
    pages: 300,
    manufacturer: null,
    coverUrl: null,
    discount: 0.1,
    contentPath: 'storage/stories/1.txt',
    contentHash: 'hash',
    contentUpdatedAt: createdAt,
    contentIndexedAt: createdAt,
    createdAt,
    updatedAt: createdAt,
    category: { id: 'cat1', name: 'Tiên hiệp' },
    ...overrides,
  };
}

function createPrismaMock() {
  const prisma: any = {
    story: { findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
  };
  prisma.$transaction = jest.fn(async (operations: unknown) =>
    Array.isArray(operations) ? Promise.all(operations) : (operations as (tx: unknown) => unknown)(prisma),
  );
  return prisma;
}

function createRepository(prisma: ReturnType<typeof createPrismaMock>) {
  return createPrismaStoriesRepository(prisma as unknown as PrismaClient);
}

describe('createPrismaStoriesRepository', () => {
  it('searches stories with text filter, content filter, and pagination in one transaction', async () => {
    const prisma = createPrismaMock();
    prisma.story.findMany.mockResolvedValue([createStoryRow()]);
    prisma.story.count.mockResolvedValue(1);
    const repository = createRepository(prisma);

    const result = await repository.searchStories({ page: 2, limit: 20, q: 'tiên', hasContent: true });

    const expectedWhere = {
      OR: [
        { title: { contains: 'tiên', mode: 'insensitive' } },
        { authors: { contains: 'tiên', mode: 'insensitive' } },
        { category: { name: { contains: 'tiên', mode: 'insensitive' } } },
      ],
      contentPath: { not: null },
    };
    expect(prisma.story.findMany).toHaveBeenCalledWith({
      where: expectedWhere,
      include: { category: true },
      orderBy: [{ externalReviewCount: 'desc' }, { externalAverageRating: 'desc' }, { title: 'asc' }],
      skip: 20,
      take: 20,
    });
    expect(prisma.story.count).toHaveBeenCalledWith({ where: expectedWhere });
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({ id: 'story1', category: { id: 'cat1', name: 'Tiên hiệp' } });
  });

  it('searches without filters when q/hasContent are absent', async () => {
    const prisma = createPrismaMock();
    prisma.story.findMany.mockResolvedValue([]);
    prisma.story.count.mockResolvedValue(0);
    const repository = createRepository(prisma);

    await repository.searchStories({ page: 1, limit: 20 });

    expect(prisma.story.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, skip: 0, take: 20 }),
    );
  });

  it('finds a story by id with its category', async () => {
    const prisma = createPrismaMock();
    prisma.story.findUnique.mockResolvedValue(createStoryRow());
    const repository = createRepository(prisma);

    await expect(repository.findByIdWithCategory('story1')).resolves.toMatchObject({ id: 'story1' });
    expect(prisma.story.findUnique).toHaveBeenCalledWith({
      where: { id: 'story1' },
      include: { category: true },
    });

    prisma.story.findUnique.mockResolvedValue(null);
    await expect(repository.findByIdWithCategory('missing')).resolves.toBeNull();
  });

  it('finds the content meta projection', async () => {
    const prisma = createPrismaMock();
    prisma.story.findUnique.mockResolvedValue({ id: 'story1', title: 'Tiên hiệp ký', contentPath: 'storage/stories/1.txt' });
    const repository = createRepository(prisma);

    await expect(repository.findContentMeta('story1')).resolves.toEqual({
      id: 'story1',
      title: 'Tiên hiệp ký',
      contentPath: 'storage/stories/1.txt',
    });
    expect(prisma.story.findUnique).toHaveBeenCalledWith({
      where: { id: 'story1' },
      select: { id: true, title: true, contentPath: true },
    });
  });
});
