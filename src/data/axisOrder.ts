// Ordinal order definitions for the M1 target axes, transcribed from
// pim-flow-graph-dev-plan.md §4.2. Order is a claim, not a neutral fact —
// see dev-plan §1 and §10. Kevin can redefine these; for M1 they are a
// hardcoded default rather than a user-editable registry (deferred to M2+).

export interface OrdinalAxisDef {
  key: string;
  label: string;
  /** Tags in order, inner-to-outer / weak-to-strong per the taxonomy's stated direction. */
  order: string[];
  /**
   * Tags that belong to this axis but sit outside the ordinal hierarchy
   * (dev-plan §4.2, Axis 1's SameDie-* tags). Rendered on a separate
   * off-hierarchy lane rather than positioned within `order`.
   */
  offHierarchy?: string[];
}

export const ORDINAL_AXES: OrdinalAxisDef[] = [
  {
    key: "1_location",
    label: "Computation Location",
    order: [
      "Cell", "DataArray", "RowBuffer", "Subarray", "Periphery", "Bank",
      "LogicDie", "BufferChip", "MemoryController", "NearMemDevice",
      "HostOnly",
    ],
    offHierarchy: ["SameDie-Processor", "SameDie-Peer"],
  },
  {
    key: "3_programmability",
    label: "Programmability",
    order: [
      "FixedFunction", "ConfigurableFixed", "ISAExtension", "SIMDLanes",
      "ProgrammableCore", "Reconfigurable",
    ],
  },
  {
    key: "4a_parallelism",
    label: "Parallelism Level",
    order: [
      "Cell", "Subarray", "Bank", "PseudoChannel", "Channel", "Vault",
      "Rank", "Die", "Stack", "Module", "MultiDevice",
    ],
  },
  {
    key: "4b_offload",
    label: "Offload Granularity",
    order: [
      "Instruction", "Sub-Operator", "Operator", "Function", "Kernel",
      "Application", "NoOffload-Resident",
    ],
    // BulkData is orthogonal to this axis per dev-plan §4.2.
    offHierarchy: ["BulkData"],
  },
  {
    key: "4c_data_gran",
    label: "Data Granularity",
    order: [
      "Bit", "Byte", "Word", "Vector", "CacheLine", "DRAMRow", "Page",
      "Tensor",
    ],
  },
  {
    key: "11c_validation",
    label: "Validation Quality",
    order: [
      "Unvalidated", "PriorFigureReproduction", "Vendor-Datasheet",
      "Cross-Simulator", "Silicon-Validated",
    ],
  },
];

