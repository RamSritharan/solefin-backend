import { Router, Response, NextFunction } from 'express';
import { IsNull, FindOptionsWhere } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Category, CategoryType } from '../entities/Category';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const categoryRepository = () => AppDataSource.getRepository(Category);

const createValidation = validate({
  name: { required: true, type: 'string' },
  type: { required: true, type: 'string', enum: Object.values(CategoryType) },
});

router.use(authenticate);

// GET /api/categories
router.get(
  '/',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;

      const categories = await categoryRepository().find({
        where: [
          { userId: IsNull() } as FindOptionsWhere<Category>,
          { userId },
        ],
        order: { type: 'ASC', name: 'ASC' },
      });

      res.json({ categories });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/categories
router.post(
  '/',
  createValidation,
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { name, type, scheduleCLine } = req.body;

      const category = categoryRepository().create({
        name,
        type,
        scheduleCLine: scheduleCLine || null,
        isCustom: true,
        userId,
      });

      await categoryRepository().save(category);
      res.status(201).json({ category });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/categories/:id
router.put(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;

      const category = await categoryRepository().findOne({
        where: { id: req.params.id as string, userId, isCustom: true },
      });

      if (!category) {
        throw new AppError('Custom category not found.', 404);
      }

      const { name, type, scheduleCLine } = req.body;

      if (name !== undefined) category.name = name;
      if (type !== undefined) category.type = type;
      if (scheduleCLine !== undefined) category.scheduleCLine = scheduleCLine;

      await categoryRepository().save(category);
      res.json({ category });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/categories/:id
router.delete(
  '/:id',
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;

      const category = await categoryRepository().findOne({
        where: { id: req.params.id as string, userId, isCustom: true },
      });

      if (!category) {
        throw new AppError('Custom category not found or cannot be deleted.', 404);
      }

      await categoryRepository().remove(category);
      res.json({ message: 'Category deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
