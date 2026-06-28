import { Router, Response, NextFunction } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as authService from "../services/auth.service";

const router = Router();

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

function setAuthCookies(
  res: Response,
  result: { token: string; refreshToken: string },
): void {
  res.cookie("token", result.token, {
    httpOnly: true,
    sameSite: "strict",
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    path: "/api/auth/refresh",
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

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
      setAuthCookies(res, result);
      res.status(201).json({ user: result.user });
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
      setAuthCookies(res, result);
      res.json({ user: result.user });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  },
);

// POST /api/auth/refresh
router.post(
  "/refresh",
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const result = await authService.refresh(req.cookies?.refreshToken);
      setAuthCookies(res, result);
      res.json({ user: result.user });
    } catch (error) {
      const status =
        error instanceof Error && "statusCode" in error
          ? (error as { statusCode: number }).statusCode
          : 500;
      res.status(status).json({ message: (error as Error).message });
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
    try {
      const user = await authService.publicProfile(req.user);
      res.json({ user });
    } catch (error) {
      next(error);
    }
  },
);

router.get("/logout", (req: AuthRequest, res: Response): void => {
  res.clearCookie("token");
  res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
  res.json({ message: "Logged out successfully." });
});

// POST /api/auth/logout-all — revoke every session for the current user.
router.post(
  "/logout-all",
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }
    await authService.revokeAllSessions(req.user);
    res.clearCookie("token");
    res.clearCookie("refreshToken", { path: "/api/auth/refresh" });
    res.json({ message: "Logged out of all sessions." });
  },
);

export default router;
