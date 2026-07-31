import { createAdminService } from './admin.service';

function createPrismaMock() {
  return {
    user: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
}

const pendingUser = {
  id: 'user1',
  email: 'boo@example.com',
  name: 'Boo',
  role: 'USER',
  status: 'PENDING',
  createdAt: new Date('2026-06-13T01:00:00.000Z'),
  updatedAt: new Date('2026-06-13T01:00:00.000Z'),
};

describe('createAdminService', () => {
  it('lists users by status without passwordHash', async () => {
    const prisma = createPrismaMock();
    prisma.user.findMany.mockResolvedValue([pendingUser]);
    const service = createAdminService({ prisma } as any);

    await expect(service.listUsers({ status: 'PENDING' })).resolves.toEqual([
      {
        id: 'user1',
        email: 'boo@example.com',
        name: 'Boo',
        role: 'USER',
        status: 'PENDING',
        createdAt: '2026-06-13T01:00:00.000Z',
        updatedAt: '2026-06-13T01:00:00.000Z',
      },
    ]);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { status: 'PENDING' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('approves a user', async () => {
    const prisma = createPrismaMock();
    prisma.user.update.mockResolvedValue({ ...pendingUser, status: 'APPROVED' });
    const service = createAdminService({ prisma } as any);

    await expect(service.approveUser('admin1', 'user1')).resolves.toMatchObject({
      id: 'user1',
      status: 'APPROVED',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user1' },
      data: { status: 'APPROVED' },
      select: expect.any(Object),
    });
  });

  it('rejects a user', async () => {
    const prisma = createPrismaMock();
    prisma.user.update.mockResolvedValue({ ...pendingUser, status: 'REJECTED' });
    const service = createAdminService({ prisma } as any);

    await expect(service.rejectUser('admin1', 'user1')).resolves.toMatchObject({
      id: 'user1',
      status: 'REJECTED',
    });
  });

  it('does not allow an admin to reject their own account', async () => {
    const prisma = createPrismaMock();
    const service = createAdminService({ prisma } as any);

    await expect(service.rejectUser('admin1', 'admin1')).rejects.toThrow('Admin cannot reject their own account');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
