"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Field, FormError } from "@/components/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { registerSchema, type RegisterValues } from "@/lib/validations";
import { getErrorMessage, useLoginMutation, useRegisterMutation } from "@/store/api";
import { setCredentials } from "@/store/authSlice";
import { useAppDispatch } from "@/store/store";

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [registerUser] = useRegisterMutation();
  const [login] = useLoginMutation();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterValues) {
    try {
      await registerUser(values).unwrap();
    } catch (error) {
      const message = getErrorMessage(error, "Could not create your account");
      if ((error as { status?: number }).status === 409) {
        setError("email", { message });
      } else {
        setError("root", { message });
      }
      return;
    }

    try {
      dispatch(setCredentials(await login(values).unwrap()));
      toast.success("Account created");
      router.replace("/dashboard");
    } catch {
      router.replace("/login");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>New accounts start as customer success managers.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormError message={errors.root?.message} />
          <Field label="Full name" htmlFor="full_name" error={errors.full_name?.message}>
            <Input id="full_name" autoComplete="name" {...register("full_name")} />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
          </Field>
          <Field label="Password" htmlFor="password" error={errors.password?.message}>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground underline">
              Log in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
