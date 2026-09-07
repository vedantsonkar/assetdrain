import fs from "fs/promises";
import path from "path";

export type DeleteStrategy = "trash" | "hard";

export interface DeletedEntry {
  original: string;
  /** Where the file was moved to (trash strategy only). */
  trash?: string;
}

export interface DeleteResult {
  strategy: DeleteStrategy;
  deleted: DeletedEntry[];
  failed: { file: string; error: string }[];
  trashDir?: string;
}

const TRASH_DIR_NAME = ".assetdrain-trash";

function trashTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

/**
 * Deletes files. The default "trash" strategy moves them into
 * `.assetdrain-trash/<timestamp>/` (structure preserved) and writes a
 * manifest mapping each file back to its original location, so a bad scan
 * is recoverable. "hard" unlinks permanently.
 */
export async function deleteAssets(
  files: string[],
  projectRoot: string,
  strategy: DeleteStrategy = "trash"
): Promise<DeleteResult> {
  const result: DeleteResult = { strategy, deleted: [], failed: [] };
  if (files.length === 0) return result;

  if (strategy === "hard") {
    for (const file of files) {
      try {
        await fs.unlink(file);
        result.deleted.push({ original: file });
      } catch (err) {
        result.failed.push({ file, error: String(err) });
      }
    }
    return result;
  }

  const trashDir = path.join(projectRoot, TRASH_DIR_NAME, trashTimestamp());
  await fs.mkdir(trashDir, { recursive: true });

  for (const file of files) {
    const destination = path.join(trashDir, path.relative(projectRoot, file));
    try {
      await fs.mkdir(path.dirname(destination), { recursive: true });
      try {
        await fs.rename(file, destination);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "EXDEV") {
          // Renaming across drives fails — copy and remove instead.
          await fs.copyFile(file, destination);
          await fs.unlink(file);
        } else {
          throw err;
        }
      }
      result.deleted.push({ original: file, trash: destination });
    } catch (err) {
      result.failed.push({ file, error: String(err) });
    }
  }

  await fs.writeFile(
    path.join(trashDir, "manifest.json"),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        strategy,
        files: result.deleted.map((entry) => ({
          original: entry.original,
          trash: entry.trash,
        })),
      },
      null,
      2
    )
  );
  result.trashDir = trashDir;

  await removeEmptyDirs(
    result.deleted.map((entry) => path.dirname(entry.original)),
    projectRoot
  );

  return result;
}

/** Removes directories emptied by deletion, never touching projectRoot. */
async function removeEmptyDirs(dirs: string[], stopAt: string): Promise<void> {
  const stopPrefix = stopAt.endsWith(path.sep) ? stopAt : stopAt + path.sep;
  const unique = [...new Set(dirs)].sort((a, b) => b.length - a.length);

  for (let dir of unique) {
    // Walk upwards while inside the project, but never remove projectRoot.
    while (dir.startsWith(stopPrefix) && dir !== stopAt) {
      try {
        await fs.rmdir(dir); // fails when the directory is not empty
      } catch {
        break;
      }
      dir = path.dirname(dir);
    }
  }
}
