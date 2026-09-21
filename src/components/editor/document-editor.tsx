"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MarkdownEditor } from "./markdown-editor";
import { MetadataPanel } from "./metadata-panel";
import { PassphraseForm } from "./passphrase-form";
import { Preview } from "@/components/preview/preview";
import { HistoryPanel } from "@/components/history/history-panel";
import { Backlinks } from "@/components/backlinks/backlinks";
import { CheckIcon, LockIcon, PencilIcon, UploadIcon, XIcon } from "@/components/icons";
import { decryptContent, encryptContent } from "@/lib/crypto";
import type { AtlasDocument, Frontmatter } from "@/types/atlas";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type RightTab = "preview" | "historial" | "backlinks";
type DesktopRightTab = "historial" | "backlinks" | null;
// En móvil solo se muestra una zona a la vez (editor o la pestaña
// seleccionada). En escritorio siempre hay 2 columnas: sin editar,
// izquierda = Preview y derecha = Historial/Backlinks; editando,
// izquierda = editor y derecha = Preview. No hay cabecera global: cada
// panel lleva sus propios controles. Historial/Backlinks están colapsados
// por defecto en escritorio (desktopRightTab = null): solo se despliegan
// si el usuario pulsa el botón correspondiente.
type MobileView = "editor" | "right";

function apiPathFor(documentPath: string): string {
  return `/api/docs/${documentPath.split("/").map(encodeURIComponent).join("/")}`;
}

function folderOf(documentPath: string): string {
  const idx = documentPath.lastIndexOf("/");
  return idx === -1 ? "." : documentPath.slice(0, idx);
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
  const [desktopRightTab, setDesktopRightTab] = useState<DesktopRightTab>(null);
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
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("folder", folderOf(document.path));
      body.append("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json().catch(() => null);
        window.alert(data?.error ?? "No se ha podido subir el fichero");
      }
    } finally {
      setUploading(false);
    }
  }

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

  function renderUploadButton() {
    return (
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        aria-label="Subir fichero"
        title="Subir fichero a esta carpeta"
        className={`${iconButtonClass} ${uploading ? iconButtonDisabledClass : ""}`}
      >
        <UploadIcon className="h-[18px] w-[18px]" />
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
          <div className="flex items-center justify-end gap-2 border-b border-border px-2 py-1">
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
    <div className="relative flex flex-1 flex-col overflow-hidden sm:flex-row">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelected} />
      <div
        className={`${mobileView === "editor" ? "flex" : "hidden"} flex-1 flex-col overflow-hidden sm:flex ${
          desktopEditing ? "sm:border-r sm:border-border" : ""
        }`}
      >
        {desktopEditing ? (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-border py-1 pl-14 pr-2 sm:pl-2">
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
            <div className="flex items-center justify-end gap-2 border-b border-border py-1 pr-2">
              {renderUploadButton()}
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
      {/* Móvil: pestañas Preview/Historial/Backlinks, una zona a la vez. */}
      <div className={`${mobileView === "right" ? "flex" : "hidden"} flex-1 flex-col overflow-hidden sm:hidden`}>
        <div className="flex items-center justify-between border-b border-border pl-14 pr-2">
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
            {rightTab === "preview" && renderUploadButton()}
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
          {rightTab === "historial" && <HistoryPanel key={document.path} documentPath={document.path} />}
          {rightTab === "backlinks" && <Backlinks paths={document.backlinks} />}
        </div>
      </div>

      {/* Escritorio, editando: preview en vivo ocupa la mitad derecha. */}
      {desktopEditing && (
        <div className="hidden flex-1 flex-col overflow-hidden sm:flex">
          <Preview content={isEncrypted ? (plaintext ?? "") : content} docPath={document.path} docPaths={docPaths} />
        </div>
      )}

      {/* Escritorio, viendo: franja de pestañas colapsadas Historial/Backlinks
          pegada al borde derecho. Al pulsar una, su panel se despliega por
          encima de la vista previa (no reparte el ancho con ella). */}
      {!desktopEditing && (
        <>
          <div className="hidden shrink-0 flex-col border-l border-border sm:flex">
            <button
              type="button"
              onClick={() => setDesktopRightTab(desktopRightTab === "historial" ? null : "historial")}
              title="Ver historial"
              className={`flex items-center justify-center whitespace-nowrap px-1.5 py-3 text-xs [writing-mode:vertical-rl] ${
                desktopRightTab === "historial"
                  ? "bg-zinc-200 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:bg-black/[.04] hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-200"
              }`}
            >
              Historial
            </button>
            <button
              type="button"
              onClick={() => setDesktopRightTab(desktopRightTab === "backlinks" ? null : "backlinks")}
              title="Ver backlinks"
              className={`flex items-center justify-center whitespace-nowrap px-1.5 py-3 text-xs [writing-mode:vertical-rl] ${
                desktopRightTab === "backlinks"
                  ? "bg-zinc-200 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  : "text-zinc-500 hover:bg-black/[.04] hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-white/[.06] dark:hover:text-zinc-200"
              }`}
            >
              Backlinks{document.backlinks.length > 0 && ` (${document.backlinks.length})`}
            </button>
          </div>
          {desktopRightTab && (
            <div className="absolute inset-y-0 right-9 z-10 hidden w-full max-w-md flex-col border-l border-border bg-background shadow-xl sm:flex">
              <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
                  {desktopRightTab === "historial" ? "Historial" : "Backlinks"}
                </span>
                <button
                  type="button"
                  onClick={() => setDesktopRightTab(null)}
                  aria-label="Cerrar"
                  title="Cerrar"
                  className={iconButtonClass}
                >
                  <XIcon className="h-[18px] w-[18px]" />
                </button>
              </div>
              <div className="flex flex-1 flex-col overflow-hidden">
                {desktopRightTab === "historial" ? (
                  <HistoryPanel key={document.path} documentPath={document.path} />
                ) : (
                  <Backlinks paths={document.backlinks} />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
