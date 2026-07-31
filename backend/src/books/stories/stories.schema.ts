import { z } from 'zod';

export const listStoriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().max(200).optional(),
  hasContent: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
});

export const storyIdParamsSchema = z.object({
  id: z.string().min(1),
});

export type ListStoriesQuery = z.infer<typeof listStoriesQuerySchema>;
export type StoryIdParams = z.infer<typeof storyIdParamsSchema>;
