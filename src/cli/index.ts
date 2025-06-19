// Built-ins
import path from "path";
import fs from "fs";

// Third-party
import chalk from "chalk";
import ora from "ora";

// Local modules
import { scanForImages } from "../core/findImages.js";
import { scanForUsages } from "../core/findUsages.js";
import { generateReport } from "../core/report.js";
import {
  defaultAssetExts,
  imageExts,
  videoExts,
  gifExts,
  defaultCodeExts,
} from "../core/fileTypes.js";
import {
  askAssetTypes,
  askCodeFileTypes,
  askAction,
  askExportFormat,
  askIfShouldDelete,
} from "./prompts.js";

const args = process.argv.slice(2);

// Version flags
if (args.includes("--version") || args.includes("-v")) {
  let version = "unknown";
  try {
    const pkgPath = path.resolve(__dirname, "../..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    version = pkg.version;
  } catch {
    /* ignore */
  }
  console.log(`🧹 assetdrain v${version}`);
  process.exit(0);
}

// Help flag
if (args.includes("--help") || args.includes("-h")) {
  console.log(`
Usage: assetdrain [asset-directory]

Options:
  --version, -v   Show version
  --help, -h      Show help
`);
  process.exit(0);
}
async function main() {
  console.log(chalk.cyanBright.bold("\n🧹 Welcome to assetdrain!\n"));

  // Ask for asset types
  const assetChoice = await askAssetTypes();

  let assetExts: string[] = [];

  if (assetChoice === "default") assetExts = defaultAssetExts;
  else if (assetChoice === "images") assetExts = imageExts;
  else if (assetChoice === "videos") assetExts = videoExts;
  else if (assetChoice === "gifs") assetExts = gifExts;
  else if (Array.isArray(assetChoice)) assetExts = assetChoice;

  // Ask for code file types
  const codeChoice = await askCodeFileTypes();
  const codeExts = codeChoice === "default" ? defaultCodeExts : codeChoice;

  // Ask what action to perform
  const action = await askAction();

  // Directories
  const assetScanDir = path.resolve(process.cwd(), process.argv[2] || ".");
  const projectRoot = process.cwd(); // code scan will always be done from root

  console.log(chalk.gray(`\n📁 Scanning assets in: ${assetScanDir}`));
  console.log(chalk.gray(`🔎 Analyzing code usage in: ${projectRoot}\n`));

  // Spinner: scanning assets
  const assetSpinner = ora("🔍 Scanning for asset files...").start();
  let allAssets: string[] = [];
  try {
    allAssets = await scanForImages(assetScanDir, assetExts, [
      "**/node_modules/**",
    ]);
    assetSpinner.succeed(`📦 Found ${allAssets.length} asset files.`);
  } catch (err) {
    assetSpinner.fail("❌ Failed to scan asset files.");
    throw err;
  }

  // Spinner: scanning usages
  const usageSpinner = ora("📚 Analyzing code usage...").start();
  let usedAssets: Set<string>;
  try {
    usedAssets = await scanForUsages(
      projectRoot,
      allAssets,
      codeExts,
      20 // concurrency
    );
    usageSpinner.succeed("✅ Usage analysis complete.");
  } catch (err) {
    usageSpinner.fail("❌ Failed to analyze usage.");
    throw err;
  }

  // Spinner: generate report (terminal view)
  const reportSpinner = ora("🧾 Generating report...").start();
  try {
    await generateReport(allAssets, usedAssets, {
      mode: action,
      export: undefined,
    });
    reportSpinner.succeed("📊 Report complete.");
  } catch (err) {
    reportSpinner.fail("❌ Failed to generate report.");
    throw err;
  }

  let deleted = false;

  if (action === "review") {
    const shouldDelete = await askIfShouldDelete();
    if (shouldDelete) {
      const deleteSpinner = ora("🧹 Deleting unused assets...").start();
      try {
        await generateReport(allAssets, usedAssets, {
          mode: "delete",
          export: undefined,
        });
        deleteSpinner.succeed("✅ Unused assets deleted.");
        deleted = true;
      } catch (err) {
        deleteSpinner.fail("❌ Failed to delete unused assets.");
        throw err;
      }
    }
  } else if (action === "delete") {
    const deleteSpinner = ora(
      chalk.red("🧹 Deleting unused assets...")
    ).start();
    try {
      await generateReport(allAssets, usedAssets, {
        mode: "delete",
        export: undefined,
      });
      deleteSpinner.succeed(
        chalk.redBright("🚨 Unused assets deleted automatically.")
      );
      deleted = true;
    } catch (err) {
      deleteSpinner.fail("❌ Failed to delete unused assets.");
      throw err;
    }
  } else {
    deleted = false; // Scan Only
  }

  const exportFormat = await askExportFormat();

  if (exportFormat !== "no") {
    const exportSpinner = ora(
      `💾 Saving report as ${exportFormat.toUpperCase()}...`
    ).start();
    try {
      await generateReport(allAssets, usedAssets, {
        mode: "dry", // safe for export
        export: exportFormat,
        deleted, // ✅ now correct and accurate
      });
      exportSpinner.succeed(
        `✅ Report saved to assetdrain-report.${exportFormat}`
      );
    } catch (err) {
      exportSpinner.fail("❌ Failed to save report.");
      throw err;
    }
  }
}

main().catch((err) => {
  console.error(chalk.red("❌ Error running assetdrain:"), err);
  process.exit(1);
});
