import type { FinanceChatAiResponse } from '../ai-client';
import type { FinanceExpense } from '../expenses/expenses.model';
import { parseStrictSpentAt, type FinanceChatSession } from './chat.model';
import type { FinanceChatRepository } from './chat.repository';
import { createFinanceChatService } from './chat.service';

const createdAt = new Date('2026-06-01T00:00:00.000Z');

function createSession(): FinanceChatSession {
  return { id: 'ses1', userId: 'user1', sessionTitle: 'Chat', status: 'active', createdAt, updatedAt: createdAt };
}

function createExpense(): FinanceExpense {
  return {
    id: 'exp1',
    userId: 'user1',
    invoiceId: null,
    categoryId: 'cat1',
    description: 'Cơm trưa',
    merchantName: null,
    amount: 125000,
    spentAt: createdAt,
    confirmedByUser: true,
    sourceType: 'text',
    sourceMetadata: { confirmedFromChat: true },
    createdAt,
    updatedAt: createdAt,
    category: null,
    invoice: null,
  };
}

function createAiResponse(overrides: Partial<FinanceChatAiResponse> = {}): FinanceChatAiResponse {
  return {
    assistantMessage: 'Đã ghi nhận',
    extractedExpense: null,
    budgetWarning: null,
    advice: null,
    requiresConfirmation: false,
    askingConfirmation: false,
    interrupted: false,
    ...overrides,
  };
}

function createRepositoryMock(): jest.Mocked<FinanceChatRepository> {
  return {
    createSession: jest.fn(),
    findSessionForUser: jest.fn(),
    closeSessionForUser: jest.fn(),
    createUserMessage: jest.fn(),
    createAssistantMessage: jest.fn(),
    listSessionMessages: jest.fn(),
    loadChatContext: jest.fn(),
    categoryExistsForUser: jest.fn(),
    invoiceExistsForUser: jest.fn(),
    createConfirmedExpense: jest.fn(),
  };
}

function createDeps() {
  return {
    repository: createRepositoryMock(),
    financeAiClient: {
      extractExpenseText: jest.fn(),
      extractInvoiceImage: jest.fn(),
      generateAdvice: jest.fn(),
      chatRespond: jest.fn(),
    },
  };
}

const emptyContext = { categories: [], budgets: [], recentExpenses: [], chatHistory: [] };

describe('parseStrictSpentAt', () => {
  it('parses date-only values as UTC midnight', () => {
    expect(parseStrictSpentAt('2026-06-01').toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });

  it('parses offset datetimes preserving the instant', () => {
    expect(parseStrictSpentAt('2026-06-01T10:15:00.000+07:00').toISOString()).toBe('2026-06-01T03:15:00.000Z');
  });

  it('rejects impossible calendar dates and malformed input', () => {
    expect(() => parseStrictSpentAt('2026-02-30')).toThrow('Invalid expense spentAt');
    expect(() => parseStrictSpentAt('hôm qua')).toThrow('Invalid expense spentAt');
  });
});

describe('createFinanceChatService', () => {
  it('starts a session with the default title', async () => {
    const deps = createDeps();
    deps.repository.createSession.mockResolvedValue(createSession());
    const service = createFinanceChatService(deps);

    const result = await service.start('user1', {});

    expect(deps.repository.createSession).toHaveBeenCalledWith('user1', 'Finance Chat Session');
    expect(result).toEqual({
      sessionId: 'ses1',
      initialMessage: 'Xin chào! Tôi là trợ lý AI quản lý chi tiêu. Bạn có thể nhập chi tiêu hoặc tải ảnh hóa đơn.',
    });
  });

  it('rejects messages for a session the user does not own', async () => {
    const deps = createDeps();
    deps.repository.findSessionForUser.mockResolvedValue(null);
    const service = createFinanceChatService(deps);

    await expect(
      service.sendMessage('user1', 'ghost', { content: 'hi', messageType: 'text', isConfirmationResponse: false }),
    ).rejects.toMatchObject({ statusCode: 404, message: 'Finance chat session not found' });
  });

  it('sends the message with full context and stores both chat messages', async () => {
    const deps = createDeps();
    deps.repository.findSessionForUser.mockResolvedValue(createSession());
    deps.repository.loadChatContext.mockResolvedValue(emptyContext);
    const aiResponse = createAiResponse();
    deps.financeAiClient.chatRespond.mockResolvedValue(aiResponse);
    const service = createFinanceChatService(deps);

    const result = await service.sendMessage('user1', 'ses1', {
      content: 'ăn trưa 125k',
      messageType: 'text',
      isConfirmationResponse: false,
    });

    expect(deps.repository.createUserMessage).toHaveBeenCalledWith('ses1', 'ăn trưa 125k');
    expect(deps.financeAiClient.chatRespond).toHaveBeenCalledWith({
      sessionId: 'ses1',
      message: 'ăn trưa 125k',
      messageType: 'text',
      isConfirmationResponse: false,
      pendingExpense: null,
      categories: [],
      budgets: [],
      recentExpenses: [],
      chatHistory: [],
      locale: 'vi-VN',
    });
    expect(result).toEqual({ ...aiResponse, savedExpense: null });
    expect(deps.repository.createAssistantMessage).toHaveBeenCalledWith('ses1', 'Đã ghi nhận', {
      ...aiResponse,
      savedExpense: null,
    });
  });

  it('saves the confirmed expense after checking ownership', async () => {
    const deps = createDeps();
    deps.repository.findSessionForUser.mockResolvedValue(createSession());
    deps.repository.loadChatContext.mockResolvedValue(emptyContext);
    deps.repository.categoryExistsForUser.mockResolvedValue(true);
    deps.repository.createConfirmedExpense.mockResolvedValue(createExpense());
    deps.financeAiClient.chatRespond.mockResolvedValue(
      createAiResponse({ extractedExpense: { amount: 125000, categoryId: 'cat1', spentAt: '2026-06-01' } }),
    );
    const service = createFinanceChatService(deps);

    const result = await service.sendMessage('user1', 'ses1', {
      content: 'đúng rồi',
      messageType: 'text',
      isConfirmationResponse: true,
      pendingExpense: { description: 'Cơm trưa' },
    });

    expect(deps.repository.categoryExistsForUser).toHaveBeenCalledWith('user1', 'cat1');
    expect(deps.repository.createConfirmedExpense).toHaveBeenCalledWith({
      userId: 'user1',
      invoiceId: undefined,
      categoryId: 'cat1',
      description: 'Cơm trưa',
      merchantName: undefined,
      amount: 125000,
      spentAt: new Date('2026-06-01T00:00:00.000Z'),
      confirmedByUser: true,
      sourceType: 'text',
      sourceMetadata: { confirmedFromChat: true },
    });
    expect(result.savedExpense).toEqual({
      id: 'exp1',
      userId: 'user1',
      invoiceId: null,
      categoryId: 'cat1',
      description: 'Cơm trưa',
      merchantName: null,
      amount: 125000,
      spentAt: '2026-06-01T00:00:00.000Z',
      confirmedByUser: true,
      sourceType: 'text',
      createdAt: '2026-06-01T00:00:00.000Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
    });
  });

  it('rejects a confirmed expense with an invalid amount', async () => {
    const deps = createDeps();
    deps.repository.findSessionForUser.mockResolvedValue(createSession());
    deps.repository.loadChatContext.mockResolvedValue(emptyContext);
    deps.financeAiClient.chatRespond.mockResolvedValue(
      createAiResponse({ extractedExpense: { amount: 0 } }),
    );
    const service = createFinanceChatService(deps);

    await expect(
      service.sendMessage('user1', 'ses1', { content: 'ok', messageType: 'text', isConfirmationResponse: true }),
    ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid expense amount' });
    expect(deps.repository.createConfirmedExpense).not.toHaveBeenCalled();
  });

  it('rejects a confirmed expense with a foreign category', async () => {
    const deps = createDeps();
    deps.repository.findSessionForUser.mockResolvedValue(createSession());
    deps.repository.loadChatContext.mockResolvedValue(emptyContext);
    deps.repository.categoryExistsForUser.mockResolvedValue(false);
    deps.financeAiClient.chatRespond.mockResolvedValue(
      createAiResponse({ extractedExpense: { amount: 1000, categoryId: 'cat9' } }),
    );
    const service = createFinanceChatService(deps);

    await expect(
      service.sendMessage('user1', 'ses1', { content: 'ok', messageType: 'text', isConfirmationResponse: true }),
    ).rejects.toMatchObject({ statusCode: 400, message: 'Finance category not found' });
  });

  it('does not save when the AI still requires confirmation', async () => {
    const deps = createDeps();
    deps.repository.findSessionForUser.mockResolvedValue(createSession());
    deps.repository.loadChatContext.mockResolvedValue(emptyContext);
    deps.financeAiClient.chatRespond.mockResolvedValue(
      createAiResponse({ requiresConfirmation: true, extractedExpense: { amount: 1000 } }),
    );
    const service = createFinanceChatService(deps);

    const result = await service.sendMessage('user1', 'ses1', {
      content: 'ăn trưa',
      messageType: 'text',
      isConfirmationResponse: true,
    });

    expect(result.savedExpense).toBeNull();
    expect(deps.repository.createConfirmedExpense).not.toHaveBeenCalled();
  });

  it('lists history for an owned session', async () => {
    const deps = createDeps();
    deps.repository.findSessionForUser.mockResolvedValue(createSession());
    const messages = [{ id: 'msg1', sessionId: 'ses1', role: 'user', content: 'hi', metadata: null, createdAt }];
    deps.repository.listSessionMessages.mockResolvedValue(messages);
    const service = createFinanceChatService(deps);

    await expect(service.history('user1', 'ses1')).resolves.toEqual(messages);
  });

  it('reports a missing session on close', async () => {
    const deps = createDeps();
    deps.repository.closeSessionForUser.mockResolvedValue(false);
    const service = createFinanceChatService(deps);

    await expect(service.close('user1', 'ghost')).rejects.toMatchObject({
      statusCode: 404,
      message: 'Finance chat session not found',
    });
  });
});
