"use client";

import { Loader2, Pencil, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { AIStatusBadge, SentimentBadge, TYPE_LABELS, formatDateTime } from "@/components/labels";
import { ErrorState, LoadingRows, PageHeader } from "@/components/states";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  api,
  getErrorMessage,
  useGetInteractionQuery,
  useRegenerateInsightMutation,
} from "@/store/api";
import type { Interaction } from "@/types";

const POLL_MS = 3000;

export default function InteractionDetailPage() {
  const { id } = useParams<{ id: string }>();
  // Poll only while the insight is still being generated.
  const { data: cached } = api.endpoints.getInteraction.useQueryState(id);
  const { data: interaction, isLoading, error, refetch } = useGetInteractionQuery(id, {
    pollingInterval: cached?.ai_status === "pending" ? POLL_MS : 0,
  });

  if (isLoading) return <LoadingRows />;
  if (!interaction) {
    return (
      <ErrorState message={getErrorMessage(error, "Interaction not found")} onRetry={refetch} />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={interaction.title}
        actions={
          <Link
            href={`/interactions/${id}/edit`}
            className={buttonVariants({ variant: "outline" })}
          >
            <Pencil />
            Edit
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">Customer</dt>
                <dd className="font-medium">
                  <Link href={`/customers/${interaction.customer.id}`} className="hover:underline">
                    {interaction.customer.company}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Type</dt>
                <dd className="font-medium">{TYPE_LABELS[interaction.type]}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Date</dt>
                <dd className="font-medium">{formatDateTime(interaction.occurred_at)}</dd>
              </div>
            </dl>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{interaction.notes}</p>
          </CardContent>
        </Card>

        <InsightCard interaction={interaction} />
      </div>
    </div>
  );
}

function InsightCard({ interaction }: { interaction: Interaction }) {
  const [regenerate, { isLoading }] = useRegenerateInsightMutation();
  const { ai_status: status, insight } = interaction;

  async function handleRegenerate() {
    try {
      await regenerate(interaction.id).unwrap();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not start a new insight"));
    }
  }

  const regenerateButton = (
    <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={isLoading}>
      <RefreshCw />
      Regenerate
    </Button>
  );

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>AI insight</CardTitle>
        <AIStatusBadge status={status} />
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {status === "pending" && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Generating the summary. This usually takes a few seconds.
          </p>
        )}

        {status === "skipped" && (
          <p className="text-muted-foreground">
            The notes are too short for a useful summary. Add more detail to get one.
          </p>
        )}

        {status === "failed" && (
          <div className="space-y-3">
            <p className="text-destructive">
              {insight?.error ?? "The insight could not be generated."}
            </p>
            {regenerateButton}
          </div>
        )}

        {status === "completed" && insight && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Sentiment</span>
              <SentimentBadge sentiment={insight.sentiment} />
            </div>
            <p className="leading-relaxed">{insight.summary}</p>
            <InsightList title="Action items" items={insight.action_items} />
            <InsightList title="Risks" items={insight.risks} />
            <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
              <span>Model: {insight.model}</span>
              {regenerateButton}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function InsightList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1 font-medium">{title}</p>
      {items.length ? (
        <ul className="list-disc space-y-1 pl-5">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">None</p>
      )}
    </div>
  );
}
