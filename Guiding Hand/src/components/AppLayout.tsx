import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, ChevronDown, FileText, Headphones, LayoutGrid, Mic, Send, Sparkles, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useDealProfiles } from "@/hooks/useDealProfiles";
import type { ActiveDealContext } from "@/hooks/useDealProfiles";

function projectDisplayName(profile: { customer?: { legalEntity?: string }; scope?: { summary?: string } }) {
  const entity = profile.customer?.legalEntity ?? "Untitled customer";
  const summary = profile.scope?.summary;
  return summary ? `${entity} — ${summary}` : entity;
}

const nav = [
  { to: "/projects", label: "Projects", icon: LayoutGrid },
  { to: "/stakeholders", label: "Stakeholders & Calls", icon: Users2 },
  { to: "/scheduling", label: "Schedule Calls", icon: CalendarClock },
  { to: "/conflict-map", label: "Conflict Map", icon: Sparkles },
  { to: "/packet", label: "Kickoff Packet", icon: FileText },
];

export default function AppLayout() {
  const [rocketOpen, setRocketOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const location = useLocation();
  const currentLabel = nav.find((n) => location.pathname.startsWith(n.to))?.label ?? "Projects";

  const { data: profiles } = useDealProfiles();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (profiles && profiles.length > 0 && !activeId) {
      setActiveId(profiles[0].id);
    }
  }, [profiles, activeId]);

  const activeProfile = profiles?.find((p) => p.id === activeId) ?? null;

  const outletContext: ActiveDealContext = {
    dealProfileId: activeId,
    onProfileCreated: (id: string) => {
      queryClient.invalidateQueries({ queryKey: ["deal_profiles"] });
      setActiveId(id);
    },
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border relative overflow-hidden">
        {/* Ambient brand glow */}
        <div className="pointer-events-none absolute -top-24 -left-16 h-64 w-64 rounded-full bg-sidebar-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 -right-16 h-56 w-56 rounded-full bg-[hsl(var(--gold)/0.12)] blur-3xl" />

        <div className="relative px-6 py-6 flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-brand ring-1 ring-white/10">
            <Mic className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-white font-semibold tracking-tight text-[15px] leading-none">PreKick</div>
            <div className="eyebrow text-sidebar-foreground/55 mt-1.5">Pre-kickoff agent</div>
          </div>
        </div>

        <div className="relative px-6 pb-4">
          <div className="h-px bg-gradient-to-r from-transparent via-sidebar-border to-transparent" />
        </div>

        <nav className="relative px-3 py-1 space-y-0.5">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all relative",
                  isActive
                    ? "bg-sidebar-accent text-white shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-white"
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r bg-sidebar-primary" />
                  )}
                  <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-white")} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="relative mt-auto m-3 p-4 rounded-xl bg-sidebar-accent/50 border border-sidebar-border">
          <div className="flex items-center gap-2 text-[11px] text-sidebar-foreground/70">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-sidebar-primary opacity-75 animate-pulse-dot" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-sidebar-primary" />
            </span>
            <Headphones className="h-3 w-3" />
            Voice agent — demo mode
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 flex items-center px-4 md:px-8 gap-4 sticky top-0 z-30">
          <div className="md:hidden flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-brand flex items-center justify-center shadow-brand">
              <Mic className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold tracking-tight">PreKick</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[13px]">
            <span className="text-muted-foreground">PreKick</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="font-medium text-foreground">{currentLabel}</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-auto md:ml-0 flex items-center gap-2.5 rounded-full border border-border bg-card pl-3 pr-2.5 py-1.5 text-[13px] hover:border-primary/30 hover:shadow-card transition-all max-w-[60vw] md:max-w-none">
                <span className="relative flex h-2 w-2">
                  <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-60 animate-pulse-dot", activeProfile ? "bg-success" : "bg-muted-foreground/40")} />
                  <span className={cn("relative inline-flex h-2 w-2 rounded-full", activeProfile ? "bg-success" : "bg-muted-foreground/40")} />
                </span>
                <span className="truncate font-medium">
                  {activeProfile ? projectDisplayName(activeProfile) : "No project yet"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel>Switch project</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(profiles ?? []).length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  No deal profiles yet — extract one from a SOW on the Projects screen.
                </div>
              )}
              {(profiles ?? []).map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className="flex items-start gap-2"
                >
                  <span className={cn("mt-1.5 h-2 w-2 rounded-full", p.id === activeId ? "bg-success" : "bg-muted-foreground/40")} />
                  <div className="flex-1">
                    <div className="text-sm">{projectDisplayName(p)}</div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-auto flex items-center gap-2">
            <Button onClick={() => setRocketOpen(true)} className="gap-2 bg-gradient-brand hover:opacity-95 shadow-brand border-0">
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Send to Rocketlane</span>
              <span className="sm:hidden">Send</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet context={outletContext} />
        </main>
      </div>

      {/* Rocketlane modal */}
      <Dialog open={rocketOpen} onOpenChange={setRocketOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="mx-auto h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mb-2">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <DialogTitle className="text-center">Project created in Rocketlane</DialogTitle>
            <DialogDescription className="text-center">
              {activeProfile ? projectDisplayName(activeProfile) : "This project"} is now populated with everything PreKick gathered.
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-2 my-2">
            {[
              "4 stakeholders added as contacts",
              "3 risks added to register",
              "Kickoff agenda created",
              "Success criteria set as project goals",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground text-center italic">
            PreKick feeds the human context Nitro can't capture.
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRocketOpen(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
