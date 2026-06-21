import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { CheckCircle2, FileText, Loader2, PhoneCall, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";
import { useDealProfile } from "@/hooks/useDealProfiles";
import { useGeneratedDocument, useStakeholderCalls } from "@/hooks/useStakeholderCalls";
import type { ActiveDealContext } from "@/hooks/useDealProfiles";
import type { CallStatusDb, DealStakeholder, StakeholderCallRow } from "@/lib/types";

const ROLE_LABELS: Record<string, string> = {
  sponsor: "Exec Sponsor",
  projectLead: "Project Lead",
  it: "IT Lead",
  finance: "Finance",
  champion: "Champion",
  procurement: "Procurement",
};

function initialsFor(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

type TranscriptLine = { speaker: "Agent" | "Stakeholder"; text: string };

function parseTranscript(transcript: string | null): TranscriptLine[] {
  if (!transcript) return [];
  const lines: TranscriptLine[] = [];
  for (const raw of transcript.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("Agent:")) {
      lines.push({ speaker: "Agent", text: line.slice("Agent:".length).trim() });
    } else if (line.startsWith("Stakeholder:")) {
      lines.push({ speaker: "Stakeholder", text: line.slice("Stakeholder:".length).trim() });
    } else if (lines.length > 0) {
      lines[lines.length - 1].text += ` ${line}`;
    }
  }
  return lines;
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className={cn("font-display text-3xl tracking-tight", accent && "text-primary")}>{value}</div>
      <div className="eyebrow text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

export default function Stakeholders() {
  const { dealProfileId } = useOutletContext<ActiveDealContext>();
  const { data: profile } = useDealProfile(dealProfileId);

  const [activeStakeholderId, setActiveStakeholderId] = useState<string | null>(null);
  const [liveCall, setLiveCall] = useState<{ callId: string; signedUrl: string } | null>(null);
  const [connecting, setConnecting] = useState(false);

  const hasInProgress = !!liveCall;
  const { data: calls } = useStakeholderCalls(dealProfileId, { refetchInterval: hasInProgress ? 3000 : undefined });

  const stakeholders = profile?.stakeholders ?? [];
  const callByStakeholder = useMemo(() => {
    const map = new Map<string, StakeholderCallRow>();
    (calls ?? []).forEach((c) => map.set(c.stakeholderId, c));
    return map;
  }, [calls]);

  const completed = stakeholders.filter((s) => callByStakeholder.get(s.id)?.status === "completed").length;

  const activeStakeholder = stakeholders.find((s) => s.id === activeStakeholderId) ?? null;
  const activeCall = activeStakeholderId ? callByStakeholder.get(activeStakeholderId) ?? null : null;

  // Once the post-call webhook lands a transcript, drop the live widget and show the replay UI.
  useEffect(() => {
    if (liveCall && activeCall?.status === "completed" && activeCall.transcript) {
      setLiveCall(null);
    }
  }, [liveCall, activeCall]);

  const callNow = async (stakeholder: DealStakeholder) => {
    if (!dealProfileId) return;
    setActiveStakeholderId(stakeholder.id);
    setConnecting(true);
    try {
      const data = await apiPost<{ callId: string; signedUrl: string }>("/api/start-call", {
        dealProfileId,
        stakeholderId: stakeholder.id,
      });
      setLiveCall({ callId: data.callId, signedUrl: data.signedUrl });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Could not start the call");
      setActiveStakeholderId(null);
    } finally {
      setConnecting(false);
    }
  };

  const viewTranscript = (stakeholder: DealStakeholder) => {
    setLiveCall(null);
    setActiveStakeholderId(stakeholder.id);
  };

  const close = () => {
    setActiveStakeholderId(null);
    setLiveCall(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 md:py-16 space-y-10">
      <PageHeader
        eyebrow="Discovery · 02"
        title="Stakeholders"
        italic="& calls."
        description="PreKick reaches out to each named stakeholder and turns the conversation into structured paperwork."
      />

      {!dealProfileId && (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No deal profile selected — extract one from a SOW on the Projects screen first.
        </div>
      )}

      {dealProfileId && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Stakeholders" value={stakeholders.length} />
            <StatCard label="Calls completed" value={completed} accent />
            <StatCard label="Scheduled" value={stakeholders.length - completed} />
          </div>

          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="hidden md:grid grid-cols-[1.5fr_1fr_auto_auto] gap-4 px-6 py-3 border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              <div>Stakeholder</div>
              <div>Role</div>
              <div>Status</div>
              <div className="text-right">Action</div>
            </div>
            <ul className="divide-y divide-border">
              {stakeholders.map((s) => {
                const call = callByStakeholder.get(s.id);
                const status: CallStatusDb = call?.status ?? "scheduled";
                return (
                  <li
                    key={s.id}
                    className="grid md:grid-cols-[1.5fr_1fr_auto_auto] grid-cols-1 gap-3 md:gap-4 px-4 md:px-6 py-4 items-center"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                        {initialsFor(s.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{s.name}</div>
                        <div className="text-xs text-muted-foreground md:hidden">{ROLE_LABELS[s.role] ?? s.role}</div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground hidden md:block">{ROLE_LABELS[s.role] ?? s.role}</div>
                    <div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-medium",
                          status === "completed"
                            ? "bg-success/10 text-success border-success/30"
                            : status === "inProgress"
                            ? "bg-destructive/10 text-destructive border-destructive/30"
                            : "bg-warning/10 text-warning border-warning/30"
                        )}
                      >
                        {status === "completed" ? "● Completed" : status === "inProgress" ? "● Live" : "○ Scheduled"}
                      </Badge>
                    </div>
                    <div className="md:text-right">
                      {status === "completed" ? (
                        <Button variant="outline" size="sm" onClick={() => viewTranscript(s)} className="gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          View transcript
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => callNow(s)}
                          disabled={connecting && activeStakeholderId === s.id}
                          className="gap-1.5 bg-gradient-brand hover:opacity-95 shadow-brand border-0"
                        >
                          {connecting && activeStakeholderId === s.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <PhoneCall className="h-3.5 w-3.5" />
                          )}
                          Call now
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

      <CallPanel
        stakeholder={activeStakeholder}
        call={activeCall}
        liveCall={liveCall}
        dealProfileId={dealProfileId}
        onClose={close}
      />
    </div>
  );
}

function CallPanel({
  stakeholder,
  call,
  liveCall,
  dealProfileId,
  onClose,
}: {
  stakeholder: DealStakeholder | null;
  call: StakeholderCallRow | null;
  liveCall: { callId: string; signedUrl: string } | null;
  dealProfileId: string | null;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lines = parseTranscript(call?.transcript ?? null);
  const { data: doc } = useGeneratedDocument(call?.generatedDocId ?? null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines.length]);

  const open = !!stakeholder;
  const showWidget = !!liveCall;
  const showTranscript = !showWidget && lines.length > 0;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        {stakeholder && (
          <>
            <div className="p-5 border-b border-border flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                  {initialsFor(stakeholder.name)}
                </div>
                <div>
                  <div className="font-semibold">{stakeholder.name}</div>
                  <div className="text-xs text-muted-foreground">{ROLE_LABELS[stakeholder.role] ?? stakeholder.role}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {showWidget ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-destructive/10 text-destructive px-2.5 py-1 text-[11px] font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse-dot" />
                    LIVE
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-full bg-success/10 text-success px-2.5 py-1 text-[11px] font-semibold">
                    <CheckCircle2 className="h-3 w-3" /> COMPLETED
                  </span>
                )}
                <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {showWidget && liveCall && (
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  Talk into your microphone — the agent is calling {stakeholder.name} as the {ROLE_LABELS[stakeholder.role]}.
                  The transcript and generated document appear here automatically once the call ends.
                </p>
                <elevenlabs-convai
                  signed-url={liveCall.signedUrl}
                  dynamic-variables={JSON.stringify({
                    stakeholder_id: stakeholder.id,
                    stakeholder_name: stakeholder.name,
                    role: stakeholder.role,
                    deal_profile_id: dealProfileId ?? "",
                  })}
                />
              </div>
            )}

            {!showWidget && !showTranscript && (
              <div className="flex-1 flex items-center justify-center p-5 text-sm text-muted-foreground">
                Waiting for the transcript to arrive…
              </div>
            )}

            {showTranscript && (
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-muted/20">
                {lines.map((l, i) => (
                  <div
                    key={i}
                    className={cn(
                      "animate-fade-up flex flex-col gap-1 max-w-[88%]",
                      l.speaker === "Agent" ? "items-start" : "items-end ml-auto"
                    )}
                  >
                    <span className={cn(
                      "text-[10px] uppercase tracking-wider font-semibold",
                      l.speaker === "Agent" ? "text-primary" : "text-muted-foreground"
                    )}>
                      {l.speaker === "Agent" ? "PreKick Agent" : stakeholder.name}
                    </span>
                    <div
                      className={cn(
                        "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed border",
                        l.speaker === "Agent"
                          ? "bg-card border-border rounded-tl-sm"
                          : "bg-primary text-primary-foreground border-primary rounded-tr-sm"
                      )}
                    >
                      {l.text}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showTranscript && doc && (
              <div className="border-t border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Auto-generated document
                    </div>
                    <div className="text-sm font-semibold">{(doc.fields as Record<string, string>)?.title ?? "Requirements Summary"}</div>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {Object.entries(doc.fields as Record<string, string>)
                    .filter(([k]) => k !== "title")
                    .map(([label, value]) => (
                      <li key={label} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                        <span><span className="font-medium">{label}:</span> {value}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
