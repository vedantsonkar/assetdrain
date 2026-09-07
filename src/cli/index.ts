#!/usr/bin/env node

import { createRequire } from "module";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import ora from "ora";
import { Command } from "commander";

const require = createRequire(import.meta.url);
const pkg = require("../../package.json");

// Local modules
import { scanForAssets } from "../core/findAssets.js";
import { scanForUsages } from "../core/findUsages.js";
import { deleteAssets, type DeleteResult } from "../core/delete.js";
import {
  buildReport,
  printReport,
  exportReport,
} from "../core/report.js";
import { detectFramework, splitFrameworkConventions } from "../core/framework.js";
import {
  defaultAssetExts,
  imageExts,
  videoExts,
  gifExts,
  audioExts,
  defaultCodeExts,
  normalizeExtList,
} from "../core/fileTypes.js";
import {
  askAssetTypes,
  askCodeFileTypes,
  askAction,
  askExportFormat,
  askIfShouldDelete,
} from "./prompts.js";

type Mode = "review" | "dry" | "delete";

interface CliOptions {
  types?: string;
  code?: string;
  mode?: string;
  delete?: boolean;
  hardDelete?: boolean;
  export?: string;
  yes?: boolean;
  json?: boolean;
  failOnUnused?: boolean;
}

const program = new Command();

program
  .name("assetdrain")
  .description("🧹 Find and remove unused assets from your codebase")
  .version(pkg.version, "-v, --version", "Show version number")
  .helpOption("-h, --help", "Show help")
  .arguments("[folder]")
  .option("-t, --types <extensions>", "Asset extensions to scan, comma-separated")
  .option(
    "-c, --code <extensions>",
    "Code extensions to search for references, comma-separated"
  )
  .option("-m, --mode <mode>", "Action: review | scan | delete")
  .option("-d, --delete", "Delete unused assets (same as --mode delete)")
  .option(
    "--hard-delete",
    "Permanently delete files instead of moving them to .assetdrain-trash/"
  )
  .option("-e, --export <format>", "Export the report: csv | json")
  .option("-y, --yes", "Skip confirmation prompts (for CI)")
  .option("--json", "Print a machine-readable JSON summary to stdout")
  .option("--fail-on-unused", "Exit with code 1 when unused assets are found")
  .parse(process.argv);

const opts = program.opts<CliOptions>();

function fail(message: string): never {
  console.error(chalk.red(`\n✖ ${message}`));
  console.error(
    chalk.gray("   Run `assetdrain --help` to see all options.\n")
  );
  process.exit(1);
}

/** Prompts interactively, or fails with guidance when stdin isn't a TTY. */
async function resolveChoice<T>(
  what: string,
  provided: T | undefined,
  ask: () => Promise<T>
): Promise<T> {
  if (provided !== undefined) return provided;
  if (interactive) return ask();
  fail(
    `${what} must be provided via flags when running non-interactively (e.g. in CI).`
  );
}

const interactive = Boolean(process.stdin.isTTY) && !opts.json;

async function main() {
  if (!opts.json) {
    console.log(chalk.cyanBright.bold("\n🧹 Welcome to assetdrain!\n"));
  }

  // ---- Resolve configuration (flags win, prompts fill the gaps) ----

  const assetExts = await (async () => {
    if (opts.types) {
      const exts = normalizeExtList(opts.types);
      if (exts.length === 0) fail("No valid asset extensions in --types.");
      return exts;
    }
    const choice = await resolveChoice("Asset types", undefined, askAssetTypes);
    if (choice === "default") return defaultAssetExts;
    if (choice === "images") return imageExts;
    if (choice === "videos") return videoExts;
    if (choice === "gifs") return gifExts;
    if (choice === "audio") return audioExts;
    return choice; // already-normalized custom list
  })();

  const codeExts = await (async () => {
    if (opts.code) {
      const exts = normalizeExtList(opts.code);
      if (exts.length === 0) fail("No valid code extensions in --code.");
      return exts;
    }
    const choice = await resolveChoice(
      "Code file types",
      undefined,
      askCodeFileTypes
    );
    return choice === "default" ? defaultCodeExts : choice;
  })();

  const mode = await (async (): Promise<Mode> => {
    const flagMode = opts.delete ? "delete" : opts.mode?.toLowerCase();
    if (flagMode !== undefined) {
      if (flagMode !== "review" && flagMode !== "scan" && flagMode !== "delete") {
        fail(`Invalid --mode "${flagMode}". Use review, scan, or delete.`);
      }
      if (flagMode === "review" && !interactive) {
        fail(
          '--mode review needs an interactive terminal. Use --mode scan or --mode delete in CI.'
        );
      }
      return flagMode === "scan" ? "dry" : flagMode;
    }
    const asked = await resolveChoice("Mode", undefined, askAction);
    return asked;
  })();

  const exportFormat = await (async (): Promise<"csv" | "json" | undefined> => {
    if (opts.export) {
      const format = opts.export.toLowerCase();
      if (format !== "csv" && format !== "json") {
        fail(`Invalid --export "${opts.export}". Use csv or json.`);
      }
      return format;
    }
    if (!interactive) return undefined;
    const asked = await askExportFormat();
    return asked === "no" ? undefined : asked;
  })();

  // ---- Resolve and validate the folder ----

  const folderArg = program.args[0] ?? ".";
  const assetScanDir = path.resolve(process.cwd(), folderArg);
  const projectRoot = process.cwd();

  try {
    const stat = await fs.stat(assetScanDir);
    if (!stat.isDirectory()) fail(`"${folderArg}" is not a directory.`);
  } catch {
    fail(`The folder "${folderArg}" does not exist.`);
  }

  if (!opts.json) {
    console.log(chalk.gray(`\n📁 Scanning assets in: ${assetScanDir}`));
    console.log(chalk.gray(`🔎 Analyzing code usage in: ${projectRoot}\n`));
  }

  // ---- Scan assets ----

  const assetSpinner = ora("🔍 Scanning for asset files...").start();
  let allAssets: string[] = [];
  try {
    allAssets = await scanForAssets(assetScanDir, assetExts);
    assetSpinner.succeed(`📦 Found ${allAssets.length} asset files.`);
  } catch (err) {
    assetSpinner.fail("❌ Failed to scan asset files.");
    throw err;
  }

  // ---- Analyze usage ----

  const usageSpinner = ora("📚 Analyzing code usage...").start();
  let usedAssets: Set<string>;
  let codeFileCount: number;
  try {
    const result = await scanForUsages(projectRoot, allAssets, codeExts);
    usedAssets = result.usedAssets;
    codeFileCount = result.codeFiles.length;
    usageSpinner.succeed(
      `✅ Usage analysis complete (${codeFileCount} code files).`
    );
  } catch (err) {
    usageSpinner.fail("❌ Failed to analyze usage.");
    throw err;
  }

  // Guard: with no code files scanned, every asset would look unused —
  // refuse to report or delete anything.
  if (codeFileCount === 0) {
    usageSpinner.fail(
      `❌ No code files matched (${codeExts.join(", ")}). ` +
        "Refusing to mark assets as unused — check --code."
    );
    process.exit(1);
  }

  // ---- Build report (framework conventions never count as unused) ----

  const framework = await detectFramework(projectRoot);
  const { candidates, kept } = splitFrameworkConventions(
    allAssets,
    projectRoot,
    framework
  );

  const report = await buildReport(candidates, usedAssets, kept);

  // ---- Act on the mode ----

  let deleted: DeleteResult | undefined;

  if (mode === "delete") {
    if (report.unusedAssets.length === 0) {
      ora("🧹 Nothing to delete.").info();
    } else {
      const strategy = opts.hardDelete ? "hard" : "trash";
      if (strategy === "hard" && interactive && !opts.yes) {
        const confirmed = await askIfShouldDelete();
        if (!confirmed) {
          ora("Deletion cancelled.").info();
          process.exit(0);
        }
      }
      const deleteSpinner = ora("🧹 Deleting unused assets...").start();
      deleted = await deleteAssets(
        report.unusedAssets,
        projectRoot,
        strategy
      );
      if (deleted.failed.length > 0) {
        deleteSpinner.warn(
          `🧹 Deleted ${deleted.deleted.length}, failed ${deleted.failed.length}.`
        );
      } else {
        deleteSpinner.succeed(
          strategy === "hard"
            ? "🚨 Unused assets permanently deleted."
            : `🗑 Unused assets moved to .assetdrain-trash/ (recoverable).`
        );
      }
    }
  } else if (mode === "review") {
    printReport(report);
    if (report.unusedAssets.length > 0) {
      const shouldDelete = await askIfShouldDelete();
      if (shouldDelete) {
        const strategy = opts.hardDelete ? "hard" : "trash";
        const deleteSpinner = ora("🧹 Deleting unused assets...").start();
        deleted = await deleteAssets(
          report.unusedAssets,
          projectRoot,
          strategy
        );
        deleted.failed.length > 0
          ? deleteSpinner.warn(
              `🧹 Deleted ${deleted.deleted.length}, failed ${deleted.failed.length}.`
            )
          : deleteSpinner.succeed("✅ Unused assets deleted.");
      }
    }
  } else if (!opts.json) {
    printReport(report);
    console.log(chalk.blueBright("\n🧪 Dry run: no files were deleted.\n"));
  }

  // In non-json modes the report was printed above (with deletion details);
  // in review mode deletion happened after printing, so pass it to the export.

  // ---- Export ----

  let reportFile: string | undefined;
  if (exportFormat) {
    const exportSpinner = ora(
      `💾 Saving report as ${exportFormat.toUpperCase()}...`
    ).start();
    try {
      reportFile = await exportReport(report, exportFormat, deleted);
      exportSpinner.succeed(`✅ Report saved to ${reportFile}`);
    } catch (err) {
      exportSpinner.fail("❌ Failed to save report.");
      throw err;
    }
  }

  // ---- JSON summary (stdout only; all human output went to stderr) ----

  if (opts.json) {
    const rel = (file: string) => path.relative(projectRoot, file);
    console.log(
      JSON.stringify(
        {
          totalAssets: report.totalAssets,
          usedCount: report.usedCount,
          unusedCount: report.unusedAssets.length,
          keptConventionCount: report.keptConventions.length,
          reclaimableBytes: report.reclaimableBytes,
          unusedAssets: report.unusedAssets.map(rel),
          keptConventions: report.keptConventions.map(rel),
          deletion: deleted
            ? {
                strategy: deleted.strategy,
                trashDir: deleted.trashDir ? rel(deleted.trashDir) : undefined,
                deleted: deleted.deleted.map((entry) => rel(entry.original)),
                failed: deleted.failed.map((failure) => ({
                  file: rel(failure.file),
                  error: failure.error,
                })),
              }
            : null,
          reportFile,
        },
        null,
        2
      )
    );
  }

  if (opts.failOnUnused && report.unusedAssets.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(chalk.red("❌ Error running assetdrain:"), err);
  process.exit(1);
});
