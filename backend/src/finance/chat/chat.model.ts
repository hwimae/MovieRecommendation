import { validationError } from '../../errors';
import type { FinanceBudget } from '../budgets/budgets.model';
import type { FinanceCategory } from '../categories/categories.model';
import type { FinanceExpense } from '../expenses/expenses.model';

export type FinanceChatSession = {
  id: string;
  userId: string;
  sessionTitle: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type FinanceChatMessage = {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  metadata: unknown;
  createdAt: Date;
};

export type FinanceChatContext = {
  categories: FinanceCategory[];
  budgets: FinanceBudget[];
  recentExpenses: FinanceExpense[];
  chatHistory: FinanceChatMessage[];
};

export type FinanceSavedExpense = {
  id: string;
  userId: string;
  invoiceId: string | null;
  categoryId: string | null;
  description: string | null;
  merchantName: string | null;
  amount: number;
  spentAt: string | null;
  confirmedByUser: boolean;
  sourceType: string;
  createdAt: string;
  updatedAt: string;
};

export type StartFinanceChatResponse = { sessionId: string; initialMessage: string };

export type CreateConfirmedFinanceExpenseData = {
  userId: string;
  invoiceId?: string;
  categoryId?: string;
  description?: string;
  merchantName?: string;
  amount: number;
  spentAt?: Date;
  confirmedByUser: true;
  sourceType: 'text';
  sourceMetadata: { confirmedFromChat: true };
};

export function parseStrictSpentAt(value: string): Date {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnlyMatch) {
    const [, yearText, monthText, dayText] = dateOnlyMatch;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() + 1 !== month ||
      date.getUTCDate() !== day
    ) {
      throw validationError('Invalid expense spentAt');
    }

    return date;
  }

  const dateTimeMatch =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(\.(\d{1,3}))?)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!dateTimeMatch) {
    throw validationError('Invalid expense spentAt');
  }

  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , millisecondText, zone, offsetSign, offsetHourText, offsetMinuteText] =
    dateTimeMatch;

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = secondText ? Number(secondText) : 0;
  const millisecond = millisecondText ? Number(millisecondText.padEnd(3, '0')) : 0;
  const offsetHours = offsetHourText ? Number(offsetHourText) : 0;
  const offsetMinutesPart = offsetMinuteText ? Number(offsetMinuteText) : 0;

  if (month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59 || offsetHours > 23 || offsetMinutesPart > 59) {
    throw validationError('Invalid expense spentAt');
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw validationError('Invalid expense spentAt');
  }

  const offsetMinutes =
    zone === 'Z' ? 0 : (offsetSign === '-' ? -1 : 1) * (offsetHours * 60 + offsetMinutesPart);
  const localTime = new Date(date.getTime() + offsetMinutes * 60_000);

  if (
    localTime.getUTCFullYear() !== year ||
    localTime.getUTCMonth() + 1 !== month ||
    localTime.getUTCDate() !== day ||
    localTime.getUTCHours() !== hour ||
    localTime.getUTCMinutes() !== minute ||
    localTime.getUTCSeconds() !== second ||
    localTime.getUTCMilliseconds() !== millisecond
  ) {
    throw validationError('Invalid expense spentAt');
  }

  return date;
}
