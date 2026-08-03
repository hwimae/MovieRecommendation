export type FinanceCategory = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isSystemCategory: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateFinanceCategoryData = {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
  isSystemCategory: boolean;
};

export type UpdateFinanceCategoryData = {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
};
