import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";
import { User } from "../entities/User";

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
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      res
        .status(401)
        .json({
          error: "Authentication required. Please provide a valid token.",
        });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    const user = await User.findByPk(decoded.userId);

    if (!user) {
      res.status(401).json({ error: "User not found. Token may be invalid." });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: "Invalid token." });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Token has expired." });
      return;
    }
    next(error);
  }
};
