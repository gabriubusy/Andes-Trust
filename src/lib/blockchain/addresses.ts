// Direcciones de contratos desplegados, leídas desde variables públicas.
// `chain:deploy` y `deploy-payment-escrow` imprimen los valores a colocar
// en `.env.local`.

export const CONTRACTS = {
  anchor: process.env.NEXT_PUBLIC_ANCHOR_CONTRACT as `0x${string}` | undefined,
  paymentEscrow: process.env.NEXT_PUBLIC_PAYMENT_ESCROW as `0x${string}` | undefined,
  mockUsdc: process.env.NEXT_PUBLIC_MOCK_USDC as `0x${string}` | undefined,
} as const;

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 80002); // Polygon Amoy

export function requireAddress(name: keyof typeof CONTRACTS): `0x${string}` {
  const v = CONTRACTS[name];
  if (!v) throw new Error(`Falta variable de entorno para contrato ${name}`);
  return v;
}
