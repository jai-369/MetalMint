import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { findActiveUserById, findUserByEmailWithPassword, toPublicUser } from "./userService.js";
import { badRequest, unauthorized } from "../utils/httpError.js";

const tokenExpiresIn = "8h";
const placeholderPasswordHash = "PLACEHOLDER_PASSWORD_HASH_REPLACE_BEFORE_USE";

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret === "change-this-in-development") {
    throw badRequest("JWT_SECRET is not configured.");
  }

  return secret;
}

export function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
    },
    getJwtSecret(),
    {
      expiresIn: tokenExpiresIn,
    }
  );
}

export function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}

export async function loginWithEmailPassword(email, password) {
  const user = await findUserByEmailWithPassword(email);

  if (!user || !user.is_active) {
    throw unauthorized("Invalid email or password.");
  }

  if (user.password_hash === placeholderPasswordHash) {
    throw unauthorized("Invalid email or password.");
  }

  let isValidPassword = false;

  try {
    isValidPassword = await bcrypt.compare(password, user.password_hash);
  } catch (_error) {
    throw unauthorized("Invalid email or password.");
  }

  if (!isValidPassword) {
    throw unauthorized("Invalid email or password.");
  }

  const publicUser = toPublicUser(user);
  const token = signAuthToken(publicUser);

  return {
    token,
    user: publicUser,
  };
}

export async function getUserFromToken(token) {
  if (!token) {
    throw unauthorized();
  }

  try {
    const payload = verifyAuthToken(token);
    const user = await findActiveUserById(payload.sub);

    if (!user) {
      throw unauthorized();
    }

    return user;
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      throw unauthorized("Your session has expired. Please log in again.");
    }

    throw error;
  }
}
