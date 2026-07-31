import type { FinanceCategory, FinanceGroupRole, Prisma } from '@prisma/client';
import type { BackendDeps } from '../../dependencies';
import { conflict, forbidden, notFound } from '../../errors';
import { summarizeExpenses } from '../spending/spending.model';
import type { AddFinanceGroupMemberInput, CreateFinanceGroupInput } from './groups.schema';

const groupInclude = {
  members: {
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.FinanceGroupInclude;

const memberInclude = { user: { select: { id: true, email: true, name: true } } } satisfies Prisma.FinanceGroupMemberInclude;
const expenseInclude = { category: true, invoice: true } satisfies Prisma.FinanceExpenseInclude;
const budgetInclude = { category: true } satisfies Prisma.FinanceBudgetInclude;

type FinanceGroupWithMembers = Prisma.FinanceGroupGetPayload<{ include: typeof groupInclude }>;
type FinanceGroupMemberWithUser = Prisma.FinanceGroupMemberGetPayload<{ include: typeof memberInclude }>;
export type FinanceExpenseWithRelations = Prisma.FinanceExpenseGetPayload<{ include: typeof expenseInclude }>;
export type FinanceBudgetWithCategory = Prisma.FinanceBudgetGetPayload<{ include: typeof budgetInclude }>;

export type FinanceGroupMemberDto = { userId: string; name: string; email: string; role: FinanceGroupRole; joinedAt: Date };
export type FinanceGroupSummaryDto = { id: string; name: string; ownerId: string; currentUserRole: FinanceGroupRole; memberCount: number; createdAt: Date; updatedAt: Date };
export type FinanceGroupDetailDto = FinanceGroupSummaryDto & { members: FinanceGroupMemberDto[] };
export type FinanceGroupMemberDashboardDto = {
  member: { userId: string; name: string; email: string };
  categories: FinanceCategory[];
  budgets: FinanceBudgetWithCategory[];
  expenses: FinanceExpenseWithRelations[];
  summary: ReturnType<typeof summarizeExpenses>;
};

export type FinanceGroupsService = {
  list(userId: string): Promise<FinanceGroupSummaryDto[]>;
  create(userId: string, input: CreateFinanceGroupInput): Promise<FinanceGroupDetailDto>;
  detail(userId: string, groupId: string): Promise<FinanceGroupDetailDto>;
  addMember(userId: string, groupId: string, input: AddFinanceGroupMemberInput): Promise<FinanceGroupMemberDto>;
  removeMember(userId: string, groupId: string, memberUserId: string): Promise<void>;
  removeGroup(userId: string, groupId: string): Promise<void>;
  memberDashboard(userId: string, groupId: string, memberUserId: string): Promise<FinanceGroupMemberDashboardDto>;
  memberExpenses(userId: string, groupId: string, memberUserId: string): Promise<FinanceExpenseWithRelations[]>;
  memberBudgets(userId: string, groupId: string, memberUserId: string): Promise<FinanceBudgetWithCategory[]>;
  deleteMemberExpense(userId: string, groupId: string, memberUserId: string, expenseId: string): Promise<void>;
  deleteMemberBudget(userId: string, groupId: string, memberUserId: string, budgetId: string): Promise<void>;
};

function toMemberDto(member: FinanceGroupMemberWithUser): FinanceGroupMemberDto {
  return { userId: member.userId, name: member.user.name, email: member.user.email, role: member.role, joinedAt: member.createdAt };
}

function toGroupDetailDto(group: FinanceGroupWithMembers, currentUserRole: FinanceGroupRole): FinanceGroupDetailDto {
  return {
    id: group.id,
    name: group.name,
    ownerId: group.ownerId,
    currentUserRole,
    memberCount: group.members.length,
    members: group.members.map(toMemberDto),
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

async function requireMembership(prisma: BackendDeps['prisma'], groupId: string, userId: string) {
  const membership = await prisma.financeGroupMember.findUnique({ where: { groupId_userId: { groupId, userId } }, include: memberInclude });
  if (!membership) throw forbidden('Finance group access required');
  return membership;
}

async function requireOwner(prisma: BackendDeps['prisma'], groupId: string, userId: string) {
  const group = await prisma.financeGroup.findFirst({ where: { id: groupId }, select: { id: true, ownerId: true } });
  if (!group) throw notFound('Finance group not found');
  if (group.ownerId !== userId) throw forbidden('Finance group owner access required');
  return group;
}

async function requireTargetMember(prisma: BackendDeps['prisma'], groupId: string, memberUserId: string) {
  const membership = await prisma.financeGroupMember.findUnique({ where: { groupId_userId: { groupId, userId: memberUserId } }, include: memberInclude });
  if (!membership) throw notFound('Finance group member not found');
  return membership;
}

export function createFinanceGroupsService(deps: Pick<BackendDeps, 'prisma'>): FinanceGroupsService {
  return {
    async list(userId) {
      const memberships = await deps.prisma.financeGroupMember.findMany({
        where: { userId },
        include: { group: { include: { members: true } } },
        orderBy: { createdAt: 'desc' },
      });

      return memberships.map((membership) => ({
        id: membership.group.id,
        name: membership.group.name,
        ownerId: membership.group.ownerId,
        currentUserRole: membership.role,
        memberCount: membership.group.members.length,
        createdAt: membership.group.createdAt,
        updatedAt: membership.group.updatedAt,
      }));
    },

    async create(userId, input) {
      const group = await deps.prisma.$transaction((tx) =>
        tx.financeGroup.create({
          data: { name: input.name.trim(), ownerId: userId, members: { create: { userId, role: 'OWNER' } } },
          include: groupInclude,
        }),
      );
      return toGroupDetailDto(group, 'OWNER');
    },

    async detail(userId, groupId) {
      const membership = await requireMembership(deps.prisma, groupId, userId);
      const group = await deps.prisma.financeGroup.findFirst({ where: { id: groupId }, include: groupInclude });
      if (!group) throw notFound('Finance group not found');
      return toGroupDetailDto(group, membership.role);
    },

    async addMember(userId, groupId, input) {
      await requireOwner(deps.prisma, groupId, userId);
      const user = await deps.prisma.user.findUnique({ where: { email: input.email.trim() }, select: { id: true, email: true, name: true } });
      if (!user) throw notFound('User not found');
      const existing = await deps.prisma.financeGroupMember.findUnique({ where: { groupId_userId: { groupId, userId: user.id } } });
      if (existing) throw conflict('User is already a finance group member');
      const member = await deps.prisma.financeGroupMember.create({ data: { groupId, userId: user.id, role: 'MEMBER' }, include: memberInclude });
      return toMemberDto(member);
    },

    async removeMember(userId, groupId, memberUserId) {
      await requireOwner(deps.prisma, groupId, userId);
      const target = await requireTargetMember(deps.prisma, groupId, memberUserId);
      if (target.role === 'OWNER') throw conflict('Finance group owner cannot be removed as a member');
      const result = await deps.prisma.financeGroupMember.deleteMany({ where: { groupId, userId: memberUserId } });
      if (result.count === 0) throw notFound('Finance group member not found');
    },

    async removeGroup(userId, groupId) {
      await requireOwner(deps.prisma, groupId, userId);
      const result = await deps.prisma.financeGroup.deleteMany({ where: { id: groupId, ownerId: userId } });
      if (result.count === 0) throw notFound('Finance group not found');
    },

    async memberDashboard(userId, groupId, memberUserId) {
      await requireMembership(deps.prisma, groupId, userId);
      const target = await requireTargetMember(deps.prisma, groupId, memberUserId);
      const [categories, budgets, expenses] = await Promise.all([
        deps.prisma.financeCategory.findMany({ where: { userId: memberUserId }, orderBy: { displayOrder: 'asc' } }),
        deps.prisma.financeBudget.findMany({ where: { userId: memberUserId }, include: budgetInclude, orderBy: { createdAt: 'desc' } }),
        deps.prisma.financeExpense.findMany({ where: { userId: memberUserId }, include: expenseInclude, orderBy: { spentAt: 'desc' } }),
      ]);
      return {
        member: { userId: target.userId, name: target.user.name, email: target.user.email },
        categories,
        budgets,
        expenses,
        summary: summarizeExpenses(expenses),
      };
    },

    async memberExpenses(userId, groupId, memberUserId) {
      await requireMembership(deps.prisma, groupId, userId);
      await requireTargetMember(deps.prisma, groupId, memberUserId);
      return deps.prisma.financeExpense.findMany({ where: { userId: memberUserId }, include: expenseInclude, orderBy: { spentAt: 'desc' } });
    },

    async memberBudgets(userId, groupId, memberUserId) {
      await requireMembership(deps.prisma, groupId, userId);
      await requireTargetMember(deps.prisma, groupId, memberUserId);
      return deps.prisma.financeBudget.findMany({ where: { userId: memberUserId }, include: budgetInclude, orderBy: { createdAt: 'desc' } });
    },

    async deleteMemberExpense(userId, groupId, memberUserId, expenseId) {
      await requireOwner(deps.prisma, groupId, userId);
      await requireTargetMember(deps.prisma, groupId, memberUserId);
      const result = await deps.prisma.financeExpense.deleteMany({ where: { id: expenseId, userId: memberUserId } });
      if (result.count === 0) throw notFound('Finance expense not found');
    },

    async deleteMemberBudget(userId, groupId, memberUserId, budgetId) {
      await requireOwner(deps.prisma, groupId, userId);
      await requireTargetMember(deps.prisma, groupId, memberUserId);
      const result = await deps.prisma.financeBudget.deleteMany({ where: { id: budgetId, userId: memberUserId } });
      if (result.count === 0) throw notFound('Finance budget not found');
    },
  };
}
