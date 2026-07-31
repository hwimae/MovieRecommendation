import type { FinanceExpense } from '../expenses/expenses.model';
import type {
  CreateConfirmedFinanceExpenseData,
  FinanceChatContext,
  FinanceChatMessage,
  FinanceChatSession,
} from './chat.model';

export interface FinanceChatRepository {
  createSession(userId: string, sessionTitle: string): Promise<FinanceChatSession>;
  findSessionForUser(userId: string, sessionId: string): Promise<FinanceChatSession | null>;
  closeSessionForUser(userId: string, sessionId: string): Promise<boolean>;
  createUserMessage(sessionId: string, content: string): Promise<void>;
  createAssistantMessage(sessionId: string, content: string, metadata: unknown): Promise<void>;
  listSessionMessages(sessionId: string): Promise<FinanceChatMessage[]>;
  loadChatContext(userId: string, sessionId: string): Promise<FinanceChatContext>;
  categoryExistsForUser(userId: string, categoryId: string): Promise<boolean>;
  invoiceExistsForUser(userId: string, invoiceId: string): Promise<boolean>;
  createConfirmedExpense(data: CreateConfirmedFinanceExpenseData): Promise<FinanceExpense>;
}
