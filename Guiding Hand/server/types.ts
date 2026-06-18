export type StakeholderRole = "sponsor" | "projectLead" | "it" | "finance" | "champion" | "procurement";

export type DealStakeholder = {
  id: string;
  name: string;
  email: string | null;
  role: StakeholderRole;
  phone: string | null;
};

export type DealProfile = {
  id: string;
  customer: {
    legalEntity?: string;
    billingEntity?: string;
    address?: string;
    billingAddress?: string;
    taxId?: string | null;
    industry?: string;
    sizeBand?: string;
    region?: string;
  };
  commercial: {
    totalValue?: number | null;
    currency?: string;
    paymentTerms?: string;
    milestones?: string[];
    poRequired?: boolean;
    poNumber?: string | null;
    termLength?: string;
  };
  scope: {
    summary?: string;
    deliverables?: string[];
    exclusions?: string[];
    startDate?: string | null;
    goLiveDate?: string | null;
    milestones?: string[];
    dependencies?: string[];
  };
  stakeholders: DealStakeholder[];
  compliance: {
    requiredDocs?: string[];
    flaggedClauses?: string[];
    dataResidency?: string | null;
    securityLevel?: string;
  };
  meta: {
    fieldConfidence?: Record<string, "high" | "medium" | "low">;
    fieldSource?: Record<string, string>;
    flaggedForReview?: string[];
  };
  createdAt: string;
};

export type CallStatus = "scheduled" | "inProgress" | "completed" | "failed";

export type StakeholderCall = {
  id: string;
  dealProfileId: string;
  stakeholderId: string;
  role: string;
  status: CallStatus;
  transcript: string | null;
  extractedData: Record<string, string> | null;
  generatedDocId: string | null;
  createdAt: string;
};

export type GeneratedDocument = {
  id: string;
  dealProfileId: string;
  type: string;
  fields: Record<string, string>;
  fillTypes: Record<string, string>;
  flaggedBlanks: string[];
  createdAt: string;
};

export type ConflictCategory = "timeline" | "successCriteria" | "authority" | "assumption" | "political";

export type Conflict = {
  category: ConflictCategory;
  stakeholderA: string;
  quoteA: string;
  stakeholderB: string;
  quoteB: string;
  severity: "high" | "medium" | "low";
  suggestedResolution: string;
};

export type ConflictMap = {
  id: string;
  dealProfileId: string;
  conflicts: Conflict[];
  createdAt: string;
};

export type KickoffPacket = {
  id: string;
  dealProfileId: string;
  executiveSummary: string | null;
  stakeholderMap: Array<{ name: string; role: string; disposition: string; tone: "positive" | "warning" | "neutral" }>;
  successReconciliation: Record<string, unknown>;
  riskRegister: Array<{ risk: string; severity: "High" | "Medium" | "Low"; mitigation: string }>;
  hiddenLandmines: string[];
  agenda: string[];
  questionsToAskLive: string[];
  createdAt: string;
};

export type SeedData = {
  dealProfiles: DealProfile[];
  stakeholderCalls: StakeholderCall[];
  generatedDocuments: GeneratedDocument[];
  conflictMaps: ConflictMap[];
  kickoffPackets: KickoffPacket[];
};
