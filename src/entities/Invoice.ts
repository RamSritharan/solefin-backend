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
} from 'sequelize-typescript';
import { User } from './User';

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  VIEWED = 'viewed',
  PAID = 'paid',
  OVERDUE = 'overdue',
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

@Table({ tableName: 'invoices' })
export class Invoice extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column({ type: DataType.UUID, field: 'user_id', onDelete: 'CASCADE' })
  declare userId: string;

  @AllowNull(false)
  @Column({ type: DataType.STRING, field: 'client_name' })
  declare clientName: string;

  @AllowNull(true)
  @Column({ type: DataType.STRING, field: 'client_email' })
  declare clientEmail: string | null;

  @AllowNull(false)
  @Column(DataType.DECIMAL(12, 2))
  declare amount: number;

  @AllowNull(false)
  @Default(InvoiceStatus.DRAFT)
  @Column(DataType.ENUM(...Object.values(InvoiceStatus)))
  declare status: InvoiceStatus;

  @AllowNull(false)
  @Column({ type: DataType.DATEONLY, field: 'due_date' })
  declare dueDate: string;

  @AllowNull(false)
  @Column(DataType.JSONB)
  declare items: InvoiceItem[];

  @AllowNull(true)
  @Column(DataType.TEXT)
  declare notes: string | null;

  @CreatedAt
  @Column({ field: 'created_at' })
  declare createdAt: Date;

  @UpdatedAt
  @Column({ field: 'updated_at' })
  declare updatedAt: Date;

  @BelongsTo(() => User)
  declare user?: User;
}
