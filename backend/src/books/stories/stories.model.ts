export type StoryCategory = { id: string; name: string };

export type Story = {
  id: string;
  productId: number;
  title: string;
  authors: string;
  originalPrice: number | null;
  currentPrice: number | null;
  quantity: number | null;
  categoryId: string;
  averageRating: number;
  reviewCount: number;
  externalAverageRating: number;
  externalReviewCount: number;
  userAverageRating: number;
  userReviewCount: number;
  pages: number | null;
  manufacturer: string | null;
  coverUrl: string | null;
  discount: number | null;
  contentPath: string | null;
  contentHash: string | null;
  contentUpdatedAt: Date | null;
  contentIndexedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StoryWithCategory = Story & { category: StoryCategory };

export type StorySearchQuery = {
  page: number;
  limit: number;
  q?: string;
  hasContent?: boolean;
};

export type StoryResponse = Omit<StoryWithCategory, 'category' | 'contentPath'> & {
  category: string;
  hasContent: boolean;
};

export type ListStoriesResponse = {
  items: StoryResponse[];
  total: number;
  page: number;
  limit: number;
};

export type StoryContentResponse = {
  storyId: string;
  title: string;
  content: string;
};
