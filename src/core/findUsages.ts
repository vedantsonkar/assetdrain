import fs from "fs/promises";
import path from "path";
import fg from "fast-glob";
import pLimit from "p-limit";
import { defaultIgnorePatterns } from "./ignore.js";

/**
 * A path-like token: a run of characters legal in file paths, ending in a
 * short extension. Extracting these from raw content (comments included) in
 * one linear pass per file replaces the old approach of running
 * `content.includes(ref)` for every asset — and replaces comment stripping,
 * which corrupted real references inside URLs like `https://cdn.com/x.png`.
 * A mention anywhere (string, CSS url(), comment, unquoted attribute) counts
 * as a usage — the safe direction for a tool that deletes files.
 */
const PATH_TOKEN = /[A-Za-z0-9_@~./\\-]+\.[A-Za-z0-9]{1,8}/g;

/** Alias prefixes that resolve to the project root (e.g. "@/img/a.png"). */
const ROOT_ALIAS_PREFIXES = ["@/", "~/"];

const IS_WIN = process.platform === "win32";

/** Normalizes separators (and case on Windows) so path lookups match. */
const toKey = (p: string) => {
  const normalized = p.replace(/\\/g, "/");
  return IS_WIN ? normalized.toLowerCase() : normalized;
};

export interface UsageScanResult {
  /** Asset paths found to be referenced somewhere in the code. */
  usedAssets: Set<string>;
  /** Code files that were scanned — lets callers refuse to act when 0. */
  codeFiles: string[];
}

export async function findCodeFiles(
  projectRoot: string,
  codeExtensions: string[],
  ignore: string[] = []
): Promise<string[]> {
  if (codeExtensions.length === 0) return [];
  return fg(codeExtensions.map((ext) => `**/*.${ext}`), {
    cwd: projectRoot,
    absolute: true,
    ignore: [...defaultIgnorePatterns, ...ignore],
    onlyFiles: true,
  });
}

export async function scanForUsages(
  projectRoot: string,
  assetPaths: string[],
  codeExtensions: string[] = [],
  concurrency: number = 20,
  ignore: string[] = []
): Promise<UsageScanResult> {
  const codeFiles = await findCodeFiles(projectRoot, codeExtensions, ignore);
  const usedAssets = new Set<string>();

  if (codeFiles.length === 0 || assetPaths.length === 0) {
    return { usedAssets, codeFiles };
  }

  // Every string a file might be referenced by → the asset(s) it points to.
  // Bare filenames are ambiguous on purpose: any filename match marks the
  // asset used, no matter which directory the reference came from.
  const refMap = new Map<string, Set<string>>();
  const assetByRelPath = new Map<string, string>();
  const assetByAbsPath = new Map<string, string>();

  for (const assetPath of assetPaths) {
    const relativeFromRoot = path
      .relative(projectRoot, assetPath)
      .replace(/\\/g, "/");
    const webPath = relativeFromRoot.startsWith("public/")
      ? "/" + relativeFromRoot.slice("public/".length)
      : "/" + relativeFromRoot;

    for (const ref of [
      path.basename(assetPath),
      relativeFromRoot,
      "./" + relativeFromRoot,
      webPath,
    ]) {
      const key = toKey(ref);
      const owners = refMap.get(key) ?? new Set<string>();
      owners.add(assetPath);
      refMap.set(key, owners);
    }

    assetByRelPath.set(toKey(relativeFromRoot), assetPath);
    assetByAbsPath.set(toKey(path.resolve(assetPath)), assetPath);
  }

  const limit = pLimit(concurrency);

  await Promise.all(
    codeFiles.map((file) =>
      limit(async () => {
        let content: string;
        try {
          content = await fs.readFile(file, "utf8");
        } catch {
          return; // deleted mid-scan or unreadable — nothing to match
        }

        const fileDir = path.dirname(file);

        for (const match of content.matchAll(PATH_TOKEN)) {
          const rawToken = match[0];
          const token = toKey(rawToken);

          const direct = refMap.get(token);
          if (direct) {
            for (const asset of direct) usedAssets.add(asset);
            continue;
          }

          // URL/CDN references ("https://cdn.io/img/hero.png") extract as one
          // long token — fall back to its last path segment, which counts
          // same-named assets as used (conservative, never deletes).
          const lastSegment = token.slice(
            Math.max(token.lastIndexOf("/"), token.lastIndexOf("\\")) + 1
          );
          if (lastSegment !== token) {
            const bySegment = refMap.get(lastSegment);
            if (bySegment) {
              for (const asset of bySegment) usedAssets.add(asset);
              continue;
            }
          }

          // Root aliases: "@/img/a.png" and "~/img/a.png" → "img/a.png"
          for (const prefix of ROOT_ALIAS_PREFIXES) {
            if (token.startsWith(prefix)) {
              const asset = assetByRelPath.get(token.slice(prefix.length));
              if (asset) usedAssets.add(asset);
              break;
            }
          }

          // Relative imports, including "../" — resolve against the
          // referencing file's own directory.
          const resolved = assetByAbsPath.get(
            toKey(path.resolve(fileDir, rawToken))
          );
          if (resolved) usedAssets.add(resolved);
        }
      })
    )
  );

  return { usedAssets, codeFiles };
}
