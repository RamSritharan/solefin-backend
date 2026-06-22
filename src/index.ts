import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { sequelize } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { seedCategories } from './seeds/categories';

import authRoutes from './routes/auth.routes';
import accountRoutes from './routes/account.routes';
import transactionRoutes from './routes/transaction.routes';
import categoryRoutes from './routes/category.routes';
import invoiceRoutes from './routes/invoice.routes';
import reportRoutes from './routes/report.routes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler (must be after routes)
app.use(errorHandler);

// Start server
const startServer = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    console.log('Database connection established.');

    await seedCategories();

    app.listen(config.port, () => {
      console.log(`SoleFin API server running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
