import { Account, AccountType } from '../entities/Account';
import { Transaction } from '../entities/Transaction';
import { AppError } from '../errors/AppError';

export interface CreateAccountInput {
  userId: string;
  name: string;
  type: AccountType;
  balance?: number;
  currency?: string;
}

export interface UpdateAccountInput {
  name?: string;
  type?: AccountType;
  balance?: number;
  currency?: string;
}

export function listForUser(userId: string): Promise<Account[]> {
  return Account.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });
}

export async function getForUser(id: string, userId: string): Promise<Account> {
  const account = await Account.findOne({
    where: { id, userId },
    include: [{ model: Transaction }],
  });
  if (!account) {
    throw new AppError('Account not found.', 404);
  }
  return account;
}

export function create(input: CreateAccountInput): Promise<Account> {
  return Account.create({
    userId: input.userId,
    name: input.name,
    type: input.type,
    balance: input.balance ?? 0,
    currency: input.currency || 'USD',
  });
}

export async function update(
  id: string,
  userId: string,
  patch: UpdateAccountInput
): Promise<Account> {
  const account = await Account.findOne({ where: { id, userId } });
  if (!account) {
    throw new AppError('Account not found.', 404);
  }

  if (patch.name !== undefined) account.name = patch.name;
  if (patch.type !== undefined) account.type = patch.type;
  if (patch.balance !== undefined) account.balance = patch.balance;
  if (patch.currency !== undefined) account.currency = patch.currency;

  await account.save();
  return account;
}

export async function remove(id: string, userId: string): Promise<void> {
  const account = await Account.findOne({ where: { id, userId } });
  if (!account) {
    throw new AppError('Account not found.', 404);
  }
  await account.destroy();
}
