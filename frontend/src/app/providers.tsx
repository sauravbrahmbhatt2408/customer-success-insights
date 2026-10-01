"use client";

import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { Provider } from "react-redux";

import { Toaster } from "@/components/ui/sonner";
import { makeStore } from "@/store/store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [store] = useState(makeStore);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Provider store={store}>
        {children}
        <Toaster richColors position="top-right" />
      </Provider>
    </ThemeProvider>
  );
}
