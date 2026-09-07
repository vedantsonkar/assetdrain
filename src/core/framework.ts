import fs from "fs/promises";
import path from "path";

export type Framework = "nextjs" | null;

const NEXT_CONFIG_FILES = [
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "next.config.mts",
  "next.config.cjs",
];

// Files the Next.js App Router loads purely by filename (metadata images,
// favicons, SEO files) — they are never referenced in code, so a plain
// usage scan would flag and delete them.
const CONVENTION_BASENAME =
  /^(favicon|icon|apple-icon|opengraph-image|twitter-image|robots|sitemap|manifest)(\.[A-Za-z0-9]+)*\.(ico|png|jpg|jpeg|svg|gif|webp|avif|xml|json|webmanifest|txt)$/i;

export async function detectFramework(
  projectRoot: string
): Promise<Framework> {
  for (const configFile of NEXT_CONFIG_FILES) {
    try {
      await fs.access(path.join(projectRoot, configFile));
      return "nextjs";
    } catch {
      // keep looking
    }
  }
  return null;
}

/**
 * Splits assets into deletion candidates and files kept because a framework
 * loads them by convention. Only applies inside `app/` directories, where
 * these filenames have framework meaning.
 */
export function splitFrameworkConventions(
  assetPaths: string[],
  projectRoot: string,
  framework: Framework
): { candidates: string[]; kept: string[] } {
  if (framework !== "nextjs") {
    return { candidates: assetPaths, kept: [] };
  }

  const candidates: string[] = [];
  const kept: string[] = [];

  for (const asset of assetPaths) {
    const relative = path.relative(projectRoot, asset).replace(/\\/g, "/");
    const inAppDir = /(^|\/)app\//.test(relative);
    if (inAppDir && CONVENTION_BASENAME.test(path.basename(asset))) {
      kept.push(asset);
    } else {
      candidates.push(asset);
    }
  }

  return { candidates, kept };
}
