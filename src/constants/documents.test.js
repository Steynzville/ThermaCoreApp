import { describe, expect, it } from "vitest";
import documentList from "./documents";

describe("documentList", () => {
  it("should export an array of documents", () => {
    expect(Array.isArray(documentList)).toBe(true);
    expect(documentList.length).toBeGreaterThan(0);
  });

  it("should have documents with required fields", () => {
    documentList.forEach((doc) => {
      expect(doc).toHaveProperty("id");
      expect(doc).toHaveProperty("name");
      expect(doc).toHaveProperty("description");
      expect(doc).toHaveProperty("url");
      expect(doc).toHaveProperty("allowedRoles");
    });
  });

  it("should have valid allowedRoles arrays", () => {
    documentList.forEach((doc) => {
      expect(Array.isArray(doc.allowedRoles)).toBe(true);
      expect(doc.allowedRoles.length).toBeGreaterThan(0);
    });
  });

  it("should have unique document IDs", () => {
    const ids = documentList.map((doc) => doc.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have valid URL paths", () => {
    documentList.forEach((doc) => {
      expect(doc.url).toMatch(/^\/documents\/.+\.pdf$/);
    });
  });

  it("should contain expected number of documents", () => {
    expect(documentList.length).toBe(4);
  });

  it("should have documents accessible by admin", () => {
    const adminDocs = documentList.filter((doc) =>
      doc.allowedRoles.includes("admin"),
    );
    expect(adminDocs.length).toBe(4);
  });

  it("should have documents accessible by users", () => {
    const userDocs = documentList.filter((doc) =>
      doc.allowedRoles.includes("user"),
    );
    expect(userDocs.length).toBe(2);
  });

  it("should have admin-only documents", () => {
    const adminOnlyDocs = documentList.filter(
      (doc) =>
        doc.allowedRoles.includes("admin") &&
        !doc.allowedRoles.includes("user"),
    );
    expect(adminOnlyDocs.length).toBeGreaterThan(0);
  });
});
