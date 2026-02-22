"use client";

import { useState } from "react";

interface TermsModalProps {
  isOpen: boolean;
  onAgree: () => void;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onAgree, onClose }: TermsModalProps) {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Termeni si Conditii</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            {"\u2715"}
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 text-sm text-gray-700">
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900">1. OBIECTUL CONTRACTULUI</h3>
            <p>
              Prin prezentul contract, Asiguratorul se obliga sa despagubeasca partea prejudiciata
              pentru prejudiciile produse prin accidente de vehicule, conform Legii nr. 132/2017
              privind asigurarea obligatorie de raspundere civila auto pentru prejudicii produse
              tertilor prin accidente de vehicule si tramvaie.
            </p>

            <h3 className="font-bold text-gray-900">2. TERITORIUL DE ACOPERIRE</h3>
            <p>
              Asigurarea RCA acopera evenimentele produse pe teritoriul Romaniei, precum si pe
              teritoriul statelor membre ale Uniunii Europene si ale statelor apartinand Spatiului
              Economic European, conform prevederilor legale in vigoare. Pentru deplasarile in
              afara acestor teritorii, se recomanda verificarea necesitatii Cartii Verzi.
            </p>

            <h3 className="font-bold text-gray-900">3. DURATA ASIGURARII</h3>
            <p>
              Contractul de asigurare RCA intra in vigoare la data si ora mentionate in polita
              de asigurare si este valabil pe perioada selectata de asigurat (1-12 luni).
              Contractul inceteaza la expirarea perioadei de asigurare mentionate in polita.
            </p>

            <h3 className="font-bold text-gray-900">4. PRIMA DE ASIGURARE</h3>
            <p>
              Prima de asigurare se calculeaza in functie de criteriile stabilite de asigurator,
              incluzand dar fara a se limita la: tipul vehiculului, capacitatea cilindrica,
              puterea motorului, categoria de utilizare, clasa bonus-malus, varsta si experienta
              conducatorului auto. Prima se achita integral la momentul incheierii contractului.
            </p>

            <h3 className="font-bold text-gray-900">5. OBLIGATIILE ASIGURATULUI</h3>
            <p>
              Asiguratul are obligatia de a declara cu exactitate toate informatiile solicitate
              la incheierea contractului, de a instiinta asiguratorul in termen de 48 de ore
              de la producerea unui eveniment asigurat, de a nu modifica starea vehiculului
              sau a locului accidentului pana la efectuarea constatarilor necesare si de a
              prezenta toate documentele necesare solutionarii dosarului de dauna.
            </p>

            <h3 className="font-bold text-gray-900">6. OBLIGATIILE ASIGURATORULUI</h3>
            <p>
              Asiguratorul are obligatia de a emite polita de asigurare in cel mult 24 de ore
              de la achitarea primei de asigurare, de a despagubi partea prejudiciata in conformitate
              cu prevederile legale si contractuale, in termenele stabilite prin lege, si de a
              pune la dispozitia asiguratului toate informatiile necesare privind derularea
              contractului de asigurare.
            </p>

            <h3 className="font-bold text-gray-900">7. EXCLUDERI</h3>
            <p>
              Nu sunt acoperite prin asigurarea RCA: prejudiciile suferite de conducatorul
              vehiculului responsabil de producerea accidentului, prejudiciile produse bunurilor
              apartinand asiguratului sau conducatorului vehiculului, prejudiciile produse cu
              intentie, prejudiciile produse in timpul participarii la curse sau competitii
              sportive neautorizate, si prejudiciile produse de vehicule furate sau utilizate
              fara consimtamantul asiguratului.
            </p>

            <h3 className="font-bold text-gray-900">8. DECONTAREA DIRECTA</h3>
            <p>
              In cazul in care polita include optiunea de decontare directa, asiguratul poate
              solicita despagubirea direct de la propriul asigurator, fara a fi necesara
              interactiunea cu asiguratorul partii responsabile. Aceasta optiune este disponibila
              doar pentru accidentele produse pe teritoriul Romaniei si in care sunt implicate
              doar doua vehicule.
            </p>

            <h3 className="font-bold text-gray-900">9. PRELUCRAREA DATELOR PERSONALE</h3>
            <p>
              Datele personale colectate in vederea incheierii contractului de asigurare sunt
              prelucrate in conformitate cu Regulamentul (UE) 2016/679 (GDPR). Datele sunt
              utilizate exclusiv in scopul ofertarii, emiterii si administrarii politei de
              asigurare. Asiguratul are dreptul de acces, rectificare, stergere si portabilitate
              a datelor, conform legislatiei aplicabile.
            </p>

            <h3 className="font-bold text-gray-900">10. DISPOZITII FINALE</h3>
            <p>
              Prezentul contract se supune legislatiei romane in vigoare. Orice litigiu
              decurgand din sau in legatura cu prezentul contract va fi solutionat pe cale
              amiabila sau, in caz contrar, de catre instantele judecatoresti competente
              din Romania. Prin achizitionarea politei, asiguratul confirma ca a citit,
              a inteles si este de acord cu toti termenii si conditiile prezentului contract.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300"
            />
            <span className="text-gray-700">
              Sunt de acord cu emiterea politei RCA in aceste conditii
            </span>
          </label>

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-100 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Renunta
            </button>
            <button
              type="button"
              onClick={onAgree}
              disabled={!agreed}
              className="rounded-lg bg-rose-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-rose-600 disabled:opacity-40"
            >
              De acord
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
