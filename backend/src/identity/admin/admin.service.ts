import { Prisma } from '@prisma/client';
import type { BackendDeps } from '../../dependencies';
import { badRequest, notFound } from '../../errors';
import type { AdminUserSummary, ListAdminUsersQuery } from './admin.schema';

const adminUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

type AdminUserRecord = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;

export type AdminService = {
  listUsers(query: ListAdminUsersQuery): Promise<AdminUserSummary[]>;
  approveUser(adminUserId: string, targetUserId: string): Promise<AdminUserSummary>;
  rejectUser(adminUserId: string, targetUserId: string): Promise<AdminUserSummary>;
};

function toAdminUserSummary(user: AdminUserRecord): AdminUserSummary {
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

async function updateUserStatus(
  deps: Pick<BackendDeps, 'prisma'>,
  targetUserId: string,
  status: 'APPROVED' | 'REJECTED',
): Promise<AdminUserSummary> {
  try {
    const user = await deps.prisma.user.update({
      where: { id: targetUserId },
      data: { status },
      select: adminUserSelect,
    });

    return toAdminUserSummary(user);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw notFound('User not found');
    }
    throw error;
  }
}

export function createAdminService(deps: Pick<BackendDeps, 'prisma'>): AdminService {
  return {
    async listUsers(query) {
      const users = await deps.prisma.user.findMany({
        where: { status: query.status },
        select: adminUserSelect,
        orderBy: { createdAt: 'asc' },
      });

      return users.map(toAdminUserSummary);
    },

    async approveUser(_adminUserId, targetUserId) {
      return updateUserStatus(deps, targetUserId, 'APPROVED');
    },

    async rejectUser(adminUserId, targetUserId) {
      if (adminUserId === targetUserId) {
        throw badRequest('Admin cannot reject their own account');
      }

      return updateUserStatus(deps, targetUserId, 'REJECTED');
    },
  };
}
