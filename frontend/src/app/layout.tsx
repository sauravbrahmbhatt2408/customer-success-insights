import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { Providers } from "@/app/providers";
import "./globals.css";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Customer Success Insights",
  description: "Track customers, log interactions and get AI summaries.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-muted/30 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
