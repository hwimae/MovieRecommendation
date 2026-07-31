import type { FinanceGroupMembership, FinanceGroupsRepository, FinanceGroupWithMembers } from './groups.repository';
import { createFinanceGroupsService } from './groups.service';

const createdAt = new Date('2026-06-14T00:00:00.000Z');

function createMembership(overrides: Partial<FinanceGroupMembership> = {}): FinanceGroupMembership {
  return {
    groupId: 'group1',
    userId: 'user1',
    role: 'OWNER',
    createdAt,
    user: { id: 'user1', email: 'boo@example.com', name: 'Boo' },
    ...overrides,
  };
}

function createGroup(): FinanceGroupWithMembers {
  return {
    id: 'group1',
    name: 'Gia đình',
    ownerId: 'user1',
    createdAt,
    updatedAt: createdAt,
    members: [createMembership()],
  };
}

function createRepositoryMock(): jest.Mocked<FinanceGroupsRepository> {
  return {
    listMembershipsWithGroups: jest.fn(),
    createGroupWithOwner: jest.fn(),
    findGroupWithMembers: jest.fn(),
    findMembership: jest.fn(),
    findGroupOwnership: jest.fn(),
    findUserByEmail: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
    deleteGroupOwnedBy: jest.fn(),
    listMemberCategories: jest.fn(),
    listMemberBudgets: jest.fn(),
    listMemberExpenses: jest.fn(),
    deleteMemberExpense: jest.fn(),
    deleteMemberBudget: jest.fn(),
  };
}

describe('createFinanceGroupsService', () => {
  it('lists group summaries for the current user', async () => {
    const repository = createRepositoryMock();
    repository.listMembershipsWithGroups.mockResolvedValue([
      {
        role: 'OWNER',
        group: { id: 'group1', name: 'Gia đình', ownerId: 'user1', memberCount: 2, createdAt, updatedAt: createdAt },
      },
    ]);
    const service = createFinanceGroupsService({ repository });

    await expect(service.list('user1')).resolves.toEqual([
      {
        id: 'group1',
        name: 'Gia đình',
        ownerId: 'user1',
        currentUserRole: 'OWNER',
        memberCount: 2,
        createdAt,
        updatedAt: createdAt,
      },
    ]);
  });

  it('creates a group with a trimmed name and owner role', async () => {
    const repository = createRepositoryMock();
    repository.createGroupWithOwner.mockResolvedValue(createGroup());
    const service = createFinanceGroupsService({ repository });

    const detail = await service.create('user1', { name: '  Gia đình  ' });

    expect(repository.createGroupWithOwner).toHaveBeenCalledWith('user1', 'Gia đình');
    expect(detail).toMatchObject({
      id: 'group1',
      currentUserRole: 'OWNER',
      memberCount: 1,
      members: [{ userId: 'user1', name: 'Boo', email: 'boo@example.com', role: 'OWNER', joinedAt: createdAt }],
    });
  });

  it('blocks non-members from group detail', async () => {
    const repository = createRepositoryMock();
    repository.findMembership.mockResolvedValue(null);
    const service = createFinanceGroupsService({ repository });

    await expect(service.detail('intruder', 'group1')).rejects.toMatchObject({
      statusCode: 403,
      message: 'Finance group access required',
    });
  });

  it('reports a missing group on detail', async () => {
    const repository = createRepositoryMock();
    repository.findMembership.mockResolvedValue(createMembership({ role: 'MEMBER' }));
    repository.findGroupWithMembers.mockResolvedValue(null);
    const service = createFinanceGroupsService({ repository });

    await expect(service.detail('user1', 'group1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Finance group not found',
    });
  });

  it('adds a member as the owner', async () => {
    const repository = createRepositoryMock();
    repository.findGroupOwnership.mockResolvedValue({ id: 'group1', ownerId: 'user1' });
    repository.findUserByEmail.mockResolvedValue({ id: 'user2', email: 'mai@example.com', name: 'Mai' });
    repository.findMembership.mockResolvedValue(null);
    repository.addMember.mockResolvedValue(
      createMembership({ userId: 'user2', role: 'MEMBER', user: { id: 'user2', email: 'mai@example.com', name: 'Mai' } }),
    );
    const service = createFinanceGroupsService({ repository });

    await expect(service.addMember('user1', 'group1', { email: ' mai@example.com ' })).resolves.toEqual({
      userId: 'user2',
      name: 'Mai',
      email: 'mai@example.com',
      role: 'MEMBER',
      joinedAt: createdAt,
    });
    expect(repository.findUserByEmail).toHaveBeenCalledWith('mai@example.com');
  });

  it('rejects addMember for non-owners and unknown users and duplicates', async () => {
    const repository = createRepositoryMock();
    const service = createFinanceGroupsService({ repository });

    repository.findGroupOwnership.mockResolvedValue({ id: 'group1', ownerId: 'someone-else' });
    await expect(service.addMember('user1', 'group1', { email: 'mai@example.com' })).rejects.toMatchObject({
      statusCode: 403,
      message: 'Finance group owner access required',
    });

    repository.findGroupOwnership.mockResolvedValue({ id: 'group1', ownerId: 'user1' });
    repository.findUserByEmail.mockResolvedValue(null);
    await expect(service.addMember('user1', 'group1', { email: 'ghost@example.com' })).rejects.toMatchObject({
      statusCode: 404,
      message: 'User not found',
    });

    repository.findUserByEmail.mockResolvedValue({ id: 'user2', email: 'mai@example.com', name: 'Mai' });
    repository.findMembership.mockResolvedValue(createMembership({ userId: 'user2', role: 'MEMBER' }));
    await expect(service.addMember('user1', 'group1', { email: 'mai@example.com' })).rejects.toMatchObject({
      statusCode: 409,
      message: 'User is already a finance group member',
    });
  });

  it('blocks removing the owner membership', async () => {
    const repository = createRepositoryMock();
    repository.findGroupOwnership.mockResolvedValue({ id: 'group1', ownerId: 'user1' });
    repository.findMembership.mockResolvedValue(createMembership());
    const service = createFinanceGroupsService({ repository });

    await expect(service.removeMember('user1', 'group1', 'user1')).rejects.toMatchObject({
      statusCode: 409,
      message: 'Finance group owner cannot be removed as a member',
    });
  });

  it('removes members and reports missing deletions', async () => {
    const repository = createRepositoryMock();
    repository.findGroupOwnership.mockResolvedValue({ id: 'group1', ownerId: 'user1' });
    repository.findMembership.mockResolvedValue(
      createMembership({ userId: 'user2', role: 'MEMBER', user: { id: 'user2', email: 'mai@example.com', name: 'Mai' } }),
    );
    repository.removeMember.mockResolvedValue(false);
    const service = createFinanceGroupsService({ repository });

    await expect(service.removeMember('user1', 'group1', 'user2')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Finance group member not found',
    });
  });

  it('deletes a group only for its owner', async () => {
    const repository = createRepositoryMock();
    repository.findGroupOwnership.mockResolvedValue({ id: 'group1', ownerId: 'user1' });
    repository.deleteGroupOwnedBy.mockResolvedValue(true);
    const service = createFinanceGroupsService({ repository });

    await expect(service.removeGroup('user1', 'group1')).resolves.toBeUndefined();
    expect(repository.deleteGroupOwnedBy).toHaveBeenCalledWith('group1', 'user1');
  });

  it('assembles the member dashboard with a spending summary', async () => {
    const repository = createRepositoryMock();
    repository.findMembership
      .mockResolvedValueOnce(createMembership())
      .mockResolvedValueOnce(
        createMembership({ userId: 'user2', role: 'MEMBER', user: { id: 'user2', email: 'mai@example.com', name: 'Mai' } }),
      );
    repository.listMemberCategories.mockResolvedValue([]);
    repository.listMemberBudgets.mockResolvedValue([]);
    repository.listMemberExpenses.mockResolvedValue([
      {
        id: 'exp1',
        userId: 'user2',
        invoiceId: null,
        categoryId: 'cat1',
        description: null,
        merchantName: null,
        amount: 150000,
        spentAt: createdAt,
        confirmedByUser: true,
        sourceType: 'manual',
        sourceMetadata: null,
        createdAt,
        updatedAt: createdAt,
        category: {
          id: 'cat1',
          userId: 'user2',
          name: 'Ăn uống',
          description: null,
          icon: null,
          color: null,
          isSystemCategory: true,
          displayOrder: 0,
          createdAt,
          updatedAt: createdAt,
        },
        invoice: null,
      },
    ]);
    const service = createFinanceGroupsService({ repository });

    const dashboard = await service.memberDashboard('user1', 'group1', 'user2');

    expect(dashboard.member).toEqual({ userId: 'user2', name: 'Mai', email: 'mai@example.com' });
    expect(dashboard.summary).toEqual({
      totalAmount: 150000,
      categories: [{ categoryId: 'cat1', categoryName: 'Ăn uống', amount: 150000 }],
    });
  });

  it('maps member expense/budget deletions to 404 when nothing matched', async () => {
    const repository = createRepositoryMock();
    repository.findGroupOwnership.mockResolvedValue({ id: 'group1', ownerId: 'user1' });
    repository.findMembership.mockResolvedValue(
      createMembership({ userId: 'user2', role: 'MEMBER', user: { id: 'user2', email: 'mai@example.com', name: 'Mai' } }),
    );
    repository.deleteMemberExpense.mockResolvedValue(false);
    repository.deleteMemberBudget.mockResolvedValue(false);
    const service = createFinanceGroupsService({ repository });

    await expect(service.deleteMemberExpense('user1', 'group1', 'user2', 'exp1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Finance expense not found',
    });
    await expect(service.deleteMemberBudget('user1', 'group1', 'user2', 'bud1')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Finance budget not found',
    });
  });
});
