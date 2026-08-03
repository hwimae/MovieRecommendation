import { z } from 'zod';
import { STORY_EMBEDDING_DIMENSION } from './embedding-contract';

export const recommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const searchRecommendationsByVectorSchema = z.object({
  query: z.string().trim().min(2).max(500),
  embedding: z.array(z.number().finite()).length(STORY_EMBEDDING_DIMENSION),
  limit: z.number().int().min(1).max(10).default(5),
});

export type RecommendationsQuery = z.infer<typeof recommendationsQuerySchema>;
export type SearchRecommendationsByVectorBody = z.infer<typeof searchRecommendationsByVectorSchema>;
