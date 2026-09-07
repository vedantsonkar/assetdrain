import { describe, expect, it, beforeAll, afterAll } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  deleteAssets,
  type DeleteResult,
} from "../src/core/delete.js";

let projectRoot: string;

beforeAll(async () => {
  projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "assetdrain-del-"));
  await fs.mkdir(path.join(projectRoot, "assets", "nested"), {
    recursive: true,
  });
  await fs.writeFile(path.join(projectRoot, "assets", "a.png"), "a");
  await fs.writeFile(
    path.join(projectRoot, "assets", "nested", "b.png"),
    "b"
  );
});

afterAll(async () => {
  await fs.rm(projectRoot, { recursive: true, force: true });
});

describe("deleteAssets", () => {
  it("moves files to a trash folder with a restorable manifest", async () => {
    const files = [
      path.join(projectRoot, "assets", "a.png"),
      path.join(projectRoot, "assets", "nested", "b.png"),
    ];

    const result: DeleteResult = await deleteAssets(files, projectRoot, "trash");

    expect(result.failed).toHaveLength(0);
    expect(result.trashDir).toBeTruthy();

    // Originals are gone from the project...
    await expect(fs.access(files[0])).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.access(files[1])).rejects.toMatchObject({ code: "ENOENT" });

    // ...and recoverable from the trash with their relative structure.
    const trashedB = path.join(result.trashDir!, "assets", "nested", "b.png");
    await expect(fs.access(trashedB)).resolves.toBeUndefined();

    const manifest = JSON.parse(
      await fs.readFile(path.join(result.trashDir!, "manifest.json"), "utf8")
    );
    expect(manifest.files).toHaveLength(2);
    expect(manifest.files[0].original).toBe(files[0]);
  });

  it("removes directories left empty by deletion", async () => {
    // "nested" was emptied by the previous test; the empty-dir sweep runs
    // inside deleteAssets, so it should already be gone.
    await expect(
      fs.access(path.join(projectRoot, "assets", "nested"))
    ).rejects.toMatchObject({ code: "ENOENT" });
    // But the project root itself always survives.
    await expect(fs.access(projectRoot)).resolves.toBeUndefined();
  });

  it("hard-deletes files permanently", async () => {
    // Fresh root so the trash folder from the trash test doesn't interfere.
    const hardRoot = await fs.mkdtemp(path.join(os.tmpdir(), "assetdrain-hard-"));
    try {
      const file = path.join(hardRoot, "a.png");
      await fs.writeFile(file, "a");

      const result = await deleteAssets([file], hardRoot, "hard");

      expect(result.trashDir).toBeUndefined();
      await expect(fs.access(file)).rejects.toMatchObject({ code: "ENOENT" });
      // No trash folder was created for a hard delete.
      const entries = await fs.readdir(hardRoot);
      expect(entries).toHaveLength(0);
    } finally {
      await fs.rm(hardRoot, { recursive: true, force: true });
    }
  });
});
