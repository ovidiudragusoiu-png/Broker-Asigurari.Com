"use client";

import { useState, useRef, useCallback } from "react";
import { btn } from "@/lib/ui/tokens";

interface TermsModalProps {
  isOpen: boolean;
  onAgree: () => void;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onAgree, onClose }: TermsModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Consider "scrolled to bottom" when within 30px of end
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 30) {
      setScrolledToBottom(true);
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="border-b px-6 py-4 text-center">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Termeni și condiții</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              {"\u2715"}
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Vă rugăm să derulați textul până la capăt.
            <br />
            Bifați acordul și butonul de confirmare se va activa.
          </p>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-4 text-sm text-gray-700"
        >
          <div className="space-y-4">
            <p className="text-center font-bold text-gray-900">
              Termeni și Condiții pentru Încheierea Poliței RCA prin www.broker-asigurari.com
            </p>

            <h3 className="font-bold text-gray-900">1. Prestarea Serviciilor</h3>
            <p>
              Serviciile de intermediere în asigurări sunt furnizate de S.C. FLETHO LLC S.R.L.,
              nr. înregistrare J29/1683/2017, C.U.I. 37880338, e-mail: bucuresti@broker-asigurari.com,
              societate înregistrată în Registrul Intermediarilor Secundari și autorizată de
              Autoritatea de Supraveghere Financiară (A.S.F.) sub codul RAJ 506943, în parteneriat
              cu S.C. MaxyGo Broker de Asigurare S.R.L.
            </p>
            <p>
              S.C. FLETHO LLC S.R.L. acționează exclusiv în calitate de intermediar secundar, în
              numele și interesul Clientului, nu al asigurătorului. Remunerația intermediarilor este
              constituită din comision inclus în prima de asigurare brută, fără costuri suplimentare
              pentru Client. Verificarea autorizării poate fi efectuată pe site-ul oficial al A.S.F.:
              www.asfromania.ro/registre.
            </p>

            <p className="font-bold text-gray-900">Identitatea Intermediarului Principal</p>
            <p>
              S.C. MaxyGo Broker de Asigurare S.R.L., cu sediul social în Municipiul Ploiești,
              Str. Alba Iulia nr. 40A, Județul Prahova, înregistrată la Registrul Comerțului
              sub nr. J29/1459/2003, C.U.I. 15710286, capital social subscris și vărsat: 150.000 lei,
              înregistrată în Registrul Intermediarilor Principali al A.S.F. cu codul RBK-179,
              autorizată conform Legii nr. 236/2018 privind distribuția de asigurări.
            </p>
            <p>
              Date de contact: Pagina web: www.maxygo.ro | E-mail: office@maxygo.ro |
              Telefon fix: 0244.567.055 | Fax: 0244.567.964 | Telefon mobil: 0720.990.509
            </p>

            <h3 className="font-bold text-gray-900">2. Definiții</h3>
            <p>În sensul prezentului document, următorii termeni au semnificațiile de mai jos:</p>
            <p>
              <strong>Asigurat</strong> &ndash; persoana fizică sau juridică ale cărei bunuri ori a
              cărei persoană sunt protejate în temeiul unui Contract de Asigurare;
            </p>
            <p>
              <strong>Asigurător</strong> &ndash; persoana juridică autorizată în condițiile Legii
              nr. 237/2015 să exercite activități de asigurare pe teritoriul României sau în afara acestuia;
            </p>
            <p>
              <strong>Calcul</strong> &ndash; determinarea valorii ofertelor de asigurare pe baza
              datelor furnizate de Cumpărător/Utilizator prin intermediul Site-ului;
            </p>
            <p>
              <strong>Comandă</strong> &ndash; document electronic ce constituie mijlocul de comunicare
              între Vânzător și Cumpărător, prin care Cumpărătorul transmite intenția sa fermă de a
              achiziționa o poliță RCA;
            </p>
            <p>
              <strong>Contract</strong> &ndash; contractul la distanță încheiat între Vânzător și
              Cumpărător, în absența prezenței fizice simultane a acestora, în conformitate cu
              legislația aplicabilă;
            </p>
            <p>
              <strong>Contract de Asigurare</strong> &ndash; actul juridic în baza căruia Asigurătorul
              se obligă să presteze serviciile stabilite la apariția evenimentului asigurat, iar
              Asiguratul se obligă să achite prima de asigurare la termenele convenite;
            </p>
            <p>
              <strong>Distribuitor de asigurări</strong> &ndash; orice persoană care desfășoară
              activități de distribuție a asigurărilor în sensul art. 2 din Legea nr. 236/2018;
            </p>
            <p>
              <strong>IPID</strong> &ndash; Documentul de Informare privind Produsul de Asigurare,
              document standardizat pus la dispoziția Clientului înainte de încheierea contractului,
              conform art. 14 din Legea nr. 236/2018;
            </p>
            <p>
              <strong>Produs RCA</strong> &ndash; asigurarea obligatorie de răspundere civilă auto,
              reglementată prin Legea nr. 132/2017;
            </p>
            <p>
              <strong>Prima de asigurare brută</strong> &ndash; suma totală datorată de Asigurat,
              incluzând taxele, contribuțiile obligatorii și comisioanele de intermediere.
            </p>

            <h3 className="font-bold text-gray-900">3. Mandatul de brokeraj</h3>
            <p>
              Prin acceptarea prezentului document, Clientul imputerniceste S.C. MaxyGo Broker de
              Asigurare S.R.L., prin intermediarul secundar S.C. FLETHO LLC S.R.L. (cod A.S.F.
              RAJ 506943), sa actioneze in numele si interesul sau, dupa cum urmeaza:
            </p>
            <p>
              <strong>3.1</strong> Compania de brokeraj este imputernicita sa negocieze cu societatile
              de asigurare oferte adaptate nevoilor Clientului, sa gestioneze contractele de asigurare
              incheiate si sa asiste Clientul in solutionarea solicitarilor de dauna, pana la plata
              finala a despagubirilor cuvenite.
            </p>
            <p>
              <strong>3.2</strong> Clientul isi rezerva dreptul de a decide cu privire la societatile
              de asigurare cu care Compania de brokeraj va purta negocieri, precum si dreptul de a
              solicita orice informatii relevante referitoare la conditiile contractului de asigurare,
              inclusiv cu privire la riscurile acoperite, modalitatea si termenele de plata.
            </p>
            <p>
              <strong>3.3</strong> Clientul are dreptul sa solicite Companiei de brokeraj informari
              cu privire la derularea contractelor de asigurare in vigoare.
            </p>
            <p>
              <strong>3.4</strong> Clientul are dreptul sa solicite Companiei de brokeraj asistenta
              in vederea obtinerii despagubirilor la aparitia unui risc asigurat.
            </p>
            <p>
              <strong>3.5</strong> Clientul se obliga sa comunice Companiei de brokeraj orice
              modificare referitoare la: datele de contact declarate; valorile bunurilor asigurate;
              bunurile sau riscurile care constituie obiectul contractului de asigurare; instrainarea,
              schimbarea destinatiei sau modificarea riscurilor aferente bunurilor asigurate.
            </p>
            <p>
              <strong>3.6</strong> Evaluarea nevoilor Clientului &mdash; Inainte de incheierea
              contractului de asigurare, Compania de brokeraj are obligatia, conform art. 20 din
              Legea nr. 236/2018, de a preciza cerintele si necesitatile Clientului pe baza
              informatiilor furnizate de acesta, oferind consiliere obiectiva si motivand in scris
              recomandarea facuta, astfel incat produsul propus sa corespunda profilului si nevoilor
              reale ale Clientului.
            </p>

            <h3 className="font-bold text-gray-900">4. Informații precontractuale și încheierea contractului</h3>
            <p>
              Conform art. 14 din Legea nr. 236/2018 si Normei A.S.F. nr. 19/2018, inainte de
              finalizarea comenzii, Clientului i se pune la dispozitie:
            </p>
            <p>
              Documentul de informare privind produsul de asigurare (IPID), in format standardizat,
              continand descrierea produsului RCA, riscurile acoperite, excluderile aplicabile,
              durata contractului si modalitatea de plata a despagubirilor;
            </p>
            <p>
              Conditiile generale ale asiguratorului ales, disponibile la cerere.
            </p>
            <p>
              Clientul confirma ca a primit, citit si inteles IPID-ul aferent produsului RCA ales
              inainte de transmiterea comenzii.
            </p>
            <p>
              Politele RCA sunt emise de S.C. FLETHO LLC S.R.L., in parteneriat cu S.C. MaxyGo
              Broker de Asigurare S.R.L., in numele asiguratorilor parteneri, in baza: (a) prezentului
              document; (b) cererii de oferta transmise de Cumparator; (c) ofertelor afisate pe Site;
              (d) comenzii transmise de Utilizator/Cumparator.
            </p>
            <p>
              Inainte de finalizarea comenzii, Cumparatorul declara in mod expres ca:
            </p>
            <p>
              (a) a implinit varsta de 18 ani;<br />
              (b) a citit, inteles si acceptat in integralitate prevederile prezentului document si
              IPID-ul aferent;<br />
              (c) datele completate pe Site sunt corecte si conforme cu realitatea;<br />
              (d) a inteles si acceptat termenii si conditiile contractului de asigurare, inclusiv
              drepturile si obligatiile ce ii revin;<br />
              (e) isi exprima acordul pentru prelucrarea datelor cu caracter personal in scopul
              executarii contractului si, separat si optional, in scop de informare comerciala si
              publicitate.
            </p>
            <p>
              Vanzatorul isi rezerva dreptul de a anula o Comanda, fara obligatii ulterioare, in
              cazul: (a) neacceptarii tranzactiei de catre banca emitenta; (b) invalidarii tranzactiei
              de catre procesatorul de plati agreat; (c) furnizarii de date incomplete sau incorecte
              de catre Client; (d) altor situatii expres mentionate in prezentul document.
            </p>

            <h3 className="font-bold text-gray-900">5. Modalitatea de plată și livrarea poliței</h3>
            <p>
              <strong>5.1</strong> Clientul are obligatia de a achita integral prima de asigurare
              bruta aferenta contractului RCA, inclusiv orice diferenta de prima rezultata in urma
              corectarii datelor. Plata se efectueaza exclusiv online, prin card bancar, intr-un
              mediu securizat conform standardului PCI-DSS si cu autentificare puternica a clientului
              (3D Secure), in conformitate cu prevederile Directivei PSD2 (UE) 2015/2366.
            </p>
            <p>
              <strong>5.2</strong> Dupa emitere, contractul de asigurare RCA va fi transmis automat
              la adresa de e-mail indicata in formularul de comanda. Furnizarea unei adrese de e-mail
              valide constituie o conditie obligatorie pentru finalizarea procesului de emitere.
            </p>
            <p>
              <strong>5.3</strong> Contractul de asigurare RCA, insotit de formularul de constat
              amiabil, va fi livrat la adresa inscrisa in Cartea de Identitate a Vehiculului sau la
              orice alta adresa indicata in formularul de Comanda. Livrarea se efectueaza gratuit,
              pe cheltuiala Vanzatorului.
            </p>

            <h3 className="font-bold text-gray-900">6. Dreptul la retragere</h3>
            <p>
              <strong>6.1</strong> In conformitate cu art. 49 alin. (3) lit. b) din O.U.G.
              nr. 50/2010, coroborat cu art. 9 alin. (2) lit. a) din O.G. nr. 85/2004, dreptul de
              denuntare unilaterala de 14 zile specific contractelor la distanta nu se aplica
              contractelor de asigurare RCA. Restituirea partiala a primei de asigurare este posibila
              exclusiv in cazul radierii sau instrainarii autovehiculului, cu conditia ca nu au fost
              platite si nu se datoreaza despagubiri.
            </p>
            <p>
              <strong>6.2</strong> Asiguratul care a achitat integral sau in rate prima de asigurare
              este indreptatit sa recupereze contravaloarea proportionala cu perioada neexpirata a
              contractului RCA, in conditiile art. 13 din Legea nr. 132/2017, cu conditia ca nu au
              fost platite si nu se datoreaza despagubiri pentru evenimente produse in perioada de
              valabilitate. In situatia in care asiguratorul este ulterior obligat la plata unor
              despagubiri, acesta este indreptatit sa recupereze de la asigurat prima restituita,
              conform dispozitiilor legale aplicabile.
            </p>

            <h3 className="font-bold text-gray-900">7. Corectarea datelor și modificarea poliței</h3>
            <p>
              In cazul in care datele inscrise in polita de asigurare nu corespund celor din
              documentele oficiale (Talon/CIV, Carte de Identitate, acte de proprietate),
              Cumparatorul are obligatia de a notifica de urgenta Vanzatorul la
              bucuresti@broker-asigurari.com. Erorile materiale constatate vor fi remediate prin
              emiterea de acte aditionale sau suplimente la contractul RCA, de catre asiguratorul
              competent, fara costuri suplimentare pentru Client, daca eroarea nu ii este imputabila
              acestuia.
            </p>

            <h3 className="font-bold text-gray-900">8. Protecția datelor cu caracter personal</h3>
            <p>
              In conformitate cu Regulamentul (UE) 2016/679 (GDPR) si Norma A.S.F. nr. 11/2018:
            </p>
            <p>
              <strong>8.1</strong> Operatorul de date este S.C. MaxyGo Broker de Asigurare S.R.L.,
              prin intermediarul S.C. FLETHO LLC S.R.L., contact: bucuresti@broker-asigurari.com.
            </p>
            <p>
              <strong>8.2</strong> Temeiul juridic al prelucrarii:
            </p>
            <p>
              Executarea contractului &mdash; pentru emiterea si gestionarea politei RCA;<br />
              Obligatie legala &mdash; pentru raportarile impuse de A.S.F. si legislatia fiscala;<br />
              Consimtamant &mdash; pentru comunicari comerciale si publicitate (optional, retractabil oricand).
            </p>
            <p>
              <strong>8.3</strong> Clientul beneficiaza de dreptul de acces, rectificare, stergere,
              restrictionare, portabilitate si opozitie fata de prelucrare, exercitabile prin cerere
              scrisa transmisa la adresa Operatorului.
            </p>
            <p>
              <strong>8.4</strong> Clientul are dreptul de a depune plangere la ANSPDCP, B-dul G-ral.
              Gheorghe Magheru nr. 28-30, Bucuresti, www.dataprotection.ro.
            </p>

            <h3 className="font-bold text-gray-900">9. Acordul de comunicare</h3>
            <p>
              <strong>9.1</strong> In scopul informarii Clientului cu privire la derularea
              contractelor de asigurare &mdash; inclusiv scadente de plata, oferte, date de incetare
              si/sau reinnoire, alerte privind expirarea ITP si/sau Rovinieta &mdash; canalul de
              comunicare agreat consta in adresa de e-mail si numarul de telefon ale Clientului,
              precum si adresa bucuresti@broker-asigurari.com a Vanzatorului.
            </p>
            <p>
              <strong>9.2</strong> Clientul are dreptul sa se retraga din prezentul acord de
              comunicare in orice moment, prin notificare scrisa, insa nu inainte de incetarea
              relatiei contractuale, respectiv de la data expirarii politei RCA emise online.
              Retragerea acordului de comunicare nu afecteaza legalitatea prelucrarilor efectuate
              anterior retragerii.
            </p>

            <h3 className="font-bold text-gray-900">10. Soluționarea litigiilor</h3>
            <p>
              <strong>10.1</strong> Solutionare amiabila &mdash; In cazul oricarui litigiu, Clientul
              este incurajat sa contacteze in prima instanta Vanzatorul la
              bucuresti@broker-asigurari.com. Vanzatorul se obliga sa raspunda in termen de maximum
              30 de zile calendaristice de la primirea reclamatiei.
            </p>
            <p>
              <strong>10.2</strong> Solutionare alternativa a litigiilor (SAL/ADR) &mdash; Conform
              Legii nr. 151/2015 si Directivei 2013/11/UE, Clientul poate apela la:
            </p>
            <p>
              A.S.F. &mdash; pentru litigii privind intermedierea in asigurari: www.asfromania.ro<br />
              CSALB &mdash; pentru litigii cu componenta financiara: www.csalb.ro<br />
              Platforma europeana ODR &mdash; pentru litigii transfrontaliere: https://ec.europa.eu/consumers/odr
            </p>
            <p>
              <strong>10.3</strong> Solutionare judiciara &mdash; In cazul in care litigiul nu poate
              fi solutionat amiabil sau prin proceduri SAL, competenta apartine instantelor
              judecatoresti romane, conform Codului de Procedura Civila.
            </p>
            <p>
              <strong>10.4</strong> Autoritati de supraveghere competente:
            </p>
            <p>
              A.S.F.: www.asfromania.ro<br />
              ANPC: www.anpc.ro<br />
              ANSPDCP: www.dataprotection.ro
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4">
          <label className="flex items-center gap-3 text-sm">
            <span className="text-emerald-600 font-bold">&gt;&gt;</span>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={!scrolledToBottom}
              className="h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-40"
            />
            <span className="text-gray-700 font-medium">
              Sunt de acord cu emiterea poliței RCA în aceste condiții.
            </span>
          </label>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={onAgree}
              disabled={!agreed}
              className={btn.primary}
            >
              De acord
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
