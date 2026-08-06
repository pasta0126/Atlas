import { describe, expect, it } from "vitest";
import { decryptContent, encryptContent, DecryptionError } from "../crypto";

describe("crypto", () => {
  it("cifra y descifra con la misma frase (round-trip)", async () => {
    const envelope = await encryptContent("# Secreto\n\nContenido sensible.", "correcto-caballo-batería-grapa");
    const plaintext = await decryptContent(envelope, "correcto-caballo-batería-grapa");

    expect(plaintext).toBe("# Secreto\n\nContenido sensible.");
  });

  it("produce un sobre JSON sin la frase ni el texto en claro", async () => {
    const envelope = await encryptContent("dato sensible", "mi-frase-secreta");

    expect(envelope).not.toContain("dato sensible");
    expect(envelope).not.toContain("mi-frase-secreta");
    expect(() => JSON.parse(envelope)).not.toThrow();
  });

  it("lanza DecryptionError con una frase incorrecta", async () => {
    const envelope = await encryptContent("dato sensible", "frase-correcta");

    await expect(decryptContent(envelope, "frase-incorrecta")).rejects.toThrow(DecryptionError);
  });

  it("lanza DecryptionError con un sobre corrupto", async () => {
    await expect(decryptContent("no es json", "cualquier frase")).rejects.toThrow(DecryptionError);
    await expect(decryptContent("{}", "cualquier frase")).rejects.toThrow(DecryptionError);
  });

  it("usa sal e IV distintos en cada cifrado, incluso para el mismo texto", async () => {
    const a = await encryptContent("mismo texto", "misma frase");
    const b = await encryptContent("mismo texto", "misma frase");

    expect(a).not.toBe(b);
  });
});
