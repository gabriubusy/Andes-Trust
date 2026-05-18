"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePrivy } from "@privy-io/react-auth";
import {
  ArrowRight,
  Loader2,
  ShieldCheck,
  Mail,
  CircleUser,
  Wallet,
  Lock,
  Database,
  Globe,
  type LucideIcon,
} from "lucide-react";

const valueProps: { icon: LucideIcon; label: string }[] = [
  { icon: Database, label: "Registros sincronizados en tiempo real" },
  { icon: Lock, label: "Datos cifrados de extremo a extremo" },
  { icon: Globe, label: "Acceso desde cualquier dispositivo" },
];

const loginMethods: { icon: LucideIcon; label: string; hint: string }[] = [
  { icon: Mail, label: "Email", hint: "Código de verificación" },
  { icon: CircleUser, label: "Google", hint: "Inicio de sesión SSO" },
  { icon: Wallet, label: "Wallet", hint: "MetaMask, WalletConnect" },
];

export default function LoginPage() {
  const router = useRouter();
  const { ready, authenticated, login } = usePrivy();

  useEffect(() => {
    if (ready && authenticated) {
      router.replace("/dashboard");
    }
  }, [ready, authenticated, router]);

  if (!ready || authenticated) {
    return (
      <div className="bg-background flex min-h-screen items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground relative flex min-h-screen flex-col overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image
          src="/home/hero-home.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-30"
        />
        <div className="from-background/95 via-background/90 to-background absolute inset-0 bg-linear-to-b" />
        <div className="bg-primary/20 absolute top-1/4 -left-32 h-[500px] w-[500px] rounded-full blur-3xl" />
        <div className="bg-secondary/20 absolute -right-32 -bottom-32 h-[500px] w-[500px] rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 container mx-auto px-4 py-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Finca El Progreso"
            width={120}
            height={48}
            priority
            className="h-10 w-auto"
          />
        </Link>
      </header>

      <main className="relative z-10 container mx-auto flex flex-1 items-center justify-center px-4 py-12">
        <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div className="hidden flex-col lg:flex">
            <div className="border-primary/30 bg-primary/10 mb-6 inline-flex w-fit items-center gap-3 rounded-full border px-5 py-2 backdrop-blur-md">
              <span className="bg-secondary relative inline-flex h-2 w-2 rounded-full">
                <span className="bg-secondary absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
              </span>
              <span className="text-foreground/90 text-sm font-medium">
                Plataforma blockchain ganadera
              </span>
            </div>

            <h1 className="text-foreground mb-6 text-4xl leading-[1.05] font-bold tracking-tight md:text-5xl lg:text-6xl">
              Bienvenido de vuelta
              <br />
              <span className="from-primary to-secondary bg-linear-to-r bg-clip-text text-transparent">
                a tu hato digital
              </span>
            </h1>

            <p className="text-foreground/70 mb-8 text-base md:text-lg">
              Gestiona registros, certificados y trazabilidad en un solo lugar — con la tranquilidad
              de que cada dato está protegido por blockchain.
            </p>

            <ul className="space-y-3">
              {valueProps.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="bg-card/40 border-border flex items-center gap-4 rounded-xl border p-4 backdrop-blur-sm"
                >
                  <div className="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="text-primary h-5 w-5" />
                  </div>
                  <span className="text-foreground/80 text-sm">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="w-full">
            <div className="relative">
              <div className="from-primary/40 to-secondary/40 absolute -inset-1 rounded-3xl bg-linear-to-br opacity-40 blur-2xl" />

              <div className="bg-card/80 border-border relative rounded-3xl border p-8 shadow-2xl backdrop-blur-xl md:p-10">
                <div className="mb-8 text-center">
                  <div className="from-primary/20 to-secondary/20 border-primary/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border bg-linear-to-br">
                    <ShieldCheck className="text-primary h-8 w-8" />
                  </div>
                  <h2 className="text-foreground mb-2 text-2xl font-bold tracking-tight md:text-3xl">
                    Inicia sesión
                  </h2>
                  <p className="text-foreground/70 text-sm">Continúa donde lo dejaste</p>
                </div>

                <button
                  type="button"
                  disabled={!ready}
                  onClick={login}
                  className="group bg-primary text-primary-foreground shadow-primary/40 hover:bg-primary/90 hover:shadow-primary/60 disabled:bg-primary/60 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-semibold shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:shadow-none"
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
                  <span className="text-foreground/50 text-xs tracking-wider uppercase">
                    Métodos disponibles
                  </span>
                  <div className="border-border flex-1 border-t" />
                </div>

                <ul className="space-y-2.5">
                  {loginMethods.map(({ icon: Icon, label, hint }) => (
                    <li
                      key={label}
                      className="bg-muted/40 border-border hover:border-primary/30 flex items-center gap-3 rounded-xl border p-3 transition-colors"
                    >
                      <div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                        <Icon className="text-primary h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-foreground text-sm font-medium">{label}</div>
                        <div className="text-foreground/60 text-xs">{hint}</div>
                      </div>
                    </li>
                  ))}
                </ul>

                <p className="text-foreground/60 mt-8 text-center text-xs leading-relaxed">
                  ¿No tienes cuenta?{" "}
                  <Link href="/contacto" className="text-primary font-medium hover:underline">
                    Solicita acceso
                  </Link>
                </p>
              </div>
            </div>

            <div className="text-foreground/50 mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
              <div className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                <span>Conexión cifrada</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Autenticación gestionada por Privy</span>
              </div>
            </div>

            <p className="text-foreground/50 mt-4 text-center text-xs">
              <Link href="/" className="hover:text-primary transition-colors">
                ← Volver al inicio
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
