import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Lightbulb, Loader2, Quote, ShieldAlert, Sparkles, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api";
import { useDealProfile } from "@/hooks/useDealProfiles";
import type { ActiveDealContext } from "@/hooks/useDealProfiles";
import type { ConflictCategory, ConflictMapRow, ConflictRow } from "@/lib/types";

const CATEGORY_LABELS: Record<ConflictCategory, string> = {
  timeline: "Timeline",
  successCriteria: "Success Criteria",
  authority: "Authority",
  assumption: "Assumption",
  political: "Political",
};

const categoryStyles: Record<ConflictCategory, string> = {
  timeline: "bg-[hsl(15_85%_55%/0.12)] text-[hsl(15_85%_40%)] border-[hsl(15_85%_55%/0.3)]",
  successCriteria: "bg-[hsl(265_60%_55%/0.12)] text-[hsl(265_60%_45%)] border-[hsl(265_60%_55%/0.3)]",
  authority: "bg-[hsl(200_70%_45%/0.12)] text-[hsl(200_70%_35%)] border-[hsl(200_70%_45%/0.3)]",
  assumption: "bg-[hsl(40_90%_50%/0.15)] text-[hsl(35_90%_35%)] border-[hsl(40_90%_50%/0.35)]",
  political: "bg-[hsl(330_60%_55%/0.12)] text-[hsl(330_60%_40%)] border-[hsl(330_60%_55%/0.3)]",
};

function useConflictMap(dealProfileId: string | null) {
  return useQuery({
    queryKey: ["conflict_map", dealProfileId],
    queryFn: () => apiGet<ConflictMapRow | null>(`/api/deal-profiles/${dealProfileId}/conflict-map`),
    enabled: !!dealProfileId,
  });
}

export default function ConflictMap() {
  const { dealProfileId } = useOutletContext<ActiveDealContext>();
  const { data: profile } = useDealProfile(dealProfileId);
  const { data: conflictMap, isLoading } = useConflictMap(dealProfileId);
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const roleByName = useMemo(() => {
    const map = new Map<string, string>();
    (profile?.stakeholders ?? []).forEach((s) => map.set(s.name.toLowerCase(), s.role));
    return map;
  }, [profile]);

  const conflicts = conflictMap?.conflicts ?? [];
  const highSev = conflicts.filter((c) => c.severity === "high").length;
  const stakeholdersInvolved = new Set(conflicts.flatMap((c) => [c.stakeholderA, c.stakeholderB])).size;

  const generate = async () => {
    if (!dealProfileId) return;
    setGenerating(true);
    try {
      const data = await apiPost<ConflictMapRow>("/api/conflict-map", { dealProfileId });
      toast.success(`Conflict map generated — ${data.conflicts.length} conflict(s) found`);
      queryClient.invalidateQueries({ queryKey: ["conflict_map", dealProfileId] });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Conflict map generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-16 space-y-10">
      <PageHeader
        eyebrow="★ Centerpiece · 03"
        title="Cross-stakeholder"
        italic="conflict map."
        description="What your stakeholders disagree on — surfaced before the kickoff call, not three weeks in."
        actions={
          <Button onClick={generate} disabled={!dealProfileId || generating} className="gap-2 bg-gradient-brand hover:opacity-95 shadow-brand border-0">
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Synthesizing…" : conflicts.length > 0 ? "Regenerate" : "Generate Conflict Map"}
          </Button>
        }
      />

      {!dealProfileId && (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No deal profile selected.
        </div>
      )}

      {dealProfileId && !isLoading && conflicts.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No conflict map yet. Complete at least two stakeholder calls, then click "Generate Conflict Map".
        </div>
      )}

      {conflicts.length > 0 && (
        <>
          <div className="rounded-2xl border border-border bg-card shadow-card p-6 grid grid-cols-3 divide-x divide-border">
            <Stat value={String(conflicts.length)} label="conflicts detected" />
            <Stat value={String(highSev)} label="high severity" accent />
            <Stat value={String(stakeholdersInvolved)} label="stakeholders" icon={<Users2 className="h-3.5 w-3.5" />} />
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            {conflicts.map((c, i) => (
              <ConflictCard key={i} c={c} index={i} roleByName={roleByName} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ value, label, accent, icon }: { value: string; label: string; accent?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="px-2 md:px-4 first:pl-0 last:pr-0">
      <div className={cn("font-display text-4xl md:text-5xl tracking-tight", accent && "text-destructive")}>{value}</div>
      <div className="eyebrow text-muted-foreground mt-2 flex items-center gap-1.5">
        {icon}
        {label}
      </div>
    </div>
  );
}

function ConflictCard({ c, index, roleByName }: { c: ConflictRow; index: number; roleByName: Map<string, string> }) {
  const ROLE_LABELS: Record<string, string> = {
    sponsor: "Sponsor", projectLead: "Project Lead", it: "IT Lead", finance: "Finance", champion: "Champion", procurement: "Procurement",
  };
  const roleA = roleByName.get(c.stakeholderA.toLowerCase());
  const roleB = roleByName.get(c.stakeholderB.toLowerCase());

  return (
    <article
      className="group relative rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/40 via-destructive/40 to-primary/40" />

      <div className="p-5 md:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider", categoryStyles[c.category])}>
            {CATEGORY_LABELS[c.category]}
          </span>
          {c.severity === "high" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-destructive">
              <ShieldAlert className="h-3.5 w-3.5" />
              High severity
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
          <QuoteBlock name={c.stakeholderA} role={roleA ? ROLE_LABELS[roleA] ?? roleA : ""} quote={c.quoteA} side="left" />
          <div className="flex sm:flex-col items-center justify-center gap-2 py-2">
            <div className="hidden sm:block flex-1 w-px bg-border" />
            <div className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              vs
            </div>
            <div className="hidden sm:block flex-1 w-px bg-border" />
          </div>
          <QuoteBlock name={c.stakeholderB} role={roleB ? ROLE_LABELS[roleB] ?? roleB : ""} quote={c.quoteB} side="right" />
        </div>

        <div className="rounded-lg bg-accent/60 border border-primary/10 p-3.5 flex items-start gap-3">
          <div className="h-7 w-7 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
            <Lightbulb className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1">
              Suggested resolution <ArrowRight className="h-3 w-3" />
            </div>
            <p className="text-sm mt-0.5 text-foreground/90">{c.suggestedResolution}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function QuoteBlock({ name, role, quote, side }: { name: string; role: string; quote: string; side: "left" | "right" }) {
  const isConflict = side === "right";
  return (
    <div
      className={cn(
        "rounded-lg p-4 border relative",
        isConflict
          ? "bg-destructive/5 border-destructive/30"
          : "bg-muted/40 border-border"
      )}
    >
      <Quote className={cn("absolute top-3 right-3 h-4 w-4 opacity-30", isConflict ? "text-destructive" : "text-muted-foreground")} />
      <p className={cn("text-sm leading-relaxed font-medium pr-4", isConflict && "text-destructive")}>
        "{quote}"
      </p>
      <div className="mt-3 pt-3 border-t border-border/60 text-xs">
        <div className="font-semibold">{name}</div>
        <div className="text-muted-foreground">{role}</div>
      </div>
    </div>
  );
}
