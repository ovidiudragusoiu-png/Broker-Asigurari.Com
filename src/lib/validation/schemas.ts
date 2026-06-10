import * as z from "zod";
import { NextResponse } from "next/server";

// ── Shared helpers ──

/** Parse & validate request JSON. Returns typed data or a 400 NextResponse. */
export async function validateBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<{ data: T } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      error: NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.join("."),
      message: i.message,
    }));
    return {
      error: NextResponse.json(
        { error: "Validation failed", issues },
        { status: 400 }
      ),
    };
  }

  return { data: result.data };
}

// ── Reusable primitives ──

const email = z.email().max(254);
const phone = z.string().min(6).max(20);
const shortText = z.string().max(200);
const mediumText = z.string().max(2000);
const optionalShort = z.string().max(200).optional().default("");

// ── Contact form ──

export const contactSchema = z.object({
  name: shortText.min(1),
  email,
  phone: z.string().max(20).optional().default(""),
  subject: shortText.optional().default(""),
  message: mediumText.min(1),
});
export type ContactData = z.infer<typeof contactSchema>;

// ── CASCO lead form ──

const fileAttachment = z.object({
  name: z.string().max(255),
  content: z.string().max(10_485_760), // ~10 MB base64
  type: z.string().max(100),
});

export const cascoSchema = z.object({
  ownerType: z.enum(["PF", "PJ"]),
  lastName: optionalShort,
  firstName: optionalShort,
  companyName: optionalShort,
  cui: optionalShort,
  cnp: z.string().max(13).optional().default(""),
  email,
  phone,
  hasLicense: optionalShort,
  licenseDate: optionalShort,
  countyName: optionalShort,
  cityName: optionalShort,
  maritalStatus: optionalShort,
  inputMode: z.enum(["form", "upload"]).optional().default("form"),
  files: z.array(fileAttachment).max(10).optional().default([]),
  plateNumber: optionalShort,
  categoryName: optionalShort,
  subcategoryName: optionalShort,
  makeName: optionalShort,
  model: optionalShort,
  version: optionalShort,
  year: optionalShort,
  firstRegistrationDate: optionalShort,
  vin: z.string().max(50).optional().default(""),
  bodyType: optionalShort,
  transmission: optionalShort,
  km: optionalShort,
  fuelType: optionalShort,
  seats: optionalShort,
  engineCc: optionalShort,
  engineKw: optionalShort,
  maxWeight: optionalShort,
  ownerHistory: optionalShort,
  ridesharing: optionalShort,
  currentInsurer: optionalShort,
  startDate: optionalShort,
  paymentFrequency: optionalShort,
  deductible: optionalShort,
  isNewCar: optionalShort,
  invoiceValue: optionalShort,
  invoiceCurrency: optionalShort,
  observations: mediumText.optional().default(""),
});
export type CascoData = z.infer<typeof cascoSchema>;

// ── Garantii lead form ──

export const garantiiSchema = z.object({
  guaranteeType: shortText.min(1),
  companyName: shortText.min(1),
  cui: optionalShort,
  countyName: optionalShort,
  cityName: optionalShort,
  email,
  phone,
  observations: mediumText.optional().default(""),
});
export type GarantiiData = z.infer<typeof garantiiSchema>;

// ── Raspundere profesionala lead form ──

export const raspundereSchema = z.object({
  professionType: shortText.min(1),
  ownerType: z.enum(["PF", "PJ"]),
  lastName: optionalShort,
  firstName: optionalShort,
  companyName: optionalShort,
  cui: optionalShort,
  cnp: z.string().max(13).optional().default(""),
  email,
  phone,
  countyName: optionalShort,
  cityName: optionalShort,
  observations: mediumText.optional().default(""),
});
export type RaspundereData = z.infer<typeof raspundereSchema>;

// ── Email validate ──

export const emailValidateSchema = z.object({
  email: z.string().min(3).max(254),
});

// ── Email documents ──

export const emailAdditionalDocumentSchema = z.object({
  offerId: z.number().int().positive(),
  policyId: z.number().int().positive().nullable().optional().default(null),
  label: z.string().min(1).max(200).optional(),
});

export const emailDocumentsSchema = z.object({
  email,
  productType: z.string().min(1).max(20),
  offerId: z.number().int().positive(),
  policyId: z.number().int().positive().nullable().optional().default(null),
  padPolicyId: z.number().int().positive().nullable().optional().default(null),
  additionalDocuments: z.array(emailAdditionalDocumentSchema).optional().default([]),
  orderHash: z.string().min(1).max(200),
  policyNumber: z.string().max(100).nullable().optional().default(null),
  vendorName: z.string().max(200).nullable().optional().default(null),
  startDate: z.string().max(50).nullable().optional().default(null),
  endDate: z.string().max(50).nullable().optional().default(null),
});
export type EmailDocumentsData = z.infer<typeof emailDocumentsSchema>;

// ── DNT summary email ──

export const dntSummaryRowSchema = z.object({
  question: z.string().min(1).max(2000),
  answer: z.string().min(1).max(500),
});

export const dntSummarySchema = z.object({
  productType: z.enum(["PAD", "HOUSE", "TRAVEL", "MALPRAXIS"]),
  email,
  firstName: z.string().max(100).optional(),
  rows: z.array(dntSummaryRowSchema).min(1).max(30),
});
export type DntSummaryEmailData = z.infer<typeof dntSummarySchema>;

// ── AI Chat ──

const chatMessage = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(10_000),
});

export const aiChatSchema = z.object({
  messages: z.array(chatMessage).min(1).max(50),
});

// ── Portal policy save ──

export const portalPolicySchema = z.object({
  orderId: z.number().int().positive(),
  orderHash: z.string().min(1).max(200),
  offerId: z.number().int().positive(),
  policyId: z.number().int().positive(),
  productType: z.string().min(1).max(20),
  policyNumber: z.string().max(100).nullable().optional().default(null),
  vendorName: z.string().max(200).nullable().optional().default(null),
  premium: z.number().nullable().optional().default(null),
  currency: z.enum(["RON", "EUR", "USD"]).optional().default("RON"),
  startDate: z.string().max(50).nullable().optional().default(null),
  endDate: z.string().max(50).nullable().optional().default(null),
  email: z.string().max(254).optional().default(""),
  vehicleVin: z.string().max(50).optional(),
  vehiclePlate: z.string().max(20).optional(),
  vehicleCategory: z.string().max(20).optional(),
  // Server-side checkout-session token authorizing a guest (unauthenticated) save.
  sessionToken: z.string().min(1).max(64).optional(),
});
export type PortalPolicyData = z.infer<typeof portalPolicySchema>;

// ── Secured document fetch (no open proxy) ──

export const documentOfferQuerySchema = z.object({
  offerId: z.coerce.number().int().positive(),
  orderHash: z.string().min(1).max(200),
  sessionToken: z.string().min(1).max(64).optional(),
});

export const documentPolicyQuerySchema = z.object({
  policyId: z.coerce.number().int().positive(),
  orderHash: z.string().min(1).max(200),
  offerId: z.coerce.number().int().positive().optional(),
  sessionToken: z.string().min(1).max(64).optional(),
});

// ── Checkout session ──

export const checkoutSessionSchema = z.object({
  orderId: z.number().int().positive(),
  offerId: z.number().int().positive(),
  orderHash: z.string().min(1).max(200),
  productType: z.string().min(1).max(20),
  email: z.string().max(254).optional().default(""),
  padOfferId: z.number().int().positive().optional(),
  policyData: z.record(z.string(), z.unknown()).optional(),
});
export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;

// ── Auth login ──

export const loginSchema = z.object({
  email: z.string().min(1).max(254),
  password: z.string().min(1).max(200),
});

// ── Auth register ──

export const registerSchema = z.object({
  email: z.string().min(1).max(254),
  password: z.string().min(8).max(200),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
});

export const resendVerificationSchema = z.object({
  email: z.string().min(1).max(254),
});
