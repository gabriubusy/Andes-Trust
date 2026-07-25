import { http, fallback, type Transport } from "viem";

// =====================================================================
// Transporte RPC de Polygon Amoy con respaldo automático.
//
// Antes cada cliente usaba un solo endpoint (`http(RPC_URL)`); cuando el
// RPC público oficial se caía —cosa frecuente en testnet— el anclaje
// fallaba con "fetch failed" y no había alternativa. `fallback` prueba los
// endpoints en orden y rota al siguiente si uno no responde, así una caída
// puntual de un RPC deja de tumbar la función entera.
//
// `retryCount: 0` en cada http: que un endpoint muerto falle rápido y ceda
// el turno al siguiente en vez de reintentar 3 veces contra la nada.
// =====================================================================

/** Endpoints públicos de Amoy que no requieren API key, como respaldo. */
const BACKUP_RPCS = ["https://polygon-amoy-bor-rpc.publicnode.com"];

export function amoyTransport(): Transport {
  const primary = process.env.NEXT_PUBLIC_RPC_URL?.trim();
  const urls = [...new Set([primary, ...BACKUP_RPCS].filter(Boolean))] as string[];
  return fallback(
    urls.map((u) => http(u, { timeout: 10_000, retryCount: 0 })),
    { rank: false }
  );
}
