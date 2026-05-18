"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Linkedin, Link2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DOMAIN_NAMES } from "@/lib/progress";

/**
 * Static repo URL used for all share links. No GitHub API / network calls.
 */
const REPO_URL =
  "https://github.com/vigneshbarani24/claude-certified-architect-exam-guide";

/**
 * Canvas cannot use next/font; we use generic system stacks. Georgia stands
 * in for the Instrument Serif display face, system sans for body, and a
 * monospace stack for numeric/metadata, matching the site's type roles.
 */
const FONT_DISPLAY = 'Georgia, "Times New Roman", serif';
const FONT_SANS =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const FONT_MONO = '"JetBrains Mono", ui-monospace, "Courier New", monospace';

const OG_W = 1200;
const OG_H = 630;

const COLORS = {
  bg: "#0a0a0a",
  surface: "#111111",
  border: "#232323",
  orange: "#d97757",
  fg: "#fafafa",
  muted: "#666666",
};

type DomainBreakdown = Record<number, { correct: number; total: number }>;

interface MockResultProps {
  variant: "mock-result";
  scoreCorrect: number;
  total: number;
  perDomain: DomainBreakdown;
  passed: boolean;
  badgeLabels?: string[];
}

interface RankProps {
  variant: "rank";
  rankName: string;
  xp: number;
  streak: number;
  badgeLabels?: string[];
}

type ShareCardProps = MockResultProps | RankProps;

function drawCard(
  ctx: CanvasRenderingContext2D,
  props: ShareCardProps
): void {
  // Background.
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, OG_W, OG_H);

  // Subtle orange glow top-left.
  const grad = ctx.createRadialGradient(120, 80, 0, 120, 80, 620);
  grad.addColorStop(0, "rgba(217,119,87,0.16)");
  grad.addColorStop(1, "rgba(217,119,87,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, OG_W, OG_H);

  // Border frame.
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, OG_W - 48, OG_H - 48);

  // Brand kicker.
  ctx.fillStyle = COLORS.orange;
  ctx.font = `600 24px ${FONT_MONO}`;
  ctx.textBaseline = "top";
  ctx.fillText("CCAF · CLAUDE CERTIFIED ARCHITECT", 72, 72);

  if (props.variant === "mock-result") {
    const pct =
      props.total > 0
        ? Math.round((props.scoreCorrect / props.total) * 100)
        : 0;

    ctx.fillStyle = COLORS.fg;
    ctx.font = `400 92px ${FONT_DISPLAY}`;
    ctx.fillText("Mock Exam Result", 72, 138);

    // Big headline metric.
    ctx.fillStyle = props.passed ? COLORS.orange : COLORS.fg;
    ctx.font = `400 130px ${FONT_DISPLAY}`;
    ctx.fillText(
      `${props.scoreCorrect}/${props.total}`,
      72,
      250
    );

    ctx.fillStyle = props.passed ? COLORS.orange : COLORS.muted;
    ctx.font = `600 44px ${FONT_MONO}`;
    ctx.fillText(
      `${pct}% · ${props.passed ? "PASS" : "KEEP GOING"}`,
      72,
      400
    );

    // Per-domain mini bars.
    const domains = Object.keys(props.perDomain)
      .map(Number)
      .sort((a, b) => a - b);
    let by = 470;
    const barX = 72;
    const barW = 760;
    ctx.font = `500 22px ${FONT_MONO}`;
    for (const d of domains) {
      const rec = props.perDomain[d];
      const ratio = rec.total > 0 ? rec.correct / rec.total : 0;
      ctx.fillStyle = COLORS.muted;
      ctx.fillText(`D${d}`, barX, by);
      // track
      ctx.fillStyle = COLORS.surface;
      ctx.fillRect(barX + 60, by + 2, barW, 16);
      // fill
      ctx.fillStyle = COLORS.orange;
      ctx.fillRect(barX + 60, by + 2, barW * ratio, 16);
      ctx.fillStyle = COLORS.muted;
      ctx.fillText(`${rec.correct}/${rec.total}`, barX + 60 + barW + 16, by);
      by += 30;
      if (by > 540) break;
    }
  } else {
    ctx.fillStyle = COLORS.fg;
    ctx.font = `400 92px ${FONT_DISPLAY}`;
    ctx.fillText("My Study Rank", 72, 138);

    ctx.fillStyle = COLORS.orange;
    ctx.font = `400 124px ${FONT_DISPLAY}`;
    ctx.fillText(props.rankName, 72, 248);

    ctx.fillStyle = COLORS.fg;
    ctx.font = `600 46px ${FONT_MONO}`;
    ctx.fillText(
      `${props.xp.toLocaleString()} XP · ${props.streak}-day streak`,
      72,
      400
    );
  }

  // Badge row.
  const badges = props.badgeLabels ?? [];
  if (badges.length > 0) {
    let bx = 72;
    const byRow = 540;
    ctx.font = `500 20px ${FONT_MONO}`;
    for (const label of badges.slice(0, 4)) {
      const text = label.toUpperCase();
      const w = ctx.measureText(text).width + 28;
      ctx.strokeStyle = COLORS.orange;
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, byRow, w, 34);
      ctx.fillStyle = COLORS.orange;
      ctx.fillText(text, bx + 14, byRow + 8);
      bx += w + 14;
      if (bx > OG_W - 200) break;
    }
  }

  // Footer.
  ctx.fillStyle = COLORS.muted;
  ctx.font = `400 22px ${FONT_SANS}`;
  ctx.fillText(
    "Claude Certified Architect — free & open-source study system",
    72,
    OG_H - 86
  );
  ctx.fillStyle = COLORS.orange;
  ctx.font = `500 22px ${FONT_MONO}`;
  ctx.fillText("github.com/vigneshbarani24", 72, OG_H - 56);
}

function shareText(props: ShareCardProps): string {
  if (props.variant === "mock-result") {
    return `I scored ${props.scoreCorrect}/${props.total} on the free CCAF mock exam 🏛️ Study free & open-source:`;
  }
  return `${props.rankName} rank · ${props.xp.toLocaleString()} XP · ${props.streak}-day streak on the free CCAF study system 🏛️`;
}

export function ShareCard(props: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawCard(ctx, props);
  }, [props]);

  useEffect(() => {
    render();
  }, [render]);

  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob || typeof document === "undefined") return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        props.variant === "mock-result"
          ? "ccaf-mock-result.png"
          : "ccaf-rank.png";
      a.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  }, [props.variant]);

  const text = shareText(props);

  const shareX = () => {
    if (typeof window === "undefined") return;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text
      )}&url=${encodeURIComponent(REPO_URL)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const shareLinkedIn = () => {
    if (typeof window === "undefined") return;
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        REPO_URL
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const copyLink = async () => {
    const payload = `${text} ${REPO_URL}`;
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(payload);
      } else if (typeof document !== "undefined") {
        const ta = document.createElement("textarea");
        ta.value = payload;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — silently ignore */
    }
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <canvas
          ref={canvasRef}
          width={OG_W}
          height={OG_H}
          className="block h-auto w-full"
          aria-label="Shareable result card preview"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={download}>
          <Download className="h-4 w-4" />
          Download PNG
        </Button>
        <Button size="sm" variant="outline" onClick={shareX}>
          Share on X
        </Button>
        <Button size="sm" variant="outline" onClick={shareLinkedIn}>
          <Linkedin className="h-4 w-4" />
          LinkedIn
        </Button>
        <Button size="sm" variant="outline" onClick={copyLink}>
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}

export { REPO_URL, DOMAIN_NAMES };
