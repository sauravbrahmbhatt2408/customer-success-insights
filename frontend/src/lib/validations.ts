import { z } from "zod";

// Same rule as the backend: at least 8 characters, one letter and one number.
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Za-z]/, "Password must include a letter")
  .regex(/\d/, "Password must include a number");

const requiredText = (label: string, max = 255) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

const email = z.email("Enter a valid email");

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  full_name: requiredText("Name"),
  email,
  password,
});

export const profileSchema = z
  .object({
    full_name: requiredText("Name"),
    current_password: z.string(),
    new_password: z.union([z.literal(""), password]),
  })
  .refine((data) => !data.new_password || data.current_password, {
    message: "Enter your current password to set a new one",
    path: ["current_password"],
  });

export const customerSchema = z.object({
  name: requiredText("Name"),
  company: requiredText("Company"),
  email: z.union([z.literal(""), email]),
  phone: z.string().trim().max(50, "Phone is too long"),
  industry: z.string().trim().max(100, "Industry is too long"),
  plan: z.enum(["starter", "growth", "enterprise"]),
  status: z.enum(["onboarding", "active", "at_risk", "churned"]),
  mrr: z
    .string()
    .trim()
    .regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter an amount like 1200 or 1200.50"),
  owner_id: z.string(),
});

export const interactionSchema = z.object({
  customer_id: z.string().min(1, "Choose a customer"),
  type: z.enum(["meeting", "call", "email", "support"]),
  title: requiredText("Title"),
  notes: requiredText("Notes", 10000),
  occurred_at: z.string().min(1, "Date is required"),
});

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ProfileValues = z.infer<typeof profileSchema>;
export type CustomerValues = z.infer<typeof customerSchema>;
export type InteractionValues = z.infer<typeof interactionSchema>;
