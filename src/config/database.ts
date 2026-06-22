import { DataSource } from 'typeorm';
import { config } from './env';
import { User } from '../entities/User';
import { Account } from '../entities/Account';
import { Transaction } from '../entities/Transaction';
import { Category } from '../entities/Category';
import { Invoice } from '../entities/Invoice';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  username: config.db.user,
  password: config.db.password,
  synchronize: true,
  logging: false,
  entities: [User, Account, Transaction, Category, Invoice],
});
