import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Database } from "lucide-react";
import { cn } from "@/lib/utils";

type LogEvent = { ts: string; op: "READ" | "WRITE" | "INFO"; detail: string };

export default function MemoryLogPanel() {
  const [open, setOpen] = useState(true);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const es = new EventSource("/api/memory-log/stream");
    es.onmessage = (m) => {
      try {
        setEvents((prev) => [...prev.slice(-199), JSON.parse(m.data) as LogEvent]);
      } catch {
        /* ignore keep-alive / non-JSON lines */
      }
    };
    es.onerror = () => {
      /* EventSource auto-reconnects; nothing to do */
    };
    return () => es.close();
  }, []);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events.length, open]);

  const color = (op: LogEvent["op"]) =>
    op === "READ" ? "text-sky-400" : op === "WRITE" ? "text-emerald-400" : "text-zinc-500";

  return (
    <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 text-zinc-100">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-2 text-[11px] uppercase tracking-wider text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <Database className="h-3.5 w-3.5" />
        HydraDB Memory Log
        <span className="ml-1 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">{events.length}</span>
        <span className="ml-auto flex items-center gap-2">
          <span className="hidden sm:inline text-[10px] normal-case text-zinc-600">live</span>
          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </span>
      </button>
      {open && (
        <div ref={scrollRef} className="h-40 overflow-y-auto px-4 pb-3 font-mono text-[11px] leading-relaxed">
          {events.length === 0 && <div className="text-zinc-600">Waiting for HydraDB operations…</div>}
          {events.map((e, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-zinc-600 shrink-0">{new Date(e.ts).toLocaleTimeString()}</span>
              <span className={cn("font-semibold shrink-0", color(e.op))}>[HYDRA {e.op}]</span>
              <span className="text-zinc-300">{e.detail}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
