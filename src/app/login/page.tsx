"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { usePrivy, useLoginWithEmail, useLoginWithPasskey } from "@privy-io/react-auth";
import { toast } from "sonner";
import {
  ArrowRight,
  Loader2,
  ShieldCheck,
  Lock,
  Database,
  Globe,
  RotateCcw,
  Fingerprint,
  type LucideIcon,
} from "lucide-react";

const valueProps: { icon: LucideIcon; label: string }[] = [
  { icon: Database, label: "Registros sincronizados en tiempo real" },
  { icon: Lock, label: "Datos cifrados de extremo a extremo" },
  { icon: Globe, label: "Acceso desde cualquier dispositivo" },
];

type Step = "email" | "code";

/** Valida el formato de un correo electrónico. */
function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/** Traduce los errores de `sendCode` de Privy a un mensaje accionable. */
function describeSendCodeError(err: unknown): { title: string; description: string } {
  const message = err instanceof Error ? err.message : String(err);

  if (/temporary email|disposable/i.test(message)) {
    return {
      title: "Correo temporal no permitido",
      description:
        "Los correos desechables (mailinator, tempmail, etc.) están bloqueados. Usa una dirección permanente.",
    };
  }
  if (/rate.?limit|too many|429/i.test(message)) {
    return {
      title: "Demasiados intentos",
      description:
        "Has solicitado varios códigos seguidos. Espera unos minutos antes de reintentar.",
    };
  }
  return { title: "No pudimos enviar el código", description: message };
}

export default function LoginPage() {
  const router = useRouter();
  const { ready, authenticated } = usePrivy();
  const { sendCode, loginWithCode, state: privyState } = useLoginWithEmail();
  const { loginWithPasskey } = useLoginWithPasskey();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

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

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    if (!isValidEmail(trimmed)) {
      toast.error("Correo electrónico no válido", {
        description: "Revisa que el formato sea correcto, por ejemplo: nombre@correo.com",
      });
      return;
    }

    setLoading(true);
    try {
      let allowed: boolean;
      try {
        const res = await fetch("/api/auth/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
        });
        const data = (await res.json()) as { allowed?: boolean };
        allowed = !!data.allowed;
      } catch (err) {
        console.error("[login] check-email failed", err);
        toast.error("No pudimos verificar tu correo", {
          description: "Revisa tu conexión e intenta de nuevo.",
        });
        return;
      }

      if (!allowed) {
        toast.error("No tienes acceso a esta plataforma", {
          description:
            "Esta plataforma es solo por invitación. Contacta al administrador de tu finca.",
          duration: 6000,
        });
        return;
      }

      try {
        await sendCode({ email: trimmed });
        setStep("code");
      } catch (err) {
        console.error("[login] sendCode failed", err);
        const { title, description } = describeSendCodeError(err);
        toast.error(title, { description, duration: 8000 });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    try {
      await loginWithCode({ code: code.trim() });
    } catch {
      toast.error("Código incorrecto o expirado. Solicita uno nuevo.");
      setCode("");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasskeyLogin() {
    setPasskeyLoading(true);
    try {
      await loginWithPasskey();
    } catch {
      toast.error("No se pudo iniciar sesión con passkey. Verifica que ya tengas uno registrado.");
    } finally {
      setPasskeyLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    try {
      await sendCode({ email: email.trim().toLowerCase() });
      toast.success("Código reenviado a " + email);
    } catch {
      toast.error("No se pudo reenviar el código.");
    } finally {
      setLoading(false);
    }
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
                    {step === "email" ? "Inicia sesión" : "Revisa tu correo"}
                  </h2>
                  <p className="text-foreground/70 text-sm">
                    {step === "email"
                      ? "Continúa donde lo dejaste"
                      : `Enviamos un código a ${email}`}
                  </p>
                </div>

                {step === "email" ? (
                  <form onSubmit={handleEmailSubmit} className="space-y-3">
                    <div>
                      <label htmlFor="email" className="text-foreground/70 mb-1.5 block text-sm">
                        Correo electrónico <span className="text-primary">*</span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        className="border-border bg-muted/40 text-foreground placeholder:text-foreground/30 focus:border-primary focus:ring-primary/20 w-full rounded-xl border px-4 py-3 text-sm transition-colors outline-none focus:ring-2"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !email.trim()}
                      className="group bg-primary text-primary-foreground shadow-primary/40 hover:bg-primary/90 disabled:bg-primary/60 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-semibold shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        <>
                          Continuar
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-3 py-1">
                      <div className="bg-border h-px flex-1" />
                      <span className="text-foreground/40 text-xs">o</span>
                      <div className="bg-border h-px flex-1" />
                    </div>

                    <button
                      type="button"
                      onClick={handlePasskeyLogin}
                      disabled={passkeyLoading}
                      className="border-border bg-muted/20 text-foreground hover:bg-muted/40 flex w-full items-center justify-center gap-2 rounded-xl border px-6 py-3.5 text-sm font-semibold transition-colors disabled:opacity-60"
                    >
                      {passkeyLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Fingerprint className="h-4 w-4" />
                      )}
                      Iniciar sesión con Passkey
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleCodeSubmit} className="space-y-3">
                    <div>
                      <label htmlFor="code" className="text-foreground/70 mb-1.5 block text-sm">
                        Código de verificación <span className="text-primary">*</span>
                      </label>
                      <input
                        id="code"
                        type="text"
                        required
                        autoFocus
                        inputMode="numeric"
                        maxLength={6}
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="123456"
                        className="border-border bg-muted/40 text-foreground placeholder:text-foreground/30 focus:border-primary focus:ring-primary/20 w-full rounded-xl border px-4 py-3 text-center font-mono text-xl tracking-widest transition-colors outline-none focus:ring-2"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || code.length < 6}
                      className="group bg-primary text-primary-foreground shadow-primary/40 hover:bg-primary/90 disabled:bg-primary/60 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-semibold shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        <>
                          Entrar
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setStep("email");
                          setCode("");
                        }}
                        className="text-foreground/50 hover:text-foreground text-xs transition-colors"
                      >
                        ← Cambiar correo
                      </button>
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={loading}
                        className="text-primary hover:text-primary/80 flex items-center gap-1 text-xs transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reenviar código
                      </button>
                    </div>
                  </form>
                )}

                {step === "email" && (
                  <p className="text-foreground/60 mt-8 text-center text-xs leading-relaxed">
                    ¿No tienes cuenta?{" "}
                    <Link href="/contacto" className="text-primary font-medium hover:underline">
                      Solicita acceso
                    </Link>
                  </p>
                )}
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
