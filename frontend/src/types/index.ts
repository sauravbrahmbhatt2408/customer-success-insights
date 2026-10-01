export type Role = "admin" | "manager" | "csm";
export type Plan = "starter" | "growth" | "enterprise";
export type CustomerStatus = "onboarding" | "active" | "at_risk" | "churned";
export type InteractionType = "meeting" | "call" | "email" | "support";
export type AIStatus = "pending" | "completed" | "failed" | "skipped";
export type Sentiment = "positive" | "neutral" | "negative";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface UserOption {
  id: string;
  full_name: string;
  role: Role;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface Customer {
  id: string;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  industry: string | null;
  plan: Plan;
  status: CustomerStatus;
  mrr: string;
  owner: UserOption;
  created_at: string;
  updated_at: string;
}

export interface CustomerInput {
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  industry: string | null;
  plan: Plan;
  status: CustomerStatus;
  mrr: string;
  owner_id?: string;
}

export interface Insight {
  summary: string | null;
  sentiment: Sentiment | null;
  action_items: string[];
  risks: string[];
  model: string;
  error: string | null;
  created_at: string;
}

export interface Interaction {
  id: string;
  customer: { id: string; name: string; company: string };
  created_by: string;
  type: InteractionType;
  title: string;
  notes: string;
  occurred_at: string;
  ai_status: AIStatus;
  insight: Insight | null;
  created_at: string;
  updated_at: string;
}

export interface InteractionInput {
  customer_id: string;
  type: InteractionType;
  title: string;
  notes: string;
  occurred_at: string;
}

export interface CustomerFilters {
  page: number;
  page_size?: number;
  status?: CustomerStatus;
  plan?: Plan;
  owner_id?: string;
  search?: string;
}

export interface InteractionFilters {
  page: number;
  page_size?: number;
  customer_id?: string;
  type?: InteractionType;
  sentiment?: Sentiment;
  date_from?: string;
  date_to?: string;
}

export interface Dashboard {
  cards: {
    total_customers: number;
    active: number;
    at_risk: number;
    churned: number;
    total_mrr: string;
    interactions_last_30_days: number;
  };
  interactions_per_day: { date: string; count: number }[];
  sentiment: Record<Sentiment, number>;
  customers_by_status: Record<CustomerStatus, number>;
  recent_risks: {
    interaction_id: string;
    title: string;
    customer_name: string;
    company: string;
    risks: string[];
    occurred_at: string;
  }[];
  quiet_customers: {
    id: string;
    name: string;
    company: string;
    status: CustomerStatus;
    last_interaction_at: string | null;
  }[];
  recent_interactions: {
    id: string;
    title: string;
    type: InteractionType;
    company: string;
    occurred_at: string;
    ai_status: AIStatus;
    sentiment: Sentiment | null;
  }[];
}
