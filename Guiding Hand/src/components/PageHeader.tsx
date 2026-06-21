import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  italic?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, italic, description, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("flex items-start justify-between gap-6 flex-wrap", className)}>
      <div className="space-y-3 max-w-2xl">
        <div className="flex items-center gap-2.5">
          <span className="h-px w-8 bg-primary/40" />
          <span className="eyebrow text-primary">{eyebrow}</span>
        </div>
        <h1 className="font-display text-[44px] md:text-[56px] leading-[1.02] tracking-tight text-foreground">
          {title}
          {italic && <> <span className="italic text-primary/80">{italic}</span></>}
        </h1>
        {description && (
          <p className="text-[15px] leading-relaxed text-muted-foreground max-w-xl">{description}</p>
        )}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
