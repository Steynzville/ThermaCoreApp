const documentList = [
  {
    id: "machine-spec-sheet-model-x",
    name: "Machine Spec Sheet (Model X)",
    description: "Detailed specifications for Machine Model X.",
    url: "/documents/machine-spec-sheet-model-x.pdf",
    allowedRoles: ["admin", "user"],
  },
  {
    id: "user-manual-v1-2",
    name: "User Manual (v1.2)",
    description: "Comprehensive user manual for the latest version.",
    url: "/documents/user-manual-v1-2.pdf",
    allowedRoles: ["admin", "user"],
  },
  {
    id: "internal-maintenance-guide-confidential",
    name: "Internal Maintenance Guide (Confidential)",
    description: "Confidential guide for internal maintenance procedures.",
    url: "/documents/internal-maintenance-guide-confidential.pdf",
    allowedRoles: ["admin"],
  },
  {
    id: "compliance-certificate-2025-internal",
    name: "Compliance Certificate 2025 (Internal)",
    description: "Internal compliance certificate for the year 2025.",
    url: "/documents/compliance-certificate-2025-internal.pdf",
    allowedRoles: ["admin"],
  },
];

export default documentList;
