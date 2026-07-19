// Lógica de verificación de integridad/firma de una entidad sanitaria.
// Compartida entre el endpoint público /api/verify y la página /verify.
import { createClient } from "@supabase/supabase-js";
import { hashPayload, verifyHashSignature } from "@/lib/crypto/sign";

export type VerifySummary = {
  title: string;
  subtitle?: string;
  fields: { label: string; value: string }[];
};

export type VerifyResult = {
  entity: string;
  id: string;
  current_hash: string;
  integrity_ok: boolean;
  summary: VerifySummary;
  signatures: {
    signer: string;
    signed_at: string;
    signed_hash: string;
    signature_valid: boolean;
    hash_matches_current: boolean;
  }[];
  anchors: {
    network: string;
    tx_hash: string;
    contract_address: string;
    anchored_hash: string;
    anchored_at: string;
    matches_current: boolean;
  }[];
};

export const VERIFY_ALLOWED_ENTITIES = new Set([
  "animals",
  "vaccinations",
  "treatments",
  "weighings",
  "certifications",
  "sales",
]);

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

type Admin = ReturnType<typeof admin>;

const ANIMAL_STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  sold: "Vendido",
  dead: "Muerto",
  lost: "Perdido",
  slaughtered: "Sacrificado",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function animalLabel(sb: Admin, animalId: string | null | undefined): Promise<string> {
  if (!animalId) return "—";
  const { data } = await sb.from("animals").select("tag, name").eq("id", animalId).maybeSingle();
  if (!data) return "—";
  return data.name ? `${data.tag} · ${data.name}` : data.tag;
}

/** Construye un resumen legible por humanos de la entidad, sin exponer datos innecesarios. */
async function buildSummary(sb: Admin, entity: string, row: any): Promise<VerifySummary> {
  switch (entity) {
    case "animals":
      return {
        title: row.name ?? row.tag,
        subtitle: `Arete ${row.tag}`,
        fields: [
          {
            label: "Sexo",
            value: row.sex === "male" ? "Macho" : row.sex === "female" ? "Hembra" : "—",
          },
          { label: "Estado", value: ANIMAL_STATUS_LABELS[row.status] ?? row.status ?? "—" },
          {
            label: "Peso actual",
            value: row.current_weight_kg ? `${row.current_weight_kg} kg` : "—",
          },
        ],
      };

    case "vaccinations": {
      const [animal, vaccine] = await Promise.all([
        animalLabel(sb, row.animal_id),
        row.vaccine_id
          ? sb.from("vaccines_catalog").select("name").eq("id", row.vaccine_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return {
        title: "Vacunación",
        subtitle: animal,
        fields: [
          { label: "Vacuna", value: vaccine.data?.name ?? "—" },
          { label: "Aplicada el", value: fmtDate(row.applied_at) },
          { label: "Dosis", value: row.dose_ml ? `${row.dose_ml} ml` : "—" },
        ],
      };
    }

    case "treatments": {
      const [animal, disease] = await Promise.all([
        animalLabel(sb, row.animal_id),
        row.disease_id
          ? sb.from("diseases_catalog").select("name").eq("id", row.disease_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return {
        title: "Tratamiento",
        subtitle: animal,
        fields: [
          { label: "Enfermedad", value: disease.data?.name ?? "—" },
          { label: "Inicio", value: fmtDate(row.started_at) },
          { label: "Fin", value: fmtDate(row.ended_at) },
        ],
      };
    }

    case "weighings": {
      const animal = await animalLabel(sb, row.animal_id);
      return {
        title: "Pesaje",
        subtitle: animal,
        fields: [
          { label: "Peso registrado", value: `${row.weight_kg} kg` },
          { label: "Fecha", value: fmtDate(row.measured_at) },
        ],
      };
    }

    case "certifications": {
      const animal = row.animal_id ? await animalLabel(sb, row.animal_id) : undefined;
      const CERT_TYPE_LABELS: Record<string, string> = {
        origin: "Origen",
        health: "Sanidad Animal",
        organic: "Producción Orgánica",
        welfare: "Bienestar Animal",
        export: "Exportación",
        other: "General",
      };
      return {
        title: `Certificado · ${CERT_TYPE_LABELS[row.type] ?? row.type}`,
        subtitle: animal,
        fields: [
          { label: "Emisor", value: row.issuer ?? "—" },
          { label: "Emitido el", value: fmtDate(row.issued_at) },
          { label: "Válido hasta", value: fmtDate(row.valid_until) },
        ],
      };
    }

    case "sales": {
      const buyer = row.buyer_id
        ? await sb.from("buyers").select("name").eq("id", row.buyer_id).maybeSingle()
        : { data: null };
      return {
        title: "Venta",
        subtitle: buyer.data?.name,
        fields: [
          { label: "Fecha", value: fmtDate(row.sold_at) },
          {
            label: "Total",
            value: `$${Number(row.total_amount).toLocaleString("es-VE", { minimumFractionDigits: 2 })} ${row.currency ?? ""}`,
          },
        ],
      };
    }

    default:
      return { title: entity, fields: [] };
  }
}

/** Devuelve el resultado de verificación, o null si la entidad no existe / no está soportada. */
export async function verifyEntity(entity: string, id: string): Promise<VerifyResult | null> {
  if (!VERIFY_ALLOWED_ENTITIES.has(entity)) return null;

  const sb = admin();
  const { data: row, error } = await sb.from(entity).select("*").eq("id", id).single();
  if (error || !row) return null;

  const currentHash = hashPayload(row);
  const summary = await buildSummary(sb, entity, row);

  const [{ data: sigs }, { data: anchors }] = await Promise.all([
    sb
      .from("signatures")
      .select("signer_address, signature, payload_hash, signed_at")
      .eq("entity_type", entity)
      .eq("entity_id", id),
    sb
      .from("blockchain_records")
      .select("payload_hash, network, tx_hash, anchored_at, contract_address")
      .eq("entity_type", entity)
      .eq("entity_id", id),
  ]);

  const signatureChecks = await Promise.all(
    (sigs ?? []).map(async (s) => {
      const ok = await verifyHashSignature(
        s.payload_hash as `0x${string}`,
        s.signature as `0x${string}`,
        s.signer_address as `0x${string}`
      ).catch(() => false);
      return {
        signer: s.signer_address as string,
        signed_at: s.signed_at as string,
        signed_hash: s.payload_hash as string,
        signature_valid: ok,
        hash_matches_current: s.payload_hash === currentHash,
      };
    })
  );

  const anchorMatches = (anchors ?? []).map((a) => ({
    network: a.network as string,
    tx_hash: a.tx_hash as string,
    contract_address: a.contract_address as string,
    anchored_hash: a.payload_hash as string,
    anchored_at: a.anchored_at as string,
    matches_current: a.payload_hash === currentHash,
  }));

  // Un registro solo puede considerarse "verificado" si existe al menos una
  // prueba criptográfica (firma o ancla). Sin pruebas no está verificado,
  // solo "sin firmar" — [].every() daría true y sería engañoso.
  const hasProof = signatureChecks.length > 0 || anchorMatches.length > 0;
  const integrityOk =
    hasProof &&
    signatureChecks.every((s) => s.signature_valid && s.hash_matches_current) &&
    anchorMatches.every((a) => a.matches_current);

  return {
    entity,
    id,
    current_hash: currentHash,
    integrity_ok: integrityOk,
    summary,
    signatures: signatureChecks,
    anchors: anchorMatches,
  };
}
