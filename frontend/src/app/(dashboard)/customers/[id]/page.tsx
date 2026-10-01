"use client";

import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmDelete } from "@/components/confirm-delete";
import { InteractionTable } from "@/components/interaction-table";
import { PLAN_LABELS, StatusBadge, formatDate, formatMoney } from "@/components/labels";
import { EmptyState, ErrorState, LoadingRows, PageHeader } from "@/components/states";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getErrorMessage,
  useDeleteCustomerMutation,
  useGetCustomerQuery,
  useGetInteractionsQuery,
} from "@/store/api";
import { useAppSelector } from "@/store/store";

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const role = useAppSelector((state) => state.auth.user?.role);
  const { data: customer, isLoading, error, refetch } = useGetCustomerQuery(id);
  const interactions = useGetInteractionsQuery({ page: 1, page_size: 50, customer_id: id });
  const [deleteCustomer] = useDeleteCustomerMutation();

  async function handleDelete() {
    try {
      await deleteCustomer(id).unwrap();
      toast.success("Customer deleted");
      router.push("/customers");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not delete the customer"));
    }
  }

  if (isLoading) return <LoadingRows />;
  if (!customer) {
    return (
      <ErrorState message={getErrorMessage(error, "Customer not found")} onRetry={refetch} />
    );
  }

  const details = [
    ["Contact", customer.name],
    ["Email", customer.email ?? "-"],
    ["Phone", customer.phone ?? "-"],
    ["Industry", customer.industry ?? "-"],
    ["Plan", PLAN_LABELS[customer.plan]],
    ["MRR", formatMoney(customer.mrr)],
    ["Owner", customer.owner.full_name],
    ["Customer since", formatDate(customer.created_at)],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.company}
        actions={
          <>
            <Link href={`/customers/${id}/edit`} className={buttonVariants({ variant: "outline" })}>
              <Pencil />
              Edit
            </Link>
            {role !== "csm" && (
              <ConfirmDelete
                title={`Delete ${customer.company}?`}
                description="This also deletes all of its interactions and insights. This can't be undone."
                onConfirm={handleDelete}
              />
            )}
          </>
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <CardTitle>Details</CardTitle>
          <StatusBadge status={customer.status} />
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Interactions</h2>
          <Link
            href={`/interactions/new?customer_id=${id}`}
            className={buttonVariants({ size: "sm" })}
          >
            <Plus />
            Log interaction
          </Link>
        </div>
        {interactions.isLoading ? (
          <LoadingRows rows={3} />
        ) : interactions.isError ? (
          <ErrorState message="Could not load interactions" onRetry={interactions.refetch} />
        ) : !interactions.data?.items.length ? (
          <EmptyState title="No interactions yet">Log the first call, meeting or email.</EmptyState>
        ) : (
          <InteractionTable interactions={interactions.data.items} showCustomer={false} />
        )}
      </div>
    </div>
  );
}
