import type { CreateFinanceCategoryData, FinanceCategory, UpdateFinanceCategoryData } from './categories.model';

export class DuplicateFinanceCategoryError extends Error {
  constructor() {
    super('Finance category name already exists for this user');
    this.name = 'DuplicateFinanceCategoryError';
  }
}

export interface FinanceCategoriesRepository {
  listByUser(userId: string): Promise<FinanceCategory[]>;
  findDefaultsByNames(userId: string, names: string[]): Promise<string[]>;
  create(userId: string, data: CreateFinanceCategoryData): Promise<FinanceCategory>;
  updateForUser(userId: string, id: string, data: UpdateFinanceCategoryData): Promise<FinanceCategory | null>;
  deleteForUser(userId: string, id: string): Promise<boolean>;
}
