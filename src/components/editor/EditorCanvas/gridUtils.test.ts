import { describe, expect, it } from "vitest";

import { calculateGridLines, getCellBounds, pointToCell } from "./gridUtils";

describe("gridUtils", () => {
  it("calculateGridLinesが行と列のライン座標を返す", () => {
    const { horizontal, vertical } = calculateGridLines(2, 3, 10);

    expect(horizontal).toEqual([0, 10, 20]);
    expect(vertical).toEqual([0, 10, 20, 30]);
  });

  it("pointToCellが座標をセル位置に変換する", () => {
    expect(pointToCell(15, 25, 5, 5, 10)).toEqual({ row: 2, col: 1 });
    expect(pointToCell(-5, 10, 5, 5, 10)).toBeNull();
    expect(pointToCell(60, 10, 5, 5, 10)).toBeNull();
  });

  it("getCellBoundsがセルの座標境界を返す", () => {
    expect(getCellBounds(2, 4, 16)).toEqual({ x: 64, y: 32, size: 16 });
    expect(getCellBounds(-1, -3, 16)).toEqual({ x: 0, y: 0, size: 16 });
  });
});
