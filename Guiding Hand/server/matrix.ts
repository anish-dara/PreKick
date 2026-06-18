import type { DealProfile } from "./types.ts";

/** Required-documents matrix from BUILD_BRIEF.md / CURSOR_INSTRUCTIONS.md section 4. */
export function computeRequiredDocs(customer: DealProfile["customer"]): string[] {
  const docs = new Set<string>(["orderForm", "billingSetup", "kickoffTemplate"]);

  const region = (customer.region ?? "").toUpperCase();
  const sizeBand = (customer.sizeBand ?? "").toLowerCase();
  const industry = (customer.industry ?? "").toLowerCase();
  const isEU = region === "EU" || region === "EEA";
  const isUS = region === "US";

  if (sizeBand === "enterprise") {
    docs.add("soc2Request");
    docs.add("securityQuestionnaire");
  }

  // "Any data processing" — true for every CRM/customer-data engagement in this product's domain.
  docs.add("dpa");

  if (isEU) {
    docs.add("gdprAddendum");
    docs.add("dataResidencyConfirmation");
  }

  if (industry === "healthcare") {
    docs.add("baa");
  }

  docs.add(isUS ? "w9" : "w8");

  return Array.from(docs);
}
