import type { BackendDeps } from '../../dependencies';
import { badRequest, notFound } from '../../errors';
import type { User } from '../users/users.model';
import type { AdminUserSummary, ListAdminUsersQuery } from './admin.schema';

export type AdminService = {
  listUsers(query: ListAdminUsersQuery): Promise<AdminUserSummary[]>;
  approveUser(adminUserId: string, targetUserId: string): Promise<AdminUserSummary>;
  rejectUser(adminUserId: string, targetUserId: string): Promise<AdminUserSummary>;
};

function toAdminUserSummary(user: User): AdminUserSummary {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function createAdminService(deps: Pick<BackendDeps, 'usersRepository'>): AdminService {
  async function updateUserStatus(
    targetUserId: string,
    status: 'APPROVED' | 'REJECTED',
  ): Promise<AdminUserSummary> {
    const user = await deps.usersRepository.updateStatus(targetUserId, status);
    if (!user) {
      throw notFound('User not found');
    }

    return toAdminUserSummary(user);
  }

  return {
    async listUsers(query) {
      const users = await deps.usersRepository.listByStatus(query.status);
      return users.map(toAdminUserSummary);
    },

    async approveUser(_adminUserId, targetUserId) {
      return updateUserStatus(targetUserId, 'APPROVED');
    },

    async rejectUser(adminUserId, targetUserId) {
      if (adminUserId === targetUserId) {
        throw badRequest('Admin cannot reject their own account');
      }

      return updateUserStatus(targetUserId, 'REJECTED');
    },
  };
}
