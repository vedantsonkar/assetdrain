import { describe, expect, it } from "vitest";
import path from "path";
import { fileURLToPath } from "url";
import { scanForUsages } from "../src/core/findUsages.js";
import { scanForAssets } from "../src/core/findAssets.js";
import { defaultCodeExts } from "../src/core/fileTypes.js";

const fixtureRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures/sample-project"
);

const asset = (...segments: string[]) => path.join(fixtureRoot, ...segments);

describe("scanForUsages", () => {
  it("detects every real reference form and keeps only true orphans", async () => {
    const assets = await scanForAssets(fixtureRoot, ["png", "svg"]);
    const { usedAssets, codeFiles } = await scanForUsages(
      fixtureRoot,
      assets,
      defaultCodeExts
    );

    expect(codeFiles.length).toBeGreaterThan(0);

    // Referenced via a https:// URL — the old comment-stripper erased this.
    expect(usedAssets).toContain(asset("public", "used-hero.png"));
    // Referenced via ./relative import — resolved against the referencing file.
    expect(usedAssets).toContain(asset("src", "assets", "used-icon.svg"));
    // Referenced via CSS url() — .css is now scanned by default.
    expect(usedAssets).toContain(asset("public", "deep", "used-bg.png"));
    // Mentioned only inside a comment — counts as used (safe direction).
    expect(usedAssets).toContain(asset("public", "dead-logo.png"));

    // Never referenced anywhere.
    expect(usedAssets).not.toContain(asset("public", "orphan.png"));
    expect(usedAssets).not.toContain(asset("app", "really-unused.png"));
  });

  it("does not flag an asset used because of a longer filename", async () => {
    const root = fixtureRoot;
    const { usedAssets } = await scanForUsages(root, [asset("public", "orphan.png")], ["ts"]);
    expect(usedAssets.size).toBe(0);
  });

  it("reports zero code files when extensions match nothing", async () => {
    const { codeFiles } = await scanForUsages(
      fixtureRoot,
      [asset("public", "orphan.png")],
      ["definitely-not-an-extension"]
    );
    expect(codeFiles).toHaveLength(0);
  });
});

describe("scanForAssets", () => {
  it("skips build output and tooling directories", async () => {
    const assets = await scanForAssets(fixtureRoot, ["png"]);
    const relatives = assets.map((a) => path.relative(fixtureRoot, a));

    expect(relatives).toContain(path.join("public", "orphan.png"));
    expect(relatives.join(",")).not.toMatch(/(^|\/|\\)dist(\/|\\)/);
    expect(relatives.join(",")).not.toMatch(/node_modules/);
  });
});
