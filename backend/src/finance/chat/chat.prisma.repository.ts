import type {
  FinanceChatMessage as PrismaFinanceChatMessage,
  FinanceChatSession as PrismaFinanceChatSession,
  Prisma,
  PrismaClient,
} from '@prisma/client';
import { includeBudgetRelations, toFinanceBudget } from '../budgets/budgets.prisma.repository';
import { toFinanceCategory } from '../categories/categories.prisma.repository';
import { includeExpenseRelations, toFinanceExpense } from '../expenses/expenses.prisma.repository';
import type { FinanceChatMessage, FinanceChatSession } from './chat.model';
import type { FinanceChatRepository } from './chat.repository';

function toFinanceChatSession(session: PrismaFinanceChatSession): FinanceChatSession {
  return {
    id: session.id,
    userId: session.userId,
    sessionTitle: session.sessionTitle,
    status: session.status,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

function toFinanceChatMessage(message: PrismaFinanceChatMessage): FinanceChatMessage {
  return {
    id: message.id,
    sessionId: message.sessionId,
    role: message.role,
    content: message.content,
    metadata: message.metadata,
    createdAt: message.createdAt,
  };
}

export function createPrismaFinanceChatRepository(prisma: PrismaClient): FinanceChatRepository {
  return {
    async createSession(userId, sessionTitle) {
      const session = await prisma.financeChatSession.create({ data: { userId, sessionTitle } });
      return toFinanceChatSession(session);
    },

    async findSessionForUser(userId, sessionId) {
      const session = await prisma.financeChatSession.findFirst({ where: { id: sessionId, userId } });
      return session ? toFinanceChatSession(session) : null;
    },

    async closeSessionForUser(userId, sessionId) {
      const result = await prisma.financeChatSession.updateMany({
        where: { id: sessionId, userId },
        data: { status: 'completed' },
      });

      return result.count > 0;
    },

    async createUserMessage(sessionId, content) {
      await prisma.financeChatMessage.create({ data: { sessionId, role: 'user', content } });
    },

    async createAssistantMessage(sessionId, content, metadata) {
      await prisma.financeChatMessage.create({
        data: { sessionId, role: 'assistant', content, metadata: metadata as Prisma.InputJsonValue },
      });
    },

    async listSessionMessages(sessionId) {
      const messages = await prisma.financeChatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' },
      });

      return messages.map(toFinanceChatMessage);
    },

    async loadChatContext(userId, sessionId) {
      const [categories, budgets, recentExpenses, chatHistory] = await Promise.all([
        prisma.financeCategory.findMany({
          where: { userId },
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        }),
        prisma.financeBudget.findMany({
          where: { userId },
          include: includeBudgetRelations,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.financeExpense.findMany({
          where: { userId },
          include: includeExpenseRelations,
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.financeChatMessage.findMany({
          where: { sessionId },
          orderBy: { createdAt: 'asc' },
          take: 30,
        }),
      ]);

      return {
        categories: categories.map(toFinanceCategory),
        budgets: budgets.map(toFinanceBudget),
        recentExpenses: recentExpenses.map(toFinanceExpense),
        chatHistory: chatHistory.map(toFinanceChatMessage),
      };
    },

    async categoryExistsForUser(userId, categoryId) {
      const category = await prisma.financeCategory.findFirst({
        where: { id: categoryId, userId },
        select: { id: true },
      });

      return category !== null;
    },

    async invoiceExistsForUser(userId, invoiceId) {
      const invoice = await prisma.financeInvoice.findFirst({
        where: { id: invoiceId, userId },
        select: { id: true },
      });

      return invoice !== null;
    },

    async createConfirmedExpense(data) {
      const expense = await prisma.financeExpense.create({
        data: { ...data, sourceMetadata: data.sourceMetadata as Prisma.InputJsonValue },
        include: includeExpenseRelations,
      });

      return toFinanceExpense(expense);
    },
  };
}
