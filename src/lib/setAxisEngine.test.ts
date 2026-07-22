import { describe, expect, it } from "vitest";
import type { Sidecar } from "../types/sidecar";
import {
  computeSetOverlay,
  edgeOverlayOpacity,
  getSetAxisMembers,
  getSetAxisValues,
  normalizeLineageBlock,
} from "./setAxisEngine";

function paper(
  id: string,
  axes: Record<string, unknown>,
  relations: Sidecar["relations"] = []
): Sidecar {
  return {
    schema_version: "0.1",
    id,
    title: id,
    year: 2020,
    mode: "standard",
    one_line: id,
    axes: axes as Sidecar["axes"],
    not_addressed: [],
    relations,
    other_tags: [],
    consistency_flags: [],
  };
}

describe("setAxisEngine", () => {
  it("orders 7a members by controlled vocabulary and puts custom values last", () => {
    const nodes = [
      paper("a", { "7a_solved": { tags: [{ v: "ProgrammingBurden" }, { v: "Other: Custom" }] } }),
      paper("b", { "7a_solved": { tags: [{ v: "OffChipBandwidth" }] } }),
      paper("c", { "7a_solved": { tags: [{ v: "ProgrammingBurden" }] } }),
    ];
    expect(getSetAxisMembers(nodes, "7a_solved")).toEqual([
      { value: "OffChipBandwidth", count: 1 },
      { value: "ProgrammingBurden", count: 2 },
      { value: "Other: Custom", count: 1 },
    ]);
  });

  it("keeps NoEconomicArgument distinct from missing economic data", () => {
    const explicit = paper("explicit", { "13_econ": { tags: [{ v: "NoEconomicArgument" }] } });
    const missing = paper("missing", { "13_econ": { tags: [] } });
    const result = computeSetOverlay(
      [explicit, missing],
      { axis: "13_econ", member: "NoEconomicArgument" }
    );
    expect(result.nodes.get("explicit")).toMatchObject({ available: true, matched: true });
    expect(result.nodes.get("missing")).toMatchObject({ available: false, matched: false });
  });

  it("normalizes mixed string and object lineage items", () => {
    const node = paper("mixed", {
      "14_lineage": {
        inherited: ["IRAM"],
        coined: [{ text: "New idea", note: "detail" }],
        transmitted: ["→ external", { to: "local", form: "Direct", note: "citation" }],
        abandoned: ["old idea", { what: "full integration", why: "EconomicallyInfeasible" }],
      },
    });
    const lineage = normalizeLineageBlock(node);
    expect(lineage.inherited[0].text).toBe("IRAM");
    expect(lineage.coined[0]).toMatchObject({ text: "New idea", note: "detail" });
    expect(lineage.transmitted.map((item) => item.to)).toEqual(["external", "local"]);
    expect(lineage.abandoned[1]).toMatchObject({
      what: "full integration",
      why: "EconomicallyInfeasible",
      validReason: true,
    });
  });

  it("deduplicates reciprocal lineage declarations and assigns directed roles", () => {
    const ancestor = paper(
      "ancestor",
      { "14_lineage": { inherited: [], coined: ["origin"], transmitted: [], abandoned: [] } },
      [{ target: "descendant", shared_axes: ["14_lineage"], divergent_axes: [], type: "lineage", direction: "to_target" }]
    );
    const descendant = paper(
      "descendant",
      { "14_lineage": { inherited: ["origin"], coined: [], transmitted: [], abandoned: [] } },
      [{ target: "ancestor", shared_axes: ["14_lineage"], divergent_axes: [], type: "lineage", direction: "from_target" }]
    );
    const outsider = paper("outsider", { "14_lineage": { inherited: ["external"], coined: [], transmitted: [], abandoned: [] } });
    const result = computeSetOverlay([ancestor, descendant, outsider], { axis: "14_lineage", member: null });
    expect(result.lineageEdgeCount).toBe(1);
    expect(result.matchedCount).toBe(2);
    expect(result.nodes.get("ancestor")?.lineageRole).toBe("source");
    expect(result.nodes.get("descendant")?.lineageRole).toBe("target");
    expect(result.nodes.get("outsider")?.lineageRole).toBe("none");
    expect(edgeOverlayOpacity(result, "ancestor", "descendant", null)).toBe(1);
    expect(edgeOverlayOpacity(result, "ancestor", "outsider", null)).toBe(0.06);
  });

  it("does not turn external transmitted text into a local edge", () => {
    const node = paper("only", {
      "14_lineage": {
        inherited: [], coined: [],
        transmitted: [{ to: "HBM-PIM", form: "Transformed" }],
        abandoned: [],
      },
    });
    const result = computeSetOverlay([node], { axis: "14_lineage", member: null });
    expect(getSetAxisValues(node, "14_lineage")).toContain("HBM-PIM");
    expect(result.lineageEdgeCount).toBe(0);
    expect(result.matchedCount).toBe(0);
  });
});
