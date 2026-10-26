import { Router } from 'express';
import { ReportController } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);

router.get('/ledger', ReportController.getLedger);
router.get('/ledger/csv', ReportController.exportLedgerCSV);
router.get('/audit', ReportController.getAuditLogs);

export default router;
