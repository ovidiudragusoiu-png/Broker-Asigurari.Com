import { prisma } from "@/lib/db/prisma";
import { getOfferDocument, getPolicyDocument } from "@/lib/api/insuretech";
import { parseDocumentUrl } from "@/lib/documents/documentUrl";
import { isOrderPaid } from "@/lib/portal/paymentCheck";
import {
  findCheckoutSession,
  isCheckoutSessionUsable,
} from "@/lib/portal/checkoutSession";

export { parseDocumentUrl };

export async function fetchOfferDocumentUrl(
  offerId: number,
  orderHash: string
): Promise<string | null> {
  const data = await getOfferDocument(offerId, orderHash);
  return parseDocumentUrl(data);
}

export async function fetchPolicyDocumentUrl(
  policyId: number,
  orderHash: string
): Promise<string | null> {
  const data = await getPolicyDocument(policyId, orderHash);
  return parseDocumentUrl(data);
}

type PolicyDocAuthInput = {
  policyId: number;
  orderHash: string;
  offerId?: number;
  sessionToken?: string;
  userId?: string | null;
};

/**
 * Policy PDFs require proof of ownership or a paid order.
 * Offer PDFs are validated upstream via orderHash + offerId (see offer route).
 */
export async function authorizePolicyDocumentAccess(
  input: PolicyDocAuthInput
): Promise<boolean> {
  const { policyId, orderHash, offerId, sessionToken, userId } = input;

  if (userId) {
    const owned = await prisma.policy.findFirst({
      where: {
        userId,
        policyId,
        orderHash,
      },
      select: { id: true },
    });
    if (owned) return true;
  }

  let resolvedOfferId = offerId;
  if (sessionToken) {
    const session = await findCheckoutSession(sessionToken);
    if (
      session &&
      isCheckoutSessionUsable(session, orderHash, session.offerId) &&
      session.orderHash === orderHash
    ) {
      resolvedOfferId = session.offerId;
    }
  }

  if (!resolvedOfferId) return false;
  return isOrderPaid(resolvedOfferId, orderHash);
}
