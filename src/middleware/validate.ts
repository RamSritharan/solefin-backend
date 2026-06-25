import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

type ValidationSchema = {
  [key: string]: {
    required?: boolean;
    type?: string;
    enum?: string[];
    isEmail?: boolean;
    isArray?: boolean;
    min?: number;
  };
};

export const validate = (schema: ValidationSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[source];
    const errors: string[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required.`);
        continue;
      }

      if (value === undefined || value === null) {
        continue;
      }

      if (rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be of type ${rules.type}.`);
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}.`);
      }

      if (rules.isEmail && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          errors.push(`${field} must be a valid email address.`);
        }
      }

      if (rules.isArray && !Array.isArray(value)) {
        errors.push(`${field} must be an array.`);
      }

      if (rules.min !== undefined && typeof value === 'number' && value < rules.min) {
        errors.push(`${field} must be at least ${rules.min}.`);
      }
    }

    if (errors.length > 0) {
      next(new AppError(errors.join(' '), 400));
      return;
    }

    next();
  };
};
