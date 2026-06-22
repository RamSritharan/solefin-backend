import { Request, Response, NextFunction } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

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

  if (err instanceof QueryFailedError) {
    const pgError = err as QueryFailedError & { code?: string; detail?: string };

    if (pgError.code === '23505') {
      res.status(409).json({ error: 'A record with that value already exists.' });
      return;
    }

    if (pgError.code === '23503') {
      res.status(400).json({ error: 'Referenced record does not exist.' });
      return;
    }

    res.status(400).json({ error: 'Database query error.' });
    return;
  }

  if (err instanceof EntityNotFoundError) {
    res.status(404).json({ error: 'Resource not found.' });
    return;
  }

  if (err.name === 'ValidationError') {
    res.status(400).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Internal server error.' });
};
