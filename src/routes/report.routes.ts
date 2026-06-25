import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import * as reportService from '../services/report.service';

const router = Router();

router.use(authenticate);

// GET /api/reports/profit-loss?startDate&endDate
router.get(
  '/profit-loss',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await reportService.profitLoss(req.user!.id, {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      });
      res.json({ report });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/reports/expense-by-category?startDate&endDate
router.get(
  '/expense-by-category',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await reportService.expenseByCategory(req.user!.id, {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      });
      res.json({ report });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/reports/income-by-source?startDate&endDate
router.get(
  '/income-by-source',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const report = await reportService.incomeBySource(req.user!.id, {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      });
      res.json({ report });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/reports/dashboard-summary
router.get(
  '/dashboard-summary',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const summary = await reportService.dashboardSummary(req.user!.id);
      res.json({ summary });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
