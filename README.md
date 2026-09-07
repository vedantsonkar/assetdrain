# 🧹 assetdrain

[![npm version](https://img.shields.io/npm/v/assetdrain)](https://www.npmjs.com/package/assetdrain)
[![npm downloads](https://img.shields.io/npm/dm/assetdrain)](https://www.npmjs.com/package/assetdrain)
[![CI](https://github.com/vedantsonkar/assetdrain/actions/workflows/ci.yml/badge.svg)](https://github.com/vedantsonkar/assetdrain/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/assetdrain)](./LICENSE)

> Find and safely clean unused images, icons, videos, fonts, and other assets from your codebase — with a fast, interactive CLI.

**Feels like Vite. Cleans like a Roomba. 🧹**

Safe by default: deleted assets are moved to a restorable trash directory instead of being permanently removed.

---

## 🚀 What is assetdrain?

`assetdrain` is a CLI that scans your project for assets such as `.svg`, `.png`, `.jpg`, `.webp`, `.mp4`, and more, then checks whether they're actually referenced anywhere in your source code.

You can:

- inspect unused assets interactively
- scan without modifying anything
- automatically clean unused files
- export results to JSON or CSV
- use it as a CI gate
- permanently delete assets when you explicitly opt in

---

## 🎯 Features

- ✅ Detect unused images, GIFs, videos, audio, fonts, or custom extensions
- 🎯 Works with virtually **any project structure**
- 🛡 **Trash-first deletion** with built-in recovery metadata
- 🧠 Understands real-world references:
  - relative imports such as `./` and `../`
  - root aliases such as `@/` and `~/`
  - CSS `url(...)`
  - external/CDN URLs
- 🏗 Framework-aware protection for Next.js convention files such as:
  - `app/icon.png`
  - `favicon.ico`
  - `opengraph-image.jpg`
- 🚫 Automatically ignores:
  - `node_modules`
  - `.next`
  - `dist`
  - `out`
  - build output
  - `.assetdrain-trash`
- ✨ Interactive CLI for local development
- 🤖 Fully scriptable CLI for CI/CD
- 📊 Machine-readable `--json` output
- 📦 CSV and JSON report exports
- 💾 Reports estimated reclaimable disk space
- 🚨 Optional `--fail-on-unused` CI gate
- 🔥 Explicit `--hard-delete` mode when permanent deletion is actually wanted

---

## 🛠 Installation

### Run directly

The easiest way to use assetdrain:

```bash
npx assetdrain@latest
```

Or scan a specific asset directory:

```bash
npx assetdrain@latest public
```

### Install globally

```bash
npm install -g assetdrain
```

Then:

```bash
assetdrain public
```

---

## 🧪 Usage

### Interactive

```bash
npx assetdrain public
```

assetdrain will walk you through the scan configuration and ask what you want to do with detected unused assets.

### Scan only

```bash
npx assetdrain public \
  --types png,jpg,svg,webp \
  --code js,ts,jsx,tsx,css,scss \
  --mode scan
```

No files are modified.

### Machine-readable output

```bash
npx assetdrain public \
  --types png,svg,webp \
  --code js,ts,jsx,tsx,css \
  --mode scan \
  --json
```

### Automatically clean unused assets

```bash
npx assetdrain public \
  --types png,jpg,svg,webp \
  --code js,ts,jsx,tsx,css,scss \
  --mode delete \
  --yes
```

Files are moved to `.assetdrain-trash/` by default and can be recovered.

---

## ⚙️ CLI Options

| Flag | Description |
|---|---|
| `[folder]` | Asset folder to scan. Defaults to `.` |
| `-t, --types <exts>` | Asset extensions to scan, comma-separated |
| `-c, --code <exts>` | Code extensions to search for references |
| `-m, --mode <mode>` | `review`, `scan`, or `delete` |
| `-d, --delete` | Shorthand for `--mode delete` |
| `--hard-delete` | Permanently delete instead of moving files to trash |
| `-e, --export <format>` | Export `csv` or `json` report |
| `-y, --yes` | Skip confirmation prompts |
| `--json` | Print machine-readable JSON summary to stdout |
| `--fail-on-unused` | Exit with code `1` when unused assets are found |
| `-v, --version` | Print installed version |
| `-h, --help` | Show CLI help |

When running without a TTY — for example in CI — assetdrain refuses to guess potentially destructive settings.

Provide `--types`, `--code`, and `--mode` explicitly.

`review` mode requires an interactive terminal.

---

## ⚙️ Modes

### Review

```text
Scan and Review
```

Shows detected unused files and asks what you want to remove.

This is the default interactive experience.

### Scan

```text
Scan Only
```

Detects unused assets without modifying your project.

Ideal for audits and CI.

### Delete

```text
Scan and Delete Automatically
```

Removes detected unused assets automatically.

By default, files are moved into:

```text
.assetdrain-trash/<timestamp>/
```

They are **not permanently deleted** unless you explicitly use `--hard-delete`.

---

## 🛡 Safety Model

Deleting project assets is risky, so assetdrain intentionally prefers false positives for **used** assets over false positives for **unused** assets.

### Trash by default

`--mode delete` moves files into:

```text
.assetdrain-trash/<timestamp>/
```

The original directory structure is preserved.

A `manifest.json` is created containing the original locations of moved files so they can be restored.

You should add:

```gitignore
.assetdrain-trash/
```

to your project's `.gitignore`.

### Permanent deletion requires explicit opt-in

```bash
--hard-delete
```

permanently removes files.

When running interactively without `--yes`, assetdrain asks for confirmation first.

### Refuses blind scans

If no source files match the extensions supplied through `--code`, assetdrain aborts instead of incorrectly reporting every asset as unused.

### Conservative reference detection

References inside comments still count as references.

For a deletion utility, incorrectly keeping an asset is much safer than incorrectly deleting a production asset.

---

## ⚠️ Limitations

Static analysis cannot perfectly understand every possible runtime asset reference.

### Dynamic references

Patterns such as:

```js
`/img/${name}.png`
```

cannot always be resolved statically.

If your project generates asset paths dynamically, ensure those assets are referenced statically somewhere or exclude them from automated deletion.

### Filename matches are intentionally conservative

If an asset filename appears anywhere in scanned source code — even in prose, comments, lockfiles, or unrelated paths — it may count as used.

Again, assetdrain prefers:

```text
false "used"
```

over:

```text
false "unused"
```

because the latter could cause data loss.

### Framework conventions

Convention-file protection currently applies to supported Next.js `app/` directory conventions.

---

## 📦 Export Reports

Export scan results as JSON:

```bash
npx assetdrain public \
  --types png,jpg,svg \
  --code js,ts,jsx,tsx \
  --mode scan \
  --export json
```

Or CSV:

```bash
npx assetdrain public \
  --types png,jpg,svg \
  --code js,ts,jsx,tsx \
  --mode scan \
  --export csv
```

Generated files:

```text
assetdrain-report.json
assetdrain-report.csv
```

Reports can include:

- asset filename
- whether the asset is used
- whether it was deleted
- whether it was protected by a framework convention
- reclaimable disk space
- deletion information

---

## 🤖 CI/CD

assetdrain can act as a CI gate and fail the build whenever unused assets are detected.

### GitHub Actions

```yaml
- name: Check for unused assets
  run: |
    npx assetdrain@latest public \
      --types png,jpg,svg,webp \
      --code js,ts,jsx,tsx,css,scss \
      --mode scan \
      --json \
      --fail-on-unused
```

With `--fail-on-unused`, assetdrain exits with code `1` when unused assets exist.

This makes it possible to prevent new dead assets from accumulating in a repository.

---

## 🧑‍💻 Development

Clone the repository:

```bash
git clone https://github.com/vedantsonkar/assetdrain.git
cd assetdrain
```

Install dependencies:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Build:

```bash
npm run build
```

Test fixtures live in:

```text
tests/fixtures/sample-project
```

The fixture project contains known used and unused assets along with reference patterns that have historically caused problems for asset detection.

---

## 🤝 Contributing

Contributions, bug reports, ideas, and improvements are welcome.

If you find an edge case assetdrain doesn't handle correctly, please open an issue with a minimal reproduction where possible.

[Open an issue](https://github.com/vedantsonkar/assetdrain/issues)

---

## 🧑‍💻 Author

Built with ❤️ by [Vedant Sonkar](https://github.com/vedantsonkar)

---

## 🧾 License

MIT.

See [LICENSE](./LICENSE) for details.

---

## ⚠️ Disclaimer

assetdrain is provided **"as-is"**, without warranties of any kind.

The author is not responsible for accidental deletions, data loss, or damage caused by use or misuse of the software.

Always inspect the detected unused assets before deleting them, especially when using:

```bash
--hard-delete
```