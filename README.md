# 🧹 assetdrain

> Find and remove unused images, icons, and media files from your codebase — with a sleek, interactive CLI. Feels like Vite. Cleans like a Roomba.

&#x20;

---

## 🚀 What is this?

A blazing-fast CLI tool that scans your repo for assets (like `.svg`, `.png`, `.mp4`, etc.), checks where they're actually used in code, and tells you what you can delete — or deletes it for you 🫡.

---

## 🎯 Features

- ✅ Scans for unused images, gifs, videos, or any custom extensions
- 🎯 Works with **any file structure** (Next.js app router, traditional `src/`, etc.)
- 🧠 Skips false positives by ignoring asset references inside comments — so if // public/file.svg is just sitting there unused, assetdrain will still flag it ✅
- 🔥 Interactive prompts (select file types, code extensions, actions)
- ✨ Export to **CSV/JSON**
- 🚨 Safe modes like dry-run and delete confirmation

---

## 🛠️ Installation

```bash
npm install -g assetdrain
```

or use directly:

```bash
npx assetdrain
```

---

## 🧪 Usage

```bash
npx assetdrain [asset-folder]
```

Example:

```bash
npx assetdrain public
```

This will scan all supported asset files in `public/`, match against code in your entire repo, and show unused ones.

---

## ⚙️ Modes

```
? What would you like to do?
✔ Scan and Review (Default)
  Scan Only
  Scan and Delete Automatically (At your own risk)
```

- **Scan and Review** – Shows unused files and _asks if you want to delete_
- **Scan Only** – Just shows unused files, safe mode
- **Scan and Delete Automatically** – 🚨 Deletes immediately, no questions asked

---

## 📦 Export

After the scan:

```bash
? Would you like to export the report?
✔ Yes (CSV)
  Yes (JSON)
  No
```

- Includes: filename, usage status, deletion status
- Saved to: `assetdrain-report.json` / `assetdrain-report.csv`

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

assetdrain is provided \"as-is\" without any warranties. Use it at your own risk.

By using this tool, you agree that the author (Vedant Sonkar) is **not responsible** for any accidental deletions, data loss, or damage caused by the use (or misuse) of this software.

Always double-check the unused asset list before confirming deletions — especially in **Scan and Delete Automatically** mode.

---

## 🤝 Contributing

PRs welcome! If you have an idea, bug report, or want to collaborate on features, open an issue or fork the repo.
