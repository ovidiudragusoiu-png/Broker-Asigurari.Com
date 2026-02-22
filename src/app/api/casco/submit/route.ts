import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const TO_EMAIL = "bucuresti@broker-asigurari.com";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

interface FileAttachment {
  name: string;
  content: string; // base64
  type: string;
}

interface CascoSubmission {
  ownerType: "PF" | "PJ";
  lastName: string;
  firstName: string;
  companyName: string;
  cui: string;
  cnp: string;
  email: string;
  phone: string;
  hasLicense: string;
  licenseDate: string;
  countyName: string;
  cityName: string;
  maritalStatus: string;
  inputMode: "form" | "upload";
  files: FileAttachment[];
  plateNumber: string;
  categoryName: string;
  subcategoryName: string;
  makeName: string;
  model: string;
  version: string;
  year: string;
  firstRegistrationDate: string;
  vin: string;
  bodyType: string;
  transmission: string;
  km: string;
  fuelType: string;
  seats: string;
  engineCc: string;
  engineKw: string;
  maxWeight: string;
  ownerHistory: string;
  ridesharing: string;
  currentInsurer: string;
  startDate: string;
  paymentFrequency: string;
  deductible: string;
  isNewCar: string;
  invoiceValue: string;
  invoiceCurrency: string;
  observations: string;
}

function row(label: string, value: string | undefined): string {
  if (!value) return "";
  return `<tr><td style="padding:6px 12px;font-weight:600;color:#374151;white-space:nowrap">${label}</td><td style="padding:6px 12px;color:#4b5563">${value}</td></tr>`;
}

function buildEmailHtml(data: CascoSubmission): string {
  const name =
    data.ownerType === "PF"
      ? `${data.lastName} ${data.firstName}`
      : data.companyName;

  const contactRows = [
    row("Tip", data.ownerType === "PF" ? "Persoană fizică" : "Persoană juridică"),
    row("Nume", name),
    data.ownerType === "PF" ? row("CNP", data.cnp) : row("CUI", data.cui),
    row("Email", data.email),
    row("Telefon", data.phone),
    row("Permis auto", data.hasLicense === "da" ? `Da — din ${data.licenseDate}` : "Nu"),
    row("Localitate", `${data.cityName}, ${data.countyName}`),
    data.ownerType === "PF" ? row("Stare civilă", data.maritalStatus) : "",
  ].join("");

  let vehicleRows: string;
  if (data.inputMode === "upload") {
    vehicleRows = row("Documente", `${data.files.length} fișier(e) atașat(e)`);
  } else {
    vehicleRows = [
      row("Nr. înmatriculare", data.plateNumber),
      row("Categorie", data.categoryName),
      row("Subcategorie", data.subcategoryName),
      row("Marca", data.makeName),
      row("Model", data.model),
      row("Versiune", data.version),
      row("An fabricație", data.year),
      row("Prima înmatriculare", data.firstRegistrationDate),
      row("VIN", data.vin),
      row("Caroserie", data.bodyType),
      row("Transmisie", data.transmission),
      row("Km la bord", data.km),
      row("Motorizare", data.fuelType),
      row("Nr. locuri", data.seats),
      row("Cilindree (cm³)", data.engineCc),
      row("Putere (kW)", data.engineKw),
      row("Masă maximă (kg)", data.maxWeight),
      row("Istoric proprietar", data.ownerHistory),
      row("Ridesharing/Taxi", data.ridesharing),
    ].join("");
  }

  const insuranceRows = [
    row("Asigurat CASCO la", data.currentInsurer),
    row("Data început", data.startDate),
    row("Frecvență plată", data.paymentFrequency),
    row("Franșiză", data.deductible),
    row("Mașină nouă", data.isNewCar === "da" ? `Da — ${data.invoiceValue} ${data.invoiceCurrency}` : "Nu"),
    row("Observații", data.observations),
  ].join("");

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#059669;margin-bottom:4px">Cerere ofertă CASCO</h2>
      <p style="color:#6b7280;margin-top:0">Trimisă de pe broker-asigurari.com</p>

      <h3 style="color:#111827;border-bottom:2px solid #d1fae5;padding-bottom:6px">Date de contact</h3>
      <table style="width:100%;border-collapse:collapse">${contactRows}</table>

      <h3 style="color:#111827;border-bottom:2px solid #d1fae5;padding-bottom:6px;margin-top:24px">Vehicul</h3>
      <table style="width:100%;border-collapse:collapse">${vehicleRows}</table>

      <h3 style="color:#111827;border-bottom:2px solid #d1fae5;padding-bottom:6px;margin-top:24px">Detalii asigurare</h3>
      <table style="width:100%;border-collapse:collapse">${insuranceRows}</table>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const data: CascoSubmission = await request.json();

    // Basic validation
    if (!data.email || !data.phone) {
      return NextResponse.json({ error: "Email și telefon sunt obligatorii" }, { status: 400 });
    }

    const name =
      data.ownerType === "PF"
        ? `${data.lastName} ${data.firstName}`
        : data.companyName;

    const vehicleInfo =
      data.inputMode === "form" && data.makeName
        ? ` — ${data.makeName} ${data.model}`
        : "";

    // Build attachments from base64 files
    const attachments = data.files
      .filter((f) => f.content && f.name)
      .map((f) => ({
        filename: f.name,
        content: Buffer.from(f.content, "base64"),
      }));

    const result = await getResend().emails.send({
      from: "CASCO <noreply@broker-asigurari.com>",
      to: [TO_EMAIL],
      replyTo: data.email,
      subject: `Cerere ofertă CASCO — ${name}${vehicleInfo}`,
      html: buildEmailHtml(data),
      attachments,
    });

    console.log("[CASCO] Resend result:", JSON.stringify(result));

    if (result.error) {
      console.error("[CASCO] Resend error:", result.error);
      return NextResponse.json(
        { error: `Eroare email: ${result.error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[CASCO] Email send error:", err);
    return NextResponse.json(
      { error: "Nu s-a putut trimite cererea. Încercați din nou." },
      { status: 500 }
    );
  }
}
