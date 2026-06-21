import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  FileText,
  Mic,
  Sparkles,
  Users2,
  Workflow,
  ShieldCheck,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: FileText,
    eyebrow: "Intake",
    title: "Contracts become structured deals",
    body: "Drop the signed SOW — or let it flow in from your CRM. PreKick extracts the deal profile, deliverables, and compliance posture in seconds.",
  },
  {
    icon: Bot,
    eyebrow: "Voice agent",
    title: "10-minute follow-ups, on autopilot",
    body: "PreKick dials stakeholders, runs the discovery script, captures answers, and posts a clean transcript back to the project.",
  },
  {
    icon: Users2,
    eyebrow: "Stakeholders",
    title: "Every voice, mapped",
    body: "Sponsors, IT, ops, finance — each one called, summarized, and aligned against the deal profile before kickoff.",
  },
  {
    icon: Sparkles,
    eyebrow: "Conflict map",
    title: "Misalignments surfaced early",
    body: "When the sponsor says six weeks and IT says Q2, PreKick flags it — and proposes a resolution before the kickoff call.",
  },
  {
    icon: CalendarClock,
    eyebrow: "Escalation",
    title: "Human rep, one click away",
    body: "When the call needs judgment — red-lines, exec relationships, scope debates — PreKick books a rep instead. Backup, not bottleneck.",
  },
  {
    icon: Workflow,
    eyebrow: "Handoff",
    title: "Rocketlane-ready, on day zero",
    body: "Stakeholders, risks, success criteria, agenda — all written into your PSA the moment kickoff begins.",
  },
];

const steps = [
  { n: "01", t: "Contract lands", b: "Uploaded or synced from your CRM the moment it's signed." },
  { n: "02", t: "Agent does the rounds", b: "10-minute calls with every stakeholder. Reps step in only when judgment is needed." },
  { n: "03", t: "Kickoff packet ships", b: "Executive summary, risks, agenda, and Rocketlane project — handed to the PM, ready to go." },
];

const stats = [
  { k: "11 days", v: "Average time saved between contract sign and kickoff" },
  { k: "94%", v: "Of discovery questions answered before the kickoff call" },
  { k: "3.2×", v: "More stakeholders engaged pre-kickoff vs manual ops" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow-brand">
              <Mic className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">PreKick</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[13px] text-muted-foreground">
            <a href="#how" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#proof" className="hover:text-foreground transition-colors">Proof</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link to="/projects">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="bg-gradient-brand hover:opacity-95 shadow-brand border-0 gap-1.5">
              <Link to="/projects">
                Open app <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 h-[480px] w-[480px] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute top-40 -right-40 h-[520px] w-[520px] rounded-full bg-[hsl(var(--gold)/0.12)] blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 md:px-10 pt-20 md:pt-28 pb-20 md:pb-28">
          <div className="grid md:grid-cols-12 gap-10 items-center">
            <div className="md:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-75 animate-pulse-dot" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
                </span>
                Pre-kickoff agent · live in 6 enterprise rollouts
              </div>

              <h1 className="font-display text-5xl sm:text-6xl md:text-7xl leading-[0.95] tracking-tight mt-6">
                The work between
                <br />
                <span className="italic text-primary">contract signed</span>
                <br />
                and <span className="italic">kickoff,</span> done.
              </h1>

              <p className="mt-6 max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed">
                PreKick is the AI agent that calls every stakeholder, extracts the deal profile,
                surfaces conflicts, and ships a kickoff-ready Rocketlane project — before your PM
                opens their laptop.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="bg-gradient-brand hover:opacity-95 shadow-brand border-0 h-12 px-6 gap-2">
                  <Link to="/projects">
                    Try the prototype <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-6">
                  <a href="#how">See how it works</a>
                </Button>
              </div>

              <div className="mt-10 flex items-center gap-6 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> SOC 2 ready</span>
                <span className="hidden sm:flex items-center gap-1.5"><Workflow className="h-3.5 w-3.5" /> Rocketlane native</span>
                <span className="hidden sm:flex items-center gap-1.5"><Bot className="h-3.5 w-3.5" /> Voice + text</span>
              </div>
            </div>

            {/* Hero visual */}
            <div className="md:col-span-5">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-brand opacity-20 blur-2xl rounded-3xl" />
                <div className="relative rounded-2xl border border-border bg-card shadow-elevated overflow-hidden">
                  <div className="px-5 py-3 border-b border-border flex items-center gap-2 bg-muted/30">
                    <div className="flex gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                      <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                      <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                    </div>
                    <div className="ml-3 text-[11px] font-mono text-muted-foreground">prekick · live call</div>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-[11px] font-semibold text-primary shrink-0">AM</div>
                      <div className="flex-1">
                        <div className="text-[11px] text-muted-foreground">Anya Müller · Sponsor</div>
                        <div className="text-sm mt-1">"We need to be live within six weeks."</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-[hsl(var(--gold)/0.15)] flex items-center justify-center text-[11px] font-semibold text-[hsl(var(--gold))] shrink-0">TB</div>
                      <div className="flex-1">
                        <div className="text-[11px] text-muted-foreground">Tom Becker · IT Lead</div>
                        <div className="text-sm mt-1">"Realistically this is a Q2 project — integration is 8+ weeks."</div>
                      </div>
                    </div>
                    <div className="rounded-lg border border-primary/20 bg-primary/[0.04] p-3">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3" /> Conflict detected
                      </div>
                      <div className="text-xs mt-1.5 text-foreground/90">
                        Timeline mismatch — flagged for kickoff agenda. Suggested resolution: phased pilot in 6 weeks, full rollout Q2.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-border bg-card/40">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 grid sm:grid-cols-3 gap-8">
          {stats.map((s) => (
            <div key={s.k}>
              <div className="font-display text-4xl md:text-5xl tracking-tight text-primary">{s.k}</div>
              <div className="mt-1 text-sm text-muted-foreground">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-7xl mx-auto px-6 md:px-10 py-24">
        <div className="max-w-2xl">
          <div className="text-[11px] font-mono uppercase tracking-wider text-primary">How it works</div>
          <h2 className="font-display text-4xl md:text-5xl tracking-tight mt-3">
            Three steps between <span className="italic">handshake</span> and <span className="italic">handoff</span>.
          </h2>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-5">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-card p-6 shadow-card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
              <div className="font-mono text-xs text-muted-foreground">{s.n}</div>
              <div className="font-display text-2xl tracking-tight mt-2">{s.t}</div>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{s.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="border-t border-border bg-gradient-to-b from-transparent via-accent/30 to-transparent">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-24">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
            <div className="max-w-2xl">
              <div className="text-[11px] font-mono uppercase tracking-wider text-primary">What it does</div>
              <h2 className="font-display text-4xl md:text-5xl tracking-tight mt-3">
                A full pre-kickoff team, <span className="italic">on call.</span>
              </h2>
            </div>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/projects">Explore the app <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="group rounded-2xl border border-border bg-card p-6 shadow-card hover:shadow-elevated transition-all">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <f.icon className="h-5 w-5" />
                </div>
                <div className="eyebrow text-muted-foreground mt-4">{f.eyebrow}</div>
                <h3 className="font-display text-xl tracking-tight mt-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Proof / quote */}
      <section id="proof" className="max-w-7xl mx-auto px-6 md:px-10 py-24">
        <div className="rounded-3xl border border-border bg-card shadow-elevated p-10 md:p-16 relative overflow-hidden">
          <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <Quote className="h-10 w-10 text-primary/40" />
          <blockquote className="font-display text-3xl md:text-4xl leading-tight tracking-tight mt-6 max-w-4xl">
            "We used to lose the first two weeks of every enterprise rollout chasing stakeholders.
            PreKick gives our PMs a fully aligned room on day one — <span className="italic">it changed our margin profile.</span>"
          </blockquote>
          <div className="mt-8 flex items-center gap-4">
            <div className="h-11 w-11 rounded-full bg-gradient-brand flex items-center justify-center text-primary-foreground font-semibold">JR</div>
            <div>
              <div className="text-sm font-medium">Jordan Reeves</div>
              <div className="text-xs text-muted-foreground">VP Customer Success · Northwind Retail</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-24 text-center">
          <h2 className="font-display text-5xl md:text-6xl tracking-tight">
            Skip the silence between <span className="italic text-primary">signed</span> and <span className="italic">started.</span>
          </h2>
          <p className="mt-6 text-muted-foreground max-w-xl mx-auto">
            See PreKick run on a real deal in under three minutes.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Button asChild size="lg" className="bg-gradient-brand hover:opacity-95 shadow-brand border-0 h-12 px-7 gap-2">
              <Link to="/projects">
                Open the prototype <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-7">
              <Link to="/scheduling">Schedule a call</Link>
            </Button>
          </div>
          <div className="mt-10 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            No credit card · No installation · Live demo data
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-sidebar text-sidebar-foreground">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-brand flex items-center justify-center">
              <Mic className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-accent-foreground">PreKick</span>
            <span className="text-xs text-sidebar-foreground/60 ml-2">Pre-kickoff agent</span>
          </div>
          <div className="text-xs text-sidebar-foreground/60">© 2026 PreKick · The work before the work.</div>
        </div>
      </footer>
    </div>
  );
}
