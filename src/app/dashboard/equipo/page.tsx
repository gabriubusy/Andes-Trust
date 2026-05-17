"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { Users, UserPlus, Mail, Trash2, Shield, Loader2, Clock } from "lucide-react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { useSupabase } from "@/hooks/use-supabase";
import { useCurrentFarm } from "@/hooks/use-current-farm";

type Member = {
  profile_id: string;
  role: "owner" | "admin" | "operator" | "vet" | "viewer" | "regulator";
  profiles: { id: string; email: string | null; full_name: string | null; wallet_address: string | null } | null;
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
  owner: "bg-purple-500/15 text-purple-600",
  admin: "bg-blue-500/15 text-blue-600",
  operator: "bg-amber-500/15 text-amber-600",
  vet: "bg-emerald-500/15 text-emerald-600",
  viewer: "bg-muted text-foreground/60",
  regulator: "bg-slate-500/15 text-slate-600",
};

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

  return (
    <DashboardShell
      title="Equipo de trabajo"
      subtitle="Miembros con acceso a la finca"
    >
      {/* Invitar */}
      <div className="bg-card border-border mb-6 rounded-2xl border p-5">
        <h3 className="text-foreground mb-3 flex items-center gap-2 text-sm font-semibold">
          <UserPlus className="h-4 w-4" /> Invitar miembro
        </h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            className="border-border bg-background flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Member["role"])}
            className="border-border bg-background rounded-lg border px-3 py-2 text-sm outline-none"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
          <button
            onClick={() => invite.mutate()}
            disabled={!email || invite.isPending}
            className="bg-primary hover:bg-primary/90 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {invite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Invitar
          </button>
        </div>
        {invite.isError && (
          <p className="mt-2 text-xs text-red-500">{(invite.error as Error).message}</p>
        )}
        {invite.isSuccess && invite.data?.added_directly && (
          <p className="text-emerald-600 mt-2 text-xs">Miembro añadido directamente (ya tenía cuenta).</p>
        )}
        {invite.isSuccess && invite.data?.invitation && (
          <p className="text-foreground/60 mt-2 text-xs">
            Invitación creada. El invitado debe iniciar sesión con ese email; la aceptación es automática.
          </p>
        )}
        <p className="text-foreground/40 mt-3 text-xs">
          <strong>Roles:</strong> Patrón gestiona finca y ventas · Administrador gestiona equipo · Médico
          veterinario autoriza tratamientos · Obrero reporta eventos · Solo lectura visualiza.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Miembros activos */}
        <div className="bg-card border-border rounded-2xl border">
          <div className="border-border flex items-center gap-2 border-b px-5 py-3">
            <Users className="text-foreground/50 h-4 w-4" />
            <h3 className="text-foreground text-sm font-semibold">Miembros activos</h3>
            <span className="text-foreground/40 text-xs">({membersQuery.data?.length ?? 0})</span>
          </div>
          {membersQuery.isLoading ? (
            <div className="text-foreground/50 py-12 text-center text-sm">Cargando…</div>
          ) : (
            <ul className="divide-border divide-y">
              {(membersQuery.data ?? []).map((m) => {
                const p = m.profiles;
                const initials = (p?.full_name ?? p?.email ?? "?").slice(0, 2).toUpperCase();
                return (
                  <li key={m.profile_id} className="flex items-center gap-4 px-5 py-3">
                    <div className="from-primary to-secondary flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-xs font-bold text-white">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-foreground truncate text-sm font-medium">
                        {p?.full_name ?? "Sin nombre"}
                      </div>
                      <div className="text-foreground/50 truncate text-xs">{p?.email ?? "Sin email"}</div>
                    </div>
                    <select
                      value={m.role}
                      onChange={(e) => changeRole.mutate({ profileId: m.profile_id, newRole: e.target.value as Member["role"] })}
                      className={`rounded-full px-2 py-0.5 text-xs ${ROLE_TINT[m.role]} border-none outline-none`}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeMember.mutate(m.profile_id)}
                      title="Eliminar miembro"
                      className="rounded-lg border border-red-500/30 p-1.5 text-red-500 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Invitaciones pendientes */}
        <div className="bg-card border-border rounded-2xl border">
          <div className="border-border flex items-center gap-2 border-b px-5 py-3">
            <Clock className="text-foreground/50 h-4 w-4" />
            <h3 className="text-foreground text-sm font-semibold">Pendientes</h3>
            <span className="text-foreground/40 text-xs">({invitesQuery.data?.length ?? 0})</span>
          </div>
          {(invitesQuery.data ?? []).length === 0 ? (
            <p className="text-foreground/50 px-5 py-8 text-center text-sm">Sin invitaciones pendientes</p>
          ) : (
            <ul className="divide-border divide-y">
              {(invitesQuery.data ?? []).map((i) => (
                <li key={i.id} className="flex items-start gap-3 px-5 py-3">
                  <Mail className="text-foreground/40 mt-0.5 h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="text-foreground truncate font-medium">{i.email}</div>
                    <div className="text-foreground/50 mt-0.5 flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      {ROLE_LABEL[i.role]} · expira {new Date(i.expires_at).toLocaleDateString("es-VE")}
                    </div>
                  </div>
                  <button
                    onClick={() => revokeInvite.mutate(i.id)}
                    className="rounded-lg border border-red-500/30 p-1 text-red-500 hover:bg-red-500/10"
                    title="Revocar"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
