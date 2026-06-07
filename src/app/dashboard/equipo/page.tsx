"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import {
  Users,
  UserPlus,
  Mail,
  Trash2,
  Shield,
  Loader2,
  Clock,
  ChevronDown,
  CheckCircle2,
  SendHorizonal,
} from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";

type Member = {
  profile_id: string;
  role: "owner" | "admin" | "operator" | "vet" | "viewer" | "regulator";
  profiles: {
    id: string;
    email: string | null;
    full_name: string | null;
    wallet_address: string | null;
  } | null;
};

type Invite = {
  id: string;
  email: string;
  role: Member["role"];
  status: "pending" | "accepted" | "expired" | "revoked";
  created_at: string;
  expires_at: string;
};

const ROLES: Member["role"][] = ["owner", "admin", "operator", "vet", "viewer", "regulator"];

const ROLE_LABEL: Record<Member["role"], string> = {
  owner: "Patrón / Dueño",
  admin: "Administrador",
  operator: "Obrero / Operador",
  vet: "Médico veterinario",
  viewer: "Solo lectura",
  regulator: "Regulador (INSAI)",
};

const ROLE_TINT: Record<Member["role"], string> = {
  owner: "bg-purple-500/15 text-purple-400 ring-purple-500/30",
  admin: "bg-blue-500/15 text-blue-400 ring-blue-500/30",
  operator: "bg-amber-500/15 text-amber-400 ring-amber-500/30",
  vet: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30",
  viewer: "bg-muted text-foreground/50 ring-border",
  regulator: "bg-slate-500/15 text-slate-400 ring-slate-500/30",
};

const ROLE_DOT: Record<Member["role"], string> = {
  owner: "bg-purple-400",
  admin: "bg-blue-400",
  operator: "bg-amber-400",
  vet: "bg-emerald-400",
  viewer: "bg-foreground/30",
  regulator: "bg-slate-400",
};

const ROLE_DESCRIPTIONS: Record<Member["role"], string> = {
  owner: "Gestiona finca, ventas y todo el equipo",
  admin: "Gestiona equipo e invitaciones",
  operator: "Registra eventos y producción",
  vet: "Autoriza y registra tratamientos",
  viewer: "Solo puede visualizar datos",
  regulator: "Acceso de revisión regulatoria",
};

function AvatarCircle({ name, email }: { name: string | null; email: string | null }) {
  const text = name ?? email ?? "?";
  const initials = text.slice(0, 2).toUpperCase();
  return (
    <div className="from-primary to-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-xs font-bold text-white shadow-sm">
      {initials}
    </div>
  );
}

export default function EquipoPage() {
  const { supabase } = useSupabase();
  const farmQuery = useCurrentFarm();
  const farmId = farmQuery.data?.id;
  const { getAccessToken } = usePrivy();
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Member["role"]>("operator");

  const membersQuery = useQuery<Member[]>({
    queryKey: ["farm-members", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("farm_members")
        .select("profile_id, role, profiles(id, email, full_name, wallet_address)")
        .eq("farm_id", farmId!);
      if (error) throw error;
      return (data ?? []) as unknown as Member[];
    },
  });

  const invitesQuery = useQuery<Invite[]>({
    queryKey: ["farm-invitations", farmId],
    enabled: !!supabase && !!farmId,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from("farm_invitations")
        .select("id, email, role, status, created_at, expires_at")
        .eq("farm_id", farmId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invite[];
    },
  });

  async function authHeaders() {
    const token = await getAccessToken();
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }

  const invite = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ farm_id: farmId, email, role }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "fail");
      return json;
    },
    onSuccess: () => {
      setEmail("");
      qc.invalidateQueries({ queryKey: ["farm-invitations", farmId] });
      qc.invalidateQueries({ queryKey: ["farm-members", farmId] });
    },
  });

  const changeRole = useMutation({
    mutationFn: async ({ profileId, newRole }: { profileId: string; newRole: Member["role"] }) => {
      const res = await fetch("/api/team/member", {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({ farm_id: farmId, profile_id: profileId, role: newRole }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "fail");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["farm-members", farmId] }),
  });

  const removeMember = useMutation({
    mutationFn: async (profileId: string) => {
      const res = await fetch(`/api/team/member?farm_id=${farmId}&profile_id=${profileId}`, {
        method: "DELETE",
        headers: await authHeaders(),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "fail");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["farm-members", farmId] }),
  });

  const revokeInvite = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/team/invite?id=${id}`, {
        method: "DELETE",
        headers: await authHeaders(),
      });
      if (!res.ok) throw new Error("fail");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["farm-invitations", farmId] }),
  });

  const pendingCount = invitesQuery.data?.length ?? 0;
  const memberCount = membersQuery.data?.length ?? 0;

  return (
    <DashboardShell title="Equipo de trabajo" subtitle="Miembros con acceso a la finca">
      {/* Cabecera con stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-2">
        <div className="bg-card border-border rounded-2xl border p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{memberCount}</div>
            <div className="text-xs text-foreground/50">Miembros activos</div>
          </div>
        </div>
        <div className="bg-card border-border rounded-2xl border p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{pendingCount}</div>
            <div className="text-xs text-foreground/50">Invitaciones pendientes</div>
          </div>
        </div>
        <div className="hidden sm:flex bg-card border-border rounded-2xl border p-4 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
            <Shield className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{ROLES.length}</div>
            <div className="text-xs text-foreground/50">Roles disponibles</div>
          </div>
        </div>
      </div>

      {/* Invitar miembro */}
      <div className="bg-card border-border rounded-2xl border overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <UserPlus className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Invitar miembro</h3>
            <p className="text-xs text-foreground/50">La invitación expira en 14 días</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && email && invite.mutate()}
                placeholder="correo@ejemplo.com"
                className="border-border bg-background/60 w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition placeholder:text-foreground/30"
              />
            </div>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Member["role"])}
                className="border-border bg-background/60 appearance-none rounded-xl border pl-4 pr-9 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition w-full sm:w-auto"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
            </div>
            <button
              onClick={() => invite.mutate()}
              disabled={!email || invite.isPending}
              className="bg-primary hover:bg-primary/90 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 transition-colors"
            >
              {invite.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizonal className="h-4 w-4" />
              )}
              Invitar
            </button>
          </div>

          {/* Rol seleccionado: descripción */}
          <div className="flex items-center gap-2 rounded-xl bg-muted/40 border border-border px-4 py-2.5">
            <div className={`h-2 w-2 rounded-full shrink-0 ${ROLE_DOT[role]}`} />
            <p className="text-xs text-foreground/60">
              <span className="font-medium text-foreground/80">{ROLE_LABEL[role]}:</span>{" "}
              {ROLE_DESCRIPTIONS[role]}
            </p>
          </div>

          {invite.isError && (
            <p className="text-xs text-red-500 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
              {(invite.error as Error).message}
            </p>
          )}
          {invite.isSuccess && invite.data?.added_directly && (
            <p className="text-xs text-emerald-500 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Miembro añadido directamente (ya tenía cuenta).
            </p>
          )}
          {invite.isSuccess && invite.data?.invitation && (
            <p className="text-xs text-foreground/60 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Invitación enviada. El miembro debe iniciar sesión con ese email.
            </p>
          )}
        </div>
      </div>

      {/* Tabla miembros + columna invitaciones */}
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Miembros activos */}
        <div className="bg-card border-border rounded-2xl border overflow-hidden">
          <div className="border-b border-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-foreground/50" />
              <h3 className="text-sm font-semibold text-foreground">Miembros activos</h3>
            </div>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {memberCount}
            </span>
          </div>

          {membersQuery.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
            </div>
          ) : memberCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Users className="h-8 w-8 text-foreground/15" />
              <p className="text-sm text-foreground/40">Sin miembros aún</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {(membersQuery.data ?? []).map((m) => {
                const p = m.profiles;
                return (
                  <li
                    key={m.profile_id}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <AvatarCircle name={p?.full_name ?? null} email={p?.email ?? null} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {p?.full_name ?? "Sin nombre"}
                      </div>
                      <div className="truncate text-xs text-foreground/50">
                        {p?.email ?? "Sin email"}
                      </div>
                    </div>
                    <div className="relative shrink-0">
                      <select
                        value={m.role}
                        disabled={changeRole.isPending}
                        onChange={(e) =>
                          changeRole.mutate({
                            profileId: m.profile_id,
                            newRole: e.target.value as Member["role"],
                          })
                        }
                        className={`appearance-none rounded-full px-3 py-1 pr-7 text-xs font-medium ring-1 outline-none cursor-pointer disabled:opacity-50 ${ROLE_TINT[m.role]}`}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 opacity-60" />
                    </div>
                    <button
                      onClick={() => removeMember.mutate(m.profile_id)}
                      disabled={removeMember.isPending}
                      title="Eliminar miembro"
                      className="shrink-0 rounded-lg p-1.5 text-foreground/30 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      {removeMember.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Invitaciones pendientes */}
        <div className="bg-card border-border rounded-2xl border overflow-hidden">
          <div className="border-b border-border px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-foreground/50" />
              <h3 className="text-sm font-semibold text-foreground">Pendientes</h3>
            </div>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-500">
                {pendingCount}
              </span>
            )}
          </div>

          {invitesQuery.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
            </div>
          ) : pendingCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Clock className="h-8 w-8 text-foreground/15" />
              <p className="text-sm text-foreground/40">Sin invitaciones pendientes</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {(invitesQuery.data ?? []).map((i) => {
                const daysLeft = Math.max(
                  0,
                  Math.ceil((new Date(i.expires_at).getTime() - Date.now()) / 86_400_000)
                );
                return (
                  <li
                    key={i.id}
                    className="flex items-center gap-3 px-6 py-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                      <Mail className="h-4 w-4 text-amber-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{i.email}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${ROLE_TINT[i.role]}`}
                        >
                          {ROLE_LABEL[i.role]}
                        </span>
                        <span
                          className={`text-[10px] ${daysLeft <= 3 ? "text-red-400" : "text-foreground/40"}`}
                        >
                          · {daysLeft}d restantes
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => revokeInvite.mutate(i.id)}
                      disabled={revokeInvite.isPending}
                      title="Revocar invitación"
                      className="shrink-0 rounded-lg p-1.5 text-foreground/30 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      {revokeInvite.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
