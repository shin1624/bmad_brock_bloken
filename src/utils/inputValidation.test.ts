import { describe, it, expect } from "vitest";
import {
  sanitizeInput,
  validatePlayerName,
  validateScore,
} from "./inputValidation";

describe("Input Validation", () => {
  describe("sanitizeInput", () => {
    it("removes potentially dangerous characters", () => {
      expect(sanitizeInput("<script>alert('xss')</script>")).toBe(
        "alert('xss')",
      );
      expect(sanitizeInput("javascript:alert('xss')")).toBe("alert('xss')");
      expect(sanitizeInput("onclick=alert('xss')")).toBe("alert('xss')");
    });

    it("preserves safe characters", () => {
      expect(sanitizeInput("Player Name 123")).toBe("Player Name 123");
      expect(sanitizeInput("Level-1_Test")).toBe("Level-1_Test");
    });

    it("handles non-string inputs", () => {
      expect(sanitizeInput(null as unknown)).toBe("");
      expect(sanitizeInput(undefined as unknown)).toBe("");
      expect(sanitizeInput(123 as unknown)).toBe("");
    });
  });

  describe("validatePlayerName", () => {
    it("validates correct player names", () => {
      const result = validatePlayerName("Player123");
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe("Player123");
      expect(result.errors).toHaveLength(0);
    });

    it("rejects empty names", () => {
      const result = validatePlayerName("");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Player name cannot be empty");
    });

    it("rejects names that are too long", () => {
      const result = validatePlayerName("A".repeat(25));
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Player name cannot exceed 20 characters",
      );
    });

    it("rejects names with invalid characters", () => {
      const result = validatePlayerName("Player@#$");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Player name can only contain letters, numbers, spaces, hyphens, and underscores",
      );
    });

    it("sanitizes XSS attempts", () => {
      const result = validatePlayerName("Player<script>");
      expect(result.sanitized).toBe("Player");
      expect(result.isValid).toBe(true);
    });
  });

  describe("validateScore", () => {
    it("validates numeric scores", () => {
      expect(validateScore(1000)).toBe(1000);
      expect(validateScore(0)).toBe(0);
      expect(validateScore(999.7)).toBe(999); // Floors decimal
    });

    it("validates string numbers", () => {
      expect(validateScore("1000")).toBe(1000);
      expect(validateScore("0")).toBe(0);
    });

    it("rejects invalid inputs", () => {
      expect(validateScore(-1)).toBe(null);
      expect(validateScore("abc")).toBe(null);
      expect(validateScore(null)).toBe(null);
      expect(validateScore(undefined)).toBe(null);
      expect(validateScore(NaN)).toBe(null);
    });
  });
});
