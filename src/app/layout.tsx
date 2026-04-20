import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import { PrivyProvider } from "@/providers/privy-provider";
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
  metadataBase: new URL("https://andestrust.com"),
  title: "Andes Trust",
  description: "Plataforma de trazabilidad ganadera con tecnología blockchain para los Andes",
  keywords: ["blockchain", "ganadería", "trazabilidad", "vacunos", "andinos", "traza", "registro"],
  authors: [{ name: "Andes Trust" }],
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Andes Trust - Trazabilidad Ganadera Blockchain",
    description: "Plataforma de trazabilidad ganadera con tecnología blockchain para los Andes",
    type: "website",
    url: "https://andestrust.com",
    siteName: "Andes Trust",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Andes Trust",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Andes Trust",
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
            <QueryProvider>{children}</QueryProvider>
          </PrivyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
