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

// Default code file types to search for references
export const defaultCodeExts = ["js", "ts", "jsx", "tsx", "vue", "html"];

// Converts ["png", "jpg"] to ["**/*.png", "**/*.jpg"]
export const getExtensionsPattern = (extensions?: string[]) => {
  const list =
    extensions && extensions.length > 0 ? extensions : defaultAssetExts;
  return list.map((ext) => `**/*.${ext}`);
};
