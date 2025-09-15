import { describe, it, expect, beforeEach, vi } from "vitest";
import { 
  safeSetItem, 
  safeGetItem, 
  safeRemoveItem, 
  isStorageAvailable 
} from "./storage";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  hasOwnProperty: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
});

describe("Storage Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("safeSetItem", () => {
    it("successfully saves data", () => {
      localStorageMock.setItem.mockImplementation(() => {});
      
      const result = safeSetItem("test", { value: 123 });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 123 });
      expect(localStorageMock.setItem).toHaveBeenCalledWith("test", '{"value":123}');
    });

    it("handles quota exceeded error", () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("QuotaExceededError: Storage quota exceeded");
      });
      
      const result = safeSetItem("test", { value: 123 });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("Storage quota exceeded");
    });

    it("handles general storage errors", () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("Storage unavailable");
      });
      
      const result = safeSetItem("test", { value: 123 });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("Storage error");
    });
  });

  describe("safeGetItem", () => {
    it("successfully retrieves data", () => {
      localStorageMock.getItem.mockReturnValue('{"value":123}');
      
      const result = safeGetItem("test");
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ value: 123 });
    });

    it("returns default value when item not found", () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = safeGetItem("test", { default: true });
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ default: true });
    });

    it("handles JSON parse errors", () => {
      localStorageMock.getItem.mockReturnValue("invalid json");
      
      const result = safeGetItem("test", { default: true });
      
      expect(result.success).toBe(false);
      expect(result.data).toEqual({ default: true });
      expect(result.error).toContain("Parse error");
    });

    it("handles storage access errors", () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error("Storage access denied");
      });
      
      const result = safeGetItem("test", { default: true });
      
      expect(result.success).toBe(false);
      expect(result.data).toEqual({ default: true });
    });
  });

  describe("safeRemoveItem", () => {
    it("successfully removes item", () => {
      localStorageMock.removeItem.mockImplementation(() => {});
      
      const result = safeRemoveItem("test");
      
      expect(result.success).toBe(true);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith("test");
    });

    it("handles removal errors", () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error("Cannot remove item");
      });
      
      const result = safeRemoveItem("test");
      
      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot remove item");
    });
  });

  describe("isStorageAvailable", () => {
    it("returns true when storage works", () => {
      localStorageMock.setItem.mockImplementation(() => {});
      localStorageMock.removeItem.mockImplementation(() => {});
      
      const result = isStorageAvailable();
      
      expect(result).toBe(true);
    });

    it("returns false when storage fails", () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error("Storage unavailable");
      });
      
      const result = isStorageAvailable();
      
      expect(result).toBe(false);
    });
  });
});