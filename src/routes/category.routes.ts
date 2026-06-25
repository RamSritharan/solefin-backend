import { Router, Response, NextFunction } from 'express';
import { CategoryType } from '../entities/Category';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import * as categoryService from '../services/category.service';

const router = Router();

const createValidation = validate({
  name: { required: true, type: 'string' },
  type: { required: true, type: 'string', enum: Object.values(CategoryType) },
});

router.use(authenticate);

// GET /api/categories
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await categoryService.listForUser(req.user!.id);
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

// POST /api/categories
router.post(
  '/',
  createValidation,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, type, scheduleCLine } = req.body;
      const category = await categoryService.create({
        userId: req.user!.id,
        name,
        type,
        scheduleCLine,
      });
      res.status(201).json({ category });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/categories/:id
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = await categoryService.update(
      req.params.id as string,
      req.user!.id,
      req.body
    );
    res.json({ category });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await categoryService.remove(req.params.id as string, req.user!.id);
    res.json({ message: 'Category deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
