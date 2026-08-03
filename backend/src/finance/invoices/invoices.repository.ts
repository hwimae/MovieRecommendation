import type { FinanceInvoice } from './invoices.model';

export type ApplyFinanceInvoiceExtractionData = {
  status: string;
  storeName?: string;
  purchasedAt?: Date;
  totalAmount?: number;
  extractedData: unknown;
};

export interface FinanceInvoicesRepository {
  listByUser(userId: string): Promise<FinanceInvoice[]>;
  createPending(userId: string, data: { filename: string; filePath: string }): Promise<FinanceInvoice>;
  markFailed(id: string): Promise<FinanceInvoice>;
  applyExtraction(id: string, data: ApplyFinanceInvoiceExtractionData): Promise<FinanceInvoice>;
}
