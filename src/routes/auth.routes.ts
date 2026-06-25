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
      res
        .status(201)
        .cookie("token", result.token, { httpOnly: true })
        .json({ user: result.user });
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
      const result = await authService.login({ email, password });
      res
        .cookie("token", result.token, { httpOnly: true })
        .json({ user: result.user });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/auth/me
router.get("/me", authenticate, (req: AuthRequest, res: Response): void => {
  res.json({ user: authService.publicProfile(req.user!) });
});

export default router;
