import { Prisma, type PrismaClient } from '@prisma/client';
import { createPrismaFinanceInvoicesRepository } from './invoices.prisma.repository';

const createdAt = new Date('2026-06-01T00:00:00.000Z');

function createInvoiceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv1',
    userId: 'user1',
    filename: 'bill.png',
    filePath: 'uploads/finance-invoices/bill.png',
    storeName: null,
    purchasedAt: null,
    totalAmount: new Prisma.Decimal('99000'),
    extractedData: null,
    status: 'pending',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function createPrismaMock() {
  return { financeInvoice: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() } };
}

function createRepository(prisma: ReturnType<typeof createPrismaMock>) {
  return createPrismaFinanceInvoicesRepository(prisma as unknown as PrismaClient);
}

describe('createPrismaFinanceInvoicesRepository', () => {
  it('lists user invoices newest first with money as numbers', async () => {
    const prisma = createPrismaMock();
    prisma.financeInvoice.findMany.mockResolvedValue([createInvoiceRow()]);
    const repository = createRepository(prisma);

    const invoices = await repository.listByUser('user1');

    expect(prisma.financeInvoice.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(invoices[0]).toMatchObject({ id: 'inv1', totalAmount: 99000 });
  });

  it('creates a pending invoice', async () => {
    const prisma = createPrismaMock();
    prisma.financeInvoice.create.mockResolvedValue(createInvoiceRow({ totalAmount: null }));
    const repository = createRepository(prisma);

    const invoice = await repository.createPending('user1', {
      filename: 'bill.png',
      filePath: 'uploads/finance-invoices/bill.png',
    });

    expect(prisma.financeInvoice.create).toHaveBeenCalledWith({
      data: {
        userId: 'user1',
        filename: 'bill.png',
        filePath: 'uploads/finance-invoices/bill.png',
        status: 'pending',
      },
    });
    expect(invoice.totalAmount).toBeNull();
  });

  it('marks an invoice as failed', async () => {
    const prisma = createPrismaMock();
    prisma.financeInvoice.update.mockResolvedValue(createInvoiceRow({ status: 'failed' }));
    const repository = createRepository(prisma);

    await expect(repository.markFailed('inv1')).resolves.toMatchObject({ status: 'failed' });
    expect(prisma.financeInvoice.update).toHaveBeenCalledWith({
      where: { id: 'inv1' },
      data: { status: 'failed' },
    });
  });

  it('applies extraction results', async () => {
    const prisma = createPrismaMock();
    prisma.financeInvoice.update.mockResolvedValue(createInvoiceRow({ status: 'processed' }));
    const repository = createRepository(prisma);
    const purchasedAt = new Date('2026-06-01T00:00:00.000Z');

    await repository.applyExtraction('inv1', {
      status: 'processed',
      storeName: 'Quán A',
      purchasedAt,
      totalAmount: 99000,
      extractedData: { items: [] },
    });

    expect(prisma.financeInvoice.update).toHaveBeenCalledWith({
      where: { id: 'inv1' },
      data: {
        status: 'processed',
        storeName: 'Quán A',
        purchasedAt,
        totalAmount: 99000,
        extractedData: { items: [] },
      },
    });
  });
});
