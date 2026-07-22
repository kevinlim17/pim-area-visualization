// Controlled-vocabulary snapshot from
// skills/pim-paper-12axis-digest/references/axis-taxonomy.md (v1.4, 2026-07-21).
//
// This is a build-time snapshot, not a live parse of the taxonomy markdown —
// dev-plan §10 asks the app not to hardcode a taxonomy version, but parsing
// prose markdown at runtime is out of scope for M1. If axis-taxonomy.md gets
// a new promoted tag, this file must be updated by hand to match.
//
// Axes not listed here (14_lineage, which is structural rather than
// tag-based) are skipped by vocabulary validation.

export const AXIS_VOCAB: Record<string, string[]> = {
  "1_location": [
    "Cell", "DataArray", "RowBuffer", "Subarray", "Periphery", "Bank",
    "LogicDie", "BufferChip", "MemoryController", "NearMemDevice",
    "SameDie-Processor", "SameDie-Peer", "HostOnly", "Not addressed",
  ],
  "2a_approach": ["PUM", "PNM", "Hybrid", "Agnostic", "Not addressed"],
  "2b_technology": [
    "CommodityDRAM", "eDRAM", "HBM", "HMC", "LPDDR", "GDDR", "UPMEM", "SRAM",
    "ReRAM", "PCM", "STT-MRAM", "FeFET", "NVM-generic", "CXL-attached",
    "Not addressed",
  ],
  "3_programmability": [
    "FixedFunction", "ConfigurableFixed", "ISAExtension", "SIMDLanes",
    "ProgrammableCore", "Reconfigurable", "Not addressed",
  ],
  "4a_parallelism": [
    "Cell", "Subarray", "Bank", "PseudoChannel", "Channel", "Vault", "Rank",
    "Die", "Stack", "Module", "MultiDevice", "Not addressed",
  ],
  "4b_offload": [
    "Instruction", "Sub-Operator", "Operator", "Function", "Kernel",
    "Application", "NoOffload-Resident", "BulkData", "Not addressed",
  ],
  "4c_data_gran": [
    "Bit", "Byte", "Word", "Vector", "CacheLine", "DRAMRow", "Page",
    "Tensor", "Not addressed",
  ],
  "5a_comm": [
    "MemoryMappedIO", "CustomDRAMCommand", "ISAInstruction", "PacketProtocol",
    "DMA", "SharedMemory", "MessagePassing", "NoC-Mesh", "CXL.mem",
    "Not addressed",
  ],
  "5b_coherency": [
    "HW-Coherent-FineGrained", "HW-Coherent-Coarse", "Speculative",
    "SW-Managed-Flush", "UncacheableRegion", "NoCoherence",
    "Host-Driven-NoAutonomousWrite", "ConfigurableCoherence",
    "GPU-L2-WriteThrough", "Not addressed",
  ],
  "5c_consistency": [
    "SequentialConsistency", "TSO", "RelaxedWithFences", "ReleaseConsistency",
    "KernelBoundarySync", "Not addressed",
  ],
  "6a_workload_analysis": [
    "Quantitative-Profiling", "Roofline", "Qualitative", "Assumed",
    "Not addressed",
  ],
  "6b_workload_class": [
    "Static-Compiler", "Static-Programmer", "Profile-Guided",
    "Runtime-Dynamic", "HW-Predictor", "Search-Based", "None",
    "Not addressed",
  ],
  "7a_solved": [
    "OffChipBandwidth", "MemoryLatency", "DataMovementEnergy",
    "CacheThrashing", "PointerChasing", "BulkCopyCost", "IrregularAccess",
    "CapacityLimit", "ComputeThroughput", "HostPIMTransfer",
    "CommandBandwidth", "ProgrammingBurden", "DesignSpaceCost",
    "Overfetch", "PipelineUtilization", "WireDelayScaling",
  ],
  "8a_offload_mech": [
    "LibraryAPI", "IntrinsicsBuiltins", "CompilerPass", "DSL",
    "FrameworkPlugin", "DriverRuntime", "DSE-Tool", "ManualAssembly",
    "MemoryController-orchestrated", "Not addressed",
  ],
  "8b_os_runtime": [
    "OS-Modification", "DeviceDriver", "RuntimeScheduler",
    "MemoryAllocator-Custom", "SupervisorSoftware", "NoneRequired",
    "Not addressed",
  ],
  "9a_hw_change": [
    "NoHWChange", "MinimalDRAMChange", "PeripheryAddition",
    "LogicDieAddition", "MonolithicIntegration", "NewMemoryArch",
    "NewDevice", "Not addressed",
  ],
  "9b_verify": [
    "FPGA-Prototype", "ASIC-Tapeout", "SPICE-Circuit", "SynthesisOnly",
    "RealCommercialPIM", "SimulationOnly", "AnalyticalOnly",
    "Not addressed",
  ],
  "10_application": [
    "CNN", "RNN-LSTM", "MLP", "Transformer-Attention", "ILGA", "LLM-Inference",
    "LLM-Training", "Embedding-Recommendation", "GNN", "HDC",
    "GraphProcessing", "Database-Query", "ANNS", "Genomics", "TimeSeries",
    "SparseLinearAlgebra", "DenseGEMM", "Cryptography", "ImageProcessing",
    "Mobile-Consumer", "HPC-Stencil", "General-Purpose", "Not addressed",
  ],
  "11a_eval_method": [
    "AnalyticalModel", "CycleAccurateSim", "TraceDrivenSim", "FullSystemSim",
    "CircuitSim", "SynthesisEstimate", "FPGAEmulation", "RealHardware",
    "Hybrid",
  ],
  "11b_tools": [
    "gem5", "Ramulator", "Ramulator2", "DRAMSim2", "DRAMSim3", "ZSim",
    "Sniper", "GPGPU-Sim", "Accel-Sim", "NeuroSim", "CACTI", "SPICE-HSPICE",
    "Synopsys-DC", "Cadence", "MultiPIM", "DAMOV", "PIMSim", "MPU-Sim",
    "AttAcc-Sim", "HBM-PIM-Sim", "In-House", "Not specified",
  ],
  "11c_validation": [
    "Silicon-Validated", "Cross-Simulator", "Vendor-Datasheet",
    "PriorFigureReproduction", "Unvalidated",
  ],
  "11d_baseline": [
    "CPU", "GPU", "TPU-NPU", "PriorPIM", "IdealMemory", "EmulatedOriginal",
    "NoBaseline",
  ],
  "12a_translation": [
    "HostTLB", "PIM-side-TLB", "PIM-side-PageWalker", "RegionBasedPageTable",
    "PhysicallyContiguous-Reserved", "IdentityMapped", "SegmentBased",
    "Not addressed",
  ],
  "12b_mapping": [
    "DefaultInterleaving", "PIM-Aware-Interleaving", "SubarrayAligned",
    "BankAligned", "ChannelPartitioned", "Custom-Allocator",
    "Compiler-Directed-Layout", "Programmer-Managed", "Not addressed",
  ],
  "13_econ": [
    "FabricationOwner: DRAMVendor", "FabricationOwner: LogicVendor",
    "FabricationOwner: Foundry", "FabricationOwner: Integrated",
    "FabricationOwner: NoneRequired", "ProcessConflict", "NRE-Amortization",
    "CommodityInterchangeability", "TestCost", "Yield", "VolumeRequirement",
    "StandardizationPath", "NoEconomicArgument",
  ],
};

// Axis keys whose values are structural (not a flat tag vocabulary) and are
// therefore exempt from AXIS_VOCAB lookups.
export const VOCAB_EXEMPT_AXES = new Set(["14_lineage"]);
