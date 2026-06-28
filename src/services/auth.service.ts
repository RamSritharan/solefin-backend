import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../entities/User";
import { config } from "../config/env";
import { AppError } from "../errors/AppError";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  businessName: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResult {
  user: PublicUser;
  token: string;
  refreshToken: string;
}

interface RefreshPayload {
  userId: string;
  type: "refresh";
  tokenVersion: number;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  businessName?: string | null;
}

export interface LoginInput {
  email: string;
  password: string;
}

function toPublicUser(user: User): PublicUser {
  const {
    passwordHash: _,
    tokenVersion: __,
    plaidAccessToken: ___,
    ...rest
  } = user.toJSON() as PublicUser & {
    passwordHash: string;
    tokenVersion: number;
    plaidAccessToken: string | null;
  };
  return rest;
}

function signToken(user: User): string {
  return jwt.sign({ userId: user.id, email: user.email }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as unknown as number,
  });
}

function signRefreshToken(user: User): string {
  return jwt.sign(
    {
      userId: user.id,
      type: "refresh",
      tokenVersion: user.tokenVersion,
    } as RefreshPayload,
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn as unknown as number },
  );
}

function buildAuthResult(user: User): AuthResult {
  return {
    user: toPublicUser(user),
    token: signToken(user),
    refreshToken: signRefreshToken(user),
  };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const existing = await User.findOne({ where: { email: input.email } });
  if (existing) {
    throw new AppError("An account with this email already exists.", 409);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(input.password, salt);

  const user = await User.create({
    email: input.email,
    passwordHash,
    name: input.name,
    businessName: input.businessName ?? null,
  });

  return buildAuthResult(user);
}

export const login = async (input: LoginInput): Promise<AuthResult> => {
  try {
    const user = await User.findOne({ where: { email: input.email } });

    if (!user) {
      throw new AppError("Invalid email or password.", 401);
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError("Invalid email or password.", 401);
    }

    return buildAuthResult(user);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("An error occurred during login.", 500);
  }
};

export async function refresh(refreshToken: string | undefined): Promise<AuthResult> {
  if (!refreshToken) {
    throw new AppError("Refresh token required.", 401);
  }

  let payload: RefreshPayload;
  try {
    payload = jwt.verify(
      refreshToken,
      config.jwt.refreshSecret,
    ) as RefreshPayload;
  } catch {
    throw new AppError("Invalid or expired refresh token.", 401);
  }

  if (payload.type !== "refresh") {
    throw new AppError("Invalid refresh token.", 401);
  }

  const user = await User.findByPk(payload.userId);
  if (!user) {
    throw new AppError("User not found.", 401);
  }

  if (payload.tokenVersion !== user.tokenVersion) {
    throw new AppError("Refresh token has been revoked.", 401);
  }

  return buildAuthResult(user);
}

// Invalidates every outstanding refresh token for the user (log out everywhere).
export async function revokeAllSessions(user: User): Promise<void> {
  await user.increment("tokenVersion");
}

export async function publicProfile(user: User): Promise<PublicUser> {
  try {
    const foundUser = await User.findByPk(user.id);
    if (!foundUser) {
      throw new AppError("User not found.", 404);
    }
    return toPublicUser(foundUser);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "An error occurred while fetching the user profile.",
      500,
    );
  }
}
