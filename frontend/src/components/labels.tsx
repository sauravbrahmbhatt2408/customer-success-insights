import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AIStatus, CustomerStatus, Sentiment } from "@/types";

export const STATUS_LABELS: Record<CustomerStatus, string> = {
  onboarding: "Onboarding",
  active: "Active",
  at_risk: "At risk",
  churned: "Churned",
};

export const PLAN_LABELS = { starter: "Starter", growth: "Growth", enterprise: "Enterprise" };

export const TYPE_LABELS = { meeting: "Meeting", call: "Call", email: "Email", support: "Support" };

export const SENTIMENT_LABELS: Record<Sentiment, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

const STATUS_STYLES: Record<CustomerStatus, string> = {
  onboarding: "bg-sky-100 text-sky-800",
  active: "bg-emerald-100 text-emerald-800",
  at_risk: "bg-amber-100 text-amber-800",
  churned: "bg-zinc-200 text-zinc-700",
};

const SENTIMENT_STYLES: Record<Sentiment, string> = {
  positive: "bg-emerald-100 text-emerald-800",
  neutral: "bg-zinc-200 text-zinc-700",
  negative: "bg-red-100 text-red-800",
};

const AI_STATUS_LABELS: Record<AIStatus, string> = {
  pending: "Generating",
  completed: "Ready",
  failed: "Failed",
  skipped: "Skipped",
};

export function StatusBadge({ status }: { status: CustomerStatus }) {
  return <Badge className={cn("border-0", STATUS_STYLES[status])}>{STATUS_LABELS[status]}</Badge>;
}

export function SentimentBadge({ sentiment }: { sentiment: Sentiment | null }) {
  if (!sentiment) return <span className="text-muted-foreground">-</span>;
  return (
    <Badge className={cn("border-0", SENTIMENT_STYLES[sentiment])}>
      {SENTIMENT_LABELS[sentiment]}
    </Badge>
  );
}

export function AIStatusBadge({ status }: { status: AIStatus }) {
  return (
    <Badge variant={status === "failed" ? "destructive" : "outline"}>
      {AI_STATUS_LABELS[status]}
    </Badge>
  );
}

export function formatMoney(value: string | number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
