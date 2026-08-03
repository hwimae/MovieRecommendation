import type { FinanceBudget } from '../budgets/budgets.model';
import type { FinanceCategory } from '../categories/categories.model';
import type { FinanceExpense } from '../expenses/expenses.model';
import type { FinanceGroupRole } from './groups.model';

export type FinanceGroupUserRef = { id: string; email: string; name: string };

export type FinanceGroupMembership = {
  groupId: string;
  userId: string;
  role: FinanceGroupRole;
  createdAt: Date;
  user: FinanceGroupUserRef;
};

export type FinanceGroupWithMembers = {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  members: FinanceGroupMembership[];
};

export type FinanceGroupMembershipWithGroup = {
  role: FinanceGroupRole;
  group: {
    id: string;
    name: string;
    ownerId: string;
    memberCount: number;
    createdAt: Date;
    updatedAt: Date;
  };
};

export interface FinanceGroupsRepository {
  listMembershipsWithGroups(userId: string): Promise<FinanceGroupMembershipWithGroup[]>;
  createGroupWithOwner(userId: string, name: string): Promise<FinanceGroupWithMembers>;
  findGroupWithMembers(groupId: string): Promise<FinanceGroupWithMembers | null>;
  findMembership(groupId: string, userId: string): Promise<FinanceGroupMembership | null>;
  findGroupOwnership(groupId: string): Promise<{ id: string; ownerId: string } | null>;
  findUserByEmail(email: string): Promise<FinanceGroupUserRef | null>;
  addMember(groupId: string, userId: string): Promise<FinanceGroupMembership>;
  removeMember(groupId: string, memberUserId: string): Promise<boolean>;
  deleteGroupOwnedBy(groupId: string, ownerId: string): Promise<boolean>;
  listMemberCategories(memberUserId: string): Promise<FinanceCategory[]>;
  listMemberBudgets(memberUserId: string): Promise<FinanceBudget[]>;
  listMemberExpenses(memberUserId: string): Promise<FinanceExpense[]>;
  deleteMemberExpense(memberUserId: string, expenseId: string): Promise<boolean>;
  deleteMemberBudget(memberUserId: string, budgetId: string): Promise<boolean>;
}
