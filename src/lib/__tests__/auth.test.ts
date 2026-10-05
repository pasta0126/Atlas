import { describe, expect, it, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import {
  createSessionToken,
  verifyCredentials,
  verifyInboxToken,
  verifySessionToken,
} from "../auth";

describe("auth", () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    process.env.AUTH_USER = "pasta0126";
    process.env.AUTH_PASSWORD_HASH = await bcrypt.hash("correcta", 4);
    process.env.SESSION_SECRET = "test-secret";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("verifyCredentials", () => {
    it("acepta usuario y contraseña correctos", async () => {
      await expect(verifyCredentials("pasta0126", "correcta")).resolves.toBe(true);
    });

    it("rechaza una contraseña incorrecta", async () => {
      await expect(verifyCredentials("pasta0126", "incorrecta")).resolves.toBe(false);
    });

    it("rechaza un usuario distinto", async () => {
      await expect(verifyCredentials("otro", "correcta")).resolves.toBe(false);
    });
  });

  describe("sesión", () => {
    it("genera un token válido para el usuario", () => {
      const token = createSessionToken("pasta0126");
      expect(verifySessionToken(token)).toBe(true);
    });

    it("rechaza un token ausente", () => {
      expect(verifySessionToken(undefined)).toBe(false);
    });

    it("rechaza un token manipulado", () => {
      const token = createSessionToken("pasta0126");
      const [payload] = token.split(".");
      expect(verifySessionToken(`${payload}.firma-falsa`)).toBe(false);
    });

    it("rechaza un token firmado con otro secreto", () => {
      const token = createSessionToken("pasta0126");
      process.env.SESSION_SECRET = "otro-secreto";
      expect(verifySessionToken(token)).toBe(false);
    });
  });

  describe("verifyInboxToken", () => {
    beforeEach(() => {
      process.env.INBOX_TOKEN_HASH = crypto.createHash("sha256").update("token-bueno").digest("hex");
    });

    it("acepta el token correcto", () => {
      expect(verifyInboxToken("Bearer token-bueno")).toBe(true);
    });

    it("rechaza un token incorrecto, mal formado o ausente", () => {
      expect(verifyInboxToken("Bearer token-malo")).toBe(false);
      expect(verifyInboxToken("token-bueno")).toBe(false);
      expect(verifyInboxToken(null)).toBe(false);
    });

    it("queda deshabilitado si INBOX_TOKEN_HASH no está configurado", () => {
      delete process.env.INBOX_TOKEN_HASH;
      expect(verifyInboxToken("Bearer token-bueno")).toBe(false);
    });
  });
});
