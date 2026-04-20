"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowRight, Loader2, ShieldCheck, Mail, CircleUser, Wallet } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();

  useEffect(() => {
    if (ready && authenticated) {
      router.replace("/dashboard");
    }
  }, [ready, authenticated, router]);

  return (
    <div className="bg-background text-foreground relative flex min-h-screen flex-col">
      <div className="absolute inset-0 z-0">
        <Image
          src="/home/hero-home.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-40"
        />
        <div className="from-background/90 via-background/95 to-background absolute inset-0 bg-linear-to-b" />
      </div>

      <header className="relative z-10 container mx-auto px-4 py-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Andes Trust"
            width={120}
            height={48}
            priority
            className="h-10 w-auto"
          />
        </Link>
      </header>

      <main className="relative z-10 container mx-auto flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-card border-border rounded-3xl border p-8 shadow-xl md:p-10">
            <div className="mb-8 text-center">
              <div className="bg-primary/10 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
                <ShieldCheck className="text-primary h-7 w-7" />
              </div>
              <h1 className="text-foreground mb-2 text-2xl font-bold tracking-tight md:text-3xl">
                Inicia sesión
              </h1>
              <p className="text-foreground/70 text-sm">
                Accede a tu cuenta para gestionar tu ganado y certificados
              </p>
            </div>

            <button
              type="button"
              disabled={!ready}
              onClick={login}
              className="group bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/60 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold shadow-md transition-all disabled:cursor-not-allowed"
            >
              {!ready ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  Continuar
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="border-border flex-1 border-t" />
              <span className="text-foreground/50 text-xs">Métodos disponibles</span>
              <div className="border-border flex-1 border-t" />
            </div>

            <ul className="text-foreground/70 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <Mail className="text-primary h-4 w-4 shrink-0" />
                <span>Email con código de verificación</span>
              </li>
              <li className="flex items-center gap-3">
                <CircleUser className="text-primary h-4 w-4 shrink-0" />
                <span>Cuenta de Google</span>
              </li>
              <li className="flex items-center gap-3">
                <Wallet className="text-primary h-4 w-4 shrink-0" />
                <span>Wallet (MetaMask, WalletConnect)</span>
              </li>
            </ul>

            <p className="text-foreground/60 mt-8 text-center text-xs leading-relaxed">
              El acceso está restringido a usuarios registrados.{" "}
              <Link href="/contacto" className="text-primary hover:underline">
                Solicita acceso
              </Link>{" "}
              si aún no tienes cuenta.
            </p>
          </div>

          <p className="text-foreground/50 mt-6 text-center text-xs">
            <Link href="/" className="hover:text-primary transition-colors">
              ← Volver al inicio
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
