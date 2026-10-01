"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { CustomerForm } from "@/components/customer-form";
import { ErrorState, LoadingRows, PageHeader } from "@/components/states";
import { Card, CardContent } from "@/components/ui/card";
import { getErrorMessage, useGetCustomerQuery, useUpdateCustomerMutation } from "@/store/api";
import type { CustomerInput } from "@/types";

export default function EditCustomerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: customer, isLoading, error } = useGetCustomerQuery(id);
  const [updateCustomer] = useUpdateCustomerMutation();

  async function handleSubmit(data: CustomerInput) {
    await updateCustomer({ id, data }).unwrap();
    toast.success("Customer saved");
    router.push(`/customers/${id}`);
  }

  if (isLoading) return <LoadingRows />;
  if (!customer) return <ErrorState message={getErrorMessage(error, "Customer not found")} />;

  return (
    <div className="max-w-3xl">
      <PageHeader title={`Edit ${customer.company}`} />
      <Card>
        <CardContent>
          <CustomerForm customer={customer} submitLabel="Save changes" onSubmit={handleSubmit} />
        </CardContent>
      </Card>
    </div>
  );
}
