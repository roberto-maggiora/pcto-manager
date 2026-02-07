import "./globals.css";

import type { ReactNode } from "react";

import { Providers } from "./providers";

export const metadata = {
  title: "Impakt PCTO",
  description: "Piattaforma PCTO per scuole"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
