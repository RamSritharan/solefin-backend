import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  Unique,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  HasMany,
} from 'sequelize-typescript';
import { Account } from './Account';
import { Invoice } from './Invoice';

export enum UserRole {
  OWNER = 'owner',
  ACCOUNTANT = 'accountant',
}

@Table({ tableName: 'users' })
export class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING)
  declare email: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING, field: 'password_hash' })
  declare passwordHash: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare name: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING, field: 'business_name' })
  declare businessName: string | null;

  @AllowNull(false)
  @Default(UserRole.OWNER)
  @Column(DataType.ENUM(...Object.values(UserRole)))
  declare role: UserRole;

  @CreatedAt
  @Column({ field: 'created_at' })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ field: 'updated_at' })
  declare updatedAt: Date;

  @HasMany(() => Account)
  declare accounts?: Account[];

  @HasMany(() => Invoice)
  declare invoices?: Invoice[];
}
