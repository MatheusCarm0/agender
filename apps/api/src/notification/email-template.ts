export function emailLayout(title: string, body: string, footer?: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#FAFAF9;font-family:'Geist',-apple-system,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAF9;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background-color:#FFFFFF;border:1px solid #E7E5E4;border-radius:8px;box-shadow:0 1px 2px rgba(0,0,0,.04),0 1px 3px rgba(0,0,0,.06);">

        <!-- Header -->
        <tr><td style="padding:32px 32px 24px;border-bottom:1px solid #E7E5E4;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
            <tr>
              <td style="vertical-align:middle;">
                <svg width="36" height="36" viewBox="0 0 112 86" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8,78 L40,8 L56,8 L24,78 Z" fill="#0D9488"/>
                  <path d="M56,8 L72,8 L104,78 L84,78 Z" fill="#0D9488"/>
                  <rect x="26" y="50" width="18" height="8" rx="1.5" fill="#0D9488"/>
                  <rect x="60" y="50" width="22" height="8" rx="1.5" fill="#0D9488"/>
                  <rect x="48" y="2" width="12" height="56" rx="3" fill="#F9A825"/>
                  <path d="M48,54 L60,54 L54,70" fill="#5D4037"/>
                  <path d="M51,62 L57,62 L54,70" fill="#455A64"/>
                </svg>
              </td>
              <td style="vertical-align:middle;padding-left:10px;">
                <span style="font-size:22px;font-weight:600;color:#1C1917;letter-spacing:-0.5px;">Agender</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 24px;font-size:20px;font-weight:600;color:#1C1917;line-height:1.35;">
            ${title}
          </h1>
          ${body}
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #E7E5E4;text-align:center;">
          <p style="margin:0;font-size:12px;color:#A8A29E;line-height:1.5;">
            ${footer || 'Enviado pelo Agender · sua agenda online.'}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function emailButton(href: string, label: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td align="center">
      <a href="${href}" target="_blank" style="display:inline-block;padding:12px 32px;background-color:#0D9488;color:#FFFFFF;font-size:14px;font-weight:500;text-decoration:none;border-radius:6px;line-height:1;">
        ${label}
      </a>
    </td></tr>
  </table>`;
}

export function emailInfoBox(rows: Array<{ label: string; value: string }>): string {
  const cells = rows.map(r => `
    <td style="padding:0 8px;">
      <div style="font-size:12px;color:#78716C;font-weight:500;line-height:1.4;margin-bottom:4px;">${r.label}</div>
      <div style="font-size:16px;font-weight:600;color:#115E59;line-height:1.4;">${r.value}</div>
    </td>`).join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F0FDFA;border:1px solid #99F6E4;border-radius:8px;margin-bottom:24px;">
    <tr><td style="padding:20px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>${cells}</tr></table>
    </td></tr>
  </table>`;
}

export function emailText(text: string): string {
  return `<p style="margin:0 0 16px;font-size:14px;color:#44403C;line-height:1.5;">${text}</p>`;
}

export function emailMutedText(text: string): string {
  return `<p style="margin:0 0 8px;font-size:12px;color:#A8A29E;line-height:1.5;text-align:center;">${text}</p>`;
}
