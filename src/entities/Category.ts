import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Transaction } from './Transaction';

export enum CategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'enum', enum: CategoryType })
  type!: CategoryType;

  @Column({ type: 'varchar', name: 'schedule_c_line', nullable: true })
  scheduleCLine!: string | null;

  @Column({ type: 'boolean', name: 'is_custom', default: false })
  isCustom!: boolean;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => Transaction, (transaction) => transaction.category)
  transactions!: Transaction[];
}
