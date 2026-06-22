import { Router, Response, NextFunction } from 'express';
import { AppDataSource } from '../config/database';
import { Transaction, TransactionType } from '../entities/Transaction';
import { Account } from '../entities/Account';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const transactionRepository = () => AppDataSource.getRepository(Transaction);
const accountRepository = () => AppDataSource.getRepository(Account);

const createValidation = validate({
  accountId: { required: true, type: 'string' },
  amount: { required: true, type: 'number', min: 0 },
  type: { required: true, type: 'string', enum: Object.values(TransactionType) },
  date: { required: true, type: 'string' },
  description: { required: true, type: 'string' },
});

router.use(authenticate);

// Helper to verify account belongs to user
async function verifyAccountOwnership(accountId: string, userId: string): Promise<Account> {
  const account = await accountRepository().findOne({
    where: { id: accountId, userId },
  });
  if (!account) {
    throw new AppError('Account not found or does not belong to you.', 404);
  }
  return account;
}

// Helper to update account balance
async function updateAccountBalance(accountId: string, amount: number, type: TransactionType, isReversal: boolean = false): Promise<void> {
  const account = await accountRepository().findOneBy({ id: accountId });
  if (!account) return;

  const numericBalance = Number(account.balance);
  const numericAmount = Number(amount);

  if (isReversal) {
    // Reverse the effect
    if (type === TransactionType.INCOME) {
      account.balance = numericBalance - numericAmount;
    } else {
      account.balance = numericBalance + numericAmount;
    }
  } else {
    if (type === TransactionType.INCOME) {
      account.balance = numericBalance + numericAmount;
    } else {
      account.balance = numericBalance - numericAmount;
    }
  }

  await accountRepository().save(account);
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

      const qb = transactionRepository()
        .createQueryBuilder('transaction')
        .innerJoin('transaction.account', 'account')
        .leftJoinAndSelect('transaction.category', 'category')
        .where('account.user_id = :userId', { userId });

      if (accountId) {
        qb.andWhere('transaction.account_id = :accountId', { accountId });
      }

      if (categoryId) {
        qb.andWhere('transaction.category_id = :categoryId', { categoryId });
      }

      if (type) {
        qb.andWhere('transaction.type = :type', { type });
      }

      if (startDate) {
        qb.andWhere('transaction.date >= :startDate', { startDate });
      }

      if (endDate) {
        qb.andWhere('transaction.date <= :endDate', { endDate });
      }

      qb.orderBy('transaction.date', 'DESC')
        .addOrderBy('transaction.created_at', 'DESC')
        .skip((pageNum - 1) * limitNum)
        .take(limitNum);

      const [transactions, total] = await qb.getManyAndCount();

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

      const transaction = await transactionRepository()
        .createQueryBuilder('transaction')
        .innerJoin('transaction.account', 'account')
        .leftJoinAndSelect('transaction.category', 'category')
        .where('transaction.id = :id', { id: req.params.id })
        .andWhere('account.user_id = :userId', { userId })
        .getOne();

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

      const transaction = transactionRepository().create({
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

      await transactionRepository().save(transaction);
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

      const transaction = await transactionRepository()
        .createQueryBuilder('transaction')
        .innerJoin('transaction.account', 'account')
        .where('transaction.id = :id', { id: req.params.id })
        .andWhere('account.user_id = :userId', { userId })
        .getOne();

      if (!transaction) {
        throw new AppError('Transaction not found.', 404);
      }

      const { categoryId, amount, type, date, description, notes, receiptUrl, isRecurring } = req.body;

      // Reverse old balance effect
      await updateAccountBalance(transaction.accountId, transaction.amount, transaction.type, true);

      if (categoryId !== undefined) transaction.categoryId = categoryId;
      if (amount !== undefined) transaction.amount = amount;
      if (type !== undefined) transaction.type = type;
      if (date !== undefined) transaction.date = date;
      if (description !== undefined) transaction.description = description;
      if (notes !== undefined) transaction.notes = notes;
      if (receiptUrl !== undefined) transaction.receiptUrl = receiptUrl;
      if (isRecurring !== undefined) transaction.isRecurring = isRecurring;

      await transactionRepository().save(transaction);

      // Apply new balance effect
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

      const transaction = await transactionRepository()
        .createQueryBuilder('transaction')
        .innerJoin('transaction.account', 'account')
        .where('transaction.id = :id', { id: req.params.id })
        .andWhere('account.user_id = :userId', { userId })
        .getOne();

      if (!transaction) {
        throw new AppError('Transaction not found.', 404);
      }

      // Reverse the balance effect
      await updateAccountBalance(transaction.accountId, transaction.amount, transaction.type, true);
      await transactionRepository().remove(transaction);

      res.json({ message: 'Transaction deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
