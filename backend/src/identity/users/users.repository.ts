import type { CreateUserData, User, UserStatus, UserWithPasswordHash } from './users.model';

export class EmailAlreadyInUseError extends Error {
  constructor() {
    super('Email already in use');
    this.name = 'EmailAlreadyInUseError';
  }
}

export interface UsersRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<UserWithPasswordHash | null>;
  create(data: CreateUserData): Promise<User>;
  listByStatus(status: UserStatus): Promise<User[]>;
  updateStatus(id: string, status: Extract<UserStatus, 'APPROVED' | 'REJECTED'>): Promise<User | null>;
}
