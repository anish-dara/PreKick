import { ArrowRight, Lightbulb, Quote, ShieldAlert, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { conflicts, type Conflict } from "@/data/mock";

const categoryStyles: Record<Conflict["category"], string> = {
  Timeline: "bg-[hsl(15_85%_55%/0.12)] text-[hsl(15_85%_40%)] border-[hsl(15_85%_55%/0.3)]",
  "Success Criteria": "bg-[hsl(265_60%_55%/0.12)] text-[hsl(265_60%_45%)] border-[hsl(265_60%_55%/0.3)]",
  Authority: "bg-[hsl(200_70%_45%/0.12)] text-[hsl(200_70%_35%)] border-[hsl(200_70%_45%/0.3)]",
  Assumption: "bg-[hsl(40_90%_50%/0.15)] text-[hsl(35_90%_35%)] border-[hsl(40_90%_50%/0.35)]",
};

export default function ConflictMap() {
  const highSev = conflicts.filter((c) => c.severity === "high").length;
  const stakeholdersInvolved = new Set(conflicts.flatMap((c) => [c.left.name, c.right.name])).size;

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-8">
      <header className="space-y-2">
        <div className="text-xs uppercase tracking-wider text-primary font-semibold flex items-center gap-2">
          <Sparkle /> Centerpiece
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Cross-Stakeholder Conflict Map</h1>
        <p className="text-muted-foreground">What your stakeholders disagree on — before kickoff.</p>
      </header>

      {/* Summary row */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-5 grid grid-cols-3 divide-x divide-border">
        <Stat value={String(conflicts.length)} label="conflicts detected" />
        <Stat value={String(highSev)} label="high severity" accent />
        <Stat value={String(stakeholdersInvolved)} label="stakeholders" icon={<Users2 className="h-3.5 w-3.5" />} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {conflicts.map((c, i) => (
          <ConflictCard key={i} c={c} index={i} />
        ))}
      </div>
    </div>
  );
}

function Stat({ value, label, accent, icon }: { value: string; label: string; accent?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="px-2 md:px-4 first:pl-0 last:pr-0">
      <div className={cn("text-2xl md:text-3xl font-semibold tracking-tight", accent && "text-destructive")}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
        {icon}
        {label}
      </div>
    </div>
  );
}

function ConflictCard({ c, index }: { c: Conflict; index: number }) {
  return (
    <article
      className="group relative rounded-xl border border-border bg-card shadow-sm overflow-hidden animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Top stripe */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/40 via-destructive/40 to-primary/40" />

      <div className="p-5 md:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider", categoryStyles[c.category])}>
            {c.category}
          </span>
          {c.severity === "high" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-destructive">
              <ShieldAlert className="h-3.5 w-3.5" />
              High severity
            </span>
          )}
        </div>

        {/* Quotes */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-stretch">
          <QuoteBlock person={c.left} side="left" />
          <div className="flex sm:flex-col items-center justify-center gap-2 py-2">
            <div className="hidden sm:block flex-1 w-px bg-border" />
            <div className="rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              vs
            </div>
            <div className="hidden sm:block flex-1 w-px bg-border" />
          </div>
          <QuoteBlock person={c.right} side="right" />
        </div>

        {/* Resolution */}
        <div className="rounded-lg bg-accent/60 border border-primary/10 p-3.5 flex items-start gap-3">
          <div className="h-7 w-7 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
            <Lightbulb className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1">
              Suggested resolution <ArrowRight className="h-3 w-3" />
            </div>
            <p className="text-sm mt-0.5 text-foreground/90">{c.resolution}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

function QuoteBlock({ person, side }: { person: Conflict["left"]; side: "left" | "right" }) {
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
        "{person.quote}"
      </p>
      <div className="mt-3 pt-3 border-t border-border/60 text-xs">
        <div className="font-semibold">{person.name}</div>
        <div className="text-muted-foreground">{person.role}</div>
      </div>
    </div>
  );
}

function Sparkle() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.8L20 10l-6.2 2.2L12 18l-1.8-5.8L4 10l6.2-2.2L12 2z"/></svg>
  );
}
