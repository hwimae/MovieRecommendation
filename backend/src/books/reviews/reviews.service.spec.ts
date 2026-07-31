import { createReviewsService } from './reviews.service';

describe('reviews.service', () => {
  it('listMyReviews applies pagination and returns paginated payload', async () => {
    const items = [
      {
        id: 'ur-1',
        userId: 'u-1',
        storyId: 's-1',
        rating: 4.5,
        title: 'Hay',
        content: 'Noi dung',
        reviewedAt: new Date('2025-01-01T00:00:00.000Z'),
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
        updatedAt: new Date('2025-01-01T00:00:00.000Z'),
        story: {
          id: 's-1',
          title: 'Story 1',
          authors: 'Author 1',
          externalAverageRating: 4.2,
          externalReviewCount: 120,
          userAverageRating: 4.4,
          userReviewCount: 20,
        },
      },
    ];

    const findMany = jest.fn().mockResolvedValue(items);
    const count = jest.fn().mockResolvedValue(42);
    const transaction = jest.fn().mockResolvedValue([items, 42]);

    const prisma = {
      userReview: { findMany, count },
      $transaction: transaction,
    };

    const service = createReviewsService({ prisma } as never);

    const result = await service.listMyReviews('u-1', { page: 2, limit: 10 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u-1' },
        orderBy: { reviewedAt: 'desc' },
        skip: 10,
        take: 10,
      }),
    );
    expect(count).toHaveBeenCalledWith({ where: { userId: 'u-1' } });
    expect(transaction).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      items,
      total: 42,
      page: 2,
      limit: 10,
    });
  });
});
