import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { validateBody, garantiiSchema, type GarantiiData } from "@/lib/validation/schemas";

const TO_EMAILS = ["bucuresti@broker-asigurari.com", "office@sigur.ai"];

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

function row(label: string, value: string | undefined): string {
  if (!value) return "";
  return `<tr><td style="padding:6px 12px;font-weight:600;color:#374151;white-space:nowrap">${label}</td><td style="padding:6px 12px;color:#4b5563">${value}</td></tr>`;
}

function buildEmailHtml(data: GarantiiData): string {
  const rows = [
    row("Tip garanție", data.guaranteeType),
    row("Denumire firmă", data.companyName),
    row("CUI", data.cui),
    row("Localitate", `${data.cityName}, ${data.countyName}`),
    row("Email", data.email),
    row("Telefon", data.phone),
    row("Observații", data.observations),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#059669;margin-bottom:4px">Cerere ofertă Garanții Contractuale</h2>
      <p style="color:#6b7280;margin-top:0">Trimisă de pe sigur.ai</p>

      <h3 style="color:#111827;border-bottom:2px solid #d1fae5;padding-bottom:6px">Detalii cerere</h3>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await validateBody(request, garantiiSchema);
    if ("error" in parsed) return parsed.error;
    const data = parsed.data;

    const result = await getResend().emails.send({
      from: "Garanții <noreply@broker-asigurari.com>",
      to: TO_EMAILS,
      replyTo: data.email,
      subject: `Cerere ofertă Garanții — ${data.companyName}`,
      html: buildEmailHtml(data),
    });

    console.log("[Garantii] Resend result:", JSON.stringify(result));

    if (result.error) {
      console.error("[Garantii] Resend error:", result.error);
      return NextResponse.json(
        { error: `Eroare email: ${result.error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Garantii] Email send error:", err);
    return NextResponse.json(
      { error: "Nu s-a putut trimite cererea. Încercați din nou." },
      { status: 500 }
    );
  }
}
