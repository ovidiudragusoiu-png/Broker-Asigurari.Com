import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const TO_EMAIL = "bucuresti@broker-asigurari.com";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

interface RPSubmission {
  professionType: string;
  ownerType: "PF" | "PJ";
  lastName: string;
  firstName: string;
  companyName: string;
  cui: string;
  cnp: string;
  email: string;
  phone: string;
  countyName: string;
  cityName: string;
  observations: string;
}

function row(label: string, value: string | undefined): string {
  if (!value) return "";
  return `<tr><td style="padding:6px 12px;font-weight:600;color:#374151;white-space:nowrap">${label}</td><td style="padding:6px 12px;color:#4b5563">${value}</td></tr>`;
}

function buildEmailHtml(data: RPSubmission): string {
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
      <p style="color:#6b7280;margin-top:0">Trimisă de pe broker-asigurari.com</p>

      <h3 style="color:#111827;border-bottom:2px solid #dbeafe;padding-bottom:6px">Detalii cerere</h3>
      <table style="width:100%;border-collapse:collapse">${rows}</table>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const data: RPSubmission = await request.json();

    if (!data.email || !data.phone) {
      return NextResponse.json({ error: "Email și telefon sunt obligatorii" }, { status: 400 });
    }

    const name = data.ownerType === "PF"
      ? `${data.lastName} ${data.firstName}`
      : data.companyName;

    const result = await getResend().emails.send({
      from: "Răspundere Profesională <noreply@broker-asigurari.com>",
      to: [TO_EMAIL],
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
