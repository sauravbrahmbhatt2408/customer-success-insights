"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/states";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateCustomerMutation } from "@/store/api";
import type { CustomerInput } from "@/types";

export default function NewCustomerPage() {
  const router = useRouter();
  const [createCustomer] = useCreateCustomerMutation();

  async function handleSubmit(data: CustomerInput) {
    const customer = await createCustomer(data).unwrap();
    toast.success("Customer created");
    router.push(`/customers/${customer.id}`);
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="New customer" />
      <Card>
        <CardContent>
          <CustomerForm submitLabel="Create customer" onSubmit={handleSubmit} />
        </CardContent>
      </Card>
    </div>
  );
}
