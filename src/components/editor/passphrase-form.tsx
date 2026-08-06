"use client";

import { useState, type FormEvent } from "react";

const inputClassName =
  "min-w-0 rounded border border-black/[.08] bg-transparent px-2 py-1 text-xs outline-none dark:border-white/[.145]";
const primaryButtonClassName =
  "shrink-0 rounded bg-foreground px-2 py-1 text-xs text-background hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]";
const secondaryButtonClassName =
  "shrink-0 rounded px-2 py-1 text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200";

/**
 * Formulario de frase secreta, en dos modos:
 * - "unlock": una sola frase, para descifrar un documento ya cifrado.
 * - "enable": frase + confirmación, para activar el cifrado por primera vez.
 * `onSubmit` devuelve un mensaje de error, o `null` si todo fue bien.
 */
export function PassphraseForm({
  mode,
  onSubmit,
  onCancel,
}: {
  mode: "unlock" | "enable";
  onSubmit: (passphrase: string) => Promise<string | null>;
  onCancel?: () => void;
}) {
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mode === "enable") {
      if (passphrase.length < 8) {
        setError("Mínimo 8 caracteres.");
        return;
      }
      if (passphrase !== confirm) {
        setError("Las frases no coinciden.");
        return;
      }
    }
    setPending(true);
    const result = await onSubmit(passphrase);
    setPending(false);
    if (result) {
      setError(result);
      return;
    }
    setPassphrase("");
    setConfirm("");
    setError(null);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        type="password"
        value={passphrase}
        onChange={(event) => setPassphrase(event.target.value)}
        placeholder="Frase secreta"
        autoFocus
        className={inputClassName}
      />
      {mode === "enable" && (
        <input
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Repite la frase"
          className={inputClassName}
        />
      )}
      <button type="submit" disabled={pending || !passphrase} className={primaryButtonClassName}>
        {mode === "unlock" ? "Desbloquear" : "Cifrar"}
      </button>
      {onCancel && (
        <button type="button" onClick={onCancel} className={secondaryButtonClassName}>
          Cancelar
        </button>
      )}
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </form>
  );
}
