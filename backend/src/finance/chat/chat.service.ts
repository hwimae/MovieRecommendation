import { notFound, validationError } from '../../errors';
import type { FinanceAiClient, FinanceChatAiResponse } from '../ai-client';
import type { FinanceExpense } from '../expenses/expenses.model';
import {
  parseStrictSpentAt,
  type CreateConfirmedFinanceExpenseData,
  type FinanceChatMessage,
  type FinanceSavedExpense,
  type StartFinanceChatResponse,
} from './chat.model';
import type { FinanceChatRepository } from './chat.repository';
import type { PendingFinanceExpenseInput, SendFinanceChatMessageInput, StartFinanceChatInput } from './chat.schema';

export type SendFinanceChatResponse = FinanceChatAiResponse & {
  savedExpense: FinanceSavedExpense | null;
};

export type FinanceChatServiceDeps = {
  repository: FinanceChatRepository;
  financeAiClient: FinanceAiClient;
};

export type FinanceChatService = {
  start(userId: string, input: StartFinanceChatInput): Promise<StartFinanceChatResponse>;
  sendMessage(userId: string, sessionId: string, input: SendFinanceChatMessageInput): Promise<SendFinanceChatResponse>;
  history(userId: string, sessionId: string): Promise<FinanceChatMessage[]>;
  close(userId: string, sessionId: string): Promise<void>;
};

export function createFinanceChatService(deps: FinanceChatServiceDeps): FinanceChatService {
  async function assertSession(userId: string, sessionId: string): Promise<void> {
    const session = await deps.repository.findSessionForUser(userId, sessionId);
    if (!session) throw notFound('Finance chat session not found');
  }

  async function assertCategoryOwnership(userId: string, categoryId?: string | null): Promise<void> {
    if (!categoryId) return;
    const exists = await deps.repository.categoryExistsForUser(userId, categoryId);
    if (!exists) throw validationError('Finance category not found');
  }

  async function assertInvoiceOwnership(userId: string, invoiceId?: string | null): Promise<void> {
    if (!invoiceId) return;
    const exists = await deps.repository.invoiceExistsForUser(userId, invoiceId);
    if (!exists) throw validationError('Finance invoice not found');
  }

  function toExpenseCreateData(userId: string, pending: PendingFinanceExpenseInput): CreateConfirmedFinanceExpenseData {
    if (typeof pending.amount !== 'number' || pending.amount <= 0) {
      throw validationError('Invalid expense amount');
    }

    const spentAt = pending.spentAt ? parseStrictSpentAt(pending.spentAt) : undefined;

    return {
      userId,
      invoiceId: pending.invoiceId ?? undefined,
      categoryId: pending.categoryId ?? undefined,
      description: pending.description ?? undefined,
      merchantName: pending.merchantName ?? undefined,
      amount: pending.amount,
      spentAt,
      confirmedByUser: true,
      sourceType: 'text',
      sourceMetadata: { confirmedFromChat: true },
    };
  }

  function toSavedExpenseResponse(expense: FinanceExpense): FinanceSavedExpense {
    return {
      id: expense.id,
      userId: expense.userId,
      invoiceId: expense.invoiceId,
      categoryId: expense.categoryId,
      description: expense.description,
      merchantName: expense.merchantName,
      amount: expense.amount,
      spentAt: expense.spentAt?.toISOString() ?? null,
      confirmedByUser: expense.confirmedByUser,
      sourceType: expense.sourceType,
      createdAt: expense.createdAt.toISOString(),
      updatedAt: expense.updatedAt.toISOString(),
    };
  }

  async function saveIfConfirmed(
    userId: string,
    input: SendFinanceChatMessageInput,
    aiResponse: FinanceChatAiResponse,
  ): Promise<FinanceSavedExpense | null> {
    if (!input.isConfirmationResponse || aiResponse.requiresConfirmation || !aiResponse.extractedExpense) {
      return null;
    }

    const pendingExpense = {
      ...(input.pendingExpense ?? {}),
      ...aiResponse.extractedExpense,
    } as PendingFinanceExpenseInput;

    await assertCategoryOwnership(userId, pendingExpense.categoryId ?? null);
    await assertInvoiceOwnership(userId, pendingExpense.invoiceId ?? null);

    const expense = await deps.repository.createConfirmedExpense(toExpenseCreateData(userId, pendingExpense));

    return toSavedExpenseResponse(expense);
  }

  return {
    async start(userId, input) {
      const session = await deps.repository.createSession(userId, input.sessionTitle ?? 'Finance Chat Session');

      return {
        sessionId: session.id,
        initialMessage: 'Xin chào! Tôi là trợ lý AI quản lý chi tiêu. Bạn có thể nhập chi tiêu hoặc tải ảnh hóa đơn.',
      };
    },

    async sendMessage(userId, sessionId, input) {
      await assertSession(userId, sessionId);

      await deps.repository.createUserMessage(sessionId, input.content);

      const { categories, budgets, recentExpenses, chatHistory } = await deps.repository.loadChatContext(
        userId,
        sessionId,
      );

      const aiResponse = await deps.financeAiClient.chatRespond({
        sessionId,
        message: input.content,
        messageType: input.messageType,
        isConfirmationResponse: input.isConfirmationResponse,
        pendingExpense: input.pendingExpense ?? null,
        categories,
        budgets,
        recentExpenses,
        chatHistory,
        locale: 'vi-VN',
      });

      const savedExpense = await saveIfConfirmed(userId, input, aiResponse);
      const response: SendFinanceChatResponse = { ...aiResponse, savedExpense };

      await deps.repository.createAssistantMessage(sessionId, aiResponse.assistantMessage, response);

      return response;
    },

    async history(userId, sessionId) {
      await assertSession(userId, sessionId);
      return deps.repository.listSessionMessages(sessionId);
    },

    async close(userId, sessionId) {
      const closed = await deps.repository.closeSessionForUser(userId, sessionId);
      if (!closed) throw notFound('Finance chat session not found');
    },
  };
}
