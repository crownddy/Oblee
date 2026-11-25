import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/utils/request";

describe("safeNextPath", () => {
  it("keeps a same-site path", () => {
    expect(safeNextPath("/events/new")).toBe("/events/new");
    expect(safeNextPath("/profile?tab=saved#top")).toBe("/profile?tab=saved#top");
    expect(safeNextPath("/")).toBe("/");
  });

  it("falls back when there is no target", () => {
    expect(safeNextPath(null)).toBe("/profile");
    expect(safeNextPath("")).toBe("/profile");
    expect(safeNextPath(undefined, "/saved")).toBe("/saved");
  });

  it("refuses absolute URLs", () => {
    expect(safeNextPath("https://evil.example/phish")).toBe("/profile");
    expect(safeNextPath("javascript:alert(1)")).toBe("/profile");
    expect(safeNextPath("evil.example")).toBe("/profile");
  });

  it("refuses protocol-relative and backslash hosts", () => {
    expect(safeNextPath("//evil.example")).toBe("/profile");
    expect(safeNextPath("/\\evil.example")).toBe("/profile");
    expect(safeNextPath("/\\\\evil.example")).toBe("/profile");
  });

  it("refuses hosts smuggled behind a control character", () => {
    expect(safeNextPath("/\t/evil.example")).toBe("/profile");
    expect(safeNextPath("/\n/evil.example")).toBe("/profile");
  });

  it("never returns a value that leaves the site", () => {
    const hostile = [
      "//evil.example",
      "/\\evil.example",
      "/\t/evil.example",
      "/\n/evil.example",
      "/\u0000/evil.example",
      "https://evil.example/phish",
      "javascript:alert(1)",
      "/%5Cevil.example",
      "/profile",
    ];

    for (const value of hostile) {
      const result = safeNextPath(value);
      expect(new URL(result, "https://oblee.test").origin).toBe("https://oblee.test");
    }
  });

  it("keeps percent-encoded paths on this site", () => {
    expect(safeNextPath("/%5Cevil.example")).toBe("/%5Cevil.example");
  });
});
