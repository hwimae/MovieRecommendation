import { conflict, notFound } from '../../errors';
import type { FinanceCategory } from './categories.model';
import { DuplicateFinanceCategoryError, type FinanceCategoriesRepository } from './categories.repository';
import type { CreateFinanceCategoryInput, UpdateFinanceCategoryInput } from './categories.schema';

export const DEFAULT_FINANCE_CATEGORIES = [
  { name: 'Ăn uống', description: 'Nhà hàng, cà phê, đồ ăn, siêu thị thực phẩm', icon: '🍜', color: '#ef4444' },
  { name: 'Đi lại', description: 'Grab, taxi, xăng xe, vé xe, bảo dưỡng', icon: '🚕', color: '#f97316' },
  { name: 'Nhà ở', description: 'Thuê nhà, điện, nước, internet', icon: '🏠', color: '#eab308' },
  { name: 'Mua sắm cá nhân', description: 'Quần áo, mỹ phẩm, thiết bị cá nhân', icon: '🛍️', color: '#22c55e' },
  { name: 'Giải trí & du lịch', description: 'Phim, game, khách sạn, vé máy bay', icon: '🎬', color: '#06b6d4' },
  { name: 'Giáo dục & học tập', description: 'Sách, khóa học, học phí', icon: '📚', color: '#3b82f6' },
  { name: 'Sức khỏe & thể thao', description: 'Thuốc, bệnh viện, gym, yoga', icon: '💊', color: '#8b5cf6' },
  { name: 'Gia đình & quà tặng', description: 'Quà tặng, lễ tết, sinh nhật', icon: '🎁', color: '#ec4899' },
  { name: 'Đầu tư & tiết kiệm', description: 'Gửi tiết kiệm, đầu tư, ngân hàng', icon: '💰', color: '#14b8a6' },
  { name: 'Khác', description: 'Chi phí chưa thuộc nhóm nào', icon: '📌', color: '#64748b' },
] as const;

const DEFAULT_CATEGORY_NAMES = DEFAULT_FINANCE_CATEGORIES.map((category) => category.name);

export type FinanceCategoriesService = {
  ensureDefaults(userId: string): Promise<void>;
  list(userId: string): Promise<FinanceCategory[]>;
  create(userId: string, input: CreateFinanceCategoryInput): Promise<FinanceCategory>;
  update(userId: string, id: string, input: UpdateFinanceCategoryInput): Promise<FinanceCategory>;
  remove(userId: string, id: string): Promise<void>;
};

export function createFinanceCategoriesService(
  deps: { repository: FinanceCategoriesRepository },
): FinanceCategoriesService {
  async function ensureDefaults(userId: string): Promise<void> {
    const existingNames = new Set(await deps.repository.findDefaultsByNames(userId, [...DEFAULT_CATEGORY_NAMES]));

    for (const [index, category] of DEFAULT_FINANCE_CATEGORIES.entries()) {
      if (existingNames.has(category.name)) continue;

      try {
        await deps.repository.create(userId, { ...category, displayOrder: index, isSystemCategory: true });
      } catch (error) {
        if (!(error instanceof DuplicateFinanceCategoryError)) {
          throw error;
        }
      }
    }
  }

  return {
    ensureDefaults,

    async list(userId) {
      await ensureDefaults(userId);
      return deps.repository.listByUser(userId);
    },

    async create(userId, input) {
      await ensureDefaults(userId);
      try {
        return await deps.repository.create(userId, { ...input, isSystemCategory: false });
      } catch (error) {
        if (error instanceof DuplicateFinanceCategoryError) {
          throw conflict('Finance category already exists');
        }
        throw error;
      }
    },

    async update(userId, id, input) {
      let category: FinanceCategory | null;
      try {
        category = await deps.repository.updateForUser(userId, id, input);
      } catch (error) {
        if (error instanceof DuplicateFinanceCategoryError) {
          throw conflict('Finance category already exists');
        }
        throw error;
      }
      if (!category) throw notFound('Finance category not found');
      return category;
    },

    async remove(userId, id) {
      const deleted = await deps.repository.deleteForUser(userId, id);
      if (!deleted) throw notFound('Finance category not found');
    },
  };
}
