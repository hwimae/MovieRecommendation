import { Prisma, type PrismaClient } from '@prisma/client';
import { createPrismaFinanceChatRepository } from './chat.prisma.repository';

function createPrismaMock() {
  return {
    financeChatSession: { create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
    financeChatMessage: { create: jest.fn(), findMany: jest.fn() },
    financeCategory: { findMany: jest.fn(), findFirst: jest.fn() },
    financeBudget: { findMany: jest.fn() },
    financeExpense: { findMany: jest.fn(), create: jest.fn() },
    financeInvoice: { findFirst: jest.fn() },
  };
}

const createdAt = new Date('2026-06-01T00:00:00.000Z');

function createSessionRow() {
  return { id: 'ses1', userId: 'user1', sessionTitle: 'Chat', status: 'active', createdAt, updatedAt: createdAt };
}

function createExpenseRow() {
  return {
    id: 'exp1',
    userId: 'user1',
    invoiceId: null,
    categoryId: 'cat1',
    description: 'Cơm trưa',
    merchantName: null,
    amount: new Prisma.Decimal('125000'),
    spentAt: createdAt,
    confirmedByUser: true,
    sourceType: 'text',
    sourceMetadata: { confirmedFromChat: true },
    createdAt,
    updatedAt: createdAt,
    category: {
      id: 'cat1',
      userId: 'user1',
      name: 'Ăn uống',
      description: null,
      icon: null,
      color: null,
      isSystemCategory: true,
      displayOrder: 0,
      createdAt,
      updatedAt: createdAt,
    },
    invoice: null,
  };
}

function createRepository(prisma: ReturnType<typeof createPrismaMock>) {
  return createPrismaFinanceChatRepository(prisma as unknown as PrismaClient);
}

describe('createPrismaFinanceChatRepository', () => {
  it('creates and finds sessions scoped by user', async () => {
    const prisma = createPrismaMock();
    prisma.financeChatSession.create.mockResolvedValue(createSessionRow());
    prisma.financeChatSession.findFirst.mockResolvedValue(createSessionRow());
    const repository = createRepository(prisma);

    await expect(repository.createSession('user1', 'Chat')).resolves.toMatchObject({ id: 'ses1' });
    expect(prisma.financeChatSession.create).toHaveBeenCalledWith({
      data: { userId: 'user1', sessionTitle: 'Chat' },
    });

    await expect(repository.findSessionForUser('user1', 'ses1')).resolves.toMatchObject({ id: 'ses1' });
    expect(prisma.financeChatSession.findFirst).toHaveBeenCalledWith({ where: { id: 'ses1', userId: 'user1' } });
  });

  it('maps close updateMany count to a boolean', async () => {
    const prisma = createPrismaMock();
    prisma.financeChatSession.updateMany.mockResolvedValue({ count: 0 });
    const repository = createRepository(prisma);

    await expect(repository.closeSessionForUser('user1', 'ses1')).resolves.toBe(false);
    expect(prisma.financeChatSession.updateMany).toHaveBeenCalledWith({
      where: { id: 'ses1', userId: 'user1' },
      data: { status: 'completed' },
    });
  });

  it('persists user and assistant messages', async () => {
    const prisma = createPrismaMock();
    const repository = createRepository(prisma);

    await repository.createUserMessage('ses1', 'xin chào');
    expect(prisma.financeChatMessage.create).toHaveBeenCalledWith({
      data: { sessionId: 'ses1', role: 'user', content: 'xin chào' },
    });

    await repository.createAssistantMessage('ses1', 'chào bạn', { assistantMessage: 'chào bạn' });
    expect(prisma.financeChatMessage.create).toHaveBeenCalledWith({
      data: { sessionId: 'ses1', role: 'assistant', content: 'chào bạn', metadata: { assistantMessage: 'chào bạn' } },
    });
  });

  it('loads the chat context with the original four queries', async () => {
    const prisma = createPrismaMock();
    prisma.financeCategory.findMany.mockResolvedValue([]);
    prisma.financeBudget.findMany.mockResolvedValue([]);
    prisma.financeExpense.findMany.mockResolvedValue([createExpenseRow()]);
    prisma.financeChatMessage.findMany.mockResolvedValue([]);
    const repository = createRepository(prisma);

    const context = await repository.loadChatContext('user1', 'ses1');

    expect(prisma.financeCategory.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
    expect(prisma.financeBudget.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(prisma.financeExpense.findMany).toHaveBeenCalledWith({
      where: { userId: 'user1' },
      include: { category: true, invoice: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    expect(prisma.financeChatMessage.findMany).toHaveBeenCalledWith({
      where: { sessionId: 'ses1' },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });
    expect(context.recentExpenses[0]).toMatchObject({ amount: 125000 });
  });

  it('creates a confirmed expense with relations and maps it to the model', async () => {
    const prisma = createPrismaMock();
    prisma.financeExpense.create.mockResolvedValue(createExpenseRow());
    const repository = createRepository(prisma);
    const data = {
      userId: 'user1',
      categoryId: 'cat1',
      amount: 125000,
      confirmedByUser: true as const,
      sourceType: 'text' as const,
      sourceMetadata: { confirmedFromChat: true as const },
    };

    await expect(repository.createConfirmedExpense(data)).resolves.toMatchObject({ amount: 125000 });
    expect(prisma.financeExpense.create).toHaveBeenCalledWith({
      data,
      include: { category: true, invoice: true },
    });
  });
});
