import { useState } from "react";
import { AlertCircle, CheckCircle2, FileText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SOW_PLACEHOLDER, dealProfile, type Field } from "@/data/mock";

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
  const [sow, setSow] = useState(SOW_PLACEHOLDER);
  const [extracting, setExtracting] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const extract = () => {
    setExtracting(true);
    setRevealed(false);
    setTimeout(() => {
      setExtracting(false);
      setRevealed(true);
    }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 space-y-8">
      <header className="space-y-1">
        <div className="text-xs uppercase tracking-wider text-primary font-semibold">Setup</div>
        <h1 className="text-3xl font-semibold tracking-tight">New Project Intake</h1>
        <p className="text-muted-foreground text-sm">
          Drop the signed contract. PreKick extracts the deal profile and lines up the calls it needs to make.
        </p>
      </header>

      <section className="rounded-xl border border-border bg-card p-5 md:p-6 shadow-sm">
        <label className="text-sm font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
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
            Nothing is stored — this is a frontend demo.
          </span>
          <Button onClick={extract} disabled={extracting} className="gap-2">
            {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {extracting ? "Extracting…" : "Extract Deal Profile"}
          </Button>
        </div>
      </section>

      {revealed && (
        <section className="animate-fade-up rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-5 md:px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Deal Profile</h2>
              <p className="text-xs text-muted-foreground">Extracted from SOW · 2 fields flagged for review</p>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-success" />High confidence</span>
              <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-warning" />Needs review</span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            <div className="p-5 md:p-6">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Customer</h3>
              {dealProfile.customer.map((f) => <FieldRow key={f.label} f={f} />)}
            </div>
            <div className="p-5 md:p-6">
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Commercial</h3>
              {dealProfile.commercial.map((f) => <FieldRow key={f.label} f={f} />)}
            </div>
          </div>

          <div className="p-5 md:p-6 border-t border-border">
            <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Scope</h3>
            <div className="text-sm font-medium">{dealProfile.scope.summary}</div>
            <ul className="mt-3 grid sm:grid-cols-2 gap-2">
              {dealProfile.scope.deliverables.map((d) => (
                <li key={d} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span><span className="font-medium text-foreground">Start:</span> {dealProfile.scope.startDate}</span>
              <span><span className="font-medium text-foreground">Go-live:</span> {dealProfile.scope.goLive}</span>
            </div>
          </div>

          <div className="p-5 md:p-6 border-t border-border bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-primary" />
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Required documents <span className="text-foreground/60 normal-case font-normal">— auto-derived from EU + Enterprise</span>
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {dealProfile.compliance.map((c) => (
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
