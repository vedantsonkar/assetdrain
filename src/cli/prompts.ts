import prompts from "prompts";
import type { PromptObject } from "prompts";
import chalk from "chalk";

const prompt = <T extends string = string>(config: PromptObject<T>) =>
  prompts<T>(config, {
    onCancel: () => {
      console.log(chalk.redBright("\n❌ Action cancelled by user."));
      process.exit(1);
    },
  });

export async function askAssetTypes() {
  const { assetChoice } = await prompt({
    type: "select",
    name: "assetChoice",
    message: "Choose asset types to scan",
    choices: [
      {
        title: chalk.greenBright("All Supported Types (default)"),
        value: "default",
      },
      { title: "Images", value: "images" },
      { title: "Videos", value: "videos" },
      { title: "GIFs", value: "gifs" },
      { title: "Custom (enter extensions)", value: "custom" },
    ],
    initial: 0,
  });

  if (assetChoice === "custom") {
    const { customAssets } = await prompt({
      type: "text",
      name: "customAssets",
      message: "Enter asset extensions (comma-separated, no spaces):",
    });
    return customAssets.split(",").map((e: string) => e.trim().toLowerCase());
  }

  return assetChoice;
}

export async function askCodeFileTypes() {
  const { codeExtChoice } = await prompt({
    type: "select",
    name: "codeExtChoice",
    message: "Choose code file types to scan",
    choices: [
      {
        title: chalk.greenBright("Default (js,ts,jsx,tsx,vue,html)"),
        value: "default",
      },
      { title: "Custom (enter extensions)", value: "custom" },
    ],
    initial: 0,
  });

  if (codeExtChoice === "custom") {
    const { customCodeExts } = await prompt({
      type: "text",
      name: "customCodeExts",
      message: "Enter code file extensions (comma-separated, no spaces):",
    });
    return customCodeExts.split(",").map((e: string) => e.trim().toLowerCase());
  }

  return codeExtChoice;
}

export async function askAction(): Promise<"review" | "dry" | "delete"> {
  const { action } = await prompt({
    type: "select",
    name: "action",
    message: "What would you like to do?",
    choices: [
      {
        title: chalk.greenBright("Scan and Review (Default)"),
        value: "review",
      },
      {
        title: "Scan Only",
        value: "dry",
      },
      {
        title: chalk.redBright(
          "Scan and Delete Automatically (At your own risk)"
        ),
        value: "delete",
      },
    ],
    initial: 0,
  });

  return action;
}

export async function askExportFormat() {
  const { format } = await prompt({
    type: "select",
    name: "format",
    message: "Would you like to export the report?",
    choices: [
      { title: "Yes (CSV)", value: "csv" },
      { title: "Yes (JSON)", value: "json" },
      { title: "No", value: "no" },
    ],
    initial: 2,
  });

  return format;
}

export async function askIfShouldDelete(): Promise<boolean> {
  const { confirmDelete } = await prompt({
    type: "select",
    name: "confirmDelete",
    message: "Do you want to delete the unused assets listed above?",
    choices: [
      { title: chalk.redBright("Yes, delete them"), value: true },
      { title: "No", value: false },
    ],
    initial: 1, // default to No for safety
  });

  return confirmDelete;
}
