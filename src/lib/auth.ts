import "server-only";

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { type Locale, withLocale } from "@/lib/i18n";

const SESSION_COOKIE = "siamebu_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const PASSWORD_KEY_LENGTH = 64;
const AUTH_SECRET = process.env.AUTH_SECRET;

if (!AUTH_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("AUTH_SECRET is required in production");
}

const SESSION_SECRET =
  AUTH_SECRET ?? "dev-only-change-this-secret-before-production";

const shouldUseSecureSessionCookie = () => {
  const explicitValue = process.env.AUTH_COOKIE_SECURE?.trim().toLowerCase();

  if (explicitValue === "true") return true;
  if (explicitValue === "false") return false;

  return process.env.NODE_ENV === "production";
};

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");

  return `scrypt:${salt}:${hash}`;
};

export const verifyPassword = (password: string, storedHash: string) => {
  const [scheme, salt, hash] = storedHash.split(":");

  if (scheme !== "scrypt" || !salt || !hash) return false;

  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, PASSWORD_KEY_LENGTH);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const sign = (value: string) =>
  createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");

const createToken = (userId: string) => {
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `${userId}.${expiresAt}`;

  return `${payload}.${sign(payload)}`;
};

const parseToken = (token: string | undefined) => {
  if (!token) return null;

  const [userId, expiresAt, signature] = token.split(".");
  const payload = `${userId}.${expiresAt}`;

  if (!userId || !expiresAt || !signature) return null;
  if (sign(payload) !== signature) return null;
  if (Number(expiresAt) < Date.now()) return null;

  return userId;
};

export const createSession = async (userId: string) => {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, createToken(userId), {
    httpOnly: true,
    maxAge: SESSION_MAX_AGE,
    path: "/",
    sameSite: "lax",
    secure: shouldUseSecureSessionCookie(),
  });
};

export const destroySession = async () => {
  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE);
};

export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const userId = parseToken(cookieStore.get(SESSION_COOKIE)?.value);

  if (!userId) return null;

  return prisma.users.findFirst({
    where: {
      user_id: userId,
      is_active: true,
    },
    include: {
      roles: true,
      engineers: true,
    },
  });
});

export const requireUser = async (locale: Locale = "en") => {
  const user = await getCurrentUser();

  if (!user) redirect(withLocale("/login", locale));

  return user;
};
