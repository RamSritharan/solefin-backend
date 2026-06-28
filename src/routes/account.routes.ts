import { Router, Response, NextFunction } from "express";
import { AccountType } from "../entities/Account";
import { authenticate, AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as accountService from "../services/account.service";
import { PlaidService } from "../services/plaid.service";
import { User } from "../entities/User";

const router = Router();

const createValidation = validate({
  name: { required: true, type: "string" },
  type: { required: true, type: "string", enum: Object.values(AccountType) },
});

router.use(authenticate);

// GET /api/accounts
router.get(
  "/",
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const accounts = await accountService.listForUser(req.user!.id);
      res.json({ accounts });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/accounts/:id
router.get(
  "/:id",
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const account = await accountService.getForUser(
        req.params.id as string,
        req.user!.id,
      );
      res.json({ account });
    } catch (error) {
      next(error);
    }
  },
);

// POST /api/accounts
router.post(
  "/",
  createValidation,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { name, type, balance, currency } = req.body;
      const account = await accountService.create({
        userId: req.user!.id,
        name,
        type,
        balance,
        currency,
      });
      res.status(201).json({ account });
    } catch (error) {
      next(error);
    }
  },
);

//plaid integration

// Step 1: create a link_token to initialize Plaid Link in the browser.
router.post(
  "/plaid",
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const plaidService = new PlaidService(req.user!.id);
      const linkTokenResponse = await plaidService.createLinkToken();

      if (!linkTokenResponse || !linkTokenResponse.link_token) {
        res.status(500).json({ message: "Failed to create link token" });
        return;
      }

      res.json({ linkToken: linkTokenResponse.link_token });
    } catch (error) {
      next(error);
    }
  },
);

// Step 2: exchange the public_token (from Link onSuccess) for an access_token
// and persist it on the user.
router.post(
  "/plaid/exchange",
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { publicToken } = req.body;
      if (!publicToken) {
        res.status(400).json({ message: "publicToken is required" });
        return;
      }

      const plaidService = new PlaidService(req.user!.id);
      await plaidService.exchangePublicToken(publicToken);

      res.json({ message: "Bank account linked successfully." });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /api/accounts/:id
router.put(
  "/:id",
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const account = await accountService.update(
        req.params.id as string,
        req.user!.id,
        req.body,
      );
      res.json({ account });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE /api/accounts/:id
router.delete(
  "/:id",
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await accountService.remove(req.params.id as string, req.user!.id);
      res.json({ message: "Account deleted successfully." });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
