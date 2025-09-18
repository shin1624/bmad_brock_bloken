import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PowerUpStatus, {
  PowerUpType,
  type ActivePowerUp,
} from "../PowerUpStatus";

describe("PowerUpStatus Component", () => {
  const mockPowerUp: ActivePowerUp = {
    id: "test-powerup-1",
    type: PowerUpType.MultiBall,
    duration: 5000,
    maxDuration: 10000,
    icon: "⚡",
    color: "#ff6b6b",
    name: "Multi Ball",
  };

  it("should compile without TypeScript syntax errors", () => {
    // This test will fail if there are syntax errors in the component
    expect(() => {
      render(<PowerUpStatus powerUps={[]} />);
    }).not.toThrow();
  });

  it("should render nothing when no power-ups are active", () => {
    const { container } = render(<PowerUpStatus powerUps={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("should display active power-up with correct icon and name", () => {
    render(<PowerUpStatus powerUps={[mockPowerUp]} />);

    expect(screen.getByText("⚡")).toBeInTheDocument();
    expect(screen.getByText("Multi Ball")).toBeInTheDocument();
  });

  it("should format time correctly for different durations", () => {
    const powerUpShort = { ...mockPowerUp, duration: 30000 }; // 30 seconds
    const powerUpLong = { ...mockPowerUp, duration: 90000 }; // 1:30

    const { rerender } = render(<PowerUpStatus powerUps={[powerUpShort]} />);
    expect(screen.getByText("30s")).toBeInTheDocument();

    rerender(<PowerUpStatus powerUps={[powerUpLong]} />);
    expect(screen.getByText("1:30")).toBeInTheDocument();
  });

  it("should display multiple power-ups", () => {
    const powerUp2: ActivePowerUp = {
      ...mockPowerUp,
      id: "test-powerup-2",
      type: PowerUpType.PaddleSize,
      name: "Big Paddle",
    };

    render(<PowerUpStatus powerUps={[mockPowerUp, powerUp2]} />);

    expect(screen.getByText("Multi Ball")).toBeInTheDocument();
    expect(screen.getByText("Big Paddle")).toBeInTheDocument();
  });

  it("should limit display count and show overflow indicator", () => {
    const powerUps: ActivePowerUp[] = Array.from({ length: 6 }, (_, i) => ({
      ...mockPowerUp,
      id: `test-powerup-${i}`,
      name: `Power-Up ${i + 1}`,
    }));

    render(<PowerUpStatus powerUps={powerUps} maxDisplayCount={3} />);

    // Should show first 3 power-ups
    expect(screen.getByText("Power-Up 1")).toBeInTheDocument();
    expect(screen.getByText("Power-Up 2")).toBeInTheDocument();
    expect(screen.getByText("Power-Up 3")).toBeInTheDocument();

    // Should show overflow indicator
    expect(screen.getByText("+3 more")).toBeInTheDocument();

    // Should not show power-ups beyond limit
    expect(screen.queryByText("Power-Up 4")).not.toBeInTheDocument();
  });

  it("should call onPowerUpActivate callback for new power-ups", () => {
    const mockActivate = vi.fn();
    render(
      <PowerUpStatus
        powerUps={[mockPowerUp]}
        onPowerUpActivate={mockActivate}
      />,
    );

    expect(mockActivate).toHaveBeenCalledWith(mockPowerUp);
  });

  it("should display correct icon for different power-up types", () => {
    const powerUps: ActivePowerUp[] = [
      { ...mockPowerUp, type: PowerUpType.MultiBall },
      { ...mockPowerUp, id: "2", type: PowerUpType.PaddleSize },
      { ...mockPowerUp, id: "3", type: PowerUpType.BallSpeed },
      { ...mockPowerUp, id: "4", type: PowerUpType.Penetration },
    ];

    render(<PowerUpStatus powerUps={powerUps} />);

    expect(screen.getByText("⚡")).toBeInTheDocument(); // MultiBall
    expect(screen.getByText("🏓")).toBeInTheDocument(); // PaddleSize
    expect(screen.getByText("💨")).toBeInTheDocument(); // BallSpeed
    expect(screen.getByText("🎯")).toBeInTheDocument(); // Penetration
  });

  it("should handle power-up with fallback type correctly", () => {
    const unknownPowerUp = {
      ...mockPowerUp,
      type: "unknown" as PowerUpType,
      name: "Unknown Power",
    };

    render(<PowerUpStatus powerUps={[unknownPowerUp]} />);

    expect(screen.getByText("❓")).toBeInTheDocument(); // Fallback icon
    expect(screen.getByText("Unknown Power")).toBeInTheDocument();
  });
});
