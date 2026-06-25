import { Invoice, InvoiceItem, InvoiceStatus } from '../entities/Invoice';
import { AppError } from '../errors/AppError';

export interface CreateInvoiceInput {
  userId: string;
  clientName: string;
  clientEmail?: string | null;
  amount: number;
  dueDate: string;
  items: InvoiceItem[];
  notes?: string | null;
}

export interface UpdateInvoiceInput {
  clientName?: string;
  clientEmail?: string | null;
  amount?: number;
  dueDate?: string;
  items?: InvoiceItem[];
  notes?: string | null;
}

export function listForUser(userId: string): Promise<Invoice[]> {
  return Invoice.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
  });
}

async function getOrFail(id: string, userId: string): Promise<Invoice> {
  const invoice = await Invoice.findOne({ where: { id, userId } });
  if (!invoice) {
    throw new AppError('Invoice not found.', 404);
  }
  return invoice;
}

export function getForUser(id: string, userId: string): Promise<Invoice> {
  return getOrFail(id, userId);
}

export function create(input: CreateInvoiceInput): Promise<Invoice> {
  return Invoice.create({
    userId: input.userId,
    clientName: input.clientName,
    clientEmail: input.clientEmail ?? null,
    amount: input.amount,
    dueDate: input.dueDate,
    items: input.items,
    notes: input.notes ?? null,
    status: InvoiceStatus.DRAFT,
  });
}

export async function update(
  id: string,
  userId: string,
  patch: UpdateInvoiceInput
): Promise<Invoice> {
  const invoice = await getOrFail(id, userId);

  if (patch.clientName !== undefined) invoice.clientName = patch.clientName;
  if (patch.clientEmail !== undefined) invoice.clientEmail = patch.clientEmail;
  if (patch.amount !== undefined) invoice.amount = patch.amount;
  if (patch.dueDate !== undefined) invoice.dueDate = patch.dueDate;
  if (patch.items !== undefined) invoice.items = patch.items;
  if (patch.notes !== undefined) invoice.notes = patch.notes;

  await invoice.save();
  return invoice;
}

export async function updateStatus(
  id: string,
  userId: string,
  status: InvoiceStatus
): Promise<Invoice> {
  const invoice = await getOrFail(id, userId);
  invoice.status = status;
  await invoice.save();
  return invoice;
}

export async function remove(id: string, userId: string): Promise<void> {
  const invoice = await getOrFail(id, userId);
  await invoice.destroy();
}
