import { Router, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../entities/User";
import { config } from "../config/env";
import { authenticate, AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { AppError } from "../middleware/errorHandler";

const router = Router();

const registerValidation = validate({
  email: { required: true, type: "string", isEmail: true },
  password: { required: true, type: "string" },
  name: { required: true, type: "string" },
});

const loginValidation = validate({
  email: { required: true, type: "string", isEmail: true },
  password: { required: true, type: "string" },
});

// POST /api/auth/register
router.post(
  "/register",
  registerValidation,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { email, password, name, businessName } = req.body;

      const existing = await User.findOne({ where: { email } });
      if (existing) {
        throw new AppError("An account with this email already exists.", 409);
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const user = await User.create({
        email,
        passwordHash,
        name,
        businessName: businessName || null,
      });

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn as unknown as number },
      );

      const { passwordHash: _, ...userResponse } = user.toJSON();
      res.status(201).json({ user: userResponse, token });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/auth/login
router.post(
  "/login",
  loginValidation,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw new AppError("Invalid email or password.", 401);
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        throw new AppError("Invalid email or password.", 401);
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn as unknown as number },
      );

      const { passwordHash: _, ...userResponse } = user.toJSON();
      res.json({ user: userResponse, token });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/auth/me
router.get(
  "/me",
  authenticate,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const user = req.user!;
      const { passwordHash: _, ...userResponse } = user.toJSON();
      res.json({ user: userResponse });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
