import { Prisma, type FinanceCategory as PrismaFinanceCategory, type PrismaClient } from '@prisma/client';
import type { FinanceCategory } from './categories.model';
import { DuplicateFinanceCategoryError, type FinanceCategoriesRepository } from './categories.repository';

export function toFinanceCategory(category: PrismaFinanceCategory): FinanceCategory {
  return {
    id: category.id,
    userId: category.userId,
    name: category.name,
    description: category.description,
    icon: category.icon,
    color: category.color,
    isSystemCategory: category.isSystemCategory,
    displayOrder: category.displayOrder,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

export function createPrismaFinanceCategoriesRepository(prisma: PrismaClient): FinanceCategoriesRepository {
  return {
    async listByUser(userId) {
      const categories = await prisma.financeCategory.findMany({
        where: { userId },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      });

      return categories.map(toFinanceCategory);
    },

    async findDefaultsByNames(userId, names) {
      const categories = await prisma.financeCategory.findMany({
        where: { userId, name: { in: names } },
        select: { name: true },
      });

      return categories.map((category) => category.name);
    },

    async create(userId, data) {
      try {
        return toFinanceCategory(await prisma.financeCategory.create({ data: { ...data, userId } }));
      } catch (error) {
        if (isUniqueConstraintError(error)) throw new DuplicateFinanceCategoryError();
        throw error;
      }
    },

    async updateForUser(userId, id, data) {
      let result: { count: number };
      try {
        result = await prisma.financeCategory.updateMany({ where: { id, userId }, data });
      } catch (error) {
        if (isUniqueConstraintError(error)) throw new DuplicateFinanceCategoryError();
        throw error;
      }
      if (result.count === 0) return null;

      const category = await prisma.financeCategory.findFirst({ where: { id, userId } });
      return category ? toFinanceCategory(category) : null;
    },

    async deleteForUser(userId, id) {
      const result = await prisma.financeCategory.deleteMany({ where: { id, userId } });
      return result.count > 0;
    },
  };
}
