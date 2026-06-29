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
  HasMany,
  CreatedAt,
  UpdatedAt,
} from "sequelize-typescript";
import { User } from "./User";
import { Transaction } from "./Transaction";

export enum AccountType {
  Depository = "depository",
  Investment = "investment",
  Loan = "loan",
  Credit = "credit",
  Other = "other",
}

@Table({ tableName: "accounts" })
export class Account extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column({ type: DataType.UUID, field: "user_id", onDelete: "CASCADE" })
  declare userId: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare name: string;

  @AllowNull(false)
  @Column(DataType.ENUM(...Object.values(AccountType)))
  declare type: AccountType;

  @AllowNull(false)
  @Column(DataType.STRING)
  declare subtype: string;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(12, 2))
  declare balance: number;

  @AllowNull(false)
  @Default("USD")
  @Column(DataType.STRING)
  declare currency: string;

  @CreatedAt
  @Column({ field: "created_at" })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ field: "updated_at" })
  declare updatedAt: Date;

  @BelongsTo(() => User)
  declare user?: User;

  @HasMany(() => Transaction)
  declare transactions?: Transaction[];
}
