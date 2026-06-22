import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";
import { Account } from "./Account";
import { Category } from "./Category";

export enum TransactionType {
  INCOME = "income",
  EXPENSE = "expense",
}

@Table({ tableName: "transactions" })
export class Transaction extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Account)
  @AllowNull(false)
  @Column({ type: DataType.UUID, field: "account_id", onDelete: "CASCADE" })
  declare accountId: string;

  @ForeignKey(() => Category)
  @AllowNull(true)
  @Column({ type: DataType.UUID, field: "category_id", onDelete: "SET NULL" })
  declare categoryId: string | null;

  @AllowNull(false)
  @Column(DataType.DECIMAL(12, 2))
  declare amount: number;

  @AllowNull(false)
  @Column(DataType.ENUM(...Object.values(TransactionType)))
  declare type: TransactionType;

  @AllowNull(false)
  @Column(DataType.DATEONLY)
  declare date: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare description: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare notes: string | null;

  @AllowNull(true)
  @Column({ type: DataType.STRING, field: "receipt_url" })
  declare receiptUrl: string | null;

  @AllowNull(false)
  @Default(false)
  @Column({ type: DataType.BOOLEAN, field: "is_recurring" })
  declare isRecurring: boolean;

  @CreatedAt
  @Column({ field: "created_at" })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  declare updatedAt: Date;

  @BelongsTo(() => Account)
  declare account?: Account;

  @BelongsTo(() => Category)
  declare category?: Category | null;
}
