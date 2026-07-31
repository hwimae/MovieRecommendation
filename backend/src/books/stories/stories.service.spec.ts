import { createStoriesService } from './stories.service';

describe('stories.service', () => {
  const baseStory = {
    id: 'story-1',
    sourceBookId: 1,
    title: 'Tiên Nghịch',
    authors: 'Nhĩ Căn',
    categoryId: 2,
    description: 'Mô tả',
    coverImage: null,
    externalAverageRating: 4.8,
    externalReviewCount: 100,
    contentPath: 'storage/stories/1.txt' as string | null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    category: { id: 2, name: 'Tiên hiệp', createdAt: new Date('2023-01-01T00:00:00.000Z') },
  };

  it('listStories does not load content relation and derives hasContent from contentPath', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { ...baseStory, contentPath: 'storage/stories/1.txt' },
      { ...baseStory, id: 'story-2', title: 'Không có file', contentPath: null },
    ]);
    const count = jest.fn().mockResolvedValue(2);
    const transaction = jest.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations));

    const prisma = {
      story: { findMany, count, findUnique: jest.fn() },
      $transaction: transaction,
    };

    const service = createStoriesService({ prisma } as never);

    const result = await service.listStories({ page: 1, limit: 20, q: undefined, hasContent: undefined });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: { category: true },
      }),
    );
    expect(findMany).toHaveBeenCalledWith(
      expect.not.objectContaining({
        include: expect.objectContaining({ content: expect.anything() }),
      }),
    );

    expect(result.items).toHaveLength(2);
    expect(result.items[0].hasContent).toBe(true);
    expect(result.items[1].hasContent).toBe(false);
    expect(result.items[0]).not.toHaveProperty('contentPath');
    expect(result.items[1]).not.toHaveProperty('contentPath');
  });

  it('getStoryById does not expose contentPath and derives hasContent', async () => {
    const findUnique = jest.fn().mockResolvedValue({ ...baseStory, contentPath: 'storage/stories/1.txt' });
    const prisma = {
      story: { findMany: jest.fn(), count: jest.fn(), findUnique },
      $transaction: jest.fn(),
    };

    const service = createStoriesService({ prisma } as never);

    const result = await service.getStoryById('story-1');

    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'story-1' }, include: { category: true } });
    expect(result.hasContent).toBe(true);
    expect(result).not.toHaveProperty('contentPath');
  });

  it('listStories applies hasContent=true filter with contentPath not null', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const transaction = jest.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations));

    const prisma = {
      story: { findMany, count, findUnique: jest.fn() },
      $transaction: transaction,
    };

    const service = createStoriesService({ prisma } as never);

    await service.listStories({ page: 1, limit: 20, q: undefined, hasContent: true });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          contentPath: { not: null },
        }),
      }),
    );
  });

  it('getStoryContentById reads content via injected reader', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'story-1',
      title: 'Tiên Nghịch',
      contentPath: 'storage/stories/1.txt',
    });
    const reader = { read: jest.fn().mockResolvedValue('Nội dung truyện') };

    const prisma = {
      story: { findMany: jest.fn(), count: jest.fn(), findUnique },
      $transaction: jest.fn(),
    };

    const service = createStoriesService({ prisma, storyContentReader: reader } as never);

    const result = await service.getStoryContentById('story-1');

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'story-1' },
      select: { id: true, title: true, contentPath: true },
    });
    expect(reader.read).toHaveBeenCalledWith('storage/stories/1.txt');
    expect(result).toEqual({
      storyId: 'story-1',
      title: 'Tiên Nghịch',
      content: 'Nội dung truyện',
    });
  });

  it('getStoryContentById returns 404 when contentPath missing', async () => {
    const prisma = {
      story: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ id: 'story-1', title: 'Tiên Nghịch', contentPath: null }),
      },
      $transaction: jest.fn(),
    };
    const reader = { read: jest.fn() };

    const service = createStoriesService({ prisma, storyContentReader: reader } as never);

    await expect(service.getStoryContentById('story-1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Story content not found',
    });
    expect(reader.read).not.toHaveBeenCalled();
  });

  it('getStoryContentById returns 404 when reader cannot find file', async () => {
    const prisma = {
      story: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({
          id: 'story-1',
          title: 'Tiên Nghịch',
          contentPath: 'storage/stories/missing.txt',
        }),
      },
      $transaction: jest.fn(),
    };
    const reader = { read: jest.fn().mockResolvedValue(null) };

    const service = createStoriesService({ prisma, storyContentReader: reader } as never);

    await expect(service.getStoryContentById('story-1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Story content not found',
    });
  });
});
