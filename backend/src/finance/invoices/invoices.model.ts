export type FinanceInvoice = {
  id: string;
  userId: string;
  filename: string;
  filePath: string;
  storeName: string | null;
  purchasedAt: Date | null;
  totalAmount: number | null;
  extractedData: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type FinanceInvoicePendingExpense = {
  invoiceId: string;
  merchantName: string | null;
  description: string;
  amount: number;
  spentAt: string | null;
  sourceType: 'image';
};
