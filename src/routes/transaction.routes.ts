import { Router, Response, NextFunction } from 'express';
import { Op, WhereOptions } from 'sequelize';
import { Transaction, TransactionType } from '../entities/Transaction';
import { Account } from '../entities/Account';
import { Category } from '../entities/Category';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const createValidation = validate({
  accountId: { required: true, type: 'string' },
  amount: { required: true, type: 'number', min: 0 },
  type: { required: true, type: 'string', enum: Object.values(TransactionType) },
  date: { required: true, type: 'string' },
  description: { required: true, type: 'string' },
});

router.use(authenticate);

async function verifyAccountOwnership(accountId: string, userId: string): Promise<Account> {
  const account = await Account.findOne({ where: { id: accountId, userId } });
  if (!account) {
    throw new AppError('Account not found or does not belong to you.', 404);
  }
  return account;
}

async function updateAccountBalance(
  accountId: string,
  amount: number,
  type: TransactionType,
  isReversal: boolean = false
): Promise<void> {
  const account = await Account.findByPk(accountId);
  if (!account) return;

  const numericBalance = Number(account.balance);
  const numericAmount = Number(amount);

  if (isReversal) {
    account.balance =
      type === TransactionType.INCOME
        ? numericBalance - numericAmount
        : numericBalance + numericAmount;
  } else {
    account.balance =
      type === TransactionType.INCOME
        ? numericBalance + numericAmount
        : numericBalance - numericAmount;
  }

  await account.save();
}

// GET /api/transactions
router.get(
  '/',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { accountId, categoryId, type, startDate, endDate, page = '1', limit = '20' } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      const where: WhereOptions = {};
      if (accountId) (where as Record<string, unknown>).accountId = accountId;
      if (categoryId) (where as Record<string, unknown>).categoryId = categoryId;
      if (type) (where as Record<string, unknown>).type = type;

      const dateFilter: Record<symbol, unknown> = {};
      if (startDate) dateFilter[Op.gte] = startDate;
      if (endDate) dateFilter[Op.lte] = endDate;
      if (Object.getOwnPropertySymbols(dateFilter).length > 0) {
        (where as Record<string, unknown>).date = dateFilter;
      }

      const { rows: transactions, count: total } = await Transaction.findAndCountAll({
        where,
        include: [
          { model: Account, attributes: [], where: { userId }, required: true },
          { model: Category, required: false },
        ],
        order: [
          ['date', 'DESC'],
          ['createdAt', 'DESC'],
        ],
        offset: (pageNum - 1) * limitNum,
        limit: limitNum,
      });

      res.json({
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/transactions/:id
router.get(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;

      const transaction = await Transaction.findOne({
        where: { id: req.params.id as string },
        include: [
          { model: Account, attributes: [], where: { userId }, required: true },
          { model: Category, required: false },
        ],
      });

      if (!transaction) {
        throw new AppError('Transaction not found.', 404);
      }

      res.json({ transaction });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/transactions
router.post(
  '/',
  createValidation,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { accountId, categoryId, amount, type, date, description, notes, receiptUrl, isRecurring } = req.body;

      await verifyAccountOwnership(accountId, userId);

      const transaction = await Transaction.create({
        accountId,
        categoryId: categoryId || null,
        amount,
        type,
        date,
        description,
        notes: notes || null,
        receiptUrl: receiptUrl || null,
        isRecurring: isRecurring || false,
      });

      await updateAccountBalance(accountId, amount, type);

      res.status(201).json({ transaction });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/transactions/:id
router.put(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;

      const transaction = await Transaction.findOne({
        where: { id: req.params.id as string },
        include: [{ model: Account, attributes: [], where: { userId }, required: true }],
      });

      if (!transaction) {
        throw new AppError('Transaction not found.', 404);
      }

      const { categoryId, amount, type, date, description, notes, receiptUrl, isRecurring } = req.body;

      await updateAccountBalance(transaction.accountId, transaction.amount, transaction.type, true);

      if (categoryId !== undefined) transaction.categoryId = categoryId;
      if (amount !== undefined) transaction.amount = amount;
      if (type !== undefined) transaction.type = type;
      if (date !== undefined) transaction.date = date;
      if (description !== undefined) transaction.description = description;
      if (notes !== undefined) transaction.notes = notes;
      if (receiptUrl !== undefined) transaction.receiptUrl = receiptUrl;
      if (isRecurring !== undefined) transaction.isRecurring = isRecurring;

      await transaction.save();

      await updateAccountBalance(transaction.accountId, transaction.amount, transaction.type);

      res.json({ transaction });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/transactions/:id
router.delete(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;

      const transaction = await Transaction.findOne({
        where: { id: req.params.id as string },
        include: [{ model: Account, attributes: [], where: { userId }, required: true }],
      });

      if (!transaction) {
        throw new AppError('Transaction not found.', 404);
      }

      await updateAccountBalance(transaction.accountId, transaction.amount, transaction.type, true);
      await transaction.destroy();

      res.json({ message: 'Transaction deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
