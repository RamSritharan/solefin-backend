import { Router, Response, NextFunction } from 'express';
import { TransactionType } from '../entities/Transaction';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as transactionService from '../services/transaction.service';

const router = Router();

const createValidation = validate({
  accountId: { required: true, type: 'string' },
  amount: { required: true, type: 'number', min: 0 },
  type: { required: true, type: 'string', enum: Object.values(TransactionType) },
  date: { required: true, type: 'string' },
  description: { required: true, type: 'string' },
});

router.use(authenticate);

// GET /api/transactions
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { accountId, categoryId, type, startDate, endDate, page = '1', limit = '20' } = req.query;

    const result = await transactionService.list({
      userId: req.user!.id,
      accountId: accountId as string | undefined,
      categoryId: categoryId as string | undefined,
      type: type as TransactionType | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/transactions/:id
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const transaction = await transactionService.getForUser(
      req.params.id as string,
      req.user!.id
    );
    res.json({ transaction });
  } catch (error) {
    next(error);
  }
});

// POST /api/transactions
router.post(
  '/',
  createValidation,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { accountId, categoryId, amount, type, date, description, notes, receiptUrl, isRecurring } =
        req.body;

      const transaction = await transactionService.create({
        userId: req.user!.id,
        accountId,
        categoryId,
        amount,
        type,
        date,
        description,
        notes,
        receiptUrl,
        isRecurring,
      });

      res.status(201).json({ transaction });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/transactions/:id
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const transaction = await transactionService.update(
      req.params.id as string,
      req.user!.id,
      req.body
    );
    res.json({ transaction });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await transactionService.remove(req.params.id as string, req.user!.id);
    res.json({ message: 'Transaction deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
