import { describe, expect, it } from "vitest";
import { parseDocumentUrl } from "@/lib/documents/documentUrl";

describe("documentAccess", () => {
  it("parses string and object upstream document responses", () => {
    expect(parseDocumentUrl("https://cdn.example.com/a.pdf")).toBe(
      "https://cdn.example.com/a.pdf"
    );
    expect(parseDocumentUrl({ url: "https://cdn.example.com/b.pdf" })).toBe(
      "https://cdn.example.com/b.pdf"
    );
    expect(parseDocumentUrl({ url: "javascript:alert(1)" })).toBeNull();
    expect(parseDocumentUrl(null)).toBeNull();
  });
});
