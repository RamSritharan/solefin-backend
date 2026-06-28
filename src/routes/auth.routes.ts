import { Router, Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as authService from "../services/auth.service";

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
      const result = await authService.register({
        email,
        password,
        name,
        businessName,
      });
      res.status(201).cookie("token", result.token, { httpOnly: true });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
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
      const result = await authService.login({ email, password });
      res.cookie("token", result.token, { httpOnly: true, sameSite: "strict" });
      res.json({ user: result.user });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
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
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    res.json({ user: req.user });
  },
);

router.get("/logout", (req: AuthRequest, res: Response): void => {
  res.clearCookie("token");
  res.json({ message: "Logged out successfully." });
});

export default router;
