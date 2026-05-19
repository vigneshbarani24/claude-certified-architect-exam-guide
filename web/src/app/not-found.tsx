import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <Compass className="h-10 w-10 text-claude-orange" />
      <p className="mt-6 font-mono text-sm uppercase tracking-wider text-claude-muted">
        404
      </p>
      <h1 className="mt-2 font-display text-4xl">Page not found</h1>
      <p className="mt-3 text-muted-foreground">
        That page does not exist. Head back to the study system and pick up
        where you left off.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">Back to home</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/learn">Open the curriculum</Link>
        </Button>
      </div>
    </div>
  );
}
