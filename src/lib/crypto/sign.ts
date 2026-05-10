// =====================================================================
// Firma EIP-191 (personal_sign) sobre el JSON canónico de un payload.
// Usa la wallet embebida de Privy. La firma se almacena junto al
// payload_hash y puede verificarse con `viem.verifyMessage`.
// =====================================================================

import { keccak256, toHex, verifyMessage as viemVerifyMessage } from "viem";

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(obj[k])).join(",") + "}";
}

export function hashPayload(value: unknown): `0x${string}` {
  return keccak256(toHex(canonicalJson(value)));
}

/**
 * Firma `payload` con la wallet Privy del usuario actual.
 * `signMessage` proviene de `@privy-io/react-auth`'s `useSignMessage` hook
 * o del provider EVM expuesto por la wallet embebida.
 */
export async function signPayload(
  payload: unknown,
  signMessage: (msg: { message: string }) => Promise<{ signature: string }>
): Promise<{ payloadHash: `0x${string}`; signature: `0x${string}`; canonical: string }> {
  const canonical = canonicalJson(payload);
  const payloadHash = keccak256(toHex(canonical));
  // Firmamos el hash en formato hex para mantener un mensaje compacto y
  // determinístico que también puede verificarse desde el contrato si fuera
  // necesario (ecrecover acepta el digest EIP-191 sobre este string).
  const { signature } = await signMessage({ message: payloadHash });
  return { payloadHash, signature: signature as `0x${string}`, canonical };
}

export async function verifySignature(
  payload: unknown,
  signature: `0x${string}`,
  expectedAddress: `0x${string}`
): Promise<boolean> {
  const payloadHash = hashPayload(payload);
  return viemVerifyMessage({ address: expectedAddress, message: payloadHash, signature });
}

export async function verifyHashSignature(
  payloadHash: `0x${string}`,
  signature: `0x${string}`,
  expectedAddress: `0x${string}`
): Promise<boolean> {
  return viemVerifyMessage({ address: expectedAddress, message: payloadHash, signature });
}
