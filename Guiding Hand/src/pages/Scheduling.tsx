import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { format } from "date-fns";
import {
  CalendarIcon,
  Bot,
  UserRound,
  Clock,
  CheckCircle2,
  Phone,
  Video,
  AlertTriangle,
  Sparkles,
  Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useDealProfile } from "@/hooks/useDealProfiles";
import type { ActiveDealContext } from "@/hooks/useDealProfiles";
import type { DealStakeholder } from "@/lib/types";

const ROLE_LABELS: Record<string, string> = {
  sponsor: "Exec Sponsor",
  projectLead: "Project Lead",
  it: "IT Lead",
  finance: "Finance",
  champion: "Champion",
  procurement: "Procurement",
};

function initialsFor(name: string) {
  return name.split(" ").filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

const AGENT_SLOTS = ["09:00", "09:15", "09:30", "10:00", "10:15", "11:00", "13:30", "14:00", "14:30", "15:00", "16:00"];
const REP_SLOTS = ["10:00", "11:30", "13:00", "15:30"];

const AGENT_TOPICS = [
  "Contract clarification",
  "Confirm missing fields",
  "Onboarding logistics",
  "Status check-in",
];
const REP_TOPICS = [
  "Contract red-line / legal",
  "Pricing or scope escalation",
  "Exec relationship moment",
  "Risk needing human judgment",
];

const autoFollowups = [
  { who: "Marcus Webb · IT Director", when: "Today · 14:00", topic: "SSO provider confirmation", trigger: "Missing field on Deal Profile" },
  { who: "Priya Shah · Ops Lead", when: "Tomorrow · 09:30", topic: "Confirm pilot user list", trigger: "Awaiting answer for 48h" },
  { who: "Daniel Roth · Finance", when: "Fri · 11:00", topic: "Billing contact + PO process", trigger: "Required for kickoff packet" },
];

const repCalls = [
  { who: "Elena Ruiz · VP Procurement", when: "Thu · 11:30", topic: "Liability cap red-line", rep: "Jordan Reeves" },
];

type Section = "agent" | "rep";

function SectionCard({
  section,
  children,
}: {
  section: Section;
  children: React.ReactNode;
}) {
  const isAgent = section === "agent";
  return (
    <section className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
      <div className={cn(
        "px-6 py-5 border-b border-border flex items-start gap-4 flex-wrap",
        isAgent ? "bg-gradient-to-r from-primary/[0.06] to-transparent" : "bg-gradient-to-r from-[hsl(var(--gold)/0.08)] to-transparent"
      )}>
        <div className={cn(
          "h-11 w-11 rounded-xl flex items-center justify-center shrink-0",
          isAgent ? "bg-primary/10 text-primary" : "bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))]"
        )}>
          {isAgent ? <Bot className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="eyebrow text-muted-foreground">
            {isAgent ? "Part 01 · Automated" : "Part 02 · Human"}
          </div>
          <h2 className="font-display text-2xl tracking-tight mt-0.5">
            {isAgent ? "Voice agent calls" : "Judgment calls with a rep"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            {isAgent
              ? "Schedule a 10-minute agent call for the simple stuff — contract help, confirmations, status checks. The agent also schedules its own follow-ups automatically."
              : "Book a real rep for anything that needs human judgment — red-lines, pricing escalations, exec relationships, or risks the agent flagged out-of-scope."}
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Clock className="h-3 w-3" />
          {isAgent ? "10 min" : "30 min"}
        </Badge>
      </div>
      {children}
    </section>
  );
}

function BookingForm({
  section,
  slots,
  topics,
  stakeholders,
}: {
  section: Section;
  slots: string[];
  topics: string[];
  stakeholders: DealStakeholder[];
}) {
  const [stakeholderId, setStakeholderId] = useState<string>(stakeholders[0]?.id ?? "");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState<string>("");
  const [topic, setTopic] = useState<string>(topics[0]);
  const [notes, setNotes] = useState("");

  const stakeholder = stakeholders.find((s) => s.id === stakeholderId);
  const isAgent = section === "agent";

  const submit = () => {
    if (!date || !time) {
      toast({ title: "Pick a date and time", variant: "destructive" });
      return;
    }
    toast({
      title: isAgent ? "Voice agent call scheduled" : "Rep call requested",
      description: `${stakeholder?.name} · ${format(date, "EEE, MMM d")} at ${time} · ${topic}`,
    });
    setTime("");
    setNotes("");
  };

  return (
    <>
      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        <div className="p-6 space-y-5">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Stakeholder</Label>
            <div className="mt-2 grid gap-2">
              {stakeholders.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStakeholderId(s.id)}
                  className={cn(
                    "text-left rounded-lg border px-3 py-2.5 flex items-center gap-3 transition-all",
                    stakeholderId === s.id
                      ? isAgent ? "border-primary/40 bg-primary/5" : "border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--gold)/0.06)]"
                      : "border-border hover:border-primary/20 hover:bg-muted/40"
                  )}
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                    {initialsFor(s.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{ROLE_LABELS[s.role] ?? s.role}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Topic</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {topics.map((t) => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                    topic === t
                      ? isAgent
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-[hsl(var(--gold))] bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))]"
                      : "border-border bg-card hover:bg-muted/50"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isAgent ? "Optional: extra context for the agent script" : "Optional: brief the rep on the situation"}
              rows={2}
              className="mt-3 resize-none text-sm"
            />
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("mt-2 w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {date ? format(date, "EEEE, MMMM d") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Available {isAgent ? "agent" : "rep"} slots
            </Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {slots.map((s) => (
                <button
                  key={s}
                  onClick={() => setTime(s)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-sm font-medium transition-all",
                    time === s
                      ? isAgent
                        ? "border-primary bg-primary text-primary-foreground shadow-brand"
                        : "border-[hsl(var(--gold))] bg-[hsl(var(--gold))] text-[hsl(var(--gold-foreground))]"
                      : "border-border bg-card hover:border-primary/30 hover:bg-muted/40"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            {!isAgent && (
              <p className="mt-3 text-[11px] text-muted-foreground flex items-start gap-1.5">
                <AlertTriangle className="h-3 w-3 mt-0.5 text-warning shrink-0" />
                Rep availability is tighter — most judgment calls happen within 48h.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between flex-wrap gap-3">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          {isAgent ? <Phone className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
          {isAgent
            ? "PreKick will dial out and post the transcript to this project."
            : "Calendar invite goes to the assigned rep and the stakeholder."}
        </div>
        <Button
          onClick={submit}
          disabled={!stakeholder}
          className={cn(
            "gap-2 border-0",
            isAgent
              ? "bg-gradient-brand hover:opacity-95 shadow-brand"
              : "bg-gradient-gold hover:opacity-95 text-[hsl(var(--gold-foreground))]"
          )}
        >
          <CheckCircle2 className="h-4 w-4" />
          {isAgent ? "Schedule agent call" : "Request rep call"}
        </Button>
      </div>
    </>
  );
}

export default function Scheduling() {
  const { dealProfileId } = useOutletContext<ActiveDealContext>();
  const { data: profile } = useDealProfile(dealProfileId);
  const stakeholders = profile?.stakeholders ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-10 md:py-16 space-y-10">
      <PageHeader
        eyebrow="Calls · 03"
        title="Schedule a"
        italic="call."
        description="Two lanes: the agent handles the routine — including its own auto-scheduled follow-ups. Reps handle the judgment."
      />

      {!dealProfileId && (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          No deal profile selected — extract one from a SOW on the Projects screen first.
        </div>
      )}

      {dealProfileId && stakeholders.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          This deal profile has no stakeholders yet.
        </div>
      )}

      {stakeholders.length > 0 && (
        <>
          {/* PART 01 — AGENT */}
          <SectionCard section="agent">
            <BookingForm section="agent" slots={AGENT_SLOTS} topics={AGENT_TOPICS} stakeholders={stakeholders} />

            {/* Auto follow-ups */}
            <div className="px-6 py-5 border-t border-border bg-muted/10">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-primary" />
                  <div className="eyebrow text-primary">Auto-scheduled by the agent</div>
                </div>
                <Badge variant="outline" className="text-[10px]">{autoFollowups.length} queued</Badge>
              </div>
              <ul className="grid gap-2">
                {autoFollowups.map((f, i) => (
                  <li key={i} className="rounded-lg border border-border bg-card px-4 py-3 flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{f.who}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{f.topic}</div>
                      <div className="text-[11px] text-muted-foreground/80 mt-1 font-mono">↳ trigger: {f.trigger}</div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {f.when}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </SectionCard>

          {/* PART 02 — REP */}
          <SectionCard section="rep">
            <BookingForm section="rep" slots={REP_SLOTS} topics={REP_TOPICS} stakeholders={stakeholders} />

            <div className="px-6 py-5 border-t border-border bg-muted/10">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-[hsl(var(--gold))]" />
                  <div className="eyebrow text-[hsl(var(--gold))]">Upcoming rep calls</div>
                </div>
                <Badge variant="outline" className="text-[10px]">{repCalls.length} booked</Badge>
              </div>
              {repCalls.length === 0 ? (
                <div className="text-xs text-muted-foreground italic">No rep calls scheduled.</div>
              ) : (
                <ul className="grid gap-2">
                  {repCalls.map((c, i) => (
                    <li key={i} className="rounded-lg border border-border bg-card px-4 py-3 flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold))] flex items-center justify-center shrink-0">
                        <UserRound className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{c.who}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{c.topic}</div>
                        <div className="text-[11px] text-muted-foreground/80 mt-1 font-mono">↳ rep: {c.rep}</div>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {c.when}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
