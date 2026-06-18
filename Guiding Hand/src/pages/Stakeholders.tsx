import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileText, PhoneCall, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { stakeholders, transcripts, type Stakeholder } from "@/data/mock";

export default function Stakeholders() {
  const [active, setActive] = useState<Stakeholder | null>(null);
  const [mode, setMode] = useState<"live" | "completed">("completed");

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-8">
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-wider text-primary font-semibold">Discovery</div>
        <h1 className="text-3xl font-semibold tracking-tight">Stakeholders & Calls</h1>
        <p className="text-muted-foreground text-sm">
          PreKick reaches out to each named stakeholder and turns the conversation into structured paperwork.
        </p>
      </header>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="hidden md:grid grid-cols-[1.5fr_1fr_auto_auto] gap-4 px-6 py-3 border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
          <div>Stakeholder</div>
          <div>Role</div>
          <div>Status</div>
          <div className="text-right">Action</div>
        </div>
        <ul className="divide-y divide-border">
          {stakeholders.map((s) => (
            <li
              key={s.id}
              className="grid md:grid-cols-[1.5fr_1fr_auto_auto] grid-cols-1 gap-3 md:gap-4 px-4 md:px-6 py-4 items-center"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                  {s.initials}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground md:hidden">{s.role}</div>
                </div>
              </div>
              <div className="text-sm text-muted-foreground hidden md:block">{s.role}</div>
              <div>
                <Badge
                  variant="outline"
                  className={cn(
                    "font-medium",
                    s.status === "Completed"
                      ? "bg-success/10 text-success border-success/30"
                      : "bg-warning/10 text-warning border-warning/30"
                  )}
                >
                  {s.status === "Completed" ? "● Completed" : "○ Scheduled"}
                </Badge>
              </div>
              <div className="md:text-right">
                {s.status === "Completed" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMode("completed");
                      setActive(s);
                    }}
                    className="gap-1.5"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    View transcript
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      setMode("live");
                      setActive(s);
                    }}
                    className="gap-1.5"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    Call now
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <CallPanel
        stakeholder={active}
        mode={mode}
        onClose={() => setActive(null)}
      />
    </div>
  );
}

function CallPanel({
  stakeholder,
  mode,
  onClose,
}: {
  stakeholder: Stakeholder | null;
  mode: "live" | "completed";
  onClose: () => void;
}) {
  const transcript = stakeholder ? transcripts[stakeholder.id] : null;
  const [visibleLines, setVisibleLines] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalLines = transcript?.lines.length ?? 0;
  const finished = visibleLines >= totalLines;

  useEffect(() => {
    if (!stakeholder || !transcript) return;
    if (mode === "completed") {
      setVisibleLines(totalLines);
      return;
    }
    setVisibleLines(0);
    const id = setInterval(() => {
      setVisibleLines((n) => {
        if (n >= totalLines) {
          clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, 850);
    return () => clearInterval(id);
  }, [stakeholder, mode, totalLines, transcript]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleLines]);

  return (
    <Sheet open={!!stakeholder} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
        {stakeholder && transcript && (
          <>
            <div className="p-5 border-b border-border flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                  {stakeholder.initials}
                </div>
                <div>
                  <div className="font-semibold">{stakeholder.name}</div>
                  <div className="text-xs text-muted-foreground">{stakeholder.role}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {mode === "live" && !finished ? (
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

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-muted/20">
              {transcript.lines.slice(0, visibleLines).map((l, i) => (
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
              {mode === "live" && !finished && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground italic">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-dot" />
                  Transcribing…
                </div>
              )}
            </div>

            {finished && (
              <div className="animate-fade-up border-t border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                      Auto-generated document
                    </div>
                    <div className="text-sm font-semibold">{transcript.doc.title}</div>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {transcript.doc.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span>{b}</span>
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
