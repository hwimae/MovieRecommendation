import multer from 'multer';
import { Router } from 'express';
import type { BackendDeps } from '../../dependencies';
import { requireAuth } from '../../middleware/auth';
import { createFinanceInvoicesController } from './invoices.controller';
import { createFinanceInvoicesService } from './invoices.service';
import { createPrismaFinanceInvoicesRepository } from './invoices.prisma.repository';
import { FINANCE_INVOICE_UPLOAD_DIR } from './invoices.storage';

export const FINANCE_INVOICE_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_INVOICE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function isAllowedFinanceInvoiceFile(file: Pick<Express.Multer.File, 'mimetype'>): boolean {
  return ALLOWED_INVOICE_MIME_TYPES.has(file.mimetype);
}

const upload = multer({
  dest: FINANCE_INVOICE_UPLOAD_DIR,
  limits: { fileSize: FINANCE_INVOICE_MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    callback(null, isAllowedFinanceInvoiceFile(file));
  },
});

export function createFinanceInvoicesRouter(deps: BackendDeps): Router {
  const router = Router();
  const repository = createPrismaFinanceInvoicesRepository(deps.prisma);
  const controller = createFinanceInvoicesController(createFinanceInvoicesService({
    repository,
    financeAiClient: deps.financeAiClient,
  }));

  router.use(requireAuth(deps));
  router.get('/', controller.list);
  router.post('/process', upload.single('file'), controller.process);

  return router;
}
