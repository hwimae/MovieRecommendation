export const STORY_EMBEDDING_MODEL_FAMILY = 'multilingual-e5-small';
export const STORY_EMBEDDING_DIMENSION = 384;

export function assertStoryEmbedding(values: number[]): number[] {
  if (values.length !== STORY_EMBEDDING_DIMENSION) {
    throw new Error(
      `Expected embedding dimension ${STORY_EMBEDDING_DIMENSION}, received ${values.length}`,
    );
  }

  if (!values.every((value) => Number.isFinite(value))) {
    throw new Error('Embedding contains a non-finite value');
  }

  return values;
}

export function toStoryVectorLiteral(values: number[]): string {
  return `[${assertStoryEmbedding(values).join(',')}]`;
}
