import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { PrivyProvider } from "@/providers/privy-provider";
import { SupabaseProvider } from "@/providers/supabase-provider";
import { ThemeScript } from "@/components/theme-script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://fincaelprogreso.com"),
  title: "Finca El Progreso",
  description:
    "Plataforma de trazabilidad ganadera con tecnología blockchain para la Finca El Progreso",
  keywords: [
    "blockchain",
    "ganadería",
    "trazabilidad",
    "vacunos",
    "Mérida",
    "Venezuela",
    "traza",
    "registro",
  ],
  authors: [{ name: "Finca El Progreso" }],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Finca El Progreso - Trazabilidad Ganadera Blockchain",
    description:
      "Plataforma de trazabilidad ganadera con tecnología blockchain para la Finca El Progreso",
    type: "website",
    url: "https://fincaelprogreso.com",
    siteName: "Finca El Progreso",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Finca El Progreso",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Finca El Progreso",
    description: "Plataforma de trazabilidad ganadera blockchain",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <PrivyProvider>
            <QueryProvider>
              <SupabaseProvider>{children}</SupabaseProvider>
            </QueryProvider>
          </PrivyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
