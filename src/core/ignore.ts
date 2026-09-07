// Directories that never contain source-of-truth assets or readable code.
// Scanning these produces noise (build output can mask usage) and, worse,
// build artifacts can be deleted as "unused assets".
export const defaultIgnorePatterns = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/out/**",
  "**/.next/**",
  "**/.nuxt/**",
  "**/.output/**",
  "**/.svelte-kit/**",
  "**/.turbo/**",
  "**/.cache/**",
  "**/coverage/**",
  "**/storybook-static/**",
  "**/.vercel/**",
  "**/.assetdrain-trash/**",
];
