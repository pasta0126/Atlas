"use client";

import { useCallback, useEffect, useState } from "react";
import { MarkdownEditor } from "./markdown-editor";
import { MetadataPanel } from "./metadata-panel";
import { PassphraseForm } from "./passphrase-form";
import { Preview } from "@/components/preview/preview";
import { HistoryPanel } from "@/components/history/history-panel";
import { Backlinks } from "@/components/backlinks/backlinks";
import { CheckIcon, LockIcon, PencilIcon, XIcon } from "@/components/icons";
import { decryptContent, encryptContent } from "@/lib/crypto";
import type { AtlasDocument, Frontmatter } from "@/types/atlas";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type RightTab = "preview" | "historial" | "backlinks";
type DesktopRightTab = "historial" | "backlinks";
// En móvil solo se muestra una zona a la vez (editor o la pestaña
// seleccionada). En escritorio siempre hay 2 columnas: sin editar,
// izquierda = Preview y derecha = Historial/Backlinks; editando,
// izquierda = editor y derecha = Preview. No hay cabecera global: cada
// panel lleva sus propios controles.
type MobileView = "editor" | "right";

function apiPathFor(documentPath: string): string {
  return `/api/docs/${documentPath.split("/").map(encodeURIComponent).join("/")}`;
}

function tabClass(active: boolean): string {
  return `border-b-2 px-3 py-1.5 text-xs ${
    active
      ? "border-foreground font-medium text-zinc-900 dark:text-zinc-100"
      : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
  }`;
}

const iconButtonClass =
  "shrink-0 rounded-full p-1.5 text-zinc-600 hover:bg-black/[.06] hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[.1] dark:hover:text-zinc-100";
const iconButtonDisabledClass = "cursor-not-allowed opacity-40 hover:bg-transparent dark:hover:bg-transparent";
const saveButtonClass =
  "shrink-0 rounded-full bg-foreground p-1.5 text-background hover:bg-[#383838] dark:hover:bg-[#ccc]";
const textButtonClass =
  "shrink-0 text-xs text-zinc-500 underline hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200";

export function DocumentEditor({
  document,
  docPaths,
}: {
  document: AtlasDocument;
  docPaths: string[];
}) {
  const [content, setContent] = useState(document.content);
  const [frontmatter, setFrontmatter] = useState<Frontmatter>(document.frontmatter);
  const [savedContent, setSavedContent] = useState(document.content);
  const [savedFrontmatter, setSavedFrontmatter] = useState<Frontmatter>(document.frontmatter);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [rightTab, setRightTab] = useState<RightTab>("preview");
  const [desktopRightTab, setDesktopRightTab] = useState<DesktopRightTab>("historial");
  const [mobileView, setMobileView] = useState<MobileView>("right");
  const [desktopEditing, setDesktopEditing] = useState(false);

  // Cifrado: `content`/`savedContent` guardan siempre el sobre cifrado tal
  // cual vive en disco (el servidor nunca ve la frase ni el texto en claro).
  // `plaintext`/`savedPlaintext` solo existen en memoria del navegador,
  // mientras el documento está desbloqueado en esta sesión.
  const isEncrypted = Boolean(frontmatter.cifrado);
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [savedPlaintext, setSavedPlaintext] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState<string | null>(null);
  const [showEnableForm, setShowEnableForm] = useState(false);
  const locked = isEncrypted && plaintext === null;

  function startEditing() {
    if (locked) return;
    setMobileView("editor");
    setDesktopEditing(true);
  }

  function cancelEditing() {
    setContent(savedContent);
    setFrontmatter(savedFrontmatter);
    if (isEncrypted) setPlaintext(savedPlaintext);
    setStatus("idle");
    setMobileView("right");
    setDesktopEditing(false);
  }

  const save = useCallback(
    async (overrides?: { content?: string; frontmatter?: Frontmatter }): Promise<boolean> => {
      const nextContent = overrides?.content ?? content;
      const nextFrontmatter = overrides?.frontmatter ?? frontmatter;
      setStatus("saving");
      try {
        const response = await fetch(apiPathFor(document.path), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frontmatter: nextFrontmatter, content: nextContent }),
        });
        if (response.ok) {
          setContent(nextContent);
          setFrontmatter(nextFrontmatter);
          setSavedContent(nextContent);
          setSavedFrontmatter(nextFrontmatter);
          setStatus("saved");
          return true;
        }
        setStatus("error");
        return false;
      } catch {
        setStatus("error");
        return false;
      }
    },
    [content, frontmatter, document.path],
  );

  const commitSave = useCallback(async () => {
    if (isEncrypted) {
      if (plaintext === null || !passphrase) return;
      let ciphertext: string;
      try {
        ciphertext = await encryptContent(plaintext, passphrase);
      } catch {
        setStatus("error");
        return;
      }
      const ok = await save({ content: ciphertext });
      if (ok) setSavedPlaintext(plaintext);
      return;
    }
    await save();
  }, [isEncrypted, plaintext, passphrase, save]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        commitSave();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [commitSave]);

  async function handleUnlock(candidate: string): Promise<string | null> {
    try {
      const decrypted = await decryptContent(content, candidate);
      setPlaintext(decrypted);
      setSavedPlaintext(decrypted);
      setPassphrase(candidate);
      return null;
    } catch {
      return "Frase incorrecta.";
    }
  }

  async function handleEnableEncryption(newPassphrase: string): Promise<string | null> {
    let ciphertext: string;
    try {
      ciphertext = await encryptContent(content, newPassphrase);
    } catch {
      return "No se pudo cifrar el documento.";
    }
    const currentPlaintext = content;
    const nextFrontmatter = { ...frontmatter, cifrado: true };
    const ok = await save({ content: ciphertext, frontmatter: nextFrontmatter });
    if (!ok) return "No se pudo guardar el documento cifrado.";
    setPlaintext(currentPlaintext);
    setSavedPlaintext(currentPlaintext);
    setPassphrase(newPassphrase);
    setShowEnableForm(false);
    return null;
  }

  async function handleDisableEncryption() {
    if (plaintext === null) return;
    const nextFrontmatter = { ...frontmatter };
    delete nextFrontmatter.cifrado;
    const ok = await save({ content: plaintext, frontmatter: nextFrontmatter });
    if (ok) {
      setPlaintext(null);
      setSavedPlaintext(null);
      setPassphrase(null);
    }
  }

  function renderEncryptToggle() {
    if (isEncrypted) return null;
    if (showEnableForm) {
      return (
        <PassphraseForm mode="enable" onSubmit={handleEnableEncryption} onCancel={() => setShowEnableForm(false)} />
      );
    }
    return (
      <button
        type="button"
        onClick={() => setShowEnableForm(true)}
        aria-label="Cifrar documento"
        title="Cifrar documento"
        className={iconButtonClass}
      >
        <LockIcon className="h-[18px] w-[18px]" />
      </button>
    );
  }

  function renderMainContent() {
    if (locked) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 overflow-auto p-6">
          <LockIcon className="h-6 w-6 text-zinc-400" />
          <p className="max-w-xs text-center text-sm text-zinc-500 dark:text-zinc-400">
            Documento cifrado. Introduce la frase secreta para verlo y editarlo.
          </p>
          <PassphraseForm mode="unlock" onSubmit={handleUnlock} />
        </div>
      );
    }
    return (
      <>
        {isEncrypted && (
          <div className="flex items-center justify-end gap-2 border-b border-black/[.08] px-2 py-1 dark:border-white/[.145]">
            <button type="button" onClick={handleDisableEncryption} className={textButtonClass}>
              Quitar cifrado
            </button>
          </div>
        )}
        <Preview content={isEncrypted ? plaintext! : content} docPath={document.path} docPaths={docPaths} />
      </>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden sm:grid sm:grid-cols-2">
      <div
        className={`${mobileView === "editor" ? "flex" : "hidden"} flex-1 flex-col overflow-hidden sm:flex sm:border-r sm:border-black/[.08] sm:dark:border-white/[.145]`}
      >
        {desktopEditing ? (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-black/[.08] py-1 pl-14 pr-2 dark:border-white/[.145] sm:pl-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {status === "saving" && "Guardando…"}
                {status === "saved" && "Guardado"}
                {status === "error" && <span className="text-red-600 dark:text-red-400">Error al guardar</span>}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={cancelEditing}
                  aria-label="Cancelar"
                  title="Cancelar"
                  className={iconButtonClass}
                >
                  <XIcon className="h-[18px] w-[18px]" />
                </button>
                <button
                  type="button"
                  onClick={commitSave}
                  aria-label="Guardar"
                  title="Guardar (Ctrl+S)"
                  className={saveButtonClass}
                >
                  <CheckIcon className="h-[18px] w-[18px]" />
                </button>
              </div>
            </div>
            <MetadataPanel frontmatter={frontmatter} onChange={setFrontmatter} />
            <MarkdownEditor
              value={isEncrypted ? (plaintext ?? "") : content}
              onChange={(value) => (isEncrypted ? setPlaintext(value) : setContent(value))}
            />
          </>
        ) : (
          <>
            <div className="flex items-center justify-end gap-2 border-b border-black/[.08] py-1 pr-2 dark:border-white/[.145]">
              {renderEncryptToggle()}
              <button
                type="button"
                onClick={startEditing}
                aria-label="Editar"
                title={locked ? "Desbloquea el documento para editar" : "Editar"}
                disabled={locked}
                className={`${iconButtonClass} ${locked ? iconButtonDisabledClass : ""}`}
              >
                <PencilIcon className="h-[18px] w-[18px]" />
              </button>
            </div>
            {renderMainContent()}
          </>
        )}
      </div>
      <div className={`${mobileView === "right" ? "flex" : "hidden"} flex-1 flex-col overflow-hidden sm:flex`}>
        <div className="flex flex-1 flex-col overflow-hidden sm:hidden">
          <div className="flex items-center justify-between border-b border-black/[.08] pl-14 pr-2 dark:border-white/[.145]">
            <div className="flex">
              <button type="button" onClick={() => setRightTab("preview")} className={tabClass(rightTab === "preview")}>
                Preview
              </button>
              <button
                type="button"
                onClick={() => setRightTab("historial")}
                className={tabClass(rightTab === "historial")}
              >
                Historial
              </button>
              <button
                type="button"
                onClick={() => setRightTab("backlinks")}
                className={tabClass(rightTab === "backlinks")}
              >
                Backlinks
                {document.backlinks.length > 0 && ` (${document.backlinks.length})`}
              </button>
            </div>
            <div className="flex items-center gap-1">
              {rightTab === "preview" && renderEncryptToggle()}
              <button
                type="button"
                onClick={startEditing}
                aria-label="Editar"
                title={locked ? "Desbloquea el documento para editar" : "Editar"}
                disabled={locked}
                className={`${iconButtonClass} ${locked ? iconButtonDisabledClass : ""}`}
              >
                <PencilIcon className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            {rightTab === "preview" && renderMainContent()}
            {rightTab === "historial" && (
              <HistoryPanel key={document.path} documentPath={document.path} />
            )}
            {rightTab === "backlinks" && <Backlinks paths={document.backlinks} />}
          </div>
        </div>
        <div className="hidden flex-1 flex-col overflow-hidden sm:flex">
          {desktopEditing ? (
            <Preview content={isEncrypted ? (plaintext ?? "") : content} docPath={document.path} docPaths={docPaths} />
          ) : (
            <>
              <div className="flex border-b border-black/[.08] dark:border-white/[.145]">
                <button
                  type="button"
                  onClick={() => setDesktopRightTab("historial")}
                  className={tabClass(desktopRightTab === "historial")}
                >
                  Historial
                </button>
                <button
                  type="button"
                  onClick={() => setDesktopRightTab("backlinks")}
                  className={tabClass(desktopRightTab === "backlinks")}
                >
                  Backlinks
                  {document.backlinks.length > 0 && ` (${document.backlinks.length})`}
                </button>
              </div>
              <div className="flex flex-1 flex-col overflow-hidden">
                {desktopRightTab === "historial" ? (
                  <HistoryPanel key={document.path} documentPath={document.path} />
                ) : (
                  <Backlinks paths={document.backlinks} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
