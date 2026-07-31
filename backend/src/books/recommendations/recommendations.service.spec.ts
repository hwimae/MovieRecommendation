import type { PopularStoryCandidate, StoryChunkSearchRow } from './recommendations.model';
import type { RecommendationsRepository } from './recommendations.repository';
import { createRecommendationsService } from './recommendations.service';

function createCandidate(overrides: Partial<PopularStoryCandidate> = {}): PopularStoryCandidate {
  return {
    id: 'story1',
    title: 'Tiên hiệp ký',
    authors: 'Tác giả A',
    userAverageRating: 4.8,
    userReviewCount: 5,
    category: { name: 'Tiên hiệp' },
    ...overrides,
  };
}

function createRow(overrides: Partial<StoryChunkSearchRow> = {}): StoryChunkSearchRow {
  return {
    storyId: 'story1',
    title: 'Tiên hiệp ký',
    authors: 'Tác giả A',
    category: 'Tiên hiệp',
    averageRating: 4.8,
    reviewCount: 5,
    chunkContent: 'đoạn nội dung tu tiên',
    distance: 0.2,
    ...overrides,
  };
}

function createRepositoryMock(): jest.Mocked<RecommendationsRepository> {
  return {
    listReviewedStoryIds: jest.fn(),
    listPopularStories: jest.fn(),
    searchStoryChunksByVector: jest.fn(),
  };
}

describe('createRecommendationsService', () => {
  it('lists popular recommendations with the rating-weighted score', async () => {
    const repository = createRepositoryMock();
    repository.listPopularStories.mockResolvedValue([createCandidate()]);
    const service = createRecommendationsService({ repository });

    const result = await service.listPopularRecommendations({ limit: 10 });

    expect(repository.listPopularStories).toHaveBeenCalledWith({ limit: 10, excludeStoryIds: [] });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      storyId: 'story1',
      category: 'Tiên hiệp',
      averageRating: 4.8,
      reviewCount: 5,
      score: 4.8 * Math.log1p(5),
    });
    expect(result.items[0].reason).toContain('4.8/5');
  });

  it('excludes already-reviewed stories for the current user', async () => {
    const repository = createRepositoryMock();
    repository.listReviewedStoryIds.mockResolvedValue(['story9']);
    repository.listPopularStories.mockResolvedValue([createCandidate()]);
    const service = createRecommendationsService({ repository });

    await service.listRecommendationsForUser('user1', { limit: 10 });

    expect(repository.listReviewedStoryIds).toHaveBeenCalledWith('user1');
    expect(repository.listPopularStories).toHaveBeenCalledWith({ limit: 10, excludeStoryIds: ['story9'] });
  });

  it('deduplicates vector rows per story keeping the closest chunk', async () => {
    const repository = createRepositoryMock();
    repository.searchStoryChunksByVector.mockResolvedValue([
      createRow({ distance: 0.5, chunkContent: 'đoạn xa' }),
      createRow({ distance: 0.1, chunkContent: 'đoạn gần' }),
      createRow({ storyId: 'story2', title: 'Truyện B', distance: 0.3 }),
    ]);
    const service = createRecommendationsService({ repository });
    const embedding = Array.from({ length: 384 }, () => 0.1);

    const result = await service.searchStoryAdvisorByVector({ query: 'tu tiên', embedding, limit: 5 });

    expect(repository.searchStoryChunksByVector).toHaveBeenCalledWith(embedding, 5);
    expect(result.recommendations).toHaveLength(2);
    expect(result.recommendations[0]).toMatchObject({ storyId: 'story1', score: 0.9 });
    expect(result.recommendations[0].reason).toContain('đoạn gần');
    expect(result.answer).toContain('tu tiên');
    expect(result.answer).toContain('2 truyện');
  });

  it('rejects a vector search with no indexed content', async () => {
    const repository = createRepositoryMock();
    repository.searchStoryChunksByVector.mockResolvedValue([]);
    const service = createRecommendationsService({ repository });
    const embedding = Array.from({ length: 384 }, () => 0.1);

    await expect(
      service.searchStoryAdvisorByVector({ query: 'tu tiên', embedding, limit: 5 }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Chưa có dữ liệu nội dung truyện để tư vấn. Hãy chạy script index story chunks ở máy local trước.',
    });
  });
});
