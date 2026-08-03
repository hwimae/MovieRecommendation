export const USER_ROLES = ['USER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type UserWithPasswordHash = User & { passwordHash: string };

export type CreateUserData = {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  status: UserStatus;
};
