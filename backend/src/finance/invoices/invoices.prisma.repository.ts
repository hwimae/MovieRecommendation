import type { Prisma, PrismaClient } from '@prisma/client';
import { toFinanceInvoice } from '../expenses/expenses.prisma.repository';
import type { FinanceInvoicesRepository } from './invoices.repository';

export function createPrismaFinanceInvoicesRepository(prisma: PrismaClient): FinanceInvoicesRepository {
  return {
    async listByUser(userId) {
      const invoices = await prisma.financeInvoice.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return invoices.map(toFinanceInvoice);
    },

    async createPending(userId, data) {
      const invoice = await prisma.financeInvoice.create({
        data: { userId, filename: data.filename, filePath: data.filePath, status: 'pending' },
      });

      return toFinanceInvoice(invoice);
    },

    async markFailed(id) {
      const invoice = await prisma.financeInvoice.update({ where: { id }, data: { status: 'failed' } });
      return toFinanceInvoice(invoice);
    },

    async applyExtraction(id, data) {
      const invoice = await prisma.financeInvoice.update({
        where: { id },
        data: { ...data, extractedData: data.extractedData as Prisma.InputJsonValue },
      });

      return toFinanceInvoice(invoice);
    },
  };
}
