/**
 * Cifrado client-side de cuerpos de documento (AES-256-GCM, clave derivada de
 * la frase secreta vía PBKDF2). La frase nunca sale del navegador: el
 * servidor solo almacena/transporta el sobre cifrado como una cadena opaca.
 */

const PBKDF2_ITERATIONS = 600_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ENVELOPE_VERSION = 1;

interface EncryptedEnvelope {
  v: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

export class DecryptionError extends Error {
  constructor() {
    super("No se pudo descifrar: frase incorrecta o contenido dañado");
    this.name = "DecryptionError";
  }
}

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuf(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function parseEnvelope(raw: string): EncryptedEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new DecryptionError();
  }
  const envelope = parsed as Partial<EncryptedEnvelope>;
  if (
    typeof envelope !== "object" ||
    envelope === null ||
    typeof envelope.salt !== "string" ||
    typeof envelope.iv !== "string" ||
    typeof envelope.ciphertext !== "string"
  ) {
    throw new DecryptionError();
  }
  return envelope as EncryptedEnvelope;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** Cifra `plaintext` con `passphrase`; devuelve el sobre cifrado serializado en JSON. */
export async function encryptContent(plaintext: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    new TextEncoder().encode(plaintext),
  );
  const envelope: EncryptedEnvelope = {
    v: ENVELOPE_VERSION,
    salt: bufToBase64(salt.buffer),
    iv: bufToBase64(iv.buffer),
    ciphertext: bufToBase64(ciphertext),
  };
  return JSON.stringify(envelope);
}

/** Descifra un sobre producido por `encryptContent`. Lanza `DecryptionError` si la frase es incorrecta o el sobre está dañado. */
export async function decryptContent(envelopeJson: string, passphrase: string): Promise<string> {
  const envelope = parseEnvelope(envelopeJson);
  const salt = new Uint8Array(base64ToBuf(envelope.salt));
  const iv = new Uint8Array(base64ToBuf(envelope.iv));
  const key = await deriveKey(passphrase, salt);
  try {
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      base64ToBuf(envelope.ciphertext),
    );
    return new TextDecoder().decode(plainBuf);
  } catch {
    throw new DecryptionError();
  }
}
