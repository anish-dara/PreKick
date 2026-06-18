import type { DealProfileRow } from "@/lib/types";

export type Confidence = "high" | "review";
export type Field = { label: string; value: string; confidence: Confidence; reviewNote?: string };

const CUSTOMER_LABELS: Record<string, string> = {
  "customer.legalEntity": "Legal entity",
  "customer.billingEntity": "Billing entity",
  "customer.address": "Headquarters",
  "customer.industry": "Industry",
  "customer.sizeBand": "Size",
  "customer.region": "Region",
};

const COMMERCIAL_LABELS: Record<string, string> = {
  "commercial.totalValue": "Contract value",
  "commercial.currency": "Billing currency",
  "commercial.paymentTerms": "Payment terms",
  "commercial.poNumber": "PO number",
  "commercial.termLength": "Term",
};

const DOC_INFO: Record<string, { label: string; reason: string }> = {
  orderForm: { label: "Order Form", reason: "Commercial execution" },
  billingSetup: { label: "Billing Setup", reason: "Separate billing entity" },
  kickoffTemplate: { label: "Kickoff Template", reason: "Standard for all engagements" },
  soc2Request: { label: "SOC 2 Request", reason: "Enterprise security review" },
  securityQuestionnaire: { label: "Security Questionnaire", reason: "Enterprise security review" },
  dpa: { label: "DPA", reason: "Personal data processing" },
  gdprAddendum: { label: "GDPR Addendum", reason: "EU customer" },
  dataResidencyConfirmation: { label: "Data Residency Confirmation", reason: "EU customer" },
  baa: { label: "BAA", reason: "Healthcare industry" },
  w9: { label: "W-9", reason: "US entity" },
  w8: { label: "W-8", reason: "Non-US entity" },
};

function confidenceFor(profile: DealProfileRow, path: string): { confidence: Confidence; reviewNote?: string } {
  const raw = profile.meta?.fieldConfidence?.[path];
  const flagged = profile.meta?.flaggedForReview?.includes(path);
  if (raw === "high" && !flagged) return { confidence: "high" };
  return { confidence: "review", reviewNote: profile.meta?.fieldSource?.[path] ?? "Flagged for review" };
}

function fieldRow(profile: DealProfileRow, path: string, label: string, value: string | null | undefined): Field {
  return { label, value: value && value.length > 0 ? value : "—", ...confidenceFor(profile, path) };
}

export function buildCustomerFields(profile: DealProfileRow): Field[] {
  const c = profile.customer ?? {};
  return [
    fieldRow(profile, "customer.legalEntity", CUSTOMER_LABELS["customer.legalEntity"], c.legalEntity),
    fieldRow(profile, "customer.billingEntity", CUSTOMER_LABELS["customer.billingEntity"], c.billingEntity),
    fieldRow(profile, "customer.address", CUSTOMER_LABELS["customer.address"], c.address),
    fieldRow(profile, "customer.industry", CUSTOMER_LABELS["customer.industry"], c.industry),
    fieldRow(
      profile,
      "customer.sizeBand",
      CUSTOMER_LABELS["customer.sizeBand"],
      c.sizeBand ? c.sizeBand[0].toUpperCase() + c.sizeBand.slice(1) : undefined,
    ),
  ];
}

export function buildCommercialFields(profile: DealProfileRow): Field[] {
  const c = profile.commercial ?? {};
  const valueDisplay =
    c.totalValue != null ? `${c.totalValue.toLocaleString()} ${c.currency ?? ""}`.trim() : undefined;
  const poDisplay = c.poNumber ?? (c.poRequired ? "Required — not yet provided" : "Not required");

  return [
    fieldRow(profile, "commercial.totalValue", COMMERCIAL_LABELS["commercial.totalValue"], valueDisplay),
    fieldRow(profile, "commercial.currency", COMMERCIAL_LABELS["commercial.currency"], c.currency),
    fieldRow(profile, "commercial.paymentTerms", COMMERCIAL_LABELS["commercial.paymentTerms"], c.paymentTerms),
    fieldRow(profile, "commercial.poNumber", COMMERCIAL_LABELS["commercial.poNumber"], poDisplay),
    fieldRow(profile, "commercial.termLength", COMMERCIAL_LABELS["commercial.termLength"], c.termLength),
  ];
}

export function buildComplianceChips(profile: DealProfileRow): Array<{ label: string; reason: string }> {
  const docs = profile.compliance?.requiredDocs ?? [];
  return docs.map((code) => DOC_INFO[code] ?? { label: code, reason: "Derived from deal profile" });
}

export function flaggedCount(profile: DealProfileRow): number {
  return profile.meta?.flaggedForReview?.length ?? 0;
}
