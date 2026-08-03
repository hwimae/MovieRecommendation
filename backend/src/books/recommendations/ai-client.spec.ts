import { createAiClient } from './ai-client';

describe('createAiClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('requests embeddings from the AI service', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: [0.1, 0.2, 0.3] }),
    } as Response);

    const client = createAiClient('http://localhost:8000');

    await expect(client.embedText('truyện tu tiên')).resolves.toEqual([0.1, 0.2, 0.3]);
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'truyện tu tiên' }),
    });
  });

  it('requests an advisor answer from the AI service', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ answer: 'Bạn nên thử Truyện A.' }),
    } as Response);

    const client = createAiClient('http://localhost:8000/');

    await expect(
      client.generateAdvisorAnswer({
        query: 'Tôi thích phiêu lưu',
        contexts: [
          {
            storyId: 'story-1',
            title: 'Truyện A',
            authors: 'Tác giả A',
            category: 'Fantasy',
            reason: 'Có nhiều hành trình.',
            content: 'Nhân vật chính rời làng.',
            score: 0.9,
          },
        ],
      }),
    ).resolves.toBe('Bạn nên thử Truyện A.');
  });

  it('throws when AI service returns an invalid embedding response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ embedding: ['bad'] }),
    } as Response);

    const client = createAiClient('http://localhost:8000');

    await expect(client.embedText('abc')).rejects.toThrow('Invalid AI embedding response');
  });
});
