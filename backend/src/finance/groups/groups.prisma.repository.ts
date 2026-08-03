import type { Prisma, PrismaClient } from '@prisma/client';
import { includeBudgetRelations, toFinanceBudget } from '../budgets/budgets.prisma.repository';
import { toFinanceCategory } from '../categories/categories.prisma.repository';
import { includeExpenseRelations, toFinanceExpense } from '../expenses/expenses.prisma.repository';
import type {
  FinanceGroupMembership,
  FinanceGroupsRepository,
  FinanceGroupWithMembers,
} from './groups.repository';

const memberInclude = {
  user: { select: { id: true, email: true, name: true } },
} satisfies Prisma.FinanceGroupMemberInclude;

const groupInclude = {
  members: { include: memberInclude, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.FinanceGroupInclude;

type PrismaMembership = Prisma.FinanceGroupMemberGetPayload<{ include: typeof memberInclude }>;
type PrismaGroupWithMembers = Prisma.FinanceGroupGetPayload<{ include: typeof groupInclude }>;

function toMembership(membership: PrismaMembership): FinanceGroupMembership {
  return {
    groupId: membership.groupId,
    userId: membership.userId,
    role: membership.role,
    createdAt: membership.createdAt,
    user: { id: membership.user.id, email: membership.user.email, name: membership.user.name },
  };
}

function toGroupWithMembers(group: PrismaGroupWithMembers): FinanceGroupWithMembers {
  return {
    id: group.id,
    name: group.name,
    ownerId: group.ownerId,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    members: group.members.map(toMembership),
  };
}

export function createPrismaFinanceGroupsRepository(prisma: PrismaClient): FinanceGroupsRepository {
  return {
    async listMembershipsWithGroups(userId) {
      const memberships = await prisma.financeGroupMember.findMany({
        where: { userId },
        include: { group: { include: { members: true } } },
        orderBy: { createdAt: 'desc' },
      });

      return memberships.map((membership) => ({
        role: membership.role,
        group: {
          id: membership.group.id,
          name: membership.group.name,
          ownerId: membership.group.ownerId,
          memberCount: membership.group.members.length,
          createdAt: membership.group.createdAt,
          updatedAt: membership.group.updatedAt,
        },
      }));
    },

    async createGroupWithOwner(userId, name) {
      const group = await prisma.$transaction((tx) =>
        tx.financeGroup.create({
          data: { name, ownerId: userId, members: { create: { userId, role: 'OWNER' } } },
          include: groupInclude,
        }),
      );

      return toGroupWithMembers(group);
    },

    async findGroupWithMembers(groupId) {
      const group = await prisma.financeGroup.findFirst({ where: { id: groupId }, include: groupInclude });
      return group ? toGroupWithMembers(group) : null;
    },

    async findMembership(groupId, userId) {
      const membership = await prisma.financeGroupMember.findUnique({
        where: { groupId_userId: { groupId, userId } },
        include: memberInclude,
      });

      return membership ? toMembership(membership) : null;
    },

    async findGroupOwnership(groupId) {
      return prisma.financeGroup.findFirst({
        where: { id: groupId },
        select: { id: true, ownerId: true },
      });
    },

    async findUserByEmail(email) {
      return prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true },
      });
    },

    async addMember(groupId, userId) {
      const member = await prisma.financeGroupMember.create({
        data: { groupId, userId, role: 'MEMBER' },
        include: memberInclude,
      });

      return toMembership(member);
    },

    async removeMember(groupId, memberUserId) {
      const result = await prisma.financeGroupMember.deleteMany({
        where: { groupId, userId: memberUserId },
      });

      return result.count > 0;
    },

    async deleteGroupOwnedBy(groupId, ownerId) {
      const result = await prisma.financeGroup.deleteMany({ where: { id: groupId, ownerId } });
      return result.count > 0;
    },

    async listMemberCategories(memberUserId) {
      const categories = await prisma.financeCategory.findMany({
        where: { userId: memberUserId },
        orderBy: { displayOrder: 'asc' },
      });

      return categories.map(toFinanceCategory);
    },

    async listMemberBudgets(memberUserId) {
      const budgets = await prisma.financeBudget.findMany({
        where: { userId: memberUserId },
        include: includeBudgetRelations,
        orderBy: { createdAt: 'desc' },
      });

      return budgets.map(toFinanceBudget);
    },

    async listMemberExpenses(memberUserId) {
      const expenses = await prisma.financeExpense.findMany({
        where: { userId: memberUserId },
        include: includeExpenseRelations,
        orderBy: { spentAt: 'desc' },
      });

      return expenses.map(toFinanceExpense);
    },

    async deleteMemberExpense(memberUserId, expenseId) {
      const result = await prisma.financeExpense.deleteMany({
        where: { id: expenseId, userId: memberUserId },
      });

      return result.count > 0;
    },

    async deleteMemberBudget(memberUserId, budgetId) {
      const result = await prisma.financeBudget.deleteMany({
        where: { id: budgetId, userId: memberUserId },
      });

      return result.count > 0;
    },
  };
}
