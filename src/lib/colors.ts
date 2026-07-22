// Shared color tokens for node rendering across 1D/2D/3D scene renderers.
import type { Sidecar, Silence } from "../types/sidecar";

export const SILENCE_COLOR: Record<Silence, string> = {
  OutOfScope: "#9c9a92",
  Evaded: "#c0392b",
  Dissolved: "#4b8b6f",
  Anachronistic: "#c9c7bd",
};

export const MODE_COLOR: Record<Sidecar["mode"], string> = {
  standard: "#D97757",
  precursor: "#5b6b8c",
};

/** X/Y/Z identity colors shared by axes and multi-value coverage rails. */
export const AXIS_COLOR = ["#b95f43", "#52688f", "#6a4c93"] as const;

/** Gap cell states: occupied uses green, impossible uses red, unknown stays neutral. */
export const GAP_COLOR = {
  occupiedLow: "#8fd3aa",
  occupiedHigh: "#16834f",
  impossible: "#d13c35",
  unknown: "#aaa79c",
} as const;
