import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Account } from './Account';
import { Invoice } from './Invoice';

export enum UserRole {
  OWNER = 'owner',
  ACCOUNTANT = 'accountant',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ type: 'varchar', name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', name: 'business_name', nullable: true })
  businessName!: string | null;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.OWNER })
  role!: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Account, (account) => account.user)
  accounts!: Account[];

  @OneToMany(() => Invoice, (invoice) => invoice.user)
  invoices!: Invoice[];
}
