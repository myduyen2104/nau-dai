import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const manifestPath = new URL("../../data-archive/catalog-cleanup/eligibility-manifest.json", import.meta.url);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const decisionsByUrl = new Map(manifest.entries.map((entry) => [entry.sourceUrl, entry]));

export function sourceRecordUrl(record) {
  const id = String(record?.id ?? "");
  const raw = record?.source_url ?? record?.sourceUrl ?? id;
  return String(raw).replace(/#variant-\d+$/, "");
}

export function getDinhduongEligibilityDecision(recordOrUrl) {
  const url = typeof recordOrUrl === "string" ? recordOrUrl.replace(/#variant-\d+$/, "") : sourceRecordUrl(recordOrUrl);
  return decisionsByUrl.get(url) ?? { sourceUrl: url, decision: "KEEP", reason: "No exact exclusion or review decision; preserve source record." };
}

export function isDinhduongSourceRecordEligible(record) {
  // REVIEW is retained in the audit/source archive but held out of the user-facing
  // catalog until a human resolves the ambiguity.
  return getDinhduongEligibilityDecision(record).decision === "KEEP";
}

export function isDinhduongSourceRecordReview(record) {
  return getDinhduongEligibilityDecision(record).decision === "REVIEW";
}

export function getDinhduongEligibilityPolicyVersion() {
  return manifest.policyVersion;
}
