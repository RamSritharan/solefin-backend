import { Router, Response, NextFunction } from 'express';
import { Account, AccountType } from '../entities/Account';
import { Transaction } from '../entities/Transaction';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const createValidation = validate({
  name: { required: true, type: 'string' },
  type: { required: true, type: 'string', enum: Object.values(AccountType) },
});

router.use(authenticate);

// GET /api/accounts
router.get(
  '/',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accounts = await Account.findAll({
        where: { userId: req.user!.id },
        order: [['createdAt', 'DESC']],
      });
      res.json({ accounts });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/accounts/:id
router.get(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const account = await Account.findOne({
        where: { id: req.params.id as string, userId: req.user!.id },
        include: [{ model: Transaction }],
      });

      if (!account) {
        throw new AppError('Account not found.', 404);
      }

      res.json({ account });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/accounts
router.post(
  '/',
  createValidation,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, type, balance, currency } = req.body;

      const account = await Account.create({
        userId: req.user!.id,
        name,
        type,
        balance: balance ?? 0,
        currency: currency || 'USD',
      });

      res.status(201).json({ account });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/accounts/:id
router.put(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const account = await Account.findOne({
        where: { id: req.params.id as string, userId: req.user!.id },
      });

      if (!account) {
        throw new AppError('Account not found.', 404);
      }

      const { name, type, balance, currency } = req.body;

      if (name !== undefined) account.name = name;
      if (type !== undefined) account.type = type;
      if (balance !== undefined) account.balance = balance;
      if (currency !== undefined) account.currency = currency;

      await account.save();
      res.json({ account });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/accounts/:id
router.delete(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const account = await Account.findOne({
        where: { id: req.params.id as string, userId: req.user!.id },
      });

      if (!account) {
        throw new AppError('Account not found.', 404);
      }

      await account.destroy();
      res.json({ message: 'Account deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
