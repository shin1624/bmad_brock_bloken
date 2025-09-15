import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { addAnimationClass } from "./animations";

describe("Animation Utilities", () => {
  let mockElement: HTMLElement;

  beforeEach(() => {
    mockElement = document.createElement("div");
    document.body.appendChild(mockElement);
  });

  afterEach(() => {
    document.body.removeChild(mockElement);
  });

  it("adds animation class to element", () => {
    addAnimationClass(mockElement, "menu-enter");
    expect(mockElement.classList.contains("menu-enter")).toBe(true);
  });
});
