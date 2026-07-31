import { createRecommendationsService } from './recommendations.service';

const candidateRows = [
  {
    storyId: 'story-1',
    title: 'Tu Tiên Ký',
    authors: 'Tác giả A',
    category: 'Tiên hiệp',
    averageRating: 4.8,
    reviewCount: 120,
    chunkContent: 'Thiếu niên yếu ớt bước vào con đường tu luyện và dần mạnh lên.',
    distance: 0.1,
  },
  {
    storyId: 'story-2',
    title: 'Đấu Trí Thành Chủ',
    authors: 'Tác giả B',
    category: 'Huyền huyễn',
    averageRating: 4.5,
    reviewCount: 80,
    chunkContent: 'Các thế lực đấu trí để giành quyền kiểm soát thành trì.',
    distance: 0.25,
  },
];

describe('listPopularRecommendations', () => {
  it('queries and maps popular stories using app user review aggregates', async () => {
    const story = {
      id: 'story-10',
      title: 'Kiếm Lộ',
      authors: 'Tác giả C',
      categoryId: 'cat-1',
      category: { id: 'cat-1', name: 'Tiên hiệp' },
      userAverageRating: 4.7,
      userReviewCount: 321,
      externalAverageRating: 4.9,
      externalReviewCount: 9999,
    };

    const prisma = {
      story: {
        findMany: jest.fn().mockResolvedValue([story]),
      },
    };
    const service = createRecommendationsService({ prisma } as never);
    const query = { limit: 5 };

    const result = await service.listPopularRecommendations(query);

    expect(prisma.story.findMany).toHaveBeenCalledWith({
      where: { userAverageRating: { gt: 0 }, userReviewCount: { gt: 0 } },
      include: { category: true },
      orderBy: [{ userReviewCount: 'desc' }, { userAverageRating: 'desc' }, { title: 'asc' }],
      take: query.limit,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        storyId: 'story-10',
        averageRating: story.userAverageRating,
        reviewCount: story.userReviewCount,
      }),
    );
    expect(result.items[0].reason).toContain('review từ người dùng app');
  });
});

describe('searchStoryAdvisorByVector', () => {
  it('returns grouped recommendations from the provided vector without calling aiClient', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue(candidateRows),
    };

    const service = createRecommendationsService({ prisma } as never);
    const result = await service.searchStoryAdvisorByVector({
      query: 'main yếu thành mạnh',
      embedding: new Array(384).fill(0.01),
      limit: 2,
    });

    expect(result.answer).toContain('main yếu thành mạnh');
    expect(result.recommendations).toHaveLength(2);
    expect(result.recommendations[0].storyId).toBe('story-1');
    expect(result.recommendations[0].reason).toContain('Nội dung gần với yêu cầu');

    const sql = (prisma.$queryRaw.mock.calls[0]?.[0] as TemplateStringsArray).join('?');
    expect(sql).toContain('ROW_NUMBER() OVER');
    expect(sql).toContain('PARTITION BY s.id');
    expect(sql).toContain('WHERE "storyRank" = 1');
    expect(sql).toContain('s."contentPath" IS NOT NULL');
    expect(sql).toContain('s."contentIndexedAt" IS NOT NULL');
    expect(sql).toContain('s."contentUpdatedAt" IS NOT NULL');
    expect(sql).toContain('s."contentIndexedAt" >= s."contentUpdatedAt"');
    expect(sql).not.toContain('s."contentUpdatedAt" IS NULL');
  });

  it('can return up to the requested number of unique stories from the ranked repository rows', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([
        {
          storyId: 'story-1',
          title: 'Tu Tiên Ký',
          authors: 'Tác giả A',
          category: 'Tiên hiệp',
          averageRating: 4.8,
          reviewCount: 120,
          chunkContent: 'Thiếu niên yếu ớt bước vào con đường tu luyện và dần mạnh lên.',
          distance: 0.1,
        },
        {
          storyId: 'story-2',
          title: 'Đấu Trí Thành Chủ',
          authors: 'Tác giả B',
          category: 'Huyền huyễn',
          averageRating: 4.5,
          reviewCount: 80,
          chunkContent: 'Các thế lực đấu trí để giành quyền kiểm soát thành trì.',
          distance: 0.2,
        },
        {
          storyId: 'story-3',
          title: 'Hắc Long Sơn',
          authors: 'Tác giả C',
          category: 'Phiêu lưu',
          averageRating: 4.4,
          reviewCount: 64,
          chunkContent: 'Một đoàn thám hiểm tiến vào dãy núi đầy bí ẩn và cổ vật.',
          distance: 0.3,
        },
      ]),
    };

    const service = createRecommendationsService({ prisma } as never);
    const result = await service.searchStoryAdvisorByVector({
      query: 'phiêu lưu tu luyện',
      embedding: new Array(384).fill(0.02),
      limit: 3,
    });

    expect(result.recommendations.map((item) => item.storyId)).toEqual([
      'story-1',
      'story-2',
      'story-3',
    ]);
  });
});
