"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Field, FormError, Select } from "@/components/form";
import { TYPE_LABELS } from "@/components/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { interactionSchema, type InteractionValues } from "@/lib/validations";
import { getErrorMessage, useGetCustomersQuery } from "@/store/api";
import type { Interaction, InteractionInput } from "@/types";

// <input type="datetime-local"> works in local time without a timezone.
function toLocalInput(iso: string) {
  const date = new Date(iso);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function InteractionForm({
  interaction,
  defaultCustomerId,
  submitLabel,
  onSubmit,
}: {
  interaction?: Interaction;
  defaultCustomerId?: string;
  submitLabel: string;
  onSubmit: (data: InteractionInput) => Promise<unknown>;
}) {
  const { data: customers } = useGetCustomersQuery(
    { page: 1, page_size: 100 },
    { skip: Boolean(interaction) },
  );
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InteractionValues>({
    resolver: zodResolver(interactionSchema),
    defaultValues: {
      customer_id: interaction?.customer.id ?? defaultCustomerId ?? "",
      type: interaction?.type ?? "call",
      title: interaction?.title ?? "",
      notes: interaction?.notes ?? "",
      occurred_at: toLocalInput(interaction?.occurred_at ?? new Date().toISOString()),
    },
  });

  async function submit(values: InteractionValues) {
    try {
      await onSubmit({ ...values, occurred_at: new Date(values.occurred_at).toISOString() });
    } catch (error) {
      setError("root", { message: getErrorMessage(error, "Could not save the interaction") });
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <FormError message={errors.root?.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        {interaction ? (
          <Field label="Customer" htmlFor="customer">
            <Input id="customer" value={interaction.customer.company} disabled />
          </Field>
        ) : (
          <Field label="Customer" htmlFor="customer_id" error={errors.customer_id?.message}>
            <Select id="customer_id" {...register("customer_id")}>
              <option value="">Choose a customer</option>
              {customers?.items.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.company} ({customer.name})
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Type" htmlFor="type" error={errors.type?.message}>
          <Select id="type" {...register("type")}>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Title" htmlFor="title" error={errors.title?.message}>
          <Input id="title" {...register("title")} />
        </Field>
        <Field label="Date and time" htmlFor="occurred_at" error={errors.occurred_at?.message}>
          <Input id="occurred_at" type="datetime-local" {...register("occurred_at")} />
        </Field>
      </div>
      <Field label="Notes" htmlFor="notes" error={errors.notes?.message}>
        <Textarea id="notes" rows={8} {...register("notes")} />
      </Field>
      <p className="text-xs text-muted-foreground">
        An AI summary is generated from the notes once you save. Very short notes are skipped.
      </p>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
