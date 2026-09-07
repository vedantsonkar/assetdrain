import { describe, expect, it } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  detectFramework,
  splitFrameworkConventions,
} from "../src/core/framework.js";

describe("detectFramework", () => {
  it("detects Next.js from any next.config variant", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "assetdrain-fw-"));
    try {
      await fs.writeFile(path.join(root, "next.config.mjs"), "export default {}");
      expect(await detectFramework(root)).toBe("nextjs");
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("returns null for plain projects", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "assetdrain-fw-"));
    try {
      expect(await detectFramework(root)).toBeNull();
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});

describe("splitFrameworkConventions", () => {
  it("keeps Next.js app-router convention files, and only inside app/", async () => {
    const root = path.sep + "proj";
    const assets = [
      path.join(root, "app", "icon.png"),
      path.join(root, "app", "opengraph-image.jpg"),
      path.join(root, "src", "app", "favicon.ico"),
      path.join(root, "app", "really-unused.png"),
      path.join(root, "public", "icon.png"), // outside app/ — no convention meaning
    ];

    const { candidates, kept } = splitFrameworkConventions(
      assets,
      root,
      "nextjs"
    );

    expect(kept).toEqual([
      path.join(root, "app", "icon.png"),
      path.join(root, "app", "opengraph-image.jpg"),
      path.join(root, "src", "app", "favicon.ico"),
    ]);
    expect(candidates).toContain(path.join(root, "app", "really-unused.png"));
    expect(candidates).toContain(path.join(root, "public", "icon.png"));
  });

  it("keeps nothing when no framework is detected", () => {
    const assets = [path.sep + "proj" + path.sep + "app" + path.sep + "icon.png"];
    const { candidates, kept } = splitFrameworkConventions(assets, path.sep + "proj", null);
    expect(kept).toHaveLength(0);
    expect(candidates).toEqual(assets);
  });
});
