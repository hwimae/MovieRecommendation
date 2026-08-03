import type { User } from '../users/users.model';
import type { UsersRepository } from '../users/users.repository';
import { createAdminService } from './admin.service';

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user1',
    email: 'boo@example.com',
    name: 'Boo',
    role: 'USER',
    status: 'PENDING',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  };
}

function createDeps() {
  const usersRepository: jest.Mocked<UsersRepository> = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    create: jest.fn(),
    listByStatus: jest.fn(),
    updateStatus: jest.fn(),
  };

  return { usersRepository };
}

describe('createAdminService', () => {
  it('lists users by status as ISO-dated summaries', async () => {
    const deps = createDeps();
    deps.usersRepository.listByStatus.mockResolvedValue([createUser()]);
    const service = createAdminService(deps);

    const users = await service.listUsers({ status: 'PENDING' });

    expect(deps.usersRepository.listByStatus).toHaveBeenCalledWith('PENDING');
    expect(users).toEqual([
      {
        id: 'user1',
        email: 'boo@example.com',
        name: 'Boo',
        role: 'USER',
        status: 'PENDING',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ]);
  });

  it('approves a user', async () => {
    const deps = createDeps();
    deps.usersRepository.updateStatus.mockResolvedValue(createUser({ status: 'APPROVED' }));
    const service = createAdminService(deps);

    await expect(service.approveUser('admin1', 'user1')).resolves.toMatchObject({ status: 'APPROVED' });
    expect(deps.usersRepository.updateStatus).toHaveBeenCalledWith('user1', 'APPROVED');
  });

  it('reports a missing user on approve', async () => {
    const deps = createDeps();
    deps.usersRepository.updateStatus.mockResolvedValue(null);
    const service = createAdminService(deps);

    await expect(service.approveUser('admin1', 'missing')).rejects.toMatchObject({
      statusCode: 404,
      message: 'User not found',
    });
  });

  it('rejects a user', async () => {
    const deps = createDeps();
    deps.usersRepository.updateStatus.mockResolvedValue(createUser({ status: 'REJECTED' }));
    const service = createAdminService(deps);

    await expect(service.rejectUser('admin1', 'user1')).resolves.toMatchObject({ status: 'REJECTED' });
    expect(deps.usersRepository.updateStatus).toHaveBeenCalledWith('user1', 'REJECTED');
  });

  it('blocks admins from rejecting their own account', async () => {
    const deps = createDeps();
    const service = createAdminService(deps);

    await expect(service.rejectUser('admin1', 'admin1')).rejects.toMatchObject({
      statusCode: 400,
      message: 'Admin cannot reject their own account',
    });
    expect(deps.usersRepository.updateStatus).not.toHaveBeenCalled();
  });
});
