import { z } from 'zod';
import { userStatusSchema } from '../auth/auth.schema';

export const adminUserIdParamSchema = z.object({ id: z.string().min(1) });

export const listAdminUsersQuerySchema = z.object({
  status: userStatusSchema.default('PENDING'),
});

export type AdminUserIdParam = z.infer<typeof adminUserIdParamSchema>;
export type ListAdminUsersQuery = z.infer<typeof listAdminUsersQuerySchema>;

export type AdminUserSummary = {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
};
