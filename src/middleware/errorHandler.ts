import { Request, Response, NextFunction } from 'express';
import {
  UniqueConstraintError,
  ForeignKeyConstraintError,
  ValidationError as SequelizeValidationError,
  DatabaseError,
  EmptyResultError,
} from 'sequelize';
import { AppError } from '../errors/AppError';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err);

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof UniqueConstraintError) {
    res.status(409).json({ error: 'A record with that value already exists.' });
    return;
  }

  if (err instanceof ForeignKeyConstraintError) {
    res.status(400).json({ error: 'Referenced record does not exist.' });
    return;
  }

  if (err instanceof SequelizeValidationError) {
    res.status(400).json({ error: err.errors.map((e) => e.message).join(' ') });
    return;
  }

  if (err instanceof EmptyResultError) {
    res.status(404).json({ error: 'Resource not found.' });
    return;
  }

  if (err instanceof DatabaseError) {
    res.status(400).json({ error: 'Database query error.' });
    return;
  }

  if (err.name === 'ValidationError') {
    res.status(400).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Internal server error.' });
};
