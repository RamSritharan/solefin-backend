import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  HasMany,
  CreatedAt,
} from 'sequelize-typescript';
import { Transaction } from './Transaction';

export enum CategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

@Table({ tableName: 'categories', updatedAt: false })
export class Category extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare name: string;

  @AllowNull(false)
  @Column(DataType.ENUM(...Object.values(CategoryType)))
  declare type: CategoryType;

  @AllowNull(true)
  @Column({ type: DataType.STRING, field: 'schedule_c_line' })
  declare scheduleCLine: string | null;

  @AllowNull(false)
  @Default(false)
  @Column({ type: DataType.BOOLEAN, field: 'is_custom' })
  declare isCustom: boolean;

  @AllowNull(true)
  @Column({ type: DataType.UUID, field: 'user_id' })
  declare userId: string | null;

  @CreatedAt
  @Column({ field: 'created_at' })
  declare createdAt: Date;

  @HasMany(() => Transaction)
  declare transactions?: Transaction[];
}
