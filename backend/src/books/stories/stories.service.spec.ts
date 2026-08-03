import type { StoryWithCategory } from './stories.model';
import type { StoriesRepository } from './stories.repository';
import { createStoriesService } from './stories.service';

const createdAt = new Date('2026-01-01T00:00:00.000Z');

function createStory(overrides: Partial<StoryWithCategory> = {}): StoryWithCategory {
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

function createRepositoryMock(): jest.Mocked<StoriesRepository> {
  return {
    searchStories: jest.fn(),
    findByIdWithCategory: jest.fn(),
    findContentMeta: jest.fn(),
  };
}

function createDeps() {
  return { repository: createRepositoryMock(), storyContentReader: { read: jest.fn() } };
}

describe('createStoriesService', () => {
  it('lists stories as public responses with pagination echo', async () => {
    const deps = createDeps();
    deps.repository.searchStories.mockResolvedValue({ items: [createStory()], total: 41 });
    const service = createStoriesService(deps);

    const result = await service.listStories({ page: 2, limit: 20 });

    expect(deps.repository.searchStories).toHaveBeenCalledWith({ page: 2, limit: 20 });
    expect(result.total).toBe(41);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(20);
    expect(result.items[0]).toMatchObject({ id: 'story1', category: 'Tiên hiệp', hasContent: true });
    expect(result.items[0]).not.toHaveProperty('contentPath');
  });

  it('reports a missing story', async () => {
    const deps = createDeps();
    deps.repository.findByIdWithCategory.mockResolvedValue(null);
    const service = createStoriesService(deps);

    await expect(service.getStoryById('missing')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Story not found',
    });
  });

  it('reads story content through the injected reader', async () => {
    const deps = createDeps();
    deps.repository.findContentMeta.mockResolvedValue({
      id: 'story1',
      title: 'Tiên hiệp ký',
      contentPath: 'storage/stories/1.txt',
    });
    deps.storyContentReader.read.mockResolvedValue('Ngày xửa ngày xưa...');
    const service = createStoriesService(deps);

    await expect(service.getStoryContentById('story1')).resolves.toEqual({
      storyId: 'story1',
      title: 'Tiên hiệp ký',
      content: 'Ngày xửa ngày xưa...',
    });
    expect(deps.storyContentReader.read).toHaveBeenCalledWith('storage/stories/1.txt');
  });

  it('reports missing content when the story has no content path or the reader misses', async () => {
    const deps = createDeps();
    deps.repository.findContentMeta.mockResolvedValue({ id: 'story1', title: 'Tiên hiệp ký', contentPath: null });
    const service = createStoriesService(deps);

    await expect(service.getStoryContentById('story1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Story content not found',
    });

    deps.repository.findContentMeta.mockResolvedValue({
      id: 'story1',
      title: 'Tiên hiệp ký',
      contentPath: 'storage/stories/1.txt',
    });
    deps.storyContentReader.read.mockResolvedValue(null);
    await expect(service.getStoryContentById('story1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Story content not found',
    });
  });
});
