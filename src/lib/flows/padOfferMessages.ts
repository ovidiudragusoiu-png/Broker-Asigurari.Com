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

  if (/^INS-9999\s*\|\s*Acest produs nu este disponibil$/i.test(detail)) {
    return "Produsul PAD nu este disponibil pentru contul broker. Reîncărcați pagina (Ctrl+F5) și încercați din nou; dacă persistă, contactați-ne.";
  }

  if (/nu este disponibil/i.test(detail)) {
    return detail.replace(/^INS-9999\s*\|\s*/i, "");
  }

  return detail.replace(/^INS-9999\s*\|\s*/i, "");
}
