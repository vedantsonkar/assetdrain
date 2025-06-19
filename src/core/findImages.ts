import fg from "fast-glob";
import { getExtensionsPattern } from "./fileTypes.js";

export async function scanForImages(
  baseDir: string,
  extensions?: string[],
  ignore: string[] = []
): Promise<string[]> {
  const patterns = getExtensionsPattern(extensions);

  const files = await fg(patterns, {
    cwd: baseDir,
    absolute: true,
    ignore,
    onlyFiles: true,
  });

  return files;
}
