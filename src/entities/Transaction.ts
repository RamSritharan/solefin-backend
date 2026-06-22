import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Account } from './Account';
import { Category } from './Category';

export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'account_id' })
  accountId!: string;

  @Column({ type: 'uuid', name: 'category_id', nullable: true })
  categoryId!: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'varchar' })
  description!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ type: 'varchar', name: 'receipt_url', nullable: true })
  receiptUrl!: string | null;

  @Column({ type: 'boolean', name: 'is_recurring', default: false })
  isRecurring!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Account, (account) => account.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @ManyToOne(() => Category, (category) => category.transactions, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category!: Category | null;
}
