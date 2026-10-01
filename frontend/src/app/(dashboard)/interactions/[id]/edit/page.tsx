"use client";

import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { InteractionForm } from "@/components/interaction-form";
import { ErrorState, LoadingRows, PageHeader } from "@/components/states";
import { Card, CardContent } from "@/components/ui/card";
import {
  getErrorMessage,
  useGetInteractionQuery,
  useUpdateInteractionMutation,
} from "@/store/api";
import type { InteractionInput } from "@/types";

export default function EditInteractionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: interaction, isLoading, error } = useGetInteractionQuery(id);
  const [updateInteraction] = useUpdateInteractionMutation();

  async function handleSubmit({ type, title, notes, occurred_at }: InteractionInput) {
    await updateInteraction({ id, data: { type, title, notes, occurred_at } }).unwrap();
    toast.success("Interaction saved");
    router.push(`/interactions/${id}`);
  }

  if (isLoading) return <LoadingRows />;
  if (!interaction) {
    return <ErrorState message={getErrorMessage(error, "Interaction not found")} />;
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Edit interaction" />
      <Card>
        <CardContent>
          <InteractionForm
            interaction={interaction}
            submitLabel="Save changes"
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
