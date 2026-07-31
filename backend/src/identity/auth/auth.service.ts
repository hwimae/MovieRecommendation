import { Prisma } from '@prisma/client';
import type { BackendDeps } from '../../dependencies';
import { conflict, forbidden, unauthorized } from '../../errors';
import type { AuthResponse, AuthUser, LoginInput, RegisterInput, RegisterResponse } from './auth.schema';

export type AuthService = {
  register(input: RegisterInput): Promise<RegisterResponse>;
  login(input: LoginInput): Promise<AuthResponse>;
};

function toAuthUser(user: AuthUser): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
  };
}

function createAuthResponse(
  deps: Pick<BackendDeps, 'tokenService'>,
  user: AuthUser,
): AuthResponse {
  const authUser = toAuthUser(user);

  return {
    user: authUser,
    accessToken: deps.tokenService.signAccessToken(authUser),
  };
}

export function createAuthService(
  deps: Pick<BackendDeps, 'prisma' | 'passwordHasher' | 'tokenService'>,
): AuthService {
  return {
    async register(input) {
      const existing = await deps.prisma.user.findUnique({ where: { email: input.email } });
      if (existing) {
        throw conflict('Email already exists');
      }

      const passwordHash = await deps.passwordHasher.hash(input.password);

      try {
        const user = await deps.prisma.user.create({
          data: {
            email: input.email,
            passwordHash,
            name: input.name,
            role: 'USER',
            status: 'PENDING',
          },
        });

        return {
          user: toAuthUser(user),
          message: 'Registration pending approval',
        };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw conflict('Email already exists');
        }
        throw error;
      }
    },

    async login(input) {
      const user = await deps.prisma.user.findUnique({ where: { email: input.email } });
      if (!user) {
        throw unauthorized('Invalid credentials');
      }

      const valid = await deps.passwordHasher.compare(input.password, user.passwordHash);
      if (!valid) {
        throw unauthorized('Invalid credentials');
      }

      if (user.status === 'PENDING') {
        throw forbidden('Account pending approval');
      }

      if (user.status === 'REJECTED') {
        throw forbidden('Account rejected');
      }

      return createAuthResponse(deps, user);
    },
  };
}
