"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";

const inputCls =
  "border-border bg-background text-foreground focus:ring-primary/40 focus:border-primary w-full rounded-lg border px-4 py-2.5 text-sm transition focus:ring-2 focus:outline-none";
const labelCls = "text-card-foreground mb-2 block text-sm font-medium";

/** Valida el formato de un correo electrónico. */
function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (!trimmed || trimmed.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  // El botón se habilita solo cuando los campos obligatorios están completos.
  const isValid = name.trim().length > 0 && isValidEmail(email) && message.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    toast.success("Mensaje enviado. Te responderemos lo antes posible.");
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className={labelCls}>
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tu nombre"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className={labelCls}>
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-subject" className={labelCls}>
          Asunto
        </label>
        <input
          id="contact-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Asunto de tu mensaje"
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="contact-message" className={labelCls}>
          Mensaje <span className="text-red-500">*</span>
        </label>
        <textarea
          id="contact-message"
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe tu mensaje aquí..."
          className={`${inputCls} min-h-[150px]`}
        />
      </div>

      <p className="text-foreground/50 text-xs">
        Los campos marcados con <span className="text-red-500">*</span> son obligatorios.
      </p>

      <button
        type="submit"
        disabled={!isValid}
        className="text-primary-foreground bg-primary hover:bg-primary/90 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        Enviar mensaje
      </button>
    </form>
  );
}
