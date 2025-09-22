/**
 * Tests for Theme Selector Component
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeSelector } from "./ThemeSelector";

describe("ThemeSelector", () => {
  it("should display current theme for MVP", () => {
    render(<ThemeSelector />);

    expect(screen.getByText("Current Theme:")).toBeInTheDocument();
    expect(screen.getByText("Neon")).toBeInTheDocument();
    expect(screen.getByText("Default theme optimized for retro gaming experience")).toBeInTheDocument();
  });

  it("should render without theme selection options in MVP", () => {
    render(<ThemeSelector />);

    // MVP: No theme selection UI
    const themeDisplay = screen.getByText("Current Theme:");
    expect(themeDisplay).toBeInTheDocument();
    
    // Should not have interactive theme switching elements
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("select")).not.toBeInTheDocument();
  });
});
