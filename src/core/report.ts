import chalk from "chalk";
import path from "path";
import fs from "fs/promises";

export async function generateReport(
  allAssets: string[],
  usedAssets: Set<string>,
  options: {
    mode: "dry" | "delete" | "review";
    export?: "csv" | "json";
    deleted?: boolean;
  }
) {
  const unusedAssets = allAssets.filter((asset) => !usedAssets.has(asset));

  console.log("");
  console.log(chalk.blueBright(`📦 Found ${allAssets.length} assets`));
  console.log(chalk.greenBright(`✅ ${usedAssets.size} are used`));
  console.log(chalk.redBright(`🧹 ${unusedAssets.length} appear to be unused`));

  if (unusedAssets.length === 0) {
    console.log(chalk.greenBright("\n🎉 No unused assets found!"));
    return;
  }

  console.log("\n" + chalk.yellow("Unused Assets:"));
  unusedAssets.forEach((img) => {
    console.log(chalk.gray("- ") + path.relative(process.cwd(), img));
  });

  if (options.mode === "dry") {
    console.log(chalk.blueBright("\n🧪 Dry run: No files were deleted.\n"));
    return;
  }

  if (options.mode === "delete") {
    console.log(chalk.redBright("\n⚠ Deleting unused assets...\n"));
    for (const file of unusedAssets) {
      try {
        await fs.unlink(file);
        console.log(
          chalk.red(`🗑 Deleted: ${path.relative(process.cwd(), file)}`)
        );
      } catch (err) {
        console.error(chalk.red(`❌ Failed to delete: ${file}`), err);
      }
    }
    console.log(chalk.greenBright("\n✅ Cleanup complete!\n"));
  } else {
    console.log(
      chalk.yellowBright("\n📝 Review mode only. No files were deleted.\n")
    );
  }

  if (options.export === "json") {
    const data = {
      totalAssets: allAssets.length,
      usedAssets: [...usedAssets],
      unusedAssets,
      summary: {
        usedCount: usedAssets.size,
        unusedCount: unusedAssets.length,
        deleted: options.deleted ?? false,
      },
    };

    await fs.writeFile("assetdrain-report.json", JSON.stringify(data, null, 2));
    console.log(chalk.cyan("\n📄 Report saved to: assetdrain-report.json"));
  }

  if (options.export === "csv") {
    const csvLines = ["Filename,Used,Deleted"];

    for (const file of allAssets) {
      const relative = path.relative(process.cwd(), file);
      const isUsed = usedAssets.has(file) ? "Yes" : "No";
      const isDeleted =
        !usedAssets.has(file) && (options.deleted ?? false) ? "Yes" : "No";
      csvLines.push(`"${relative}","${isUsed}","${isDeleted}"`);
    }

    await fs.writeFile("assetdrain-report.csv", csvLines.join("\n"));
    console.log(chalk.cyan("\n📄 Report saved to: assetdrain-report.csv"));
  }
}
