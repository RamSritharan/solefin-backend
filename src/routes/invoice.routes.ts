import { Router, Response, NextFunction } from 'express';
import { Invoice, InvoiceStatus } from '../entities/Invoice';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const createValidation = validate({
  clientName: { required: true, type: 'string' },
  amount: { required: true, type: 'number', min: 0 },
  dueDate: { required: true, type: 'string' },
  items: { required: true, isArray: true },
});

const statusValidation = validate({
  status: { required: true, type: 'string', enum: Object.values(InvoiceStatus) },
});

router.use(authenticate);

// GET /api/invoices
router.get(
  '/',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invoices = await Invoice.findAll({
        where: { userId: req.user!.id },
        order: [['createdAt', 'DESC']],
      });
      res.json({ invoices });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/invoices/:id
router.get(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invoice = await Invoice.findOne({
        where: { id: req.params.id as string, userId: req.user!.id },
      });

      if (!invoice) {
        throw new AppError('Invoice not found.', 404);
      }

      res.json({ invoice });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/invoices
router.post(
  '/',
  createValidation,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientName, clientEmail, amount, dueDate, items, notes } = req.body;

      const invoice = await Invoice.create({
        userId: req.user!.id,
        clientName,
        clientEmail: clientEmail || null,
        amount,
        dueDate,
        items,
        notes: notes || null,
        status: InvoiceStatus.DRAFT,
      });

      res.status(201).json({ invoice });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/invoices/:id
router.put(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invoice = await Invoice.findOne({
        where: { id: req.params.id as string, userId: req.user!.id },
      });

      if (!invoice) {
        throw new AppError('Invoice not found.', 404);
      }

      const { clientName, clientEmail, amount, dueDate, items, notes } = req.body;

      if (clientName !== undefined) invoice.clientName = clientName;
      if (clientEmail !== undefined) invoice.clientEmail = clientEmail;
      if (amount !== undefined) invoice.amount = amount;
      if (dueDate !== undefined) invoice.dueDate = dueDate;
      if (items !== undefined) invoice.items = items;
      if (notes !== undefined) invoice.notes = notes;

      await invoice.save();
      res.json({ invoice });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/invoices/:id/status
router.put(
  '/:id/status',
  statusValidation,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invoice = await Invoice.findOne({
        where: { id: req.params.id as string, userId: req.user!.id },
      });

      if (!invoice) {
        throw new AppError('Invoice not found.', 404);
      }

      invoice.status = req.body.status;
      await invoice.save();
      res.json({ invoice });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/invoices/:id
router.delete(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invoice = await Invoice.findOne({
        where: { id: req.params.id as string, userId: req.user!.id },
      });

      if (!invoice) {
        throw new AppError('Invoice not found.', 404);
      }

      await invoice.destroy();
      res.json({ message: 'Invoice deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
