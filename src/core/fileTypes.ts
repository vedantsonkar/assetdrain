// All supported asset types
export const defaultAssetExts = [
  "png",
  "jpg",
  "jpeg",
  "svg",
  "webp",
  "avif",
  "heic",
  "gif",
  "mp4",
  "mov",
  "avi",
  "webm",
  "mp3",
  "wav",
  "ogg",
];

// Specific categories
export const imageExts = ["png", "jpg", "jpeg", "svg", "webp", "avif", "heic"];
export const gifExts = ["gif"];
export const videoExts = ["mp4", "mov", "avi", "webm"];
export const audioExts = ["mp3", "wav", "ogg"];

// Code file types searched for references. CSS/SCSS is essential: assets
// referenced only via `background: url(...)` would otherwise be flagged
// unused and deleted. JSON/MD catch manifests and docs that reference files.
export const defaultCodeExts = [
  "js",
  "ts",
  "jsx",
  "tsx",
  "vue",
  "html",
  "css",
  "scss",
  "sass",
  "less",
  "svelte",
  "astro",
  "mdx",
  "md",
  "json",
];

// Normalizes user input like ".PNG, *.webp ,  jpg,,gif" → ["png","webp","jpg","gif"]
export function normalizeExtList(
  input: string | string[] | undefined
): string[] {
  const raw = Array.isArray(input) ? input : (input ?? "").split(",");
  const cleaned = raw
    .map((ext) =>
      ext
        .trim()
        .toLowerCase()
        .replace(/^\*+\./, "")
        .replace(/^\.+/, "")
    )
    .filter(Boolean);
  return [...new Set(cleaned)];
}

// Converts ["png", "jpg"] to ["**/*.png", "**/*.jpg"]
export const getExtensionsPattern = (extensions?: string[]) => {
  const list =
    extensions && extensions.length > 0 ? extensions : defaultAssetExts;
  return list.map((ext) => `**/*.${ext}`);
};
