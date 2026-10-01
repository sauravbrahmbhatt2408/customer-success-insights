"use client";

import Link from "next/link";

import { CountBars, InteractionsLine } from "@/components/dashboard-charts";
import {
  AIStatusBadge,
  SENTIMENT_LABELS,
  STATUS_LABELS,
  SentimentBadge,
  StatusBadge,
  TYPE_LABELS,
  formatDate,
  formatMoney,
} from "@/components/labels";
import { ErrorState, PageHeader } from "@/components/states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage, useGetDashboardQuery } from "@/store/api";
import { useAppSelector } from "@/store/store";
import type { CustomerStatus, Sentiment } from "@/types";

export default function DashboardPage() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const { data, isLoading, error, refetch } = useGetDashboardQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }
  if (!data) {
    return (
      <ErrorState message={getErrorMessage(error, "Could not load the dashboard")} onRetry={refetch} />
    );
  }

  const cards = [
    { label: "Customers", value: data.cards.total_customers },
    { label: "Active", value: data.cards.active },
    { label: "At risk", value: data.cards.at_risk },
    { label: "Churned", value: data.cards.churned },
    { label: "Total MRR", value: formatMoney(data.cards.total_mrr) },
    { label: "Interactions (30 days)", value: data.cards.interactions_last_30_days },
  ];
  const sentiment = (Object.keys(SENTIMENT_LABELS) as Sentiment[]).map((key) => ({
    label: SENTIMENT_LABELS[key],
    value: data.sentiment[key] ?? 0,
  }));
  const byStatus = (Object.keys(STATUS_LABELS) as CustomerStatus[]).map((key) => ({
    label: STATUS_LABELS[key],
    value: data.customers_by_status[key] ?? 0,
  }));
  const hasSentiment = sentiment.some((s) => s.value > 0);

  return (
    <div className="space-y-6">
      <PageHeader title={role === "csm" ? "My dashboard" : "Dashboard"} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <Card key={card.label} size="sm">
            <CardContent>
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="mt-1 truncate text-xl font-semibold tabular-nums sm:text-2xl">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Interactions per day, last 30 days</CardTitle>
        </CardHeader>
        <CardContent>
          <InteractionsLine data={data.interactions_per_day} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sentiment</CardTitle>
          </CardHeader>
          <CardContent>
            {hasSentiment ? (
              <CountBars data={sentiment} sentiment />
            ) : (
              <p className="text-sm text-muted-foreground">No insights yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Customers by status</CardTitle>
          </CardHeader>
          <CardContent>
            <CountBars data={byStatus} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent risks</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recent_risks.length ? (
              <ul className="divide-y text-sm">
                {data.recent_risks.map((risk) => (
                  <li key={risk.interaction_id} className="py-3 first:pt-0 last:pb-0">
                    <Link
                      href={`/interactions/${risk.interaction_id}`}
                      className="font-medium hover:underline"
                    >
                      {risk.company}: {risk.title}
                    </Link>
                    <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                      {risk.risks.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No risks flagged.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>No contact in 30+ days</CardTitle>
          </CardHeader>
          <CardContent>
            {data.quiet_customers.length ? (
              <ul className="divide-y text-sm">
                {data.quiet_customers.map((customer) => (
                  <li
                    key={customer.id}
                    className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div>
                      <Link href={`/customers/${customer.id}`} className="font-medium hover:underline">
                        {customer.company}
                      </Link>
                      <p className="text-muted-foreground">
                        {customer.last_interaction_at
                          ? `Last contact ${formatDate(customer.last_interaction_at)}`
                          : "Never contacted"}
                      </p>
                    </div>
                    <StatusBadge status={customer.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Every customer was contacted recently.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent interactions</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recent_interactions.length ? (
            <ul className="divide-y text-sm">
              {data.recent_interactions.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <Link href={`/interactions/${item.id}`} className="font-medium hover:underline">
                      {item.title}
                    </Link>
                    <p className="text-muted-foreground">
                      {item.company} · {TYPE_LABELS[item.type]} · {formatDate(item.occurred_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SentimentBadge sentiment={item.sentiment} />
                    <AIStatusBadge status={item.ai_status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No interactions logged yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
