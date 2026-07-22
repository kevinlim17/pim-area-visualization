import { describe, expect, it } from "vitest";
import type { Sidecar } from "../types/sidecar";
import { computeGrid, resolveNodeCells } from "./gapEngine";

function paper(id: string, axes: Record<string, string[]>): Sidecar {
  return {
    schema_version: "0.1",
    id,
    title: id,
    year: 2026,
    mode: "standard",
    one_line: id,
    axes: Object.fromEntries(
      Object.entries(axes).map(([axisKey, values]) => [axisKey, { tags: values.map((v) => ({ v })) }])
    ),
    not_addressed: [],
    relations: [],
    other_tags: [],
    consistency_flags: [],
  };
}

describe("GapEngine", () => {
  it("marks every real multi-tag combination as occupied", () => {
    const node = paper("multi", {
      "1_location": ["Bank", "Periphery"],
      "3_programmability": ["FixedFunction", "SIMDLanes"],
    });
    const grid = computeGrid([node], ["1_location", "3_programmability"]);
    const occupied = grid.cells
      .filter((cell) => cell.count > 0)
      .map((cell) => `${cell.axisValues["1_location"]}:${cell.axisValues["3_programmability"]}`)
      .sort();
    expect(occupied).toEqual([
      "Bank:FixedFunction",
      "Bank:SIMDLanes",
      "Periphery:FixedFunction",
      "Periphery:SIMDLanes",
    ]);
  });

  it("does not turn a centroid into a fake occupied cell", () => {
    const node = paper("spread", {
      "1_location": ["Bank", "NearMemDevice"],
      "3_programmability": ["FixedFunction"],
    });
    const grid = computeGrid([node], ["1_location", "3_programmability"]);
    const bufferChip = grid.cells.find((cell) =>
      cell.axisValues["1_location"] === "BufferChip" &&
      cell.axisValues["3_programmability"] === "FixedFunction"
    );
    expect(bufferChip?.count).toBe(0);
  });

  it("keeps occupancy equivalent when X and Y are swapped", () => {
    const node = paper("swap", {
      "1_location": ["Bank", "Periphery"],
      "3_programmability": ["FixedFunction"],
    });
    const xy = computeGrid([node], ["1_location", "3_programmability"]);
    const yx = computeGrid([node], ["3_programmability", "1_location"]);
    expect(xy.occupiedCount).toBe(yx.occupiedCount);
    expect(xy.occupiedCount).toBe(2);
  });

  it("excludes silence and off-hierarchy tags from the main grid", () => {
    const silent = paper("silent", { "1_location": ["Not addressed"] });
    const offHierarchy = paper("off", { "1_location": ["SameDie-Processor"] });
    expect(resolveNodeCells(silent, ["1_location"])).toEqual([]);
    expect(resolveNodeCells(offHierarchy, ["1_location"])).toEqual([]);
    expect(computeGrid([silent, offHierarchy], ["1_location"]).occupiedCount).toBe(0);
  });

  it("evaluates the true three-axis rule #13", () => {
    const grid = computeGrid([], ["1_location", "9a_hw_change", "2a_approach"]);
    const impossible = grid.cells.find((cell) =>
      cell.axisValues["1_location"] === "Bank" &&
      cell.axisValues["9a_hw_change"] === "PeripheryAddition" &&
      cell.axisValues["2a_approach"] === "PUM"
    );
    expect(impossible?.plausibility).toBe("impossible");
    expect(impossible?.ruleIds).toContain("#13");
  });
});
