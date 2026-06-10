import { createPublicClient, createWalletClient, encodeFunctionData, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { polygonAmoy } from "viem/chains";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc-amoy.polygon.technology";

let _public: ReturnType<typeof createPublicClient> | null = null;
function getPublicClient() {
  if (!_public) _public = createPublicClient({ chain: polygonAmoy, transport: http(RPC_URL) });
  return _public;
}

function getWalletClient() {
  const pk = process.env.RELAYER_PRIVATE_KEY;
  if (!pk) throw new Error("RELAYER_PRIVATE_KEY not configured");
  const key = pk.startsWith("0x") ? (pk as `0x${string}`) : (`0x${pk}` as `0x${string}`);
  const account = privateKeyToAccount(key);
  return createWalletClient({ account, chain: polygonAmoy, transport: http(RPC_URL) });
}

export function getRelayerAddress(): `0x${string}` {
  const pk = process.env.RELAYER_PRIVATE_KEY;
  if (!pk) throw new Error("RELAYER_PRIVATE_KEY not configured");
  const key = pk.startsWith("0x") ? (pk as `0x${string}`) : (`0x${pk}` as `0x${string}`);
  return privateKeyToAccount(key).address;
}

/**
 * Sends a contract write via the relayer private key.
 * Returns the transaction hash after on-chain confirmation.
 */
export async function relayContractWrite({
  to,
  abi,
  functionName,
  args,
}: {
  to: `0x${string}`;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abi: any;
  functionName: string;
  args?: readonly unknown[];
}): Promise<`0x${string}`> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = encodeFunctionData({ abi, functionName, args } as any);
  const wallet = getWalletClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hash = await wallet.sendTransaction({ to, data } as any);
  await getPublicClient().waitForTransactionReceipt({ hash });
  return hash;
}
