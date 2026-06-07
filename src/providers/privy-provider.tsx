"use client";

import { PrivyProvider as PrivyAuthProvider } from "@privy-io/react-auth";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

export function PrivyProvider({ children }: { readonly children: React.ReactNode }) {
  if (!appId) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[Privy] NEXT_PUBLIC_PRIVY_APP_ID is not set. Authentication will not work. " +
          "Create an app at https://dashboard.privy.io and add the ID to .env.local."
      );
    }
    return <>{children}</>;
  }

  return (
    <PrivyAuthProvider
      appId={appId}
      config={{
        loginMethods: ["email", "google", "wallet"],
        appearance: {
          theme: "light",
          accentColor: "#3b82f6",
          logo: "/logo.png",
          showWalletLoginFirst: false,
          landingHeader: "Inicia sesión o regístrate",
          loginMessage: "Continúa con tu cuenta para acceder a la plataforma",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
          solana: {
            createOnLogin: "off",
          },
        },
      }}
    >
      {children}
    </PrivyAuthProvider>
  );
}
