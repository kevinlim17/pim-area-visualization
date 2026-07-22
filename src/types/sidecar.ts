// Mirrors skill-mod/sidecar-schema.json v0.1. Keep in sync manually when the schema changes.

export type Mode = "standard" | "precursor";

export type Silence = "OutOfScope" | "Evaded" | "Dissolved" | "Anachronistic";

export type RelationType =
  | "competes"
  | "complements"
  | "premise"
  | "subsumes"
  | "disjoint"
  | "lineage";

export type Direction = "undirected" | "to_target" | "from_target";

export interface Tag {
  v: string;
  primary?: boolean;
  note?: string;
  estimated?: boolean;
  segment?: string;
}

export type SetAxisKey = "7a_solved" | "13_econ" | "14_lineage";

export type LineageForm = "Direct" | "Reinvented" | "Transformed" | "Reframed";

export type AbandonReason =
  | "TechnicallyFalsified"
  | "EconomicallyInfeasible"
  | "SupersededByBetter"
  | "Unknown";

export interface TransmittedItem {
  to: string;
  form: LineageForm;
  note?: string;
}

export interface AbandonedItem {
  what: string;
  why: AbandonReason;
  note?: string;
}

/** Axis 14 is structural and intentionally does not use the normal tags[]. */
export interface LineageBlock {
  inherited?: Array<string | Record<string, unknown>>;
  coined?: Array<string | Record<string, unknown>>;
  transmitted?: Array<string | TransmittedItem>;
  abandoned?: Array<string | AbandonedItem>;
  evidence?: string;
  note?: string;
}

export interface AxisBlock {
  tags: Tag[];
  evidence?: string;
  note?: string;
  // DSE/meta-paper split (dev-plan §4.1 note #2): explored = design space the
  // paper surveys. In the actual sidecar corpus this is always free-text
  // prose (not a Tag[]), e.g. pathfinding-pim-hpca-24's 1_location.explored
  // = "Bank(UPMEM DPU per bank) + BufferChip(...)". There is no separate
  // `artifact` field in practice — the artifact/paper's-own-coordinate
  // reading is expressed via `tags[].note` and which tag is `primary`, so
  // `tags` already IS the artifact position. ProjectionEngine's `artifact ??
  // tags` fallback is kept for forward compatibility in case a future
  // sidecar does emit a real artifact: Tag[], but never fires today.
  explored?: string;
  artifact?: Tag[];
  [extra: string]: unknown;
}

export interface NotAddressedEntry {
  axis: string;
  silence: Silence;
  partial_evaded?: boolean;
  note?: string;
}

export interface RelationEntry {
  target: string;
  shared_axes: string[];
  divergent_axes: string[];
  type: RelationType;
  direction: Direction;
  note?: string;
}

export interface OtherTagEntry {
  axis: string;
  value: string;
  reason?: string;
  proposal?: string;
  status: "pending" | "promoted" | "one-off";
}

export interface ConsistencyFlagEntry {
  check: string;
  resolution: "pass" | "violation" | string;
  note?: string;
}

export interface Sidecar {
  schema_version: string;
  id: string;
  title: string;
  bib?: string;
  year: number;
  mode: Mode;
  file?: string;
  digest?: string;
  one_line: string;
  axes: Record<string, AxisBlock>;
  not_addressed: NotAddressedEntry[];
  relations: RelationEntry[];
  other_tags: OtherTagEntry[];
  consistency_flags: ConsistencyFlagEntry[];
}
