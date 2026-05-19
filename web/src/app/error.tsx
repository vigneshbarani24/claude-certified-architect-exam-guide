"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Global App Router error boundary. Themed, static-friendly, links home.
 * Must be a Client Component per Next.js App Router conventions.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the dev console only — no tracker, no network (privacy).
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <AlertTriangle className="h-10 w-10 text-claude-orange" />
      <h1 className="mt-6 font-display text-4xl">Something went wrong</h1>
      <p className="mt-3 text-muted-foreground">
        An unexpected error interrupted this page. Your progress is stored
        locally and is safe — nothing is sent anywhere.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <Link href="/">Back to home</Link>
        </Button>
      </div>
    </div>
  );
}
