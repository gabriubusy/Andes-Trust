import { PrivyClient } from "@privy-io/server-auth";
import { createPublicClient, encodeFunctionData, http } from "viem";
import { polygonAmoy } from "viem/chains";

const CAIP2 = "eip155:80002"; // Polygon Amoy

let _privy: PrivyClient | null = null;
function getPrivy() {
  if (!_privy) _privy = new PrivyClient(process.env.PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);
  return _privy;
}

let _public: ReturnType<typeof createPublicClient> | null = null;
function getPublicClient() {
  if (!_public)
    _public = createPublicClient({
      chain: polygonAmoy,
      transport: http(process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc-amoy.polygon.technology"),
    });
  return _public;
}

export function getRelayerWalletId() {
  const id = process.env.PRIVY_RELAYER_WALLET_ID;
  if (!id) throw new Error("PRIVY_RELAYER_WALLET_ID not configured");
  return id;
}

/**
 * Sends a contract write via the Privy server wallet (relayer).
 * Returns the transaction hash after on-chain confirmation.
 */
export async function relayContractWrite<
  const TAbi extends readonly unknown[],
  TFn extends string,
>({
  to,
  abi,
  functionName,
  args,
}: {
  to: `0x${string}`;
  abi: TAbi;
  functionName: TFn;
  args?: readonly unknown[];
}): Promise<`0x${string}`> {
  const data = encodeFunctionData({ abi: abi as never, functionName, args: args as never });

  const privy = getPrivy();
  const result = await privy.walletApi.ethereum.sendTransaction({
    walletId: getRelayerWalletId(),
    caip2: CAIP2,
    transaction: { to, data },
  });

  const hash = result.hash as `0x${string}`;
  await getPublicClient().waitForTransactionReceipt({ hash });
  return hash;
}
