import { Op } from 'sequelize';
import { Category, CategoryType } from '../entities/Category';
import { AppError } from '../errors/AppError';

export interface CreateCategoryInput {
  userId: string;
  name: string;
  type: CategoryType;
  scheduleCLine?: string | null;
}

export interface UpdateCategoryInput {
  name?: string;
  type?: CategoryType;
  scheduleCLine?: string | null;
}

export function listForUser(userId: string): Promise<Category[]> {
  return Category.findAll({
    where: { [Op.or]: [{ userId: null }, { userId }] },
    order: [
      ['type', 'ASC'],
      ['name', 'ASC'],
    ],
  });
}

export function create(input: CreateCategoryInput): Promise<Category> {
  return Category.create({
    name: input.name,
    type: input.type,
    scheduleCLine: input.scheduleCLine ?? null,
    isCustom: true,
    userId: input.userId,
  });
}

async function findCustomOrFail(id: string, userId: string): Promise<Category> {
  const category = await Category.findOne({ where: { id, userId, isCustom: true } });
  if (!category) {
    throw new AppError('Custom category not found.', 404);
  }
  return category;
}

export async function update(
  id: string,
  userId: string,
  patch: UpdateCategoryInput
): Promise<Category> {
  const category = await findCustomOrFail(id, userId);

  if (patch.name !== undefined) category.name = patch.name;
  if (patch.type !== undefined) category.type = patch.type;
  if (patch.scheduleCLine !== undefined) category.scheduleCLine = patch.scheduleCLine;

  await category.save();
  return category;
}

export async function remove(id: string, userId: string): Promise<void> {
  const category = await findCustomOrFail(id, userId);
  await category.destroy();
}
