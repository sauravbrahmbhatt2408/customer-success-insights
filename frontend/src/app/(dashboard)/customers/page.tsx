"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Select } from "@/components/form";
import { PLAN_LABELS, STATUS_LABELS, StatusBadge, formatMoney } from "@/components/labels";
import { EmptyState, ErrorState, LoadingRows, PageHeader, Pagination } from "@/components/states";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getErrorMessage, useGetCustomersQuery, useGetUserOptionsQuery } from "@/store/api";
import { useAppSelector } from "@/store/store";
import type { CustomerFilters, CustomerStatus, Plan } from "@/types";

export default function CustomersPage() {
  const user = useAppSelector((state) => state.auth.user);
  const canSeeAll = user?.role !== "csm";
  const [filters, setFilters] = useState<CustomerFilters>({ page: 1, search: "" });
  const [search, setSearch] = useState("");
  const { data: owners } = useGetUserOptionsQuery(undefined, { skip: !canSeeAll });
  const { data, isLoading, isFetching, isError, error, refetch } = useGetCustomersQuery(filters);

  useEffect(() => {
    const timer = setTimeout(
      () => setFilters((f) => (f.search === search ? f : { ...f, search, page: 1 })),
      300,
    );
    return () => clearTimeout(timer);
  }, [search]);

  function setFilter(changes: Partial<CustomerFilters>) {
    setFilters((f) => ({ ...f, ...changes, page: 1 }));
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        actions={
          <Link href="/customers/new" className={buttonVariants()}>
            <Plus />
            New customer
          </Link>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Search name, company or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search customers"
        />
        <Select
          aria-label="Filter by status"
          value={filters.status ?? ""}
          onChange={(e) => setFilter({ status: (e.target.value || undefined) as CustomerStatus })}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by plan"
          value={filters.plan ?? ""}
          onChange={(e) => setFilter({ plan: (e.target.value || undefined) as Plan })}
        >
          <option value="">All plans</option>
          {Object.entries(PLAN_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        {canSeeAll && (
          <Select
            aria-label="Filter by owner"
            value={filters.owner_id ?? ""}
            onChange={(e) => setFilter({ owner_id: e.target.value || undefined })}
          >
            <option value="">All owners</option>
            {owners?.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.full_name}
              </option>
            ))}
          </Select>
        )}
      </div>

      {isLoading ? (
        <LoadingRows />
      ) : isError ? (
        <ErrorState message={getErrorMessage(error, "Could not load customers")} onRetry={refetch} />
      ) : !data?.items.length ? (
        <EmptyState title="No customers found">
          Try different filters, or add a new customer.
        </EmptyState>
      ) : (
        <>
          <div className={`rounded-xl border bg-background ${isFetching ? "opacity-60" : ""}`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead className="hidden lg:table-cell">Contact</TableHead>
                  <TableHead className="hidden sm:table-cell">Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                  <TableHead className="hidden xl:table-cell">Owner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <Link href={`/customers/${customer.id}`} className="hover:underline">
                        {customer.company}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div>{customer.name}</div>
                      <div className="text-xs text-muted-foreground">{customer.email}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{PLAN_LABELS[customer.plan]}</TableCell>
                    <TableCell>
                      <StatusBadge status={customer.status} />
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(customer.mrr)}</TableCell>
                    <TableCell className="hidden xl:table-cell">{customer.owner.full_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
