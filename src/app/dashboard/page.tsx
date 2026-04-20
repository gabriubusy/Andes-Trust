"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { LogOut, Wallet, Mail, Construction, Loader2 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { ready, authenticated, user, logout } = usePrivy();

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace("/login");
    }
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return (
      <div className="bg-background text-foreground flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="text-primary h-5 w-5 animate-spin" />
          <span className="text-foreground/70 text-sm">Verificando sesión...</span>
        </div>
      </div>
    );
  }

  const walletAddress = user?.wallet?.address;
  const email = user?.email?.address ?? user?.google?.email;

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <header className="border-border bg-background/80 sticky top-0 z-10 border-b backdrop-blur-xl">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <Link href="/" className="inline-flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Andes Trust"
              width={120}
              height={48}
              priority
              className="h-9 w-auto"
            />
          </Link>
          <button
            type="button"
            onClick={logout}
            className="border-border text-foreground hover:border-primary hover:bg-primary/5 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 py-10">
        <div className="mx-auto max-w-4xl space-y-8">
          <div>
            <h1 className="text-foreground mb-2 text-3xl font-bold tracking-tight md:text-4xl">
              Bienvenido
            </h1>
            <p className="text-foreground/70">Sesión iniciada correctamente.</p>
          </div>

          <div className="bg-card border-border rounded-2xl border p-6 md:p-8">
            <h2 className="text-card-foreground mb-4 text-lg font-bold">Tu cuenta</h2>
            <dl className="space-y-4">
              {email && (
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                    <Mail className="text-primary h-5 w-5" />
                  </div>
                  <div>
                    <dt className="text-foreground/60 text-xs font-semibold tracking-wider uppercase">
                      Email
                    </dt>
                    <dd className="text-card-foreground text-sm">{email}</dd>
                  </div>
                </div>
              )}
              {walletAddress && (
                <div className="flex items-start gap-3">
                  <div className="bg-secondary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                    <Wallet className="text-secondary h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <dt className="text-foreground/60 text-xs font-semibold tracking-wider uppercase">
                      Wallet
                    </dt>
                    <dd className="text-card-foreground font-mono text-sm break-all">
                      {walletAddress}
                    </dd>
                  </div>
                </div>
              )}
            </dl>
          </div>

          <div className="bg-muted/50 border-border rounded-2xl border p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="bg-accent/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
                <Construction className="text-accent h-6 w-6" />
              </div>
              <div>
                <h2 className="text-foreground mb-2 text-lg font-bold">Panel en construcción</h2>
                <p className="text-foreground/70 text-sm leading-relaxed">
                  Aquí aparecerán tus animales registrados, certificados de trazabilidad, dashboards
                  y acciones on-chain. Por ahora esta página es solo un stub para verificar que el
                  login funciona correctamente.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
