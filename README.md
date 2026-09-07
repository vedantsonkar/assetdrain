# 🧹 assetdrain

![npm](https://img.shields.io/npm/v/assetdrain) > ![downloads](https://img.shields.io/npm/dm/assetdrain) > ![license](https://img.shields.io/npm/l/assetdrain)
[![CI](https://github.com/vedantsonkar/assetdrain/actions/workflows/ci.yml/badge.svg)](https://github.com/vedantsonkar/assetdrain/actions/workflows/ci.yml)

> Find and remove unused images, icons, and media files from your codebase — with a sleek, interactive CLI. Feels like Vite. Cleans like a Roomba. **Safe by default: deletions go to a restorable trash folder.**

---

## 🚀 What is this?

A fast CLI tool that scans your repo for assets (like `.svg`, `.png`, `.mp4`, etc.), checks where they're actually used in code, and tells you what you can delete — or moves them to a recoverable trash folder for you 🫡.

---

## 🎯 Features

- ✅ Scans for unused images, gifs, videos, audio, or any custom extensions
- 🎯 Works with **any file structure** (Next.js app router, traditional `src/`, etc.)
- 🛡 **Safe by default** — deleted files are moved to `.assetdrain-trash/<timestamp>/` with a manifest you can restore from
- 🧠 Understands real-world references: `https://` CDN URLs, `./` and `../` relative imports, `@/` and `~/` root aliases, and CSS `url(...)`
- 🏗 Framework-aware — Next.js convention files (`app/icon.png`, `opengraph-image.jpg`, `favicon.ico`, …) are never flagged
- 🚫 Ignores `node_modules`, build output (`.next`, `dist`, `out`, …) and its own trash folder
- ✨ Interactive prompts, or fully scriptable flags for CI with `--json` output
- 📦 Export to **CSV/JSON**, with reclaimable disk-space estimates

---

## 🛠️ Installation

```bash
npm install -g assetdrain
```

or use directly:

```bash
npx assetdrain [asset-folder]
```

---

## 🧪 Usage

```bash
# Interactive — walk through prompts
npx assetdrain public

# Non-interactive (CI / scripts) — everything via flags
npx assetdrain public --types png,svg,webp --mode scan --json
```

### CLI options

| Flag | Description |
|---|---|
| `[folder]` | Asset folder to scan (default: `.`) |
| `-t, --types <exts>` | Asset extensions to scan, comma-separated |
| `-c, --code <exts>` | Code extensions to search for references |
| `-m, --mode <mode>` | `review` (ask), `scan` (dry run), `delete` |
| `-d, --delete` | Shorthand for `--mode delete` |
| `--hard-delete` | Permanently delete instead of trashing |
| `-e, --export <format>` | Write `assetdrain-report.csv` / `.json` |
| `-y, --yes` | Skip confirmation prompts (CI) |
| `--json` | Machine-readable JSON summary on stdout (all logs go to stderr) |
| `--fail-on-unused` | Exit code 1 when unused assets are found (CI gate) |
| `-v, --version` / `-h, --help` | Version / help |

When run without a TTY (CI), assetdrain refuses to guess: provide `--types`, `--code` and `--mode` explicitly. `review` mode requires an interactive terminal.

---

## 🛡 Safety model

- **Trash by default.** `--mode delete` moves files to `.assetdrain-trash/<timestamp>/` (directory structure preserved) and writes a `manifest.json` mapping every file to its original location. Restore by moving files back. Add `.assetdrain-trash/` to your `.gitignore`.
- **`--hard-delete` is permanent.** When combined with an interactive terminal and no `--yes`, assetdrain asks once before deleting.
- **Refuses to act blindly.** If no code files match your `--code` extensions, assetdrain aborts instead of reporting every asset as unused.
- **No comment-stripping.** References inside comments count as *used* — for a deletion tool, a false "used" is a cosmetic issue, but a false "unused" is a deleted production asset.

### ⚠️ Limitations (please read)

- **Dynamic references** like `` `/img/${name}.png` `` cannot be resolved by static analysis — make sure such assets are referenced somewhere statically, or exclude them from the scan.
- An asset whose filename appears *anywhere* in scanned code (even in prose, a lockfile, or an unrelated path) counts as used. assetdrain prefers false "used" over false "unused".
- Convention files are protected only inside `app/` directories of detected Next.js projects.

---

## ⚙️ Modes

```
? What would you like to do?
✔ Scan and Review (Default)
  Scan Only
  Scan and Delete Automatically (moved to .assetdrain-trash/)
```

- **Scan and Review** – Shows unused files and _asks if you want to delete_
- **Scan Only** – Just shows unused files, safe mode
- **Scan and Delete Automatically** – 🚨 Deletes immediately (trash-recoverable unless `--hard-delete`)

---

## 📦 Export

After the scan (or via `--export csv|json`):

- `assetdrain-report.json` — full summary including reclaimable bytes and deletion details
- `assetdrain-report.csv` — one row per asset: `Filename, Used, Deleted, Kept (convention)`

---

## 🤖 CI example

```yaml
- name: Check for unused assets
  run: |
    npx assetdrain public \
      --types png,jpg,svg,webp \
      --code js,ts,jsx,tsx,css,scss \
      --mode scan --json --fail-on-unused
```

---

## 🧑‍💻 Development

```bash
npm install
npm run dev        # run the CLI locally
npm test           # vitest suite (fixture-based)
npm run build      # tsc → dist/
```

Test fixtures live in `tests/fixtures/sample-project` — a miniature project with known used/unused assets and every reference form that has historically broken asset detection.

---

## 🧑‍💻 Author

Built with ❤️ by [Vedant Sonkar](https://github.com/vedantsonkar)

Open to contributions, ideas, and collabs. Feel free to reach out!

---

## 🐞 Issues / Bugs / Feature Requests

If assetdrain misbehaves or you're dreaming up a feature: 👉 [Open an issue](https://github.com/vedantsonkar/assetdrain/issues)

---

## 🧾 License

MIT. You can clone it, fork it, break it, and improve it 😄

---

## ⚠️ Disclaimer

assetdrain is provided "as-is" without any warranties. Use it at your own risk.

By using this tool, you agree that the author (Vedant Sonkar) is **not responsible** for any accidental deletions, data loss, or damage caused by the use (or misuse) of this software.

Always double-check the unused asset list before confirming deletions — especially when using `--hard-delete`.
