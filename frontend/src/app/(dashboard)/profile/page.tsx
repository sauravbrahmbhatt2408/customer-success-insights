"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Field, FormError } from "@/components/form";
import { PageHeader } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { profileSchema, type ProfileValues } from "@/lib/validations";
import { getErrorMessage, useUpdateMeMutation } from "@/store/api";
import { setUser } from "@/store/authSlice";
import { useAppDispatch, useAppSelector } from "@/store/store";

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [updateMe] = useUpdateMeMutation();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: user?.full_name ?? "", current_password: "", new_password: "" },
  });

  async function onSubmit(values: ProfileValues) {
    try {
      const updated = await updateMe({
        full_name: values.full_name,
        ...(values.new_password && {
          current_password: values.current_password,
          new_password: values.new_password,
        }),
      }).unwrap();
      dispatch(setUser(updated));
      reset({ full_name: updated.full_name, current_password: "", new_password: "" });
      toast.success("Profile saved");
    } catch (error) {
      setError("root", { message: getErrorMessage(error, "Could not save your profile") });
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-xl">
      <PageHeader title="Profile" />
      <Card>
        <CardHeader>
          <CardTitle>{user.email}</CardTitle>
          <CardDescription className="capitalize">{user.role}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormError message={errors.root?.message} />
            <Field label="Full name" htmlFor="full_name" error={errors.full_name?.message}>
              <Input id="full_name" {...register("full_name")} />
            </Field>
            <p className="pt-2 text-sm text-muted-foreground">
              Leave the password fields empty to keep your current password.
            </p>
            <Field
              label="Current password"
              htmlFor="current_password"
              error={errors.current_password?.message}
            >
              <Input
                id="current_password"
                type="password"
                autoComplete="current-password"
                {...register("current_password")}
              />
            </Field>
            <Field label="New password" htmlFor="new_password" error={errors.new_password?.message}>
              <Input
                id="new_password"
                type="password"
                autoComplete="new-password"
                {...register("new_password")}
              />
            </Field>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
