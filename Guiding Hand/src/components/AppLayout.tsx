import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, FileText, Headphones, LayoutGrid, Mic, Send, Sparkles, Users2 } from "lucide-react";
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
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="px-6 py-5 flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-sidebar-primary/15 ring-1 ring-sidebar-primary/30 flex items-center justify-center">
            <Mic className="h-4 w-4 text-sidebar-primary" />
          </div>
          <div>
            <div className="text-sidebar-primary-foreground font-semibold tracking-tight">PreKick</div>
            <div className="text-[11px] uppercase tracking-wider text-sidebar-foreground/60">Pre-kickoff agent</div>
          </div>
        </div>

        <nav className="px-3 py-2 space-y-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-4 py-4 text-xs text-sidebar-foreground/60 border-t border-sidebar-border">
          <div className="flex items-center gap-2">
            <Headphones className="h-3.5 w-3.5" />
            Voice agent — demo mode
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b border-border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/60 flex items-center px-4 md:px-8 gap-4">
          <div className="md:hidden flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
              <Mic className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-semibold tracking-tight">PreKick</span>
          </div>
          <div className="text-sm text-muted-foreground hidden md:block">{currentLabel}</div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-auto md:ml-0 flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors max-w-[60vw] md:max-w-none">
                <span className={cn("h-2 w-2 rounded-full", activeProfile ? "bg-success" : "bg-muted-foreground/40")} />
                <span className="truncate font-medium">
                  {activeProfile ? projectDisplayName(activeProfile) : "No project yet"}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
            <Button onClick={() => setRocketOpen(true)} className="gap-2">
              <Send className="h-4 w-4" />
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
