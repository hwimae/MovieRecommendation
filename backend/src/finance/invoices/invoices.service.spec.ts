import path from 'path';
import { HttpError } from '../../errors';
import type { FinanceInvoice } from './invoices.model';
import type { FinanceInvoicesRepository } from './invoices.repository';
import { createFinanceInvoicesService } from './invoices.service';
import { FINANCE_INVOICE_UPLOAD_ROOT } from './invoices.storage';

const createdAt = new Date('2026-06-01T00:00:00.000Z');

function createInvoice(overrides: Partial<FinanceInvoice> = {}): FinanceInvoice {
  return {
    id: 'inv1',
    userId: 'user1',
    filename: 'bill.png',
    filePath: path.join(FINANCE_INVOICE_UPLOAD_ROOT, 'bill.png'),
    storeName: null,
    purchasedAt: null,
    totalAmount: null,
    extractedData: null,
    status: 'pending',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function createFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'bill.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 4,
    buffer: Buffer.from('data'),
    destination: FINANCE_INVOICE_UPLOAD_ROOT,
    filename: 'bill.png',
    path: path.join(FINANCE_INVOICE_UPLOAD_ROOT, 'bill.png'),
    stream: undefined as never,
    ...overrides,
  };
}

function createRepositoryMock(): jest.Mocked<FinanceInvoicesRepository> {
  return {
    listByUser: jest.fn(),
    createPending: jest.fn(),
    markFailed: jest.fn(),
    applyExtraction: jest.fn(),
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

describe('createFinanceInvoicesService', () => {
  it('lists invoices through the repository', async () => {
    const deps = createDeps();
    const invoices = [createInvoice()];
    deps.repository.listByUser.mockResolvedValue(invoices);
    const service = createFinanceInvoicesService(deps);

    await expect(service.list('user1')).resolves.toEqual(invoices);
    expect(deps.repository.listByUser).toHaveBeenCalledWith('user1');
  });

  it('rejects uploads whose stored path escapes the upload root', async () => {
    const deps = createDeps();
    const service = createFinanceInvoicesService(deps);

    await expect(
      service.processUpload('user1', createFile({ path: '/etc/passwd' })),
    ).rejects.toMatchObject({ statusCode: 400, message: 'Invalid finance invoice upload path' });
    expect(deps.repository.createPending).not.toHaveBeenCalled();
  });

  it('processes an upload end-to-end and returns the pending expense', async () => {
    const deps = createDeps();
    deps.repository.createPending.mockResolvedValue(createInvoice());
    deps.repository.applyExtraction.mockResolvedValue(
      createInvoice({ status: 'processed', storeName: 'Quán A', totalAmount: 99000 }),
    );
    deps.financeAiClient.extractInvoiceImage.mockResolvedValue({
      storeName: 'Quán A',
      totalAmount: 99000,
      purchasedAt: '2026-06-01T00:00:00.000Z',
      rawText: 'hóa đơn 99k',
      extractedData: { items: [] },
      assistantMessage: 'Đã đọc hóa đơn',
    });
    const service = createFinanceInvoicesService(deps);

    const result = await service.processUpload('user1', createFile());

    expect(deps.repository.createPending).toHaveBeenCalledWith('user1', {
      filename: 'bill.png',
      filePath: path.join(FINANCE_INVOICE_UPLOAD_ROOT, 'bill.png'),
    });
    expect(deps.repository.applyExtraction).toHaveBeenCalledWith('inv1', {
      status: 'processed',
      storeName: 'Quán A',
      purchasedAt: new Date('2026-06-01T00:00:00.000Z'),
      totalAmount: 99000,
      extractedData: { items: [] },
    });
    expect(result.invoice).toMatchObject({ status: 'processed', totalAmount: 99000 });
    expect(result.pendingExpense).toEqual({
      invoiceId: 'inv1',
      merchantName: 'Quán A',
      description: 'hóa đơn 99k',
      amount: 99000,
      spentAt: '2026-06-01T00:00:00.000Z',
      sourceType: 'image',
    });
  });

  it('returns a null pending expense when the AI finds no total amount', async () => {
    const deps = createDeps();
    deps.repository.createPending.mockResolvedValue(createInvoice());
    deps.repository.applyExtraction.mockResolvedValue(createInvoice());
    deps.financeAiClient.extractInvoiceImage.mockResolvedValue({
      storeName: null,
      totalAmount: null,
      purchasedAt: null,
      rawText: null,
      extractedData: {},
      assistantMessage: 'Không đọc được tổng tiền',
    });
    const service = createFinanceInvoicesService(deps);

    const result = await service.processUpload('user1', createFile());

    expect(deps.repository.applyExtraction).toHaveBeenCalledWith('inv1', {
      status: 'pending',
      storeName: undefined,
      purchasedAt: undefined,
      totalAmount: undefined,
      extractedData: {},
    });
    expect(result.pendingExpense).toBeNull();
  });

  it('marks the invoice failed when the AI OCR gateway fails', async () => {
    const deps = createDeps();
    deps.repository.createPending.mockResolvedValue(createInvoice());
    deps.repository.markFailed.mockResolvedValue(createInvoice({ status: 'failed' }));
    deps.financeAiClient.extractInvoiceImage.mockRejectedValue(new HttpError(502, 'AI down'));
    const service = createFinanceInvoicesService(deps);

    const result = await service.processUpload('user1', createFile());

    expect(deps.repository.markFailed).toHaveBeenCalledWith('inv1');
    expect(result).toEqual({ invoice: expect.objectContaining({ status: 'failed' }), pendingExpense: null });
  });

  it('rethrows non-gateway AI errors', async () => {
    const deps = createDeps();
    deps.repository.createPending.mockResolvedValue(createInvoice());
    deps.financeAiClient.extractInvoiceImage.mockRejectedValue(new Error('boom'));
    const service = createFinanceInvoicesService(deps);

    await expect(service.processUpload('user1', createFile())).rejects.toThrow('boom');
    expect(deps.repository.markFailed).not.toHaveBeenCalled();
  });
});
