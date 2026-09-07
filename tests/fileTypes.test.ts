import { describe, expect, it } from "vitest";
import {
  defaultAssetExts,
  defaultCodeExts,
  getExtensionsPattern,
  normalizeExtList,
} from "../src/core/fileTypes.js";
import { humanizeBytes } from "../src/core/utils.js";

describe("normalizeExtList", () => {
  it("cleans user input: dots, globs, whitespace, empties, duplicates", () => {
    expect(normalizeExtList(".PNG, *.webp ,  jpg,,gif,png")).toEqual([
      "png",
      "webp",
      "jpg",
      "gif",
    ]);
  });

  it("accepts arrays and undefined", () => {
    expect(normalizeExtList([".svg"])).toEqual(["svg"]);
    expect(normalizeExtList(undefined)).toEqual([]);
  });
});

describe("defaultCodeExts", () => {
  it("includes stylesheet extensions so url() references are found", () => {
    for (const ext of ["css", "scss", "less"]) {
      expect(defaultCodeExts).toContain(ext);
    }
  });
});

describe("getExtensionsPattern", () => {
  it("builds fast-glob patterns", () => {
    expect(getExtensionsPattern(["png"])).toEqual(["**/*.png"]);
  });

  it("falls back to all supported asset types", () => {
    expect(getExtensionsPattern()).toEqual(
      defaultAssetExts.map((ext) => `**/*.${ext}`)
    );
  });
});

describe("humanizeBytes", () => {
  it("formats sizes readably", () => {
    expect(humanizeBytes(0)).toBe("0 B");
    expect(humanizeBytes(512)).toBe("512 B");
    expect(humanizeBytes(1536)).toBe("1.5 KB");
    expect(humanizeBytes(1024 * 1024 * 12.4)).toBe("12.4 MB");
  });
});
