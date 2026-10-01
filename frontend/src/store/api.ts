import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import { createApi } from "@reduxjs/toolkit/query/react";
import { isAxiosError, type AxiosRequestConfig } from "axios";

import { http } from "@/lib/axios";
import type {
  Customer,
  CustomerFilters,
  CustomerInput,
  Dashboard,
  Interaction,
  InteractionFilters,
  InteractionInput,
  Page,
  Role,
  TokenResponse,
  User,
  UserOption,
} from "@/types";

export interface ApiError {
  status: number;
  data: unknown;
}

const axiosBaseQuery: BaseQueryFn<AxiosRequestConfig, unknown, ApiError> = async (config) => {
  try {
    const response = await http.request(config);
    return { data: response.data };
  } catch (error) {
    if (isAxiosError(error)) {
      return { error: { status: error.response?.status ?? 0, data: error.response?.data } };
    }
    return { error: { status: 0, data: null } };
  }
};

export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as ApiError).data;
    if (data && typeof data === "object" && "detail" in data) {
      const detail = (data as { detail: unknown }).detail;
      if (typeof detail === "string") return detail;
      if (Array.isArray(detail) && typeof detail[0]?.msg === "string") {
        return detail[0].msg.replace(/^Value error, /, "");
      }
    }
    if ((error as ApiError).status === 0) return "Can't reach the server. Try again.";
  }
  return fallback;
}

function params(filters: object) {
  return Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "" && v != null));
}

export const api = createApi({
  reducerPath: "api",
  baseQuery: axiosBaseQuery,
  tagTypes: ["Customer", "Interaction", "User", "Dashboard"],
  refetchOnMountOrArgChange: true,
  endpoints: (build) => ({
    login: build.mutation<TokenResponse, { email: string; password: string }>({
      query: (data) => ({ url: "/auth/login", method: "POST", data }),
    }),
    register: build.mutation<User, { email: string; password: string; full_name: string }>({
      query: (data) => ({ url: "/auth/register", method: "POST", data }),
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
    }),
    updateMe: build.mutation<
      User,
      { full_name: string; current_password?: string; new_password?: string }
    >({
      query: (data) => ({ url: "/auth/me", method: "PATCH", data }),
    }),

    getUsers: build.query<Page<User>, number>({
      query: (page) => ({ url: "/users", params: { page } }),
      providesTags: ["User"],
    }),
    updateUser: build.mutation<User, { id: string; role?: Role; is_active?: boolean }>({
      query: ({ id, ...data }) => ({ url: `/users/${id}`, method: "PATCH", data }),
      invalidatesTags: ["User"],
    }),
    getUserOptions: build.query<UserOption[], void>({
      query: () => ({ url: "/users/options" }),
      providesTags: ["User"],
    }),

    getCustomers: build.query<Page<Customer>, CustomerFilters>({
      query: (filters) => ({ url: "/customers", params: params(filters) }),
      providesTags: ["Customer"],
    }),
    getCustomer: build.query<Customer, string>({
      query: (id) => ({ url: `/customers/${id}` }),
      providesTags: (_result, _error, id) => [{ type: "Customer", id }],
    }),
    createCustomer: build.mutation<Customer, CustomerInput>({
      query: (data) => ({ url: "/customers", method: "POST", data }),
      invalidatesTags: ["Customer", "Dashboard"],
    }),
    updateCustomer: build.mutation<Customer, { id: string; data: Partial<CustomerInput> }>({
      query: ({ id, data }) => ({ url: `/customers/${id}`, method: "PATCH", data }),
      invalidatesTags: ["Customer", "Dashboard"],
    }),
    deleteCustomer: build.mutation<void, string>({
      query: (id) => ({ url: `/customers/${id}`, method: "DELETE" }),
      invalidatesTags: ["Customer", "Interaction", "Dashboard"],
    }),

    getInteractions: build.query<Page<Interaction>, InteractionFilters>({
      query: (filters) => ({ url: "/interactions", params: params(filters) }),
      providesTags: ["Interaction"],
    }),
    getInteraction: build.query<Interaction, string>({
      query: (id) => ({ url: `/interactions/${id}` }),
      providesTags: (_result, _error, id) => [{ type: "Interaction", id }],
    }),
    createInteraction: build.mutation<Interaction, InteractionInput>({
      query: (data) => ({ url: "/interactions", method: "POST", data }),
      invalidatesTags: ["Interaction", "Dashboard"],
    }),
    updateInteraction: build.mutation<
      Interaction,
      { id: string; data: Partial<Omit<InteractionInput, "customer_id">> }
    >({
      query: ({ id, data }) => ({ url: `/interactions/${id}`, method: "PATCH", data }),
      invalidatesTags: ["Interaction", "Dashboard"],
    }),
    regenerateInsight: build.mutation<Interaction, string>({
      query: (id) => ({ url: `/interactions/${id}/regenerate`, method: "POST" }),
      invalidatesTags: ["Interaction"],
    }),

    getDashboard: build.query<Dashboard, void>({
      query: () => ({ url: "/dashboard" }),
      providesTags: ["Dashboard"],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useUpdateMeMutation,
  useGetUsersQuery,
  useUpdateUserMutation,
  useGetUserOptionsQuery,
  useGetCustomersQuery,
  useGetCustomerQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useGetInteractionsQuery,
  useGetInteractionQuery,
  useCreateInteractionMutation,
  useUpdateInteractionMutation,
  useRegenerateInsightMutation,
  useGetDashboardQuery,
} = api;
