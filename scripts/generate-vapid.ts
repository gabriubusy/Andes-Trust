// Genera un par de claves VAPID para Web Push.
// Uso: npx tsx scripts/generate-vapid.ts
// Salida: pega las dos líneas en tu `.env.local`.

import { generateKeyPairSync, createPublicKey, createPrivateKey } from "node:crypto";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });

function toUrlBase64(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// El public key VAPID es el punto sin comprimir de 65 bytes (0x04 + X + Y)
const pubRaw = createPublicKey(publicKey).export({ format: "jwk" }) as { x: string; y: string };
const x = Buffer.from(pubRaw.x, "base64url");
const y = Buffer.from(pubRaw.y, "base64url");
const pubUncompressed = Buffer.concat([Buffer.from([0x04]), x, y]);

const privJwk = createPrivateKey(privateKey).export({ format: "jwk" }) as { d: string };
const priv = Buffer.from(privJwk.d, "base64url");

console.log("NEXT_PUBLIC_VAPID_PUBLIC_KEY=" + toUrlBase64(pubUncompressed));
console.log("VAPID_PRIVATE_KEY=" + toUrlBase64(priv));
console.log("VAPID_SUBJECT=mailto:admin@finca-el-progreso.com");
