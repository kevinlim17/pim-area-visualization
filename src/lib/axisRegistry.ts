// AxisRegistry: axis-type classification (dev-plan §4.1) and the scale
// function that turns a tag value into a normalized [0,1] position (or a
// special off-hierarchy / silence marker). Covers ordinal axes (§4.2 order
// is a magnitude claim) and nominal/binary axes (§4.3 order is just
// clustering) through one merged slot lookup — the projection math doesn't
// care which kind an axis is, only the UI badge does.

import { ORDINAL_AXES, type OrdinalAxisDef } from "../data/axisOrder";
import { CATEGORICAL_AXES } from "../data/axisClusters";
import { AXIS_VOCAB } from "../data/axisVocab";
import type { Sidecar } from "../types/sidecar";

export type AxisType = "ordinal" | "nominal" | "binary" | "set";

// Classification per dev-plan §4.1, used for AxisSelector badges. Set-type
// axes are never spatially selectable (M4: color/size/heatmap instead).
export const AXIS_TYPES: Record<string, AxisType> = {
  "1_location": "ordinal",
  "3_programmability": "ordinal",
  "4a_parallelism": "ordinal",
  "4b_offload": "ordinal",
  "4c_data_gran": "ordinal",
  "11c_validation": "ordinal",
  "2b_technology": "nominal",
  "5a_comm": "nominal",
  "6b_workload_class": "nominal",
  "8a_offload_mech": "nominal",
  "10_application": "nominal",
  "11b_tools": "nominal",
  "2a_approach": "binary",
  "9a_hw_change": "binary",
  "7a_solved": "set",
  "13_econ": "set",
  "14_lineage": "set",
};

export function axisType(axisKey: string): AxisType {
  return AXIS_TYPES[axisKey] ?? "nominal";
}

const EXPLICIT_AXIS_DEFS = [...ORDINAL_AXES, ...CATEGORICAL_AXES];
const EXPLICIT_AXIS_KEYS = new Set(EXPLICIT_AXIS_DEFS.map((def) => def.key));

// Axes without a hand-curated spatial order still remain usable as nominal
// slots. Their controlled-vocabulary order is stable and lets the UI select an
// axis even when only part of the corpus contains a value for it.
const VOCAB_AXIS_DEFS: OrdinalAxisDef[] = Object.entries(AXIS_VOCAB)
  .filter(([key]) => axisType(key) !== "set" && !EXPLICIT_AXIS_KEYS.has(key))
  .map(([key, values]) => ({
    key,
    label: key,
    order: values.filter((value) => value !== "Not addressed"),
  }));

const AXIS_SLOT_DEFS: Record<string, OrdinalAxisDef> = Object.fromEntries(
  [...EXPLICIT_AXIS_DEFS, ...VOCAB_AXIS_DEFS].map((def) => [def.key, def])
);

/** Slot definition (order + off-hierarchy lane) for any spatially-selectable axis. */
export function getAxisSlots(axisKey: string): OrdinalAxisDef | undefined {
  return AXIS_SLOT_DEFS[axisKey];
}

/** Selectable as a spatial axis (M2: everything except set-type). */
export function isSelectable(axisKey: string): boolean {
  return axisKey in AXIS_SLOT_DEFS;
}

/** True when a paper has at least one value that can be plotted on the axis. */
export function hasAxisValue(node: Sidecar, axisKey: string): boolean {
  const block = node.axes[axisKey];
  const tags = block?.artifact ?? block?.tags ?? [];
  return tags.some((tag) => tag.v !== "Not addressed" && scaleAxisTag(axisKey, tag.v) !== null);
}

export type AxisPosition =
  | { kind: "value"; t: number }
  | { kind: "offHierarchy"; label: string }
  | { kind: "unknownTag"; label: string };

/** Position a single tag value on an axis's [0,1] slot scale. */
export function scaleAxisTag(axisKey: string, tagValue: string): AxisPosition | null {
  const axis = getAxisSlots(axisKey);
  if (!axis) return null;
  if (axis.offHierarchy?.includes(tagValue)) {
    return { kind: "offHierarchy", label: tagValue };
  }
  const idx = axis.order.indexOf(tagValue);
  if (idx === -1) return { kind: "unknownTag", label: tagValue };
  const t = axis.order.length === 1 ? 0.5 : idx / (axis.order.length - 1);
  return { kind: "value", t };
}
