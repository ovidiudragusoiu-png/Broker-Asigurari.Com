/** Map Insuretech / PAID PAD offer errors to actionable Romanian messages. */
export function presentPadOfferError(rawMessage: string | undefined): string {
  const detail = rawMessage?.trim() || "";
  if (!detail) {
    return "Nu am putut genera oferta PAD. Verificați datele și încercați din nou.";
  }

  const paid = detail.match(/mesaj asigurator PAID:\s*([^|]+)/i)?.[1]?.trim();
  if (paid) {
    if (/codul postal nu exista/i.test(paid)) {
      return "Codul poștal nu este recunoscut de PAID. Selectați strada din lista de sugestii sau verificați codul poștal.";
    }
    if (/tipul structurii nu corespunde/i.test(paid)) {
      return "Combinația tip PAD / structură / tip construcție nu este validă. Pentru Tip B folosiți de regulă Casă; pentru Tip A, Bloc.";
    }
    if (/tipul pad al cladirii nu corespunde/i.test(paid)) {
      return "Tipul PAD selectat nu corespunde produsului cerut. Verificați că Tip A/B este ales corect.";
    }
    return paid;
  }

  if (/acest produs nu este disponibil/i.test(detail)) {
    return "Combinația tip PAD / produs nu este acceptată. Verificați Tip A (bloc) sau Tip B (casă) și încercați din nou.";
  }

  return detail.replace(/^INS-9999\s*\|\s*/i, "");
}

export function presentPadOfferErrorWithContext(
  rawMessage: string | undefined,
  context: { padPropertyType: string; productId: number }
): string {
  const base = presentPadOfferError(rawMessage);
  return `${base} (Tip ${context.padPropertyType}, produs ${context.productId})`;
}
