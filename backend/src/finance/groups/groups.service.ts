import { conflict, forbidden, notFound } from '../../errors';
import type { FinanceBudget } from '../budgets/budgets.model';
import type { FinanceExpense } from '../expenses/expenses.model';
import { summarizeExpenses } from '../spending/spending.model';
import type {
  FinanceGroupDetailDto,
  FinanceGroupMemberDashboardDto,
  FinanceGroupMemberDto,
  FinanceGroupSummaryDto,
} from './groups.model';
import type {
  FinanceGroupMembership,
  FinanceGroupsRepository,
  FinanceGroupWithMembers,
} from './groups.repository';
import type { AddFinanceGroupMemberInput, CreateFinanceGroupInput } from './groups.schema';

export type FinanceGroupsService = {
  list(userId: string): Promise<FinanceGroupSummaryDto[]>;
  create(userId: string, input: CreateFinanceGroupInput): Promise<FinanceGroupDetailDto>;
  detail(userId: string, groupId: string): Promise<FinanceGroupDetailDto>;
  addMember(userId: string, groupId: string, input: AddFinanceGroupMemberInput): Promise<FinanceGroupMemberDto>;
  removeMember(userId: string, groupId: string, memberUserId: string): Promise<void>;
  removeGroup(userId: string, groupId: string): Promise<void>;
  memberDashboard(userId: string, groupId: string, memberUserId: string): Promise<FinanceGroupMemberDashboardDto>;
  memberExpenses(userId: string, groupId: string, memberUserId: string): Promise<FinanceExpense[]>;
  memberBudgets(userId: string, groupId: string, memberUserId: string): Promise<FinanceBudget[]>;
  deleteMemberExpense(userId: string, groupId: string, memberUserId: string, expenseId: string): Promise<void>;
  deleteMemberBudget(userId: string, groupId: string, memberUserId: string, budgetId: string): Promise<void>;
};

function toMemberDto(membership: FinanceGroupMembership): FinanceGroupMemberDto {
  return {
    userId: membership.userId,
    name: membership.user.name,
    email: membership.user.email,
    role: membership.role,
    joinedAt: membership.createdAt,
  };
}

function toGroupDetailDto(
  group: FinanceGroupWithMembers,
  currentUserRole: FinanceGroupMembership['role'],
): FinanceGroupDetailDto {
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

export function createFinanceGroupsService(
  deps: { repository: FinanceGroupsRepository },
): FinanceGroupsService {
  async function requireMembership(groupId: string, userId: string): Promise<FinanceGroupMembership> {
    const membership = await deps.repository.findMembership(groupId, userId);
    if (!membership) throw forbidden('Finance group access required');
    return membership;
  }

  async function requireOwner(groupId: string, userId: string): Promise<void> {
    const group = await deps.repository.findGroupOwnership(groupId);
    if (!group) throw notFound('Finance group not found');
    if (group.ownerId !== userId) throw forbidden('Finance group owner access required');
  }

  async function requireTargetMember(groupId: string, memberUserId: string): Promise<FinanceGroupMembership> {
    const membership = await deps.repository.findMembership(groupId, memberUserId);
    if (!membership) throw notFound('Finance group member not found');
    return membership;
  }

  return {
    async list(userId) {
      const memberships = await deps.repository.listMembershipsWithGroups(userId);

      return memberships.map((membership) => ({
        id: membership.group.id,
        name: membership.group.name,
        ownerId: membership.group.ownerId,
        currentUserRole: membership.role,
        memberCount: membership.group.memberCount,
        createdAt: membership.group.createdAt,
        updatedAt: membership.group.updatedAt,
      }));
    },

    async create(userId, input) {
      const group = await deps.repository.createGroupWithOwner(userId, input.name.trim());
      return toGroupDetailDto(group, 'OWNER');
    },

    async detail(userId, groupId) {
      const membership = await requireMembership(groupId, userId);
      const group = await deps.repository.findGroupWithMembers(groupId);
      if (!group) throw notFound('Finance group not found');
      return toGroupDetailDto(group, membership.role);
    },

    async addMember(userId, groupId, input) {
      await requireOwner(groupId, userId);
      const user = await deps.repository.findUserByEmail(input.email.trim());
      if (!user) throw notFound('User not found');
      const existing = await deps.repository.findMembership(groupId, user.id);
      if (existing) throw conflict('User is already a finance group member');
      const member = await deps.repository.addMember(groupId, user.id);
      return toMemberDto(member);
    },

    async removeMember(userId, groupId, memberUserId) {
      await requireOwner(groupId, userId);
      const target = await requireTargetMember(groupId, memberUserId);
      if (target.role === 'OWNER') throw conflict('Finance group owner cannot be removed as a member');
      const removed = await deps.repository.removeMember(groupId, memberUserId);
      if (!removed) throw notFound('Finance group member not found');
    },

    async removeGroup(userId, groupId) {
      await requireOwner(groupId, userId);
      const deleted = await deps.repository.deleteGroupOwnedBy(groupId, userId);
      if (!deleted) throw notFound('Finance group not found');
    },

    async memberDashboard(userId, groupId, memberUserId) {
      await requireMembership(groupId, userId);
      const target = await requireTargetMember(groupId, memberUserId);
      const [categories, budgets, expenses] = await Promise.all([
        deps.repository.listMemberCategories(memberUserId),
        deps.repository.listMemberBudgets(memberUserId),
        deps.repository.listMemberExpenses(memberUserId),
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
      await requireMembership(groupId, userId);
      await requireTargetMember(groupId, memberUserId);
      return deps.repository.listMemberExpenses(memberUserId);
    },

    async memberBudgets(userId, groupId, memberUserId) {
      await requireMembership(groupId, userId);
      await requireTargetMember(groupId, memberUserId);
      return deps.repository.listMemberBudgets(memberUserId);
    },

    async deleteMemberExpense(userId, groupId, memberUserId, expenseId) {
      await requireOwner(groupId, userId);
      await requireTargetMember(groupId, memberUserId);
      const deleted = await deps.repository.deleteMemberExpense(memberUserId, expenseId);
      if (!deleted) throw notFound('Finance expense not found');
    },

    async deleteMemberBudget(userId, groupId, memberUserId, budgetId) {
      await requireOwner(groupId, userId);
      await requireTargetMember(groupId, memberUserId);
      const deleted = await deps.repository.deleteMemberBudget(memberUserId, budgetId);
      if (!deleted) throw notFound('Finance budget not found');
    },
  };
}
