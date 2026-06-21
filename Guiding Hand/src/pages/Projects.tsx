import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AlertCircle, CheckCircle2, FileText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { SOW_PLACEHOLDER } from "@/data/mock";
import { apiPost } from "@/lib/api";
import { useDealProfile } from "@/hooks/useDealProfiles";
import type { ActiveDealContext } from "@/hooks/useDealProfiles";
import {
  buildCommercialFields,
  buildComplianceChips,
  buildCustomerFields,
  flaggedCount,
  type Field,
} from "@/lib/dealProfileDisplay";

function ConfidenceDot({ c }: { c: Field["confidence"] }) {
  return (
    <span
      className={cn(
        "inline-block h-1.5 w-1.5 rounded-full",
        c === "high" ? "bg-success" : "bg-warning"
      )}
      aria-label={c === "high" ? "High confidence" : "Needs review"}
    />
  );
}

function FieldRow({ f }: { f: Field }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-border last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <ConfidenceDot c={f.confidence} />
          {f.label}
        </div>
        <div className="text-sm mt-0.5 font-medium">{f.value}</div>
      </div>
      {f.confidence === "review" && (
        <Badge variant="outline" className="border-warning/40 text-warning bg-warning/10 text-[10px] font-semibold uppercase">
          Review
        </Badge>
      )}
    </div>
  );
}

export default function Projects() {
  const { dealProfileId, onProfileCreated } = useOutletContext<ActiveDealContext>();
  const [sow, setSow] = useState(SOW_PLACEHOLDER);
  const [extracting, setExtracting] = useState(false);

  const { data: profile, isLoading } = useDealProfile(dealProfileId);

  const extract = async () => {
    setExtracting(true);
    try {
      const data = await apiPost<{ id: string }>("/api/extract-profile", { sowText: sow });
      toast.success("Deal Profile extracted");
      onProfileCreated(data.id);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtracting(false);
    }
  };

  const revealed = !!profile && !isLoading;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 md:py-16 space-y-10">
      <PageHeader
        eyebrow="Setup · 01"
        title="New project"
        italic="intake."
        description="Paste the signed contract. PreKick extracts the deal profile and lines up the discovery calls it needs to make."
      />

      <section className="rounded-2xl border border-border bg-card p-6 md:p-7 shadow-card relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <label className="text-sm font-semibold flex items-center gap-2">
          <span className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-3.5 w-3.5 text-primary" />
          </span>
          Paste signed SOW / MSA
        </label>
        <Textarea
          value={sow}
          onChange={(e) => setSow(e.target.value)}
          rows={10}
          className="mt-3 font-mono text-xs leading-relaxed resize-y"
        />
        <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground">
            Extraction runs live against Claude and creates a new deal profile.
          </span>
          <Button onClick={extract} disabled={extracting} className="gap-2 bg-gradient-brand hover:opacity-95 shadow-brand border-0">
            {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {extracting ? "Extracting…" : "Extract Deal Profile"}
          </Button>
        </div>
      </section>

      {revealed && profile && (
        <section className="animate-fade-up rounded-2xl border border-border bg-card shadow-elevated overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-gradient-to-r from-accent/40 to-transparent">
            <div>
              <div className="eyebrow text-primary mb-1.5">Output · 02</div>
              <h2 className="font-display text-2xl tracking-tight">Deal Profile</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Extracted from SOW · {flaggedCount(profile)} field{flaggedCount(profile) === 1 ? "" : "s"} flagged for review
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success" />High confidence</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-warning" />Needs review</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="p-5 md:p-6">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Customer</h3>
              {buildCustomerFields(profile).map((f) => <FieldRow key={f.label} f={f} />)}
            </div>
            <div className="p-5 md:p-6">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Commercial</h3>
              {buildCommercialFields(profile).map((f) => <FieldRow key={f.label} f={f} />)}
            </div>
          </div>

          <div className="p-5 md:p-6 border-t border-border">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Scope</h3>
            <div className="text-sm font-medium">{profile.scope?.summary ?? "—"}</div>
            <ul className="mt-3 grid sm:grid-cols-2 gap-2">
              {(profile.scope?.deliverables ?? []).map((d) => (
                <li key={d} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span><span className="font-medium text-foreground">Start:</span> {profile.scope?.startDate ?? "—"}</span>
              <span><span className="font-medium text-foreground">Go-live:</span> {profile.scope?.goLiveDate ?? "—"}</span>
            </div>
          </div>

          <div className="p-5 md:p-6 border-t border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-primary" />
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Required documents <span className="text-foreground/60 normal-case font-normal">— auto-derived from the deal profile</span>
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {buildComplianceChips(profile).map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent text-accent-foreground border border-primary/15 px-3 py-1 text-xs font-medium"
                  title={c.reason}
                >
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
