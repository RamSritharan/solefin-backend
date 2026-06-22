import { Sequelize } from 'sequelize-typescript';
import { config } from './env';
import { User } from '../entities/User';
import { Account } from '../entities/Account';
import { Transaction } from '../entities/Transaction';
import { Category } from '../entities/Category';
import { Invoice } from '../entities/Invoice';

export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  username: config.db.user,
  password: config.db.password,
  logging: false,
  models: [User, Account, Transaction, Category, Invoice],
});
