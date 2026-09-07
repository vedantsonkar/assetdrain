import chalk from "chalk";
import path from "path";
import fs from "fs/promises";
import type { DeleteResult } from "./delete.js";
import { humanizeBytes } from "./utils.js";

export interface ReportData {
  allAssets: string[];
  usedAssets: Set<string>;
  totalAssets: number;
  usedCount: number;
  unusedAssets: string[];
  keptConventions: string[];
  reclaimableBytes: number;
}

export async function buildReport(
  allAssets: string[],
  usedAssets: Set<string>,
  keptConventions: string[]
): Promise<ReportData> {
  // Convention files referenced in code count as simply "used"; only
  // unreferenced ones are kept aside so they never look deletable.
  const kept = keptConventions.filter((file) => !usedAssets.has(file));
  const unusedAssets = allAssets.filter((asset) => !usedAssets.has(asset));

  const sizes = await Promise.all(
    unusedAssets.map(async (file) => {
      try {
        return (await fs.stat(file)).size;
      } catch {
        return 0;
      }
    })
  );

  return {
    allAssets: [...allAssets, ...keptConventions],
    usedAssets,
    totalAssets: allAssets.length + keptConventions.length,
    usedCount: allAssets.length + keptConventions.length - unusedAssets.length - kept.length,
    unusedAssets,
    keptConventions: kept,
    reclaimableBytes: sizes.reduce((sum, size) => sum + size, 0),
  };
}

const MAX_LISTED = 200;

export function printReport(report: ReportData, deleted?: DeleteResult) {
  const rel = (file: string) => path.relative(process.cwd(), file);

  console.log("");
  console.log(chalk.blueBright(`📦 Found ${report.totalAssets} assets`));
  console.log(chalk.greenBright(`✅ ${report.usedCount} are used`));
  console.log(
    chalk.redBright(`🧹 ${report.unusedAssets.length} appear to be unused`)
  );
  if (report.keptConventions.length > 0) {
    console.log(
      chalk.cyanBright(
        `🛡 ${report.keptConventions.length} kept (framework convention)`
      )
    );
  }

  if (report.reclaimableBytes > 0) {
    console.log(
      chalk.yellowBright(
        `💾 Reclaimable space: ${humanizeBytes(report.reclaimableBytes)}`
      )
    );
  }

  if (report.unusedAssets.length > 0) {
    console.log("\n" + chalk.yellow("Unused Assets:"));
    for (const asset of report.unusedAssets.slice(0, MAX_LISTED)) {
      console.log(chalk.gray("• ") + chalk.italic(`[${rel(asset)}]`));
    }
    if (report.unusedAssets.length > MAX_LISTED) {
      console.log(
        chalk.gray(
          `  …and ${report.unusedAssets.length - MAX_LISTED} more (see export)`
        )
      );
    }
  }

  if (report.keptConventions.length > 0) {
    console.log("\n" + chalk.cyan("Kept (framework convention):"));
    for (const asset of report.keptConventions) {
      console.log(chalk.gray("• ") + chalk.italic(`[${rel(asset)}]`));
    }
  }

  if (!deleted) return;

  if (deleted.strategy === "trash" && deleted.trashDir) {
    console.log(
      chalk.yellowBright(
        `\n🗑 ${deleted.deleted.length} files moved to ${rel(deleted.trashDir)}`
      )
    );
    console.log(
      chalk.gray(
        "   Restore anytime by moving files back from the trash folder."
      )
    );
    console.log(
      chalk.gray("   💡 Consider adding `.assetdrain-trash/` to your .gitignore.")
    );
  }
  if (deleted.failed.length > 0) {
    console.log(
      chalk.red(`\n⚠ ${deleted.failed.length} files could not be deleted:`)
    );
    for (const failure of deleted.failed) {
      console.log(chalk.red(`   • ${rel(failure.file)} — ${failure.error}`));
    }
  }
}

export async function exportReport(
  report: ReportData,
  format: "csv" | "json",
  deleted?: DeleteResult
): Promise<string> {
  const rel = (file: string) => path.relative(process.cwd(), file);

  if (format === "json") {
    const data = {
      generatedAt: new Date().toISOString(),
      totalAssets: report.totalAssets,
      usedCount: report.usedCount,
      unusedCount: report.unusedAssets.length,
      keptConventionCount: report.keptConventions.length,
      reclaimableBytes: report.reclaimableBytes,
      reclaimableHuman: humanizeBytes(report.reclaimableBytes),
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
    };

    await fs.writeFile("assetdrain-report.json", JSON.stringify(data, null, 2));
    return "assetdrain-report.json";
  }

  const csvField = (value: string | number | boolean) =>
    `"${String(value).replace(/"/g, '""')}"`;

  const deletedFiles = new Set(
    deleted ? deleted.deleted.map((entry) => entry.original) : []
  );
  const keptFiles = new Set(report.keptConventions);

  const csvLines = ["Filename,Used,Deleted,Kept (convention)"];
  for (const file of report.allAssets) {
    const isUsed = report.usedAssets.has(file) ? "Yes" : "No";
    const isDeleted = deletedFiles.has(file) ? "Yes" : "No";
    const isKept = keptFiles.has(file) ? "Yes" : "No";
    csvLines.push(
      [csvField(rel(file)), csvField(isUsed), csvField(isDeleted), csvField(isKept)].join(",")
    );
  }

  await fs.writeFile("assetdrain-report.csv", csvLines.join("\n"));
  return "assetdrain-report.csv";
}
