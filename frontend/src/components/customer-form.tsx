"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Field, FormError, Select } from "@/components/form";
import { PLAN_LABELS, STATUS_LABELS } from "@/components/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { customerSchema, type CustomerValues } from "@/lib/validations";
import { getErrorMessage, useGetUserOptionsQuery } from "@/store/api";
import { useAppSelector } from "@/store/store";
import type { Customer, CustomerInput } from "@/types";

export function CustomerForm({
  customer,
  submitLabel,
  onSubmit,
}: {
  customer?: Customer;
  submitLabel: string;
  onSubmit: (data: CustomerInput) => Promise<unknown>;
}) {
  const user = useAppSelector((state) => state.auth.user);
  const canAssign = user?.role === "admin" || user?.role === "manager";
  const { data: owners } = useGetUserOptionsQuery(undefined, { skip: !canAssign });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomerValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: customer?.name ?? "",
      company: customer?.company ?? "",
      email: customer?.email ?? "",
      phone: customer?.phone ?? "",
      industry: customer?.industry ?? "",
      plan: customer?.plan ?? "starter",
      status: customer?.status ?? "onboarding",
      mrr: customer ? String(Number(customer.mrr)) : "0",
      owner_id: customer?.owner.id ?? user?.id ?? "",
    },
  });

  async function submit(values: CustomerValues) {
    const { owner_id, ...rest } = values;
    try {
      await onSubmit({
        ...rest,
        email: values.email || null,
        phone: values.phone || null,
        industry: values.industry || null,
        ...(canAssign && { owner_id }),
      });
    } catch (error) {
      const message = getErrorMessage(error, "Could not save the customer");
      if ((error as { status?: number }).status === 409) {
        setError("email", { message });
      } else {
        setError("root", { message });
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
      <FormError message={errors.root?.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" {...register("name")} />
        </Field>
        <Field label="Company" htmlFor="company" error={errors.company?.message}>
          <Input id="company" {...register("company")} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input id="email" type="email" {...register("email")} />
        </Field>
        <Field label="Phone" htmlFor="phone" error={errors.phone?.message}>
          <Input id="phone" {...register("phone")} />
        </Field>
        <Field label="Industry" htmlFor="industry" error={errors.industry?.message}>
          <Input id="industry" {...register("industry")} />
        </Field>
        <Field label="MRR (USD)" htmlFor="mrr" error={errors.mrr?.message}>
          <Input id="mrr" inputMode="decimal" {...register("mrr")} />
        </Field>
        <Field label="Plan" htmlFor="plan" error={errors.plan?.message}>
          <Select id="plan" {...register("plan")}>
            {Object.entries(PLAN_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" htmlFor="status" error={errors.status?.message}>
          <Select id="status" {...register("status")}>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        {canAssign && (
          <Field label="Owner" htmlFor="owner_id" error={errors.owner_id?.message}>
            <Select id="owner_id" {...register("owner_id")}>
              {owners?.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.full_name} ({owner.role})
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
