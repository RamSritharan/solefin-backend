import { Router, Response, NextFunction } from 'express';
import { InvoiceStatus } from '../entities/Invoice';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as invoiceService from '../services/invoice.service';

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
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invoices = await invoiceService.listForUser(req.user!.id);
    res.json({ invoices });
  } catch (error) {
    next(error);
  }
});

// GET /api/invoices/:id
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invoice = await invoiceService.getForUser(req.params.id as string, req.user!.id);
    res.json({ invoice });
  } catch (error) {
    next(error);
  }
});

// POST /api/invoices
router.post(
  '/',
  createValidation,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { clientName, clientEmail, amount, dueDate, items, notes } = req.body;
      const invoice = await invoiceService.create({
        userId: req.user!.id,
        clientName,
        clientEmail,
        amount,
        dueDate,
        items,
        notes,
      });
      res.status(201).json({ invoice });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/invoices/:id
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const invoice = await invoiceService.update(
      req.params.id as string,
      req.user!.id,
      req.body
    );
    res.json({ invoice });
  } catch (error) {
    next(error);
  }
});

// PUT /api/invoices/:id/status
router.put(
  '/:id/status',
  statusValidation,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const invoice = await invoiceService.updateStatus(
        req.params.id as string,
        req.user!.id,
        req.body.status
      );
      res.json({ invoice });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/invoices/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await invoiceService.remove(req.params.id as string, req.user!.id);
    res.json({ message: 'Invoice deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
