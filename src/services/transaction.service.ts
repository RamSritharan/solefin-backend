import { Op, WhereOptions } from 'sequelize';
import { Transaction, TransactionType } from '../entities/Transaction';
import { Account } from '../entities/Account';
import { Category } from '../entities/Category';
import { AppError } from '../errors/AppError';

export interface ListFilters {
  userId: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

export interface ListResult {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateTransactionInput {
  userId: string;
  accountId: string;
  categoryId?: string | null;
  amount: number;
  type: TransactionType;
  date: string;
  description: string;
  notes?: string | null;
  receiptUrl?: string | null;
  isRecurring?: boolean;
}

export interface UpdateTransactionInput {
  categoryId?: string | null;
  amount?: number;
  type?: TransactionType;
  date?: string;
  description?: string;
  notes?: string | null;
  receiptUrl?: string | null;
  isRecurring?: boolean;
}

async function verifyAccountOwnership(accountId: string, userId: string): Promise<Account> {
  const account = await Account.findOne({ where: { id: accountId, userId } });
  if (!account) {
    throw new AppError('Account not found or does not belong to you.', 404);
  }
  return account;
}

async function adjustBalance(
  accountId: string,
  amount: number,
  type: TransactionType,
  isReversal: boolean
): Promise<void> {
  const account = await Account.findByPk(accountId);
  if (!account) return;

  const numericBalance = Number(account.balance);
  const numericAmount = Number(amount);
  const isIncome = type === TransactionType.INCOME;
  const sign = isReversal ? -1 : 1;

  account.balance = isIncome
    ? numericBalance + sign * numericAmount
    : numericBalance - sign * numericAmount;

  await account.save();
}

export async function list(filters: ListFilters): Promise<ListResult> {
  const where: Record<string, unknown> = {};
  if (filters.accountId) where.accountId = filters.accountId;
  if (filters.categoryId) where.categoryId = filters.categoryId;
  if (filters.type) where.type = filters.type;

  const dateFilter: Record<symbol, unknown> = {};
  if (filters.startDate) dateFilter[Op.gte] = filters.startDate;
  if (filters.endDate) dateFilter[Op.lte] = filters.endDate;
  if (Object.getOwnPropertySymbols(dateFilter).length > 0) {
    where.date = dateFilter;
  }

  const { rows: transactions, count: total } = await Transaction.findAndCountAll({
    where: where as WhereOptions,
    include: [
      { model: Account, attributes: [], where: { userId: filters.userId }, required: true },
      { model: Category, required: false },
    ],
    order: [
      ['date', 'DESC'],
      ['createdAt', 'DESC'],
    ],
    offset: (filters.page - 1) * filters.limit,
    limit: filters.limit,
  });

  return {
    transactions,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit),
    },
  };
}

export async function getForUser(id: string, userId: string): Promise<Transaction> {
  const transaction = await Transaction.findOne({
    where: { id },
    include: [
      { model: Account, attributes: [], where: { userId }, required: true },
      { model: Category, required: false },
    ],
  });

  if (!transaction) {
    throw new AppError('Transaction not found.', 404);
  }
  return transaction;
}

export async function create(input: CreateTransactionInput): Promise<Transaction> {
  await verifyAccountOwnership(input.accountId, input.userId);

  const transaction = await Transaction.create({
    accountId: input.accountId,
    categoryId: input.categoryId ?? null,
    amount: input.amount,
    type: input.type,
    date: input.date,
    description: input.description,
    notes: input.notes ?? null,
    receiptUrl: input.receiptUrl ?? null,
    isRecurring: input.isRecurring ?? false,
  });

  await adjustBalance(input.accountId, input.amount, input.type, false);
  return transaction;
}

export async function update(
  id: string,
  userId: string,
  patch: UpdateTransactionInput
): Promise<Transaction> {
  const transaction = await Transaction.findOne({
    where: { id },
    include: [{ model: Account, attributes: [], where: { userId }, required: true }],
  });

  if (!transaction) {
    throw new AppError('Transaction not found.', 404);
  }

  await adjustBalance(transaction.accountId, transaction.amount, transaction.type, true);

  if (patch.categoryId !== undefined) transaction.categoryId = patch.categoryId;
  if (patch.amount !== undefined) transaction.amount = patch.amount;
  if (patch.type !== undefined) transaction.type = patch.type;
  if (patch.date !== undefined) transaction.date = patch.date;
  if (patch.description !== undefined) transaction.description = patch.description;
  if (patch.notes !== undefined) transaction.notes = patch.notes;
  if (patch.receiptUrl !== undefined) transaction.receiptUrl = patch.receiptUrl;
  if (patch.isRecurring !== undefined) transaction.isRecurring = patch.isRecurring;

  await transaction.save();
  await adjustBalance(transaction.accountId, transaction.amount, transaction.type, false);

  return transaction;
}

export async function remove(id: string, userId: string): Promise<void> {
  const transaction = await Transaction.findOne({
    where: { id },
    include: [{ model: Account, attributes: [], where: { userId }, required: true }],
  });

  if (!transaction) {
    throw new AppError('Transaction not found.', 404);
  }

  await adjustBalance(transaction.accountId, transaction.amount, transaction.type, true);
  await transaction.destroy();
}
