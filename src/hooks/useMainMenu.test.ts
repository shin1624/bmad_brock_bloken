import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMainMenu } from "./useMainMenu";

describe("useMainMenu", () => {
  it("returns menu state with default values", () => {
    const { result } = renderHook(() => useMainMenu());

    expect(result.current.menuState).toBeDefined();
    expect(result.current.isLoading).toBe(false);
  });
});
