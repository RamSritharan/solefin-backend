import { Router, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Transaction, TransactionType } from '../entities/Transaction';
import { Account } from '../entities/Account';
import { Invoice, InvoiceStatus } from '../entities/Invoice';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/reports/profit-loss?startDate&endDate
router.get(
  '/profit-loss',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { startDate, endDate } = req.query;

      const qb = AppDataSource.getRepository(Transaction)
        .createQueryBuilder('t')
        .innerJoin('t.account', 'a')
        .select('t.type', 'type')
        .addSelect('SUM(t.amount)', 'total')
        .where('a.user_id = :userId', { userId })
        .groupBy('t.type');

      if (startDate) {
        qb.andWhere('t.date >= :startDate', { startDate });
      }
      if (endDate) {
        qb.andWhere('t.date <= :endDate', { endDate });
      }

      const results = await qb.getRawMany();

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

      const qb = AppDataSource.getRepository(Transaction)
        .createQueryBuilder('t')
        .innerJoin('t.account', 'a')
        .leftJoin('t.category', 'c')
        .select('c.id', 'categoryId')
        .addSelect('c.name', 'categoryName')
        .addSelect('c.schedule_c_line', 'scheduleCLine')
        .addSelect('SUM(t.amount)', 'total')
        .addSelect('COUNT(t.id)', 'count')
        .where('a.user_id = :userId', { userId })
        .andWhere('t.type = :type', { type: TransactionType.EXPENSE })
        .groupBy('c.id')
        .addGroupBy('c.name')
        .addGroupBy('c.schedule_c_line')
        .orderBy('total', 'DESC');

      if (startDate) {
        qb.andWhere('t.date >= :startDate', { startDate });
      }
      if (endDate) {
        qb.andWhere('t.date <= :endDate', { endDate });
      }

      const results = await qb.getRawMany();

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

      const qb = AppDataSource.getRepository(Transaction)
        .createQueryBuilder('t')
        .innerJoin('t.account', 'a')
        .select('t.description', 'source')
        .addSelect('SUM(t.amount)', 'total')
        .addSelect('COUNT(t.id)', 'count')
        .where('a.user_id = :userId', { userId })
        .andWhere('t.type = :type', { type: TransactionType.INCOME })
        .groupBy('t.description')
        .orderBy('total', 'DESC');

      if (startDate) {
        qb.andWhere('t.date >= :startDate', { startDate });
      }
      if (endDate) {
        qb.andWhere('t.date <= :endDate', { endDate });
      }

      const results = await qb.getRawMany();

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

      // Get account balances
      const accounts = await AppDataSource.getRepository(Account).find({
        where: { userId },
      });

      const totalBalance = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

      // Get current month date range
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      // Monthly income/expense totals
      const monthlyTotals = await AppDataSource.getRepository(Transaction)
        .createQueryBuilder('t')
        .innerJoin('t.account', 'a')
        .select('t.type', 'type')
        .addSelect('SUM(t.amount)', 'total')
        .where('a.user_id = :userId', { userId })
        .andWhere('t.date >= :startOfMonth', { startOfMonth })
        .andWhere('t.date <= :endOfMonth', { endOfMonth })
        .groupBy('t.type')
        .getRawMany();

      let monthlyIncome = 0;
      let monthlyExpenses = 0;

      for (const row of monthlyTotals) {
        if (row.type === TransactionType.INCOME) {
          monthlyIncome = parseFloat(row.total) || 0;
        } else {
          monthlyExpenses = parseFloat(row.total) || 0;
        }
      }

      // Outstanding invoices
      const outstandingInvoices = await AppDataSource.getRepository(Invoice)
        .createQueryBuilder('i')
        .select('COUNT(i.id)', 'count')
        .addSelect('COALESCE(SUM(i.amount), 0)', 'total')
        .where('i.user_id = :userId', { userId })
        .andWhere('i.status IN (:...statuses)', {
          statuses: [InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.OVERDUE],
        })
        .getRawOne();

      // Recent transactions
      const recentTransactions = await AppDataSource.getRepository(Transaction)
        .createQueryBuilder('t')
        .innerJoin('t.account', 'a')
        .leftJoinAndSelect('t.category', 'c')
        .where('a.user_id = :userId', { userId })
        .orderBy('t.date', 'DESC')
        .addOrderBy('t.created_at', 'DESC')
        .take(5)
        .getMany();

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
