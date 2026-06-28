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
  const { passwordHash: _, ...rest } = user.toJSON() as PublicUser & {
    passwordHash: string;
  };
  return rest;
}

function signToken(user: User): string {
  return jwt.sign({ userId: user.id, email: user.email }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as unknown as number,
  });
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

  return { user: toPublicUser(user), token: signToken(user) };
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

    return { user: toPublicUser(user), token: signToken(user) };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("An error occurred during login.", 500);
  }
};

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
