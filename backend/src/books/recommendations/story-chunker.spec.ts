import { chunkStoryContent, cleanStoryContent } from './story-chunker';

describe('cleanStoryContent', () => {
  it('normalizes whitespace and removes empty lines', () => {
    expect(cleanStoryContent(' Dòng một\r\n\r\n   Dòng   hai  ')).toBe('Dòng một\nDòng hai');
  });
});

describe('chunkStoryContent', () => {
  it('returns one chunk for short content', () => {
    expect(chunkStoryContent('Một đoạn truyện ngắn.', { maxCharacters: 100, overlapCharacters: 10 })).toEqual([
      { chunkIndex: 0, content: 'Một đoạn truyện ngắn.' },
    ]);
  });

  it('splits long content with overlap', () => {
    const content = 'a'.repeat(80) + '\n' + 'b'.repeat(80) + '\n' + 'c'.repeat(80);

    const chunks = chunkStoryContent(content, { maxCharacters: 120, overlapCharacters: 20 });

    expect(chunks).toHaveLength(3);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[1].chunkIndex).toBe(1);
    expect(chunks[2].chunkIndex).toBe(2);
    expect(chunks[1].content.startsWith('a'.repeat(20))).toBe(true);
  });

  it('continues advancing when a preferred split point is inside the overlap window', () => {
    const content = `${'a'.repeat(120)}\n${'b'.repeat(120)}`;

    const chunks = chunkStoryContent(content, { maxCharacters: 120, overlapCharacters: 100 });

    expect(chunks).toHaveLength(4);
    expect(chunks[0].content).toBe('a'.repeat(120));
    expect(chunks[1].content).toBe('a'.repeat(100));
    expect(chunks[2].content.startsWith('b')).toBe(true);
    expect(chunks[3].content.endsWith('b'.repeat(100))).toBe(true);
  });

  it('drops blank content', () => {
    expect(chunkStoryContent('   \n\n   ', { maxCharacters: 100, overlapCharacters: 10 })).toEqual([]);
  });
});
