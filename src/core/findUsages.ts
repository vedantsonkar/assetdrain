import fs from "fs/promises";
import path from "path";
import fg from "fast-glob";
import pLimit from "p-limit";

function stripComments(input: string): string {
  return (
    input
      // Remove block comments (/* ... */)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      // Remove line comments (//...)
      .replace(/\/\/.*$/gm, "")
  );
}

export async function scanForUsages(
  projectRoot: string,
  assetPaths: string[],
  codeExtensions: string[] = [],
  concurrency: number = 20,
  ignore: string[] = []
): Promise<Set<string>> {
  const codePatterns = codeExtensions.map((ext) => `**/*.${ext}`);
  const codeFiles = await fg(codePatterns, {
    cwd: projectRoot,
    absolute: true,
    ignore: ["**/node_modules/**", ...ignore],
    onlyFiles: true,
  });

  const usedAssets = new Set<string>();
  const limit = pLimit(concurrency);

  // Create reverse lookup: reference string → actual asset path
  const referenceMap = new Map<string, Set<string>>();

  for (const assetPath of assetPaths) {
    const relativeFromRoot = path
      .relative(projectRoot, assetPath)
      .replace(/\\/g, "/");

    const filename = path.basename(assetPath).replace(/\\/g, "/");

    // Handle public path mapping → /image.png
    let webPath = "/" + relativeFromRoot;
    if (relativeFromRoot.startsWith("public/")) {
      webPath = "/" + relativeFromRoot.replace(/^public\//, "");
    }

    const references = [
      filename,
      relativeFromRoot,
      "./" + relativeFromRoot,
      webPath,
    ];

    for (const ref of references) {
      if (!referenceMap.has(ref)) {
        referenceMap.set(ref, new Set());
      }
      referenceMap.get(ref)!.add(assetPath);
    }
  }

  await Promise.all(
    codeFiles.map((file) =>
      limit(async () => {
        try {
          const raw = await fs.readFile(file, "utf8");
          const content = stripComments(raw);
          for (const [ref, assetSet] of referenceMap.entries()) {
            if (content.includes(ref)) {
              assetSet.forEach((p) => usedAssets.add(p));
            }
          }
        } catch (err) {
          console.error(`⚠ Failed to read file: ${file}`, err);
        }
      })
    )
  );

  return usedAssets;
}
