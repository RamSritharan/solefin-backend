import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';

export interface AuthRequest extends Request {
  user?: User;
}

interface JwtPayload {
  userId: string;
  email: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required. Please provide a valid token.' });
      return;
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { id: decoded.userId } });

    if (!user) {
      res.status(401).json({ error: 'User not found. Token may be invalid.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token.' });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token has expired.' });
      return;
    }
    next(error);
  }
};
