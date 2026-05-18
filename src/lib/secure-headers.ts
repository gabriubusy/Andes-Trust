const baseDirectives = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://auth.privy.io https://*.privy.io https://*.rpc.privy.systems https://explorer-api.walletconnect.com https://*.walletconnect.com https://*.walletconnect.org wss://*.walletconnect.com wss://*.walletconnect.org https://*.coinbase.com wss://*.coinbase.com https://*.supabase.co wss://*.supabase.co",
  "frame-src 'self' https://auth.privy.io https://verify.walletconnect.com https://verify.walletconnect.org https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
];

const scriptSrc =
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://privy.io https://*.privy.io";

export const secureHeaders = {
  "Content-Security-Policy": [scriptSrc, ...baseDirectives].join("; "),
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), geolocation=(self), microphone=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-XSS-Protection": "1; mode=block",
};
