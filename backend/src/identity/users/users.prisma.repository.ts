import { Prisma, type PrismaClient, type User as PrismaUser } from '@prisma/client';
import type { User, UserWithPasswordHash } from './users.model';
import { EmailAlreadyInUseError, type UsersRepository } from './users.repository';

function toUser(user: PrismaUser): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function toUserWithPasswordHash(user: PrismaUser): UserWithPasswordHash {
  return { ...toUser(user), passwordHash: user.passwordHash };
}

function isKnownPrismaError(error: unknown, code: string): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
}

export function createPrismaUsersRepository(prisma: PrismaClient): UsersRepository {
  return {
    async findById(id) {
      const user = await prisma.user.findUnique({ where: { id } });
      return user ? toUser(user) : null;
    },

    async findByEmail(email) {
      const user = await prisma.user.findUnique({ where: { email } });
      return user ? toUserWithPasswordHash(user) : null;
    },

    async create(data) {
      try {
        return toUser(await prisma.user.create({ data }));
      } catch (error) {
        if (isKnownPrismaError(error, 'P2002')) throw new EmailAlreadyInUseError();
        throw error;
      }
    },

    async listByStatus(status) {
      const users = await prisma.user.findMany({ where: { status }, orderBy: { createdAt: 'asc' } });
      return users.map(toUser);
    },

    async updateStatus(id, status) {
      try {
        return toUser(await prisma.user.update({ where: { id }, data: { status } }));
      } catch (error) {
        if (isKnownPrismaError(error, 'P2025')) return null;
        throw error;
      }
    },
  };
}
