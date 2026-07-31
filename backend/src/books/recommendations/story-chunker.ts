export type StoryChunkInput = {
  maxCharacters: number;
  overlapCharacters: number;
};

export type StoryChunk = {
  chunkIndex: number;
  content: string;
};

const DEFAULT_OPTIONS: StoryChunkInput = {
  maxCharacters: 2400,
  overlapCharacters: 300,
};

export function cleanStoryContent(content: string): string {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .filter((line) => line.length > 0)
    .join('\n');
}

export function chunkStoryContent(content: string, options: StoryChunkInput = DEFAULT_OPTIONS): StoryChunk[] {
  const cleaned = cleanStoryContent(content);
  if (cleaned.length === 0) return [];
  if (cleaned.length <= options.maxCharacters) return [{ chunkIndex: 0, content: cleaned }];

  const chunks: StoryChunk[] = [];
  let start = 0;

  while (start < cleaned.length) {
    const hardEnd = Math.min(start + options.maxCharacters, cleaned.length);
    const end = findChunkEnd(cleaned, start, hardEnd);
    const chunk = cleaned.slice(start, end).trim();

    if (chunk.length > 0) {
      chunks.push({ chunkIndex: chunks.length, content: chunk });
    }

    if (end >= cleaned.length) break;
    const nextStart = Math.max(0, end - options.overlapCharacters);
    start = nextStart > start ? nextStart : end;
  }

  return chunks;
}

function findChunkEnd(content: string, start: number, hardEnd: number): number {
  if (hardEnd >= content.length) return content.length;

  const minimumEnd = start + Math.min(200, Math.floor((hardEnd - start) / 2));
  const newlineIndex = content.lastIndexOf('\n', hardEnd);
  if (newlineIndex > minimumEnd) return newlineIndex;

  const sentenceIndex = Math.max(content.lastIndexOf('.', hardEnd), content.lastIndexOf('!', hardEnd), content.lastIndexOf('?', hardEnd));
  if (sentenceIndex > minimumEnd) return sentenceIndex + 1;

  return hardEnd;
}
