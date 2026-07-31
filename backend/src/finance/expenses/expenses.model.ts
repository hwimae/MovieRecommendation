import type { FinanceCategory } from '../categories/categories.model';
import type { FinanceInvoice } from '../invoices/invoices.model';

export type FinanceExpense = {
  id: string;
  userId: string;
  invoiceId: string | null;
  categoryId: string | null;
  description: string | null;
  merchantName: string | null;
  amount: number;
  spentAt: Date | null;
  confirmedByUser: boolean;
  sourceType: string;
  sourceMetadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  category: FinanceCategory | null;
  invoice: FinanceInvoice | null;
};

export type CreateFinanceExpenseData = {
  invoiceId?: string;
  categoryId?: string;
  description?: string;
  merchantName?: string;
  amount: number;
  spentAt?: Date;
  confirmedByUser?: boolean;
  sourceType: string;
  sourceMetadata?: unknown;
};

export type UpdateFinanceExpenseData = Partial<CreateFinanceExpenseData>;
