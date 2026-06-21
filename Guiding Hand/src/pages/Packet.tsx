import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, FileText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/lib/api";
import type { ActiveDealContext } from "@/hooks/useDealProfiles";
import type { KickoffPacketRow } from "@/lib/types";

const toneStyles = {
  positive: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

function useKickoffPacket(dealProfileId: string | null) {
  return useQuery({
    queryKey: ["kickoff_packet", dealProfileId],
    queryFn: () => apiGet<KickoffPacketRow | null>(`/api/deal-profiles/${dealProfileId}/kickoff-packet`),
    enabled: !!dealProfileId,
  });
}

export default function Packet() {
  const { dealProfileId } = useOutletContext<ActiveDealContext>();
  const { data: packet, isLoading } = useKickoffPacket(dealProfileId);
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const generate = async () => {
    if (!dealProfileId) return;
    setGenerating(true);
    try {
      await apiPost("/api/kickoff-packet", { dealProfileId });
      toast.success("Kickoff packet generated");
      queryClient.invalidateQueries({ queryKey: ["kickoff_packet", dealProfileId] });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Packet generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 md:py-16 space-y-10">
      <PageHeader
        eyebrow="Deliverable · 04"
        title="Kickoff"
        italic="packet."
        description="Everything the team needs to walk into the kickoff confident — synthesized from every call."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={generate} disabled={!dealProfileId || generating} variant="outline" className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Synthesizing…" : packet ? "Regenerate" : "Generate packet"}
            </Button>
            <Button className="gap-2 bg-gradient-brand hover:opacity-95 shadow-brand border-0" disabled={!packet}>
              <Download className="h-4 w-4" />
              Export packet
            </Button>
          </div>
        }
      />

      {!dealProfileId && (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No deal profile selected.
        </div>
      )}

      {dealProfileId && !isLoading && !packet && (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No kickoff packet yet. Generate the conflict map first, then click "Generate packet".
        </div>
      )}

      {packet && (
        <article className="rounded-2xl border border-border bg-card shadow-elevated divide-y divide-border overflow-hidden">
          <Section title="Executive summary" eyebrow="01">
            <p className="text-sm leading-relaxed text-foreground/90">{packet.executiveSummary}</p>
          </Section>

          <Section title="Stakeholder map" eyebrow="02">
            <ul className="space-y-2">
              {packet.stakeholderMap.map((s) => (
                <li key={s.name} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                  <div>
                    <div className="font-medium text-sm">{s.name} <span className="text-muted-foreground font-normal">· {s.role}</span></div>
                    <div className="text-sm text-foreground/80 mt-0.5">{s.disposition}</div>
                  </div>
                  <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", toneStyles[s.tone])}>
                    {s.tone === "positive" ? "Champion" : s.tone === "warning" ? "At risk" : "Aligned"}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Risk register" eyebrow="03">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-semibold px-4 py-2.5">Risk</th>
                    <th className="text-left font-semibold px-4 py-2.5 w-28">Severity</th>
                    <th className="text-left font-semibold px-4 py-2.5">Mitigation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {packet.riskRegister.map((r) => (
                    <tr key={r.risk}>
                      <td className="px-4 py-3 align-top">{r.risk}</td>
                      <td className="px-4 py-3 align-top">
                        <span className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                          r.severity === "High" ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-warning/10 text-warning border-warning/30"
                        )}>
                          {r.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top text-foreground/85">{r.mitigation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Hidden landmines" eyebrow="04" subtitle="PM eyes only">
            <div className="rounded-lg border border-warning/40 bg-warning/5 p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-warning font-semibold text-xs uppercase tracking-wider">
                <AlertTriangle className="h-3.5 w-3.5" />
                Confidential
              </div>
              <ul className="space-y-2">
                {packet.hiddenLandmines.map((l) => (
                  <li key={l} className="text-sm flex gap-2 leading-relaxed">
                    <span className="text-warning shrink-0">▸</span>
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          <Section title="Suggested kickoff agenda" eyebrow="05">
            <ol className="space-y-2">
              {packet.agenda.map((a, i) => (
                <li key={a} className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
                  <span className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm">{a}</span>
                </li>
              ))}
            </ol>
          </Section>

          {packet.questionsToAskLive?.length > 0 && (
            <Section title="Questions to ask live" eyebrow="06">
              <ul className="space-y-2">
                {packet.questionsToAskLive.map((q) => (
                  <li key={q} className="text-sm flex gap-2 leading-relaxed rounded-lg border border-border bg-muted/20 px-4 py-3">
                    <span className="text-primary shrink-0">?</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </article>
      )}
    </div>
  );
}

function Section({
  title,
  eyebrow,
  subtitle,
  children,
}: {
  title: string;
  eyebrow: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="p-5 md:p-8">
      <div className="flex items-baseline justify-between mb-4">
        <div className="flex items-baseline gap-3">
          <span className="text-[11px] font-mono text-muted-foreground">{eyebrow}</span>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {title}
          </h2>
        </div>
        {subtitle && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{subtitle}</span>
        )}
      </div>
      {children}
    </section>
  );
}
