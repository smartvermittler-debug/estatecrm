import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "EstateFlow AI", template: "%s — EstateFlow AI" },
  description: "Die intelligente CRM-Plattform für österreichische Immobilienmakler",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
