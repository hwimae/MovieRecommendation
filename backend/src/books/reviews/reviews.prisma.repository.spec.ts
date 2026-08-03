import { Prisma, type PrismaClient } from '@prisma/client';
import { createPrismaReviewsRepository } from './reviews.prisma.repository';

const reviewedAt = new Date('2026-06-01T00:00:00.000Z');

function createReviewRow() {
  return {
    id: 'rev1',
    userId: 'user1',
    storyId: 'story1',
    rating: 4.5,
    title: 'Hay',
    content: 'Đáng đọc',
    reviewedAt,
    createdAt: reviewedAt,
    updatedAt: reviewedAt,
  };
}

function createPrismaMock() {
  const tx = {
    story: { findUnique: jest.fn(), update: jest.fn() },
    userReview: { upsert: jest.fn(), aggregate: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  };
  const prisma: any = {
    ...tx,
    $transaction: jest.fn(async (arg: unknown, _options?: unknown) =>
      Array.isArray(arg) ? Promise.all(arg) : (arg as (t: typeof tx) => unknown)(tx),
    ),
  };
  return { prisma, tx };
}

function createRepository(prisma: any) {
  return createPrismaReviewsRepository(prisma as PrismaClient);
}

function serializationConflict() {
  return new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: 'test' });
}

const input = { storyId: 'story1', rating: 4.5, title: 'Hay', content: 'Đáng đọc' };

describe('createPrismaReviewsRepository', () => {
  it('upserts the review and refreshes the story rating in one serializable transaction', async () => {
    const { prisma, tx } = createPrismaMock();
    tx.story.findUnique.mockResolvedValue({ id: 'story1' });
    tx.userReview.upsert.mockResolvedValue(createReviewRow());
    tx.userReview.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: { _all: 3 } });
    const repository = createRepository(prisma);

    const review = await repository.upsertForStoryAndRefreshRating('user1', input);

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(tx.userReview.upsert).toHaveBeenCalledWith({
      where: { userId_storyId: { userId: 'user1', storyId: 'story1' } },
      update: { rating: 4.5, title: 'Hay', content: 'Đáng đọc', reviewedAt: expect.any(Date) },
      create: { userId: 'user1', storyId: 'story1', rating: 4.5, title: 'Hay', content: 'Đáng đọc' },
    });
    expect(tx.story.update).toHaveBeenCalledWith({
      where: { id: 'story1' },
      data: { userAverageRating: 4.5, userReviewCount: 3 },
    });
    expect(review).toMatchObject({ id: 'rev1', rating: 4.5 });
  });

  it('returns null without writing when the story does not exist', async () => {
    const { prisma, tx } = createPrismaMock();
    tx.story.findUnique.mockResolvedValue(null);
    const repository = createRepository(prisma);

    await expect(repository.upsertForStoryAndRefreshRating('user1', input)).resolves.toBeNull();
    expect(tx.userReview.upsert).not.toHaveBeenCalled();
  });

  it('defaults the aggregate to zero when no reviews remain', async () => {
    const { prisma, tx } = createPrismaMock();
    tx.story.findUnique.mockResolvedValue({ id: 'story1' });
    tx.userReview.upsert.mockResolvedValue(createReviewRow());
    tx.userReview.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: { _all: 0 } });
    const repository = createRepository(prisma);

    await repository.upsertForStoryAndRefreshRating('user1', input);

    expect(tx.story.update).toHaveBeenCalledWith({
      where: { id: 'story1' },
      data: { userAverageRating: 0, userReviewCount: 0 },
    });
  });

  it('retries serialization conflicts up to three attempts', async () => {
    const { prisma, tx } = createPrismaMock();
    tx.story.findUnique.mockResolvedValue({ id: 'story1' });
    tx.userReview.upsert.mockResolvedValue(createReviewRow());
    tx.userReview.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: { _all: 1 } });
    prisma.$transaction
      .mockRejectedValueOnce(serializationConflict())
      .mockRejectedValueOnce(serializationConflict());
    const repository = createRepository(prisma);

    await expect(repository.upsertForStoryAndRefreshRating('user1', input)).resolves.toMatchObject({ id: 'rev1' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('gives up after three serialization conflicts', async () => {
    const { prisma } = createPrismaMock();
    prisma.$transaction.mockRejectedValue(serializationConflict());
    const repository = createRepository(prisma);

    await expect(repository.upsertForStoryAndRefreshRating('user1', input)).rejects.toMatchObject({ code: 'P2034' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(3);
  });

  it('lists my reviews with the story projection and total', async () => {
    const { prisma, tx } = createPrismaMock();
    const storySelect = {
      id: true,
      title: true,
      authors: true,
      externalAverageRating: true,
      externalReviewCount: true,
      userAverageRating: true,
      userReviewCount: true,
    };
    tx.userReview.findMany.mockResolvedValue([
      {
        ...createReviewRow(),
        story: {
          id: 'story1',
          title: 'Tiên hiệp ký',
          authors: 'Tác giả A',
          externalAverageRating: 4.2,
          externalReviewCount: 120,
          userAverageRating: 4.8,
          userReviewCount: 5,
        },
      },
    ]);
    tx.userReview.count.mockResolvedValue(1);
    const repository = createRepository(prisma);

    const result = await repository.listByUser('user1', { page: 1, limit: 20 });

    expect(tx.userReview.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      include: { story: { select: storySelect } },
      orderBy: { reviewedAt: 'desc' },
      skip: 0,
      take: 20,
    });
    expect(tx.userReview.count).toHaveBeenCalledWith({ where: { userId: 'user1' } });
    expect(result.total).toBe(1);
    expect(result.items[0].story).toMatchObject({ title: 'Tiên hiệp ký' });
  });
});
