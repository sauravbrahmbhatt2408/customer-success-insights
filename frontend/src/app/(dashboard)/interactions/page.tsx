"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Select } from "@/components/form";
import { InteractionTable } from "@/components/interaction-table";
import { SENTIMENT_LABELS, TYPE_LABELS } from "@/components/labels";
import { EmptyState, ErrorState, LoadingRows, PageHeader, Pagination } from "@/components/states";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getErrorMessage, useGetCustomersQuery, useGetInteractionsQuery } from "@/store/api";
import type { InteractionFilters, InteractionType, Sentiment } from "@/types";

export default function InteractionsPage() {
  const [filters, setFilters] = useState<InteractionFilters>({ page: 1 });
  const { data: customers } = useGetCustomersQuery({ page: 1, page_size: 100 });
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetInteractionsQuery(filters);

  function setFilter(changes: Partial<InteractionFilters>) {
    setFilters((f) => ({ ...f, ...changes, page: 1 }));
  }

  return (
    <div>
      <PageHeader
        title="Interactions"
        actions={
          <Link href="/interactions/new" className={buttonVariants()}>
            <Plus />
            Log interaction
          </Link>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Select
          aria-label="Filter by customer"
          value={filters.customer_id ?? ""}
          onChange={(e) => setFilter({ customer_id: e.target.value || undefined })}
        >
          <option value="">All customers</option>
          {customers?.items.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.company}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by type"
          value={filters.type ?? ""}
          onChange={(e) => setFilter({ type: (e.target.value || undefined) as InteractionType })}
        >
          <option value="">All types</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by sentiment"
          value={filters.sentiment ?? ""}
          onChange={(e) => setFilter({ sentiment: (e.target.value || undefined) as Sentiment })}
        >
          <option value="">Any sentiment</option>
          {Object.entries(SENTIMENT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          From
          <Input
            type="date"
            value={filters.date_from ?? ""}
            onChange={(e) => setFilter({ date_from: e.target.value || undefined })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          To
          <Input
            type="date"
            value={filters.date_to ?? ""}
            onChange={(e) => setFilter({ date_to: e.target.value || undefined })}
          />
        </label>
      </div>

      {isLoading ? (
        <LoadingRows />
      ) : isError ? (
        <ErrorState
          message={getErrorMessage(error, "Could not load interactions")}
          onRetry={refetch}
        />
      ) : !data?.items.length ? (
        <EmptyState title="No interactions found">
          Try different filters, or log a new interaction.
        </EmptyState>
      ) : (
        <>
          <div className={isFetching ? "opacity-60" : ""}>
            <InteractionTable interactions={data.items} />
          </div>
          <Pagination
            page={data.page}
            pageSize={data.page_size}
            total={data.total}
            onChange={(page) => setFilters((f) => ({ ...f, page }))}
          />
        </>
      )}
    </div>
  );
}
