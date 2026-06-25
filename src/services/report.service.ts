import { fn, col, literal, Op, WhereOptions } from 'sequelize';
import { Transaction, TransactionType } from '../entities/Transaction';
import { Account } from '../entities/Account';
import { Category } from '../entities/Category';
import { Invoice, InvoiceStatus } from '../entities/Invoice';

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

export interface ProfitLossReport {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  startDate: string | null;
  endDate: string | null;
}

export interface ExpenseByCategoryReport {
  categories: Array<{
    categoryId: string | null;
    categoryName: string;
    scheduleCLine: string | null;
    total: number;
    count: number;
  }>;
  grandTotal: number;
  startDate: string | null;
  endDate: string | null;
}

export interface IncomeBySourceReport {
  sources: Array<{ source: string; total: number; count: number }>;
  grandTotal: number;
  startDate: string | null;
  endDate: string | null;
}

export interface DashboardSummary {
  totalBalance: number;
  accountCount: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyNetProfit: number;
  outstandingInvoices: { count: number; total: number };
  recentTransactions: Transaction[];
}

function dateRangeWhere(range: DateRange): WhereOptions {
  const where: Record<string, unknown> = {};
  const dateFilter: Record<symbol, unknown> = {};
  if (range.startDate) dateFilter[Op.gte] = range.startDate;
  if (range.endDate) dateFilter[Op.lte] = range.endDate;
  if (Object.getOwnPropertySymbols(dateFilter).length > 0) {
    where.date = dateFilter;
  }
  return where;
}

export async function profitLoss(userId: string, range: DateRange): Promise<ProfitLossReport> {
  const results = (await Transaction.findAll({
    attributes: ['type', [fn('SUM', col('Transaction.amount')), 'total']],
    include: [{ model: Account, attributes: [], where: { userId }, required: true }],
    where: dateRangeWhere(range),
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

  return {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    startDate: range.startDate ?? null,
    endDate: range.endDate ?? null,
  };
}

export async function expenseByCategory(
  userId: string,
  range: DateRange
): Promise<ExpenseByCategoryReport> {
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
    where: { type: TransactionType.EXPENSE, ...dateRangeWhere(range) },
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

  return {
    categories,
    grandTotal: categories.reduce((sum, cat) => sum + cat.total, 0),
    startDate: range.startDate ?? null,
    endDate: range.endDate ?? null,
  };
}

export async function incomeBySource(
  userId: string,
  range: DateRange
): Promise<IncomeBySourceReport> {
  const results = (await Transaction.findAll({
    attributes: [
      ['description', 'source'],
      [fn('SUM', col('Transaction.amount')), 'total'],
      [fn('COUNT', col('Transaction.id')), 'count'],
    ],
    include: [{ model: Account, attributes: [], where: { userId }, required: true }],
    where: { type: TransactionType.INCOME, ...dateRangeWhere(range) },
    group: ['Transaction.description'],
    order: [[literal('total'), 'DESC']],
    raw: true,
  })) as unknown as Array<{ source: string; total: string; count: string }>;

  const sources = results.map((row) => ({
    source: row.source,
    total: parseFloat(row.total) || 0,
    count: parseInt(row.count, 10),
  }));

  return {
    sources,
    grandTotal: sources.reduce((sum, src) => sum + src.total, 0),
    startDate: range.startDate ?? null,
    endDate: range.endDate ?? null,
  };
}

export async function dashboardSummary(userId: string): Promise<DashboardSummary> {
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
      status: { [Op.in]: [InvoiceStatus.SENT, InvoiceStatus.VIEWED, InvoiceStatus.OVERDUE] },
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

  return {
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
  };
}
