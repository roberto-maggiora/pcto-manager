import "./globals.css";

import type { ReactNode } from "react";
import { Inter } from "next/font/google";

import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata = {
  title: "Impakt PCTO",
  description: "Piattaforma PCTO per scuole"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it" className={inter.variable}>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
