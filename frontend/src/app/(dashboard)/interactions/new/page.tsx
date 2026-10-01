"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { toast } from "sonner";

import { InteractionForm } from "@/components/interaction-form";
import { PageHeader } from "@/components/states";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateInteractionMutation } from "@/store/api";
import type { InteractionInput } from "@/types";

function NewInteraction() {
  const router = useRouter();
  const customerId = useSearchParams().get("customer_id") ?? undefined;
  const [createInteraction] = useCreateInteractionMutation();

  async function handleSubmit(data: InteractionInput) {
    const interaction = await createInteraction(data).unwrap();
    toast.success("Interaction saved");
    router.push(`/interactions/${interaction.id}`);
  }

  return (
    <InteractionForm
      defaultCustomerId={customerId}
      submitLabel="Save interaction"
      onSubmit={handleSubmit}
    />
  );
}

export default function NewInteractionPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Log interaction" />
      <Card>
        <CardContent>
          <Suspense>
            <NewInteraction />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
