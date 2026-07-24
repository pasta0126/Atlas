import crypto from "node:crypto";
import bcrypt from "bcryptjs";

export const SESSION_COOKIE_NAME = "atlas_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días

interface SessionPayload {
  user: string;
  exp: number;
}

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET no está configurado");
  }
  return secret;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const expectedUser = process.env.AUTH_USER;
  const passwordHash = process.env.AUTH_PASSWORD_HASH;
  if (!expectedUser || !passwordHash || username !== expectedUser) {
    return false;
  }
  return bcrypt.compare(password, passwordHash);
}

export function createSessionToken(username: string): string {
  const payload: SessionPayload = {
    user: username,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadEncoded}.${sign(payloadEncoded)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token) return false;

  const [payloadEncoded, signature] = token.split(".");
  if (!payloadEncoded || !signature) return false;

  const expectedSignature = Buffer.from(sign(payloadEncoded));
  const receivedSignature = Buffer.from(signature);
  if (
    expectedSignature.length !== receivedSignature.length ||
    !crypto.timingSafeEqual(expectedSignature, receivedSignature)
  ) {
    return false;
  }

  try {
    const payload: SessionPayload = JSON.parse(Buffer.from(payloadEncoded, "base64url").toString());
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
