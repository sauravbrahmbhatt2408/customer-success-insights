import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { TokenResponse, User } from "@/types";

interface AuthState {
  accessToken: string | null;
  user: User | null;
  status: "idle" | "authenticated" | "unauthenticated";
}

const initialState: AuthState = { accessToken: null, user: null, status: "idle" };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<TokenResponse>) {
      state.accessToken = action.payload.access_token;
      state.user = action.payload.user;
      state.status = "authenticated";
    },
    setUser(state, action: PayloadAction<User>) {
      state.user = action.payload;
    },
    loggedOut(state) {
      state.accessToken = null;
      state.user = null;
      state.status = "unauthenticated";
    },
  },
});

export const { setCredentials, setUser, loggedOut } = authSlice.actions;
export default authSlice.reducer;
