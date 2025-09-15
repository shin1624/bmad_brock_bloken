import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScoreFormatter } from "./ScoreFormatter";

describe("ScoreFormatter", () => {
  it("formats score with thousands separator", () => {
    render(<ScoreFormatter score={10000} />);
    expect(screen.getByText("10,000")).toBeInTheDocument();
  });
});
