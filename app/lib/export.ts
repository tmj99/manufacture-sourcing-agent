import * as XLSX from "xlsx";
import { type BatchSpecResult, type AgentData } from "./types";
import { geoMatch } from "./utils";

const NEXT_STEPS = [
  "Verify certification on site",
  "Confirm geographic location",
  "Assess production capacity",
  "Request RFI / NDA",
  "Check customer references",
  "Schedule intro call",
];

function toSheetName(spec: string, index: number, used: Set<string>): string {
  // Excel sheet names: max 31 chars, forbidden: \ / ? * [ ] :
  let base = spec.replace(/[\\/?*[\]:]/g, "").trim().slice(0, 28) || `Spec ${index + 1}`;
  let name = base;
  let n = 2;
  while (used.has(name)) name = `${base.slice(0, 25)} (${n++})`;
  used.add(name);
  return name;
}

function toFilename(s: string): string {
  return s.replace(/[^a-z0-9]/gi, "-").replace(/-{2,}/g, "-").slice(0, 40).toLowerCase();
}

function buildSheet(result: BatchSpecResult, drillData?: AgentData | null): XLSX.WorkSheet {
  // Build a domain → ShortlistEntry lookup so drilled-down rows get richer data
  const drillByDomain = new Map<string, AgentData["shortlist"][number]>();
  if (drillData) {
    for (const entry of drillData.shortlist) {
      drillByDomain.set(entry.primaryDomain, entry);
    }
  }

  const rows: (string | number)[][] = [
    ["Spec:", result.spec],
    ["Geography:", result.geography || "—"],
    ["Generated:", new Date().toISOString().split("T")[0]],
    [], // spacer
    // Column headers
    [
      "#",
      "Company Name",
      "Website URL",
      "Domain",
      "Location",
      "Geo Match",
      "Description / Highlights",
      "Certification Verified?",
      "Capacity Verified?",
      ...NEXT_STEPS,
      "Analyst Notes",
    ],
  ];

  if (result.status !== "completed" || result.candidates.length === 0) {
    rows.push([
      "",
      result.status !== "completed"
        ? `No data — spec returned ${result.status}`
        : "No candidates returned",
    ]);
  } else {
    for (let i = 0; i < result.candidates.length; i++) {
      const c = result.candidates[i];
      const matched = geoMatch(c.location, result.geography);
      const drill = drillByDomain.get(c.domain);

      rows.push([
        i + 1,
        c.name || "",
        c.url || "",
        c.domain || "",
        c.location || "",
        matched ? "✓" : "?",
        c.description || "",
        drill ? drill.certificationsFound.join(", ") || "None found" : "Unconfirmed",
        drill ? drill.capabilitiesMatched.join("; ") || "Unconfirmed" : "Unconfirmed",
        ...NEXT_STEPS.map(() => "☐"),
        "",
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths (one entry per column in order)
  ws["!cols"] = [
    { wch: 4 },   // #
    { wch: 28 },  // Company Name
    { wch: 42 },  // Website URL
    { wch: 24 },  // Domain
    { wch: 10 },  // Location
    { wch: 10 },  // Geo Match
    { wch: 52 },  // Description
    { wch: 24 },  // Certification Verified?
    { wch: 24 },  // Capacity Verified?
    ...NEXT_STEPS.map(() => ({ wch: 28 })),
    { wch: 32 },  // Analyst Notes
  ];

  // Hyperlinks on Website URL column (col index 2)
  // Row layout: 0=Spec, 1=Geo, 2=Date, 3=blank, 4=header, 5+=data
  const DATA_START = 5;
  if (result.status === "completed") {
    result.candidates.forEach((c, i) => {
      if (c.url) {
        const ref = XLSX.utils.encode_cell({ r: DATA_START + i, c: 2 });
        if (ws[ref]) ws[ref].l = { Target: c.url };
      }
    });
  }

  return ws;
}

export function exportSpecToExcel(
  result: BatchSpecResult,
  drillData?: AgentData | null
): void {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  XLSX.utils.book_append_sheet(wb, buildSheet(result, drillData), toSheetName(result.spec, 0, used));
  XLSX.writeFile(wb, `sourcing-${toFilename(result.spec)}.xlsx`);
}

export function exportAllToExcel(
  results: BatchSpecResult[],
  drillDataList: (AgentData | null)[]
): void {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  results.forEach((r, i) => {
    XLSX.utils.book_append_sheet(wb, buildSheet(r, drillDataList[i]), toSheetName(r.spec, i, used));
  });
  XLSX.writeFile(wb, "sourcing-batch.xlsx");
}
