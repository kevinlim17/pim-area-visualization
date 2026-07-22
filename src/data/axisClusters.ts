// Slot arrays for the nominal/binary axes (dev-plan §4.3). Reuses the same
// {key,label,order,offHierarchy?} shape as axisOrder.ts's ordinal axes —
// the math (index -> [0,1] position) is identical for ordinal and nominal;
// what differs is only whether the order carries a magnitude claim. That
// distinction is surfaced in the UI via AXIS_TYPES badges, not here.
//
// Adjacency within each `order` array *is* the clustering dev-plan §4.3
// asks for (related tags placed next to each other) — no separate cluster
// metadata is needed.

import type { OrdinalAxisDef } from "./axisOrder";

export const CATEGORICAL_AXES: OrdinalAxisDef[] = [
  {
    key: "2a_approach",
    label: "Approach (PUM/PNM)",
    order: ["PUM", "Hybrid", "PNM"],
    // Agnostic doesn't sit on the PUM<->PNM spectrum at all.
    offHierarchy: ["Agnostic"],
  },
  {
    key: "2b_technology",
    label: "Memory Technology",
    order: [
      // commodity/stacked DRAM family
      "CommodityDRAM", "LPDDR", "GDDR", "eDRAM", "HBM", "HMC", "UPMEM",
      "SRAM",
      // emerging NVM family
      "ReRAM", "PCM", "STT-MRAM", "FeFET", "NVM-generic",
      "CXL-attached",
    ],
  },
  {
    key: "5a_comm",
    label: "Communication",
    order: [
      // simple/direct access
      "MemoryMappedIO", "DMA", "SharedMemory",
      // command-driven
      "CustomDRAMCommand", "ISAInstruction",
      // network/packet
      "PacketProtocol", "MessagePassing", "NoC-Mesh", "CXL.mem",
    ],
  },
  {
    key: "6b_workload_class",
    label: "Workload Classification",
    order: [
      "None", "Static-Programmer", "Static-Compiler", "Profile-Guided",
      "Runtime-Dynamic", "HW-Predictor", "Search-Based",
    ],
  },
  {
    key: "8a_offload_mech",
    label: "Offload Mechanism",
    order: [
      "ManualAssembly", "IntrinsicsBuiltins", "LibraryAPI", "DSL",
      "CompilerPass", "FrameworkPlugin", "DriverRuntime",
      // one-off promotion (v1.4): no SW layer at all, controller issues
      // commands directly — sits past DriverRuntime on the "how much
      // software mediates this" spectrum.
      "MemoryController-orchestrated",
    ],
  },
  {
    key: "9a_hw_change",
    label: "HW Change",
    order: [
      "NoHWChange", "MinimalDRAMChange", "PeripheryAddition",
      "LogicDieAddition", "MonolithicIntegration", "NewMemoryArch",
      "NewDevice",
    ],
  },
  {
    key: "10_application",
    label: "Application Field",
    order: [
      // neural-network family
      "CNN", "RNN-LSTM", "MLP", "Transformer-Attention",
      // one-off promotion (v1.4): attention-variant pattern, not a
      // taxonomy segment — placed next to Transformer-Attention since it's
      // that family, pending a possible attention-variant sub-axis later.
      "ILGA",
      "LLM-Inference",
      "LLM-Training",
      "Embedding-Recommendation",
      // graph family
      "GNN", "GraphProcessing", "HDC",
      // data-intensive / search family
      "Database-Query",
      // one-off promotion (v1.4): vector DB / RAG search — adjacent to
      // Database-Query but a distinct access pattern (graph index + PQ codebook lookups).
      "ANNS",
      "Genomics", "TimeSeries",
      // linear-algebra / HPC family
      "SparseLinearAlgebra", "DenseGEMM", "HPC-Stencil",
      // other domains
      "Cryptography", "ImageProcessing", "Mobile-Consumer", "General-Purpose",
    ],
  },
  {
    key: "11b_tools",
    label: "Tools",
    order: [
      // memory simulators
      "Ramulator", "Ramulator2", "DRAMSim2", "DRAMSim3", "MultiPIM",
      "DAMOV", "PIMSim", "MPU-Sim", "HBM-PIM-Sim", "AttAcc-Sim",
      // full-system / CPU simulators
      "gem5", "ZSim", "Sniper",
      // GPU simulators
      "GPGPU-Sim", "Accel-Sim",
      // circuit / analog
      "NeuroSim", "CACTI", "SPICE-HSPICE",
      // synthesis / ASIC
      "Synopsys-DC", "Cadence",
      "In-House", "Not specified",
    ],
  },
];
