import { z } from 'zod';

export const reviewStorySchema = z.object({
  storyId: z.string().min(1).regex(/^c[a-z0-9]{8,}$/i),
  rating: z.number().min(0.5).max(5),
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(5000),
});

export const listMyReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ReviewStoryInput = z.infer<typeof reviewStorySchema>;
export type ListMyReviewsQuery = z.infer<typeof listMyReviewsQuerySchema>;
