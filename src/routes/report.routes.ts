import { Router, Response, NextFunction } from 'express';
import { fn, col, literal, Op, WhereOptions } from 'sequelize';
import { Transaction, TransactionType } from '../entities/Transaction';
import { Account } from '../entities/Account';
import { Category } from '../entities/Category';
import { Invoice, InvoiceStatus } from '../entities/Invoice';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

function dateRangeWhere(startDate: unknown, endDate: unknown): WhereOptions {
  const where: Record<string, unknown> = {};
  const range: Record<symbol, unknown> = {};
  if (startDate) range[Op.gte] = startDate;
  if (endDate) range[Op.lte] = endDate;
  if (Object.getOwnPropertySymbols(range).length > 0) {
    where.date = range;
  }
  return where;
}

// GET /api/reports/profit-loss?startDate&endDate
router.get(
  '/profit-loss',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { startDate, endDate } = req.query;

      const results = (await Transaction.findAll({
        attributes: ['type', [fn('SUM', col('Transaction.amount')), 'total']],
        include: [{ model: Account, attributes: [], where: { userId }, required: true }],
        where: dateRangeWhere(startDate, endDate),
        group: ['Transaction.type'],
        raw: true,
      })) as unknown as Array<{ type: TransactionType; total: string }>;

      let totalIncome = 0;
      let totalExpenses = 0;

      for (const row of results) {
        if (row.type === TransactionType.INCOME) {
          totalIncome = parseFloat(row.total) || 0;
        } else {
          totalExpenses = parseFloat(row.total) || 0;
        }
      }

      res.json({
        report: {
          totalIncome,
          totalExpenses,
          netProfit: totalIncome - totalExpenses,
          startDate: startDate || null,
          endDate: endDate || null,
        },
      });
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
      const userId = req.user!.id;
      const { startDate, endDate } = req.query;

      const results = (await Transaction.findAll({
        attributes: [
          [col('Category.id'), 'categoryId'],
          [col('Category.name'), 'categoryName'],
          [col('Category.schedule_c_line'), 'scheduleCLine'],
          [fn('SUM', col('Transaction.amount')), 'total'],
          [fn('COUNT', col('Transaction.id')), 'count'],
        ],
        include: [
          { model: Account, attributes: [], where: { userId }, required: true },
          { model: Category, attributes: [], required: false },
        ],
        where: { type: TransactionType.EXPENSE, ...dateRangeWhere(startDate, endDate) },
        group: ['Category.id', 'Category.name', 'Category.schedule_c_line'],
        order: [[literal('total'), 'DESC']],
        raw: true,
      })) as unknown as Array<{
        categoryId: string | null;
        categoryName: string | null;
        scheduleCLine: string | null;
        total: string;
        count: string;
      }>;

      const categories = results.map((row) => ({
        categoryId: row.categoryId,
        categoryName: row.categoryName || 'Uncategorized',
        scheduleCLine: row.scheduleCLine,
        total: parseFloat(row.total) || 0,
        count: parseInt(row.count, 10),
      }));

      const grandTotal = categories.reduce((sum, cat) => sum + cat.total, 0);

      res.json({
        report: {
          categories,
          grandTotal,
          startDate: startDate || null,
          endDate: endDate || null,
        },
      });
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
      const userId = req.user!.id;
      const { startDate, endDate } = req.query;

      const results = (await Transaction.findAll({
        attributes: [
          ['description', 'source'],
          [fn('SUM', col('Transaction.amount')), 'total'],
          [fn('COUNT', col('Transaction.id')), 'count'],
        ],
        include: [{ model: Account, attributes: [], where: { userId }, required: true }],
        where: { type: TransactionType.INCOME, ...dateRangeWhere(startDate, endDate) },
        group: ['Transaction.description'],
        order: [[literal('total'), 'DESC']],
        raw: true,
      })) as unknown as Array<{ source: string; total: string; count: string }>;

      const sources = results.map((row) => ({
        source: row.source,
        total: parseFloat(row.total) || 0,
        count: parseInt(row.count, 10),
      }));

      const grandTotal = sources.reduce((sum, src) => sum + src.total, 0);

      res.json({
        report: {
          sources,
          grandTotal,
          startDate: startDate || null,
          endDate: endDate || null,
        },
      });
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
      const userId = req.user!.id;

      const accounts = await Account.findAll({ where: { userId } });
      const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const monthlyTotals = (await Transaction.findAll({
        attributes: ['type', [fn('SUM', col('Transaction.amount')), 'total']],
        include: [{ model: Account, attributes: [], where: { userId }, required: true }],
        where: { date: { [Op.gte]: startOfMonth, [Op.lte]: endOfMonth } },
        group: ['Transaction.type'],
        raw: true,
      })) as unknown as Array<{ type: TransactionType; total: string }>;

      let monthlyIncome = 0;
      let monthlyExpenses = 0;

      for (const row of monthlyTotals) {
        if (row.type === TransactionType.INCOME) {
          monthlyIncome = parseFloat(row.total) || 0;
        } else {
          monthlyExpenses = parseFloat(row.total) || 0;
        }
      }

      const outstandingInvoices = (await Invoice.findOne({
        attributes: [
          [fn('COUNT', col('id')), 'count'],
          [fn('COALESCE', fn('SUM', col('amount')), 0), 'total'],
        ],
        where: {
          userId,
          status: {
            [Op.in]: [InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.OVERDUE],
          },
        },
        raw: true,
      })) as unknown as { count: string; total: string } | null;

      const recentTransactions = await Transaction.findAll({
        include: [
          { model: Account, attributes: [], where: { userId }, required: true },
          { model: Category, required: false },
        ],
        order: [
          ['date', 'DESC'],
          ['createdAt', 'DESC'],
        ],
        limit: 5,
      });

      res.json({
        summary: {
          totalBalance,
          accountCount: accounts.length,
          monthlyIncome,
          monthlyExpenses,
          monthlyNetProfit: monthlyIncome - monthlyExpenses,
          outstandingInvoices: {
            count: parseInt(outstandingInvoices?.count || '0', 10),
            total: parseFloat(outstandingInvoices?.total || '0'),
          },
          recentTransactions,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
