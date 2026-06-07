const ROLE_LABEL: Record<string, string> = {
  owner: "Patrón / Dueño",
  admin: "Administrador",
  operator: "Obrero / Operador",
  vet: "Médico veterinario",
  viewer: "Solo lectura",
  regulator: "Regulador (INSAI)",
};

export function buildInviteEmail({
  farmName,
  role,
  invitedByEmail,
  appUrl,
}: {
  farmName: string;
  role: string;
  invitedByEmail: string;
  appUrl: string;
}) {
  const roleLabel = ROLE_LABEL[role] ?? role;
  const loginUrl = `${appUrl}/login`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invitación a ${farmName}</title>
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#1a1d27;border-radius:16px;border:1px solid #2a2d3a;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a5f 0%,#0f2744 100%);padding:32px 40px;text-align:center;">
              <div style="font-size:32px;margin-bottom:8px;">🐄</div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Finca El Progreso</h1>
              <p style="margin:4px 0 0;color:#93c5fd;font-size:13px;">Plataforma blockchain ganadera</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 8px;color:#f1f5f9;font-size:18px;font-weight:600;">Te han invitado a unirte</h2>
              <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6;">
                <strong style="color:#e2e8f0;">${invitedByEmail}</strong> te ha invitado a colaborar en
                <strong style="color:#e2e8f0;">${farmName}</strong> con el rol de
                <strong style="color:#60a5fa;">${roleLabel}</strong>.
              </p>

              <!-- Role badge -->
              <div style="background:#1e3a5f;border:1px solid #2563eb33;border-radius:10px;padding:14px 18px;margin-bottom:28px;display:flex;align-items:center;gap:12px;">
                <div>
                  <div style="color:#93c5fd;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px;">Tu rol</div>
                  <div style="color:#f1f5f9;font-size:15px;font-weight:600;">${roleLabel}</div>
                </div>
              </div>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}"
                       style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:13px 36px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.2px;">
                      Aceptar invitación
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0;color:#64748b;font-size:12px;text-align:center;line-height:1.6;">
                Inicia sesión con <strong style="color:#94a3b8;">${invitedByEmail.split("@")[1] ? "este correo" : "tu cuenta"}</strong> para que el acceso se active automáticamente.<br/>
                Esta invitación expira en <strong style="color:#94a3b8;">14 días</strong>.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #2a2d3a;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#475569;font-size:11px;">
                Si no esperabas esta invitación puedes ignorar este correo.<br/>
                © 2025 Finca El Progreso · Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Te han invitado a unirte a ${farmName}\n\n${invitedByEmail} te invitó con el rol de ${roleLabel}.\n\nPara aceptar, inicia sesión en: ${loginUrl}\n\nEsta invitación expira en 14 días.`;

  return { html, text };
}
