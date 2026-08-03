import type { MyReview, UserReview } from './reviews.model';
import type { ReviewsRepository } from './reviews.repository';
import { createReviewsService } from './reviews.service';

const reviewedAt = new Date('2026-06-01T00:00:00.000Z');

function createReview(): UserReview {
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

function createMyReview(): MyReview {
  return {
    ...createReview(),
    story: {
      id: 'story1',
      title: 'Tiên hiệp ký',
      authors: 'Tác giả A',
      externalAverageRating: 4.2,
      externalReviewCount: 120,
      userAverageRating: 4.8,
      userReviewCount: 5,
    },
  };
}

function createRepositoryMock(): jest.Mocked<ReviewsRepository> {
  return {
    upsertForStoryAndRefreshRating: jest.fn(),
    listByUser: jest.fn(),
  };
}

describe('createReviewsService', () => {
  it('reviews a story through the repository', async () => {
    const repository = createRepositoryMock();
    repository.upsertForStoryAndRefreshRating.mockResolvedValue(createReview());
    const service = createReviewsService({ repository });
    const input = { storyId: 'story1', rating: 4.5, title: 'Hay', content: 'Đáng đọc' };

    await expect(service.reviewStory('user1', input)).resolves.toMatchObject({ id: 'rev1' });
    expect(repository.upsertForStoryAndRefreshRating).toHaveBeenCalledWith('user1', input);
  });

  it('reports a missing story', async () => {
    const repository = createRepositoryMock();
    repository.upsertForStoryAndRefreshRating.mockResolvedValue(null);
    const service = createReviewsService({ repository });

    await expect(
      service.reviewStory('user1', { storyId: 'missing', rating: 4, title: 'x', content: 'y' }),
    ).rejects.toMatchObject({ statusCode: 404, message: 'Story not found' });
  });

  it('lists my reviews with pagination echo', async () => {
    const repository = createRepositoryMock();
    repository.listByUser.mockResolvedValue({ items: [createMyReview()], total: 7 });
    const service = createReviewsService({ repository });

    await expect(service.listMyReviews('user1', { page: 2, limit: 5 })).resolves.toEqual({
      items: [createMyReview()],
      total: 7,
      page: 2,
      limit: 5,
    });
    expect(repository.listByUser).toHaveBeenCalledWith('user1', { page: 2, limit: 5 });
  });
});
