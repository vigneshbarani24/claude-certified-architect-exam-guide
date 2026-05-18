import { Lightbulb, AlertTriangle, Info } from "lucide-react";

import { cn } from "@/lib/utils";

type Variant = "concept" | "callout" | "warning";

const ICONS: Record<Variant, typeof Info> = {
  concept: Lightbulb,
  callout: Info,
  warning: AlertTriangle,
};

const STYLES: Record<Variant, string> = {
  concept: "border-claude-orange/40 bg-claude-orange/5",
  callout: "border-border bg-secondary/40",
  warning: "border-destructive/40 bg-destructive/5",
};

interface ConceptBlockProps {
  title: string;
  variant?: Variant;
  children: React.ReactNode;
}

export function ConceptBlock({
  title,
  variant = "concept",
  children,
}: ConceptBlockProps) {
  const Icon = ICONS[variant];
  return (
    <div
      className={cn(
        "my-5 rounded-lg border p-4",
        STYLES[variant]
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-claude-orange" />
        <span className="font-mono text-xs uppercase tracking-wider text-claude-orange">
          {title}
        </span>
      </div>
      <div className="text-sm leading-relaxed text-foreground">{children}</div>
    </div>
  );
}
