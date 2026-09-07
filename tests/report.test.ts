import { describe, expect, it, beforeAll, afterAll } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { buildReport, exportReport } from "../src/core/report.js";

let cwd: string;
let root: string;

beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "assetdrain-rep-"));
  cwd = process.cwd();
  process.chdir(root);
});

afterAll(async () => {
  process.chdir(cwd);
  await fs.rm(root, { recursive: true, force: true });
});

describe("buildReport", () => {
  it("separates used, unused and kept assets", async () => {
    const used = path.join(root, "used.png");
    const unused = path.join(root, "unused.png");
    const kept = path.join(root, "app-icon.png");
    await fs.writeFile(used, "x");
    await fs.writeFile(unused, "yyyy");

    // Candidates and kept conventions arrive disjoint from the CLI's
    // framework split; used conventions count as simply "used".
    const report = await buildReport([used, unused], new Set([used]), [kept]);
    expect(report.totalAssets).toBe(3);
    expect(report.unusedAssets).toEqual([unused]);
    expect(report.usedCount).toBe(1);
    expect(report.keptConventions).toEqual([kept]);
    expect(report.reclaimableBytes).toBe(4);
  });

  it("counts a convention file referenced in code as used, not kept", async () => {
    const used = path.join(root, "used.png");
    const convention = path.join(root, "app-icon.png");

    const report = await buildReport(
      [used],
      new Set([used, convention]),
      [convention]
    );

    expect(report.totalAssets).toBe(2);
    expect(report.unusedAssets).toHaveLength(0);
    expect(report.keptConventions).toHaveLength(0);
    expect(report.usedCount).toBe(2);
  });
});

describe("exportReport", () => {
  it("writes JSON including deletion details", async () => {
    const unused = path.join(root, "unused.png");
    const report = await buildReport([unused], new Set(), []);
    const file = await exportReport(report, "json", {
      strategy: "trash",
      deleted: [{ original: unused, trash: "/trash/unused.png" }],
      failed: [],
      trashDir: path.join(root, ".assetdrain-trash", "x"),
    });

    expect(file).toBe("assetdrain-report.json");
    const data = JSON.parse(await fs.readFile(file, "utf8"));
    expect(data.unusedCount).toBe(1);
    expect(data.deletion.strategy).toBe("trash");
    expect(data.deletion.deleted).toHaveLength(1);
  });

  it("escapes quotes in CSV fields", async () => {
    // A `"` can't exist in a Windows filename, so pass a synthetic path —
    // buildReport tolerates files it cannot stat.
    const weird = path.join(root, 'odd"name.png');
    const report = await buildReport([weird], new Set(), []);

    const file = await exportReport(report, "csv");
    expect(file).toBe("assetdrain-report.csv");

    const csv = await fs.readFile(file, "utf8");
    // A quote inside a field must be doubled, not broken out of the field.
    expect(csv).toContain('"odd""name.png"');
    expect(csv).not.toContain('"odd"name.png"');
  });
});
