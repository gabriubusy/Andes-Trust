import { NextResponse } from "next/server";
import { PrivyClient } from "@privy-io/server-auth";
import { SignJWT } from "jose";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const privy = new PrivyClient(process.env.PRIVY_APP_ID!, process.env.PRIVY_APP_SECRET!);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const JWT_TTL_SECONDS = 60 * 60;

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  const privyToken = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!privyToken) {
    return NextResponse.json({ error: "missing_token" }, { status: 401 });
  }

  let claims;
  try {
    claims = await privy.verifyAuthToken(privyToken);
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const privyDid = claims.userId;
  const user = await privy.getUserById(privyDid).catch(() => null);
  const email = user?.email?.address ?? user?.google?.email ?? null;
  const wallet = user?.wallet?.address ?? null;

  const adminDids = (process.env.PLATFORM_ADMIN_DIDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const isPlatformAdmin = adminDids.includes(privyDid);

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        privy_did: privyDid,
        email,
        wallet_address: wallet,
        is_platform_admin: isPlatformAdmin,
      },
      { onConflict: "privy_did" }
    )
    .select("id")
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: "profile_upsert_failed" }, { status: 500 });
  }

  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!);
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({
    privy_did: privyDid,
    role: "authenticated",
    email: email ?? undefined,
    is_platform_admin: isPlatformAdmin,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + JWT_TTL_SECONDS)
    .setSubject(profile.id)
    .setAudience("authenticated")
    .sign(secret);

  return NextResponse.json({
    token,
    expiresAt: (now + JWT_TTL_SECONDS) * 1000,
    profileId: profile.id,
    isPlatformAdmin,
  });
}
