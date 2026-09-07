import path from "path";
import fg from "fast-glob";
import { getExtensionsPattern } from "./fileTypes.js";
import { defaultIgnorePatterns } from "./ignore.js";

export async function scanForAssets(
  baseDir: string,
  extensions?: string[],
  ignore: string[] = []
): Promise<string[]> {
  const patterns = getExtensionsPattern(extensions);

  const files = await fg(patterns, {
    cwd: baseDir,
    absolute: true,
    ignore: [...defaultIgnorePatterns, ...ignore],
    onlyFiles: true,
  });

  // fast-glob's separator style varies between environments; normalize so
  // returned paths compare equal to path.join()-built ones everywhere.
  return files.map((file) => path.resolve(file));
}
