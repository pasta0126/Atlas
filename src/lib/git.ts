import { simpleGit, type SimpleGit } from "simple-git";
import { getContentDir } from "./paths";

export interface CommitInfo {
  hash: string;
  date: string;
  message: string;
}

function client(): SimpleGit {
  const name = process.env.GIT_AUTHOR_NAME;
  const email = process.env.GIT_AUTHOR_EMAIL;
  // Autor y committer vía `-c user.*`: simple-git 4 bloquea por defecto
  // pasar GIT_AUTHOR_*/GIT_COMMITTER_* como variables de entorno.
  const config = name && email ? [`user.name=${name}`, `user.email=${email}`] : [];
  return simpleGit({ baseDir: getContentDir(), config });
}

/**
 * Comitea los cambios de una o varias rutas (relativas a CONTENT_DIR). No
 * lanza si git falla o si CONTENT_DIR no es (o no está dentro de) un repo:
 * el commit es un efecto secundario del guardado, nunca debe impedirlo.
 */
export async function commitChange(
  relativePaths: string | string[],
  message: string,
): Promise<void> {
  const paths = Array.isArray(relativePaths) ? relativePaths : [relativePaths];
  try {
    const git = client();
    await git.add(paths);
    const status = await git.status();
    // status.staged no incluye los renombrados (van en status.renamed);
    // status.files sí cubre todos los tipos de cambio en el índice.
    if (status.files.length === 0) return;
    await git.commit(message);
  } catch (error) {
    console.error(`[git] no se ha podido comitear ${paths.join(", ")}:`, error);
  }
}

/** Historial de commits que han tocado una ruta, más reciente primero. */
export async function history(relativePath: string): Promise<CommitInfo[]> {
  try {
    const log = await client().log({ file: relativePath });
    return log.all.map((entry) => ({
      hash: entry.hash,
      date: entry.date,
      message: entry.message,
    }));
  } catch {
    return [];
  }
}

/** Diff de una ruta entre dos commits (o entre un commit y HEAD si se omite `to`). */
export async function diff(
  relativePath: string,
  from: string,
  to = "HEAD",
): Promise<string> {
  return client().diff([`${from}..${to}`, "--", relativePath]);
}
