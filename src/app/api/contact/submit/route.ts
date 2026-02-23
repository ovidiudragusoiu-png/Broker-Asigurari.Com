import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const TO_EMAIL = "bucuresti@broker-asigurari.com";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

interface ContactSubmission {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

function row(label: string, value: string | undefined): string {
  if (!value) return "";
  return `<tr><td style="padding:6px 12px;font-weight:600;color:#374151;white-space:nowrap">${label}</td><td style="padding:6px 12px;color:#4b5563">${value}</td></tr>`;
}

function buildEmailHtml(data: ContactSubmission): string {
  const rows = [
    row("Nume", data.name),
    row("Email", data.email),
    row("Telefon", data.phone),
    row("Subiect", data.subject),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#059669;margin-bottom:4px">Mesaj Contact</h2>
      <p style="color:#6b7280;margin-top:0">Trimis de pe broker-asigurari.com</p>

      <h3 style="color:#111827;border-bottom:2px solid #d1fae5;padding-bottom:6px">Date contact</h3>
      <table style="width:100%;border-collapse:collapse">${rows}</table>

      <h3 style="color:#111827;border-bottom:2px solid #d1fae5;padding-bottom:6px;margin-top:24px">Mesaj</h3>
      <p style="padding:12px;color:#4b5563;background:#f9fafb;border-radius:8px;white-space:pre-wrap">${data.message}</p>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const data: ContactSubmission = await request.json();

    if (!data.email || !data.name || !data.message) {
      return NextResponse.json({ error: "Nume, email și mesaj sunt obligatorii" }, { status: 400 });
    }

    const result = await getResend().emails.send({
      from: "Contact <noreply@broker-asigurari.com>",
      to: [TO_EMAIL],
      replyTo: data.email,
      subject: `Mesaj contact — ${data.name}`,
      html: buildEmailHtml(data),
    });

    console.log("[Contact] Resend result:", JSON.stringify(result));

    if (result.error) {
      console.error("[Contact] Resend error:", result.error);
      return NextResponse.json(
        { error: `Eroare email: ${result.error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Contact] Email send error:", err);
    return NextResponse.json(
      { error: "Nu s-a putut trimite mesajul. Încercați din nou." },
      { status: 500 }
    );
  }
}
