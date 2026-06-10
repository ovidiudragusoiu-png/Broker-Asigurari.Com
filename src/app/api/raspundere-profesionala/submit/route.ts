import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { validateBody, raspundereSchema, type RaspundereData } from "@/lib/validation/schemas";
import { escapeHtml } from "@/lib/email/escapeHtml";

const TO_EMAILS = ["bucuresti@broker-asigurari.com", "office@sigur.ai"];

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

function row(label: string, value: string | undefined): string {
  if (!value) return "";
  return `<tr><td style="padding:6px 12px;font-weight:600;color:#374151;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:6px 12px;color:#4b5563">${escapeHtml(value)}</td></tr>`;
}

function buildEmailHtml(data: RaspundereData): string {
  const name = data.ownerType === "PF"
    ? `${data.lastName} ${data.firstName}`
    : data.companyName;

  const rows = [
    row("Tip răspundere", data.professionType),
    row("Tip solicitant", data.ownerType === "PF" ? "Persoană fizică" : "Persoană juridică"),
    row("Nume", name),
    data.ownerType === "PJ" ? row("CUI", data.cui) : "",
    data.ownerType === "PF" && data.cnp ? row("CNP", data.cnp) : "",
    row("Localitate", `${data.cityName}, ${data.countyName}`),
    row("Email", data.email),
    row("Telefon", data.phone),
    row("Observații", data.observations),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#2563EB;margin-bottom:4px">Cerere ofertă Răspundere Profesională</h2>
      <p style="color:#6b7280;margin-top:0">Trimisă de pe sigur.ai</p>

      <h3 style="color:#111827;border-bottom:2px solid #dbeafe;padding-bottom:6px">Detalii cerere</h3>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await validateBody(request, raspundereSchema);
    if ("error" in parsed) return parsed.error;
    const data = parsed.data;

    const name = data.ownerType === "PF"
      ? `${data.lastName} ${data.firstName}`
      : data.companyName;

    const result = await getResend().emails.send({
      from: "Răspundere Profesională <noreply@broker-asigurari.com>",
      to: TO_EMAILS,
      replyTo: data.email,
      subject: `Cerere ofertă Răspundere Profesională — ${name}`,
      html: buildEmailHtml(data),
    });

    console.log("[RP] Resend result:", JSON.stringify(result));

    if (result.error) {
      console.error("[RP] Resend error:", result.error);
      return NextResponse.json(
        { error: `Eroare email: ${result.error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[RP] Email send error:", err);
    return NextResponse.json(
      { error: "Nu s-a putut trimite cererea. Încercați din nou." },
      { status: 500 }
    );
  }
}
