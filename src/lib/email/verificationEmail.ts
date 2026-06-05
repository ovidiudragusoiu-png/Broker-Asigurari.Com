import { Resend } from "resend";
import { runtimeAbsoluteUrl } from "@/lib/seo/site";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

function buildVerificationEmailHtml(
  firstName: string | null | undefined,
  verifyUrl: string
): string {
  const greeting = firstName?.trim() ? `Bună, ${firstName.trim()}!` : "Bună!";

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#111827">
      <h2 style="color:#2563EB;margin-bottom:8px">Confirmă adresa de email</h2>
      <p style="color:#4b5563;line-height:1.6">${greeting}</p>
      <p style="color:#4b5563;line-height:1.6">
        Îți mulțumim că ți-ai creat cont pe Sigur.Ai. Apasă butonul de mai jos pentru a confirma adresa de email și a accesa polițele tale.
      </p>
      <p style="margin:28px 0">
        <a href="${verifyUrl}" style="display:inline-block;background:#2563EB;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">
          Confirmă contul
        </a>
      </p>
      <p style="color:#6b7280;font-size:14px;line-height:1.6">
        Linkul este valabil 24 de ore. Dacă nu ai creat acest cont, poți ignora acest email.
      </p>
      <p style="color:#9ca3af;font-size:12px;line-height:1.6;word-break:break-all">
        Dacă butonul nu funcționează, copiază acest link în browser:<br />
        ${verifyUrl}
      </p>
    </div>
  `;
}

export async function sendVerificationEmail(params: {
  email: string;
  firstName?: string | null;
  token: string;
}) {
  const verifyUrl = runtimeAbsoluteUrl(
    `/verify-email?token=${encodeURIComponent(params.token)}`
  );

  const result = await getResend().emails.send({
    from: "Sigur.Ai <noreply@broker-asigurari.com>",
    to: params.email,
    subject: "Confirmă contul tău Sigur.Ai",
    html: buildVerificationEmailHtml(params.firstName, verifyUrl),
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result;
}
