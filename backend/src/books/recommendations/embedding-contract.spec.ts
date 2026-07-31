import {
  STORY_EMBEDDING_DIMENSION,
  STORY_EMBEDDING_MODEL_FAMILY,
  assertStoryEmbedding,
  toStoryVectorLiteral,
} from './embedding-contract';

describe('embedding-contract', () => {
  it('exposes the story embedding model family and dimension', () => {
    expect(STORY_EMBEDDING_MODEL_FAMILY).toBe('multilingual-e5-small');
    expect(STORY_EMBEDDING_DIMENSION).toBe(384);
  });

  it('accepts a finite 384-dimension embedding', () => {
    const values = new Array(384).fill(0.1);
    expect(assertStoryEmbedding(values)).toBe(values);
    expect(toStoryVectorLiteral(values)).toBe(`[${values.join(',')}]`);
  });

  it('rejects embeddings with the wrong dimension', () => {
    expect(() => assertStoryEmbedding([0.1, 0.2])).toThrow(
      'Expected embedding dimension 384, received 2',
    );
  });
});
