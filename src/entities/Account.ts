import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './User';
import { Transaction } from './Transaction';

export enum AccountType {
  CHECKING = 'checking',
  SAVINGS = 'savings',
  CREDIT_CARD = 'credit_card',
  CASH = 'cash',
}

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'enum', enum: AccountType })
  type!: AccountType;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  balance!: number;

  @Column({ type: 'varchar', default: 'USD' })
  currency!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.accounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => Transaction, (transaction) => transaction.account)
  transactions!: Transaction[];
}
