import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const userRoleSchema = z.enum(['USER', 'ADMIN']);
export const userStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

export type UserRole = z.infer<typeof userRoleSchema>;
export type UserStatus = z.infer<typeof userStatusSchema>;

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
};

export type RegisterResponse = {
  user: AuthUser;
  message: 'Registration pending approval';
};

export type AuthResponse = {
  user: AuthUser;
  accessToken: string;
};
