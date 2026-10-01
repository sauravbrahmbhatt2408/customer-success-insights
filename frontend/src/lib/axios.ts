import axios, { type InternalAxiosRequestConfig } from "axios";

import { loggedOut, setCredentials } from "@/store/authSlice";
import type { AppStore } from "@/store/store";
import type { TokenResponse } from "@/types";

// Requests go to /api on the same origin and Next.js rewrites them to the backend,
// so the refresh cookie always belongs to the frontend's domain.
export const http = axios.create({ baseURL: "/api/v1", withCredentials: true });

let store: AppStore | null = null;
let refreshing: Promise<string | null> | null = null;

export function injectStore(appStore: AppStore) {
  store = appStore;
}

// Only one refresh runs at a time; concurrent 401s wait on the same promise.
export function refreshSession(): Promise<string | null> {
  if (!refreshing) {
    refreshing = http
      .post<TokenResponse>("/auth/refresh")
      .then(({ data }) => {
        store?.dispatch(setCredentials(data));
        return data.access_token;
      })
      .catch(() => {
        store?.dispatch(loggedOut());
        return null;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

http.interceptors.request.use((config) => {
  const token = store?.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean };

const NO_RETRY = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetryConfig | undefined;
    if (
      error.response?.status !== 401 ||
      !config ||
      config._retried ||
      NO_RETRY.includes(config.url ?? "")
    ) {
      throw error;
    }

    config._retried = true;
    const token = await refreshSession();
    if (!token) {
      throw error;
    }
    config.headers.Authorization = `Bearer ${token}`;
    return http(config);
  },
);
