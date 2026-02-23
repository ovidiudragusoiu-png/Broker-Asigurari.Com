export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  gradient: string;
  content: string; // markdown-like HTML paragraphs
}

export const ARTICLES: Article[] = [
  {
    slug: "ghid-complet-rca-2025",
    title: "Ghid complet RCA 2025: Tot ce trebuie să știi",
    excerpt:
      "Află cum funcționează asigurarea RCA, ce acoperă, cum să compari prețurile și cum să alegi cea mai bună ofertă pentru mașina ta.",
    category: "RCA",
    date: "15 Feb 2025",
    readTime: "5 min",
    gradient: "from-sky-500 to-sky-700",
    content: `
      <p>Asigurarea RCA (Răspundere Civilă Auto) este obligatorie pentru orice vehicul înmatriculat în România. Aceasta acoperă daunele pe care le poți cauza altor participanți la trafic — atât materiale, cât și corporale.</p>

      <h2>Ce acoperă polița RCA?</h2>
      <p>Polița RCA acoperă prejudiciile produse terților în urma unui accident rutier. Aceasta include:</p>
      <ul>
        <li><strong>Daune materiale</strong> — repararea sau înlocuirea vehiculelor și bunurilor deteriorate</li>
        <li><strong>Vătămări corporale</strong> — cheltuieli medicale, indemnizații pentru incapacitate de muncă</li>
        <li><strong>Deces</strong> — despăgubiri pentru urmașii victimelor</li>
      </ul>
      <p>Limitele minime de despăgubire sunt stabilite prin lege și sunt actualizate periodic. În 2025, limitele sunt de 1.300.000 EUR pentru daune materiale și 6.450.000 EUR pentru vătămări corporale per eveniment.</p>

      <h2>Cum se calculează prețul RCA?</h2>
      <p>Prețul poliței RCA depinde de mai mulți factori:</p>
      <ul>
        <li><strong>Clasa Bonus-Malus</strong> — istoricul tău de daune influențează direct prețul</li>
        <li><strong>Tipul vehiculului</strong> — capacitate cilindrică, putere, categorie</li>
        <li><strong>Vârsta conducătorului</strong> — șoferii tineri plătesc de regulă mai mult</li>
        <li><strong>Zona de înmatriculare</strong> — județul în care este înmatriculat vehiculul</li>
        <li><strong>Perioada de asigurare</strong> — 1, 6 sau 12 luni</li>
      </ul>

      <h2>Cum compari ofertele RCA?</h2>
      <p>Cel mai eficient mod de a obține cel mai bun preț este să folosești un comparator online. Pe platforma noastră, poți compara instantaneu ofertele de la toți asigurătorii din piață, introducând doar câteva date despre vehicul și proprietar.</p>
      <p>Sfatul nostru: alege întotdeauna o poliță pe 12 luni — este mai convenabilă decât varianta semestrială sau trimestrială, și nu riști să rămâi neacoperit.</p>

      <h2>Ce se întâmplă dacă circuli fără RCA?</h2>
      <p>Circulația fără RCA valabil este contravenție și se sancționează cu amendă de la 1.000 la 2.000 lei, plus reținerea certificatului de înmatriculare până la prezentarea unei polițe valabile. Mai grav, în cazul unui accident, vei fi nevoit să suporți personal toate costurile daunelor cauzate.</p>
    `,
  },
  {
    slug: "casco-vs-rca-diferente",
    title: "CASCO vs RCA: Care sunt diferențele și de ce ai nevoie de ambele?",
    excerpt:
      "Înțelege diferențele fundamentale dintre asigurarea CASCO și RCA, și descoperă de ce o asigurare completă îți protejează investiția.",
    category: "CASCO",
    date: "8 Feb 2025",
    readTime: "4 min",
    gradient: "from-teal-500 to-teal-700",
    content: `
      <p>Mulți șoferi confundă asigurarea RCA cu CASCO sau consideră că una o înlocuiește pe cealaltă. În realitate, cele două sunt complementare și servesc scopuri diferite.</p>

      <h2>RCA — protecție pentru ceilalți</h2>
      <p>Asigurarea RCA este <strong>obligatorie</strong> și acoperă daunele pe care le cauzezi altor participanți la trafic. Dacă ești vinovat de un accident, RCA-ul tău plătește reparațiile mașinii celuilalt, cheltuielile medicale ale victimelor și alte prejudicii.</p>
      <p>Important: RCA-ul <strong>nu</strong> acoperă daunele propriului tău vehicul.</p>

      <h2>CASCO — protecție pentru tine</h2>
      <p>Asigurarea CASCO este <strong>facultativă</strong> și acoperă daunele propriului vehicul, indiferent de cine este vinovat. Aceasta include:</p>
      <ul>
        <li>Accidente rutiere (chiar dacă ești vinovat)</li>
        <li>Furt total sau parțial</li>
        <li>Fenomene naturale (grindină, inundații, furtuni)</li>
        <li>Vandalism</li>
        <li>Incendiu sau explozie</li>
        <li>Ciocnire cu animale</li>
      </ul>

      <h2>De ce ai nevoie de ambele?</h2>
      <p>Dacă ai un vehicul nou sau de valoare mare, combinația RCA + CASCO îți oferă protecție completă. RCA te protejează legal și financiar față de terți, iar CASCO îți protejează propria investiție.</p>
      <p>Sfat: pentru vehiculele mai vechi de 10 ani, evaluează dacă prima CASCO merită comparativ cu valoarea mașinii. Pentru vehicule noi sau în leasing, CASCO este practic indispensabil.</p>
    `,
  },
  {
    slug: "asigurare-calatorie-vacanta",
    title: "Asigurare de călătorie: De ce nu ar trebui să pleci fără ea",
    excerpt:
      "Sfaturi practice pentru alegerea asigurării de călătorie potrivite, ce acoperă și cum te protejează în străinătate.",
    category: "Travel",
    date: "1 Feb 2025",
    readTime: "6 min",
    gradient: "from-indigo-500 to-indigo-700",
    content: `
      <p>Fie că pleci într-o vacanță în Grecia sau într-o călătorie de afaceri în SUA, o asigurare de călătorie îți poate salva vacanța — și portofelul. Cheltuielile medicale în străinătate pot ajunge la sume astronomice, iar o poliță de călătorie te protejează de aceste costuri neprevăzute.</p>

      <h2>Ce acoperă asigurarea de călătorie?</h2>
      <ul>
        <li><strong>Cheltuieli medicale</strong> — consultații, spitalizare, medicamente, intervenții chirurgicale</li>
        <li><strong>Repatriere medicală</strong> — transport medical în țara de origine</li>
        <li><strong>Anularea călătoriei</strong> — rambursarea costurilor dacă nu mai poți pleca</li>
        <li><strong>Pierderea bagajelor</strong> — despăgubire pentru bagajele pierdute sau întârziate</li>
        <li><strong>Răspundere civilă</strong> — dacă produci daune accidentale în străinătate</li>
        <li><strong>Asistență juridică</strong> — suport legal în cazul unor probleme în străinătate</li>
      </ul>

      <h2>Cum alegi polița potrivită?</h2>
      <p>Ține cont de următoarele criterii:</p>
      <ul>
        <li><strong>Destinația</strong> — tarifele diferă pentru Europa, SUA, Asia etc.</li>
        <li><strong>Durata</strong> — polițe pe călătorie sau anuale pentru călători frecvenți</li>
        <li><strong>Suma asigurată</strong> — minim 30.000 EUR pentru Europa, 100.000+ EUR pentru SUA</li>
        <li><strong>Sporturi extreme</strong> — dacă practici activități riscante, asigură-te că sunt acoperite</li>
        <li><strong>Condiții preexistente</strong> — verifică dacă bolile cronice sunt acoperite</li>
      </ul>

      <h2>Cardul European de Sănătate nu este suficient</h2>
      <p>Cardul European acoperă doar tratamentul medical de urgență în UE, la aceleași condiții ca cetățenii locali. Nu acoperă repatrierea, anularea călătoriei sau pierderea bagajelor. O asigurare de călătorie oferă o protecție mult mai completă.</p>
    `,
  },
  {
    slug: "economiseste-la-asigurari",
    title: "5 moduri inteligente de a economisi la asigurări",
    excerpt:
      "Descoperă strategii dovedite pentru a obține cele mai bune prețuri la asigurări fără a compromite calitatea acoperirii.",
    category: "Sfaturi",
    date: "25 Ian 2025",
    readTime: "3 min",
    gradient: "from-amber-500 to-orange-600",
    content: `
      <p>Asigurările sunt o cheltuială necesară, dar asta nu înseamnă că trebuie să plătești mai mult decât este necesar. Iată 5 strategii inteligente pentru a economisi.</p>

      <h2>1. Compară mereu ofertele</h2>
      <p>Nu accepta prima ofertă primită. Prețurile pot varia semnificativ între asigurători pentru exact aceeași acoperire. Folosește un comparator online pentru a vedea toate opțiunile disponibile într-un singur loc.</p>

      <h2>2. Alege perioada optimă de asigurare</h2>
      <p>Polițele anuale sunt aproape întotdeauna mai convenabile decât cele semestriale sau trimestriale. Plata integrală (în loc de rate) poate aduce, de asemenea, o reducere.</p>

      <h2>3. Menține un istoric de conducere curat</h2>
      <p>Clasa Bonus-Malus (B/M) influențează direct prețul RCA-ului. Fiecare an fără daune te avansează către clase superioare cu reduceri de până la 50%. Un accident te poate retrograda considerabil.</p>

      <h2>4. Evaluează corect sumele asigurate</h2>
      <p>Nu subasigura și nu supraasigura. Pentru CASCO, alege o sumă asigurată realistă, apropiată de valoarea de piață a vehiculului. Pentru călătorii, adaptează suma asigurată la destinație.</p>

      <h2>5. Profită de ofertele speciale</h2>
      <p>Mulți asigurători oferă reduceri sezoniere, pachete bundle (RCA + CASCO) sau prețuri speciale pentru plata online. Urmărește aceste oportunități și acționează la momentul potrivit.</p>
    `,
  },
  {
    slug: "garantii-contractuale-ghid",
    title: "Garanții contractuale: Ghid pentru companii",
    excerpt:
      "Tot ce trebuie să știi despre garanțiile contractuale — tipuri, documente necesare și cum să obții cea mai bună ofertă pentru firma ta.",
    category: "Garanții",
    date: "18 Ian 2025",
    readTime: "7 min",
    gradient: "from-emerald-500 to-emerald-700",
    content: `
      <p>Garanțiile contractuale sunt instrumente financiare esențiale pentru companiile care participă la licitații publice sau execută contracte de valoare mare. Acestea oferă beneficiarului siguranța că obligațiile contractuale vor fi îndeplinite.</p>

      <h2>Tipuri de garanții contractuale</h2>
      <ul>
        <li><strong>Garanție de participare la licitație</strong> — demonstrează seriozitatea ofertantului în procesul de licitație</li>
        <li><strong>Garanție de bună execuție</strong> — asigură îndeplinirea obligațiilor contractuale</li>
        <li><strong>Garanție de retur avans</strong> — protejează avansul plătit de beneficiar</li>
        <li><strong>Garanție post-execuție</strong> — acoperă perioada de garanție după finalizarea lucrărilor</li>
        <li><strong>Garanție de bună plată</strong> — asigură plata la termen a obligațiilor financiare</li>
      </ul>

      <h2>De ce să alegi asigurarea în loc de scrisoarea bancară?</h2>
      <p>Garanțiile emise de companii de asigurări prezintă avantaje semnificative față de scrisorile de garanție bancară:</p>
      <ul>
        <li>Nu blochează liniile de credit bancare</li>
        <li>Procesul de emitere este mai rapid</li>
        <li>Costurile sunt de regulă mai mici</li>
        <li>Nu necesită garanții colaterale</li>
      </ul>

      <h2>Ce documente sunt necesare?</h2>
      <p>Pentru obținerea unei garanții contractuale, veți avea nevoie de: situațiile financiare ale companiei (ultimii 2-3 ani), contractul sau documentația de licitație, certificatul de înregistrare la Registrul Comerțului și certificatul de atestare fiscală.</p>

      <h2>Cum obții cea mai bună ofertă?</h2>
      <p>Completează formularul nostru de cerere de ofertă cu datele companiei și tipul de garanție solicitat. Vom compara ofertele de la toți asigurătorii parteneri și îți vom prezenta cele mai competitive opțiuni.</p>
    `,
  },
  {
    slug: "malpraxis-medici-ghid",
    title: "Asigurarea de malpraxis: Ghid esențial pentru medici",
    excerpt:
      "Aflați de ce asigurarea de malpraxis este obligatorie, cum funcționează și cum să alegeți polița potrivită pentru specialitatea dumneavoastră.",
    category: "Malpraxis",
    date: "10 Ian 2025",
    readTime: "5 min",
    gradient: "from-rose-500 to-rose-700",
    content: `
      <p>Asigurarea de malpraxis medical este obligatorie în România pentru toți profesioniștii din domeniul sănătății. Aceasta vă protejează în cazul în care un pacient formulează o plângere legată de actul medical.</p>

      <h2>Cine are nevoie de asigurare de malpraxis?</h2>
      <ul>
        <li>Medici (toate specialitățile)</li>
        <li>Medici dentiști</li>
        <li>Farmaciști</li>
        <li>Moașe și asistenți medicali</li>
        <li>Alte categorii de personal medical</li>
      </ul>

      <h2>Ce acoperă polița de malpraxis?</h2>
      <p>Asigurarea de malpraxis acoperă răspunderea civilă profesională pentru prejudiciile cauzate pacienților prin acte de malpraxis medical, inclusiv:</p>
      <ul>
        <li>Erori de diagnostic</li>
        <li>Erori de tratament sau medicație</li>
        <li>Infecții nosocomiale</li>
        <li>Neglijență profesională</li>
        <li>Cheltuieli de judecată și asistență juridică</li>
      </ul>

      <h2>Cum se stabilește prima de asigurare?</h2>
      <p>Prețul depinde de specialitatea medicală (chirurgia și obstetrică au prime mai mari), limita de despăgubire aleasă, experiența profesională și istoricul de daune anterioare.</p>

      <h2>Sfaturi pentru alegerea poliței</h2>
      <p>Alegeți o limită de despăgubire adecvată specialității dumneavoastră. Verificați dacă polița acoperă și daunele morale, nu doar cele materiale. Optați pentru o perioadă retroactivă cât mai lungă pentru a fi acoperiți și pentru actele medicale din trecut.</p>
    `,
  },
  {
    slug: "asigurare-locuinta-obligatorie-vs-facultativa",
    title: "Asigurarea locuinței: Obligatorie (PAD) vs Facultativă",
    excerpt:
      "Înțelege diferențele dintre asigurarea obligatorie PAD și cea facultativă, și află de ce ai nevoie de ambele pentru protecție completă.",
    category: "Locuință",
    date: "5 Ian 2025",
    readTime: "5 min",
    gradient: "from-violet-500 to-violet-700",
    content: `
      <p>Protejarea locuinței tale ar trebui să fie o prioritate. În România, există două tipuri principale de asigurări pentru locuință: obligatoria (PAD) și facultativă. Fiecare oferă un nivel diferit de protecție.</p>

      <h2>Asigurarea obligatorie PAD</h2>
      <p>Polița PAD (Pool-ul de Asigurare împotriva Dezastrelor Naturale) este obligatorie pentru toate locuințele din România și acoperă trei riscuri naturale:</p>
      <ul>
        <li><strong>Cutremure</strong> — despăgubire până la 20.000 EUR</li>
        <li><strong>Inundații</strong> — despăgubire până la 20.000 EUR</li>
        <li><strong>Alunecări de teren</strong> — despăgubire până la 20.000 EUR</li>
      </ul>
      <p>Prima anuală este fixă: 20 EUR pentru locuințe tip A (structură rezistentă) și 10 EUR pentru locuințe tip B.</p>

      <h2>Asigurarea facultativă</h2>
      <p>Asigurarea facultativă de locuință oferă protecție extinsă pentru:</p>
      <ul>
        <li>Incendiu, explozie, trăsnet</li>
        <li>Furtună, grindină, ploaie torențială</li>
        <li>Furt prin efracție sau tâlhărie</li>
        <li>Inundații din cauze accidentale (țevi sparte)</li>
        <li>Răspundere civilă față de vecini</li>
        <li>Bunurile din locuință (mobilă, electronice, bijuterii)</li>
      </ul>

      <h2>De ce ai nevoie de ambele?</h2>
      <p>PAD-ul acoperă doar dezastrele naturale cu sume limitate. Asigurarea facultativă completează protecția cu acoperire pentru incendiu, furt, avarii accidentale și bunuri. Împreună, oferă o protecție completă pentru casa ta.</p>
    `,
  },
  {
    slug: "ce-faci-in-caz-de-accident-auto",
    title: "Ce faci în caz de accident auto: Pașii esențiali",
    excerpt:
      "Ghid pas cu pas despre ce trebuie să faci imediat după un accident rutier — de la asigurarea locului accidentului până la dosarul de daună.",
    category: "RCA",
    date: "28 Dec 2024",
    readTime: "6 min",
    gradient: "from-red-500 to-red-700",
    content: `
      <p>Un accident auto poate fi o experiență stresantă. Știind exact ce pași trebuie să urmezi, poți gestiona situația mai eficient și îți protejezi drepturile.</p>

      <h2>Pasul 1: Asigură locul accidentului</h2>
      <p>Oprește motorul, pornește luminile de avarie și plasează triunghiul reflectorizant la 30-50 m în spate. Dacă sunt răniți, sună imediat la 112.</p>

      <h2>Pasul 2: Documentează accidentul</h2>
      <p>Fotografiază pozițiile vehiculelor, daunele vizibile, plăcuțele de înmatriculare și condițiile de drum. Notează numele, datele de contact și numărul poliței RCA ale celorlalți implicați.</p>

      <h2>Pasul 3: Completează constatarea amiabilă</h2>
      <p>Dacă nu sunt răniți și ambii șoferi sunt de acord asupra circumstanțelor, completați formularul de constatare amiabilă. Acesta accelerează semnificativ procesul de despăgubire.</p>

      <h2>Pasul 4: Contactează asigurătorul</h2>
      <p>Anunță asigurătorul tău RCA în maxim 48 de ore. Dacă nu ești vinovat, contactează direct asigurătorul celui vinovat pentru deschiderea dosarului de daună.</p>

      <h2>Pasul 5: Deschide dosarul de daună</h2>
      <p>Pregătește: constatarea amiabilă sau procesul verbal al poliției, fotografiile, copia actului de identitate, copia talonului auto și copia poliței RCA. Asigurătorul are 30 de zile pentru daune materiale și 90 de zile pentru vătămări corporale.</p>

      <h2>Sfaturi importante</h2>
      <ul>
        <li>Nu recunoaște niciodată vina la locul accidentului</li>
        <li>Nu muta vehiculele înainte de a documenta totul</li>
        <li>Păstrează toate documentele și chitanțele</li>
        <li>Dacă situația este neclară, solicită prezența Poliției</li>
      </ul>
    `,
  },
  {
    slug: "bonus-malus-cum-functioneaza",
    title: "Sistemul Bonus-Malus: Cum îți afectează prețul RCA",
    excerpt:
      "Descoperă cum funcționează clasele Bonus-Malus, cum te afectează un accident și cum poți obține reduceri maxime la RCA.",
    category: "RCA",
    date: "20 Dec 2024",
    readTime: "4 min",
    gradient: "from-sky-600 to-blue-800",
    content: `
      <p>Sistemul Bonus-Malus (B/M) este mecanismul prin care asigurătorii recompensează șoferii prudenți și penalizează pe cei care cauzează accidente. Înțelegerea acestui sistem te ajută să economisești semnificativ la RCA.</p>

      <h2>Cum funcționează?</h2>
      <p>Există 14 clase Bonus-Malus, de la B1 (cel mai bun) la M8 (cel mai rău). Toți șoferii noi încep la clasa B0 (de bază). La fiecare an fără daune, avansezi o clasă Bonus. La fiecare daună cauzată, retrogradezi cu 2-3 clase.</p>

      <h2>Ce reduceri poți obține?</h2>
      <ul>
        <li><strong>Clasa B1</strong> — reducere de ~50% față de tariful de bază</li>
        <li><strong>Clasele B2-B5</strong> — reduceri de 10-40%</li>
        <li><strong>Clasa B0</strong> — tariful standard, fără reduceri sau penalizări</li>
        <li><strong>Clasele M1-M8</strong> — majorări de 10% până la 300%</li>
      </ul>

      <h2>Cum verifici clasa ta B/M?</h2>
      <p>Poți verifica clasa Bonus-Malus pe site-ul BAAR (Biroul Asigurătorilor de Autovehicule din România) folosind seria și numărul certificatului de înmatriculare.</p>

      <h2>Sfaturi pentru menținerea clasei Bonus</h2>
      <ul>
        <li>Conduci defensiv și respecti regulile de circulație</li>
        <li>Pentru daune minore, evaluează dacă merită să deschizi dosar (retrogradarea poate costa mai mult pe termen lung)</li>
        <li>Transferul clasei B/M se face pe persoană, nu pe vehicul — la schimbarea mașinii, clasa ta se păstrează</li>
      </ul>
    `,
  },
  {
    slug: "asigurare-calatorie-sporturi-extreme",
    title: "Asigurare de călătorie pentru sporturi extreme și aventură",
    excerpt:
      "Practici schi, scufundări sau bungee jumping? Află ce asigurare ai nevoie și la ce să fii atent când alegi polița.",
    category: "Travel",
    date: "12 Dec 2024",
    readTime: "5 min",
    gradient: "from-cyan-500 to-cyan-700",
    content: `
      <p>Dacă ești pasionat de sporturi extreme sau activități de aventură, asigurarea standard de călătorie s-ar putea să nu te acopere. Multe polițe exclud explicit activitățile considerate riscante.</p>

      <h2>Ce sporturi sunt considerate extreme?</h2>
      <p>Activitățile care necesită de obicei asigurare specială includ:</p>
      <ul>
        <li>Schi și snowboard (off-piste)</li>
        <li>Scufundări (peste 10-30m adâncime)</li>
        <li>Alpinism și escaladă</li>
        <li>Bungee jumping și parasailing</li>
        <li>Rafting și caiac pe ape învolburate</li>
        <li>Parapantă și deltaplan</li>
        <li>Motociclism (în unele destinații)</li>
      </ul>

      <h2>La ce să fii atent?</h2>
      <ul>
        <li><strong>Lista de excluderi</strong> — citește cu atenție ce sporturi sunt excluse din polița standard</li>
        <li><strong>Suplimentul pentru sporturi</strong> — multe asigurări oferă un rider (supliment) pentru activități extreme</li>
        <li><strong>Limita de despăgubire</strong> — accidentele sportive pot genera costuri medicale foarte mari</li>
        <li><strong>Evacuare și salvare montană</strong> — verifică dacă include costurile de salvare cu elicopterul</li>
      </ul>

      <h2>Recomandarea noastră</h2>
      <p>Optează pentru o poliță cu acoperire extinsă pentru sporturi, cu o sumă asigurată de minimum 50.000 EUR și care include explicit evacuare montană/maritimă. Diferența de preț este mică, dar protecția suplimentară este enormă.</p>
    `,
  },
  {
    slug: "casco-fransize-explicatie",
    title: "Franșiza CASCO explicată: Cu sau fără franșiză?",
    excerpt:
      "Ce este franșiza la CASCO, cum te afectează și cum alegi între polița cu franșiză și cea fără franșiză.",
    category: "CASCO",
    date: "5 Dec 2024",
    readTime: "4 min",
    gradient: "from-teal-600 to-teal-800",
    content: `
      <p>Franșiza este unul dintre cele mai importante aspecte ale poliței CASCO, dar și unul dintre cele mai puțin înțelese. Alegerea corectă între o poliță cu sau fără franșiză poate face o diferență semnificativă în costul total al asigurării.</p>

      <h2>Ce este franșiza?</h2>
      <p>Franșiza este suma pe care o suporți tu din propriul buzunar în cazul unei daune, înainte ca asigurătorul să înceapă să plătească. De exemplu, dacă ai o franșiză de 500 EUR și o daună de 2.000 EUR, tu plătești 500 EUR, iar asigurătorul plătește 1.500 EUR.</p>

      <h2>Tipuri de franșiză</h2>
      <ul>
        <li><strong>Franșiză fixă (deductibilă)</strong> — o sumă fixă (ex: 200, 500, 1.000 EUR) care se scade din fiecare daună</li>
        <li><strong>Franșiză procentuală</strong> — un procent din valoarea daunei (ex: 10%)</li>
        <li><strong>Franșiză atinsă</strong> — sub un anumit prag nu se plătește nimic, dar peste prag se plătește totul</li>
      </ul>

      <h2>Cu franșiză vs Fără franșiză</h2>
      <p><strong>Cu franșiză:</strong> prima anuală este mai mică (cu 15-30%), dar suporți o parte din fiecare daună. Ideal pentru șoferi experimentați cu puține daune.</p>
      <p><strong>Fără franșiză:</strong> prima anuală este mai mare, dar asigurătorul acoperă integral orice daună. Ideal pentru mașini noi/scumpe sau șoferi care doresc liniște totală.</p>

      <h2>Sfatul nostru</h2>
      <p>Dacă mașina ta are o valoare mare și vrei protecție completă, alege varianta fără franșiză. Dacă vrei să economisești la primă și ești dispus să acoperi daunele mici, o franșiză de 200-500 EUR este un compromis bun.</p>
    `,
  },
  {
    slug: "documente-necesare-asigurare-auto",
    title: "Documente necesare pentru asigurarea auto: Lista completă",
    excerpt:
      "Pregătește-te din timp cu toate documentele necesare pentru RCA, CASCO sau transferul asigurării la schimbarea mașinii.",
    category: "RCA",
    date: "28 Nov 2024",
    readTime: "3 min",
    gradient: "from-slate-500 to-slate-700",
    content: `
      <p>Fie că închei o asigurare RCA nouă, o poliță CASCO sau transferi asigurarea pe un vehicul nou, ai nevoie de anumite documente. Iată lista completă pentru fiecare situație.</p>

      <h2>Pentru RCA</h2>
      <ul>
        <li>Cartea de identitate sau pașaportul proprietarului</li>
        <li>Certificatul de înmatriculare (talonul)</li>
        <li>Permisul de conducere al utilizatorului principal</li>
        <li>Polița RCA anterioară (dacă există, pentru transferul clasei B/M)</li>
      </ul>

      <h2>Pentru CASCO</h2>
      <p>Pe lângă documentele de mai sus, mai ai nevoie de:</p>
      <ul>
        <li>Cartea de identitate a vehiculului (CIV)</li>
        <li>Factură de achiziție (pentru vehicule noi)</li>
        <li>Inspecția tehnică periodică (ITP) valabilă</li>
        <li>Fotografii ale vehiculului (unii asigurători le solicită)</li>
      </ul>

      <h2>Pentru persoane juridice</h2>
      <ul>
        <li>Certificat de înregistrare la Registrul Comerțului</li>
        <li>CUI (Cod Unic de Identificare)</li>
        <li>Împuternicire pentru reprezentantul legal (dacă este cazul)</li>
      </ul>

      <h2>Sfat</h2>
      <p>Pe platforma noastră online, multe dintre aceste documente nu sunt necesare fizic — introduci datele direct în formular, iar verificarea se face automat. Procesul durează mai puțin de 2 minute.</p>
    `,
  },
  {
    slug: "asigurarea-locuintei-in-chirie",
    title: "Ești chiriaș? De ce ai nevoie de asigurare pentru locuință",
    excerpt:
      "Mulți chiriași cred că nu au nevoie de asigurare. Află de ce o poliță de locuință te protejează chiar dacă nu ești proprietar.",
    category: "Locuință",
    date: "20 Nov 2024",
    readTime: "4 min",
    gradient: "from-purple-500 to-purple-700",
    content: `
      <p>Dacă locuiești în chirie, probabil crezi că asigurarea locuinței este responsabilitatea proprietarului. Parțial ai dreptate — proprietarul ar trebui să aibă o asigurare pentru structura clădirii. Dar bunurile tale personale și răspunderea ta civilă nu sunt acoperite de polița lui.</p>

      <h2>Ce riscuri ai ca chiriaș?</h2>
      <ul>
        <li><strong>Incendiu</strong> — bunurile tale (electronice, mobilă, haine) pot fi distruse</li>
        <li><strong>Inundație</strong> — o conductă spartă poate distruge laptopul, cărțile, documentele</li>
        <li><strong>Furt</strong> — dacă locuința este spartă, pierzi bunurile personale</li>
        <li><strong>Răspundere civilă</strong> — dacă produci daune vecinilor (ex: inundație), tu ești responsabil</li>
      </ul>

      <h2>Ce acoperă asigurarea pentru chiriaș?</h2>
      <p>O poliță facultativă de locuință pentru chiriaș acoperă:</p>
      <ul>
        <li>Bunurile personale din locuință</li>
        <li>Răspunderea civilă față de proprietar și vecini</li>
        <li>Cheltuieli de cazare temporară (dacă locuința devine nelocuibilă)</li>
        <li>Echipamente electronice și electrocasnice</li>
      </ul>

      <h2>Cât costă?</h2>
      <p>Asigurarea pentru chiriaș este surprinzător de accesibilă — de la 50-100 lei pe an pentru acoperire de bază. Raportul cost-beneficiu este excelent, mai ales când te gândești la valoarea totală a bunurilor din locuință.</p>
    `,
  },
  {
    slug: "licitatii-publice-garantie-participare",
    title: "Cum obții garanția de participare la licitații publice",
    excerpt:
      "Ghid practic pentru companiile care participă la achiziții publice: ce este garanția de participare și cum o obții rapid.",
    category: "Garanții",
    date: "10 Nov 2024",
    readTime: "5 min",
    gradient: "from-green-500 to-green-700",
    content: `
      <p>Participarea la licitații publice din România necesită, în majoritatea cazurilor, depunerea unei garanții de participare. Aceasta demonstrează seriozitatea ofertantului și capacitatea sa financiară de a executa contractul.</p>

      <h2>Ce este garanția de participare?</h2>
      <p>Garanția de participare la licitație este un instrument financiar prin care un terț (bancă sau companie de asigurări) garantează autorității contractante că ofertantul își va menține oferta și, dacă este declarat câștigător, va semna contractul.</p>

      <h2>Cât trebuie să fie valoarea garanției?</h2>
      <p>Conform legislației achizițiilor publice, garanția de participare nu poate depăși 2% din valoarea estimată a contractului. De exemplu, pentru un contract estimat la 1.000.000 EUR, garanția maximă este de 20.000 EUR.</p>

      <h2>Asigurare vs Scrisoare bancară de garanție</h2>
      <p>Garanția prin asigurare (polița de asigurare de garanții) prezintă avantaje față de scrisoarea bancară:</p>
      <ul>
        <li>Nu blochează liniile de credit</li>
        <li>Emitere mai rapidă (24-48 ore vs 5-7 zile)</li>
        <li>Costuri mai mici (0.5-2% vs 2-5% din valoare)</li>
        <li>Nu necesită garanții colaterale suplimentare</li>
      </ul>

      <h2>Cum obții garanția rapid?</h2>
      <p>Completează cererea de ofertă pe platforma noastră cu datele companiei și detaliile licitației. Asigurătorul va evalua solicitarea și va emite polița, de regulă, în 24-48 de ore.</p>
    `,
  },
  {
    slug: "asigurare-calatorie-familie-copii",
    title: "Asigurare de călătorie cu familia: Ce trebuie să știi când călătorești cu copiii",
    excerpt:
      "Sfaturi esențiale pentru asigurarea de călătorie în familie — ce acoperiri extra ai nevoie și cum te pregătești pentru orice situație.",
    category: "Travel",
    date: "1 Nov 2024",
    readTime: "5 min",
    gradient: "from-blue-500 to-blue-700",
    content: `
      <p>Călătoria cu copiii este o experiență minunată, dar vine cu responsabilități suplimentare. O asigurare de călătorie bine aleasă vă oferă liniștea de care aveți nevoie pentru a vă bucura de vacanță.</p>

      <h2>De ce este asigurarea mai importantă când călătorești cu copiii?</h2>
      <p>Copiii sunt mai susceptibili la îmbolnăviri în medii noi, au nevoie de atenție medicală specializată și pot avea reacții imprevizibile la schimbările de climă și alimentație.</p>

      <h2>Ce acoperiri sunt esențiale?</h2>
      <ul>
        <li><strong>Cheltuieli medicale pediatrice</strong> — consultații, medicamente, spitalizare</li>
        <li><strong>Anularea călătoriei</strong> — copiii se pot îmbolnăvi chiar înainte de plecare</li>
        <li><strong>Întârziere bagaje</strong> — pierderea bagajelor copilului poate fi stresantă</li>
        <li><strong>Asistență 24/7 în limba română</strong> — esențială pentru situații de urgență</li>
        <li><strong>Repatriere medicală</strong> — transport medical pentru copil și un însoțitor</li>
      </ul>

      <h2>Sfaturi practice</h2>
      <ul>
        <li>Verificați dacă polița familială acoperă toți membrii sau dacă trebuie polițe individuale</li>
        <li>Alegeți o sumă asigurată mai mare — costurile medicale pediatrice pot fi ridicate</li>
        <li>Luați cu voi o copie a poliței în format digital (pe telefon) și fizic</li>
        <li>Salvați numărul de telefon al asistenței 24/7 în telefonul mobil</li>
        <li>Păstrați toate chitanțele și documentele medicale pentru dosarul de daună</li>
      </ul>
    `,
  },
  {
    slug: "tendinte-piata-asigurarilor-romania-2025",
    title: "Piața asigurărilor din România în 2025: Tendințe și prognoze",
    excerpt:
      "Analiză a principalelor tendințe din piața asigurărilor românești — digitalizare, prețuri, reglementări noi și ce înseamnă pentru consumatori.",
    category: "Industrie",
    date: "22 Oct 2024",
    readTime: "6 min",
    gradient: "from-fuchsia-500 to-fuchsia-700",
    content: `
      <p>Piața asigurărilor din România continuă să evolueze rapid, influențată de digitalizare, reglementări europene și schimbarea comportamentului consumatorilor. Iată cele mai importante tendințe pentru 2025.</p>

      <h2>1. Digitalizarea accelerată</h2>
      <p>Tot mai mulți români cumpără asigurări online. Platformele de comparare și achizițiile digitale au crescut cu peste 40% în ultimul an. Procesul de emitere a polițelor devine complet digital, iar dosarele de daune pot fi deschise online sau prin aplicații mobile.</p>

      <h2>2. Prețuri RCA — stabilizare după creșteri</h2>
      <p>După creșterile semnificative din anii anteriori, prețurile RCA s-au stabilizat. Intrarea pe piață a unor asigurători noi și concurența crescută mențin prețurile competitive. Sistemul Bonus-Malus recompensează tot mai mult șoferii prudenți.</p>

      <h2>3. CASCO — produse personalizate</h2>
      <p>Asigurătorii oferă tot mai multe opțiuni de personalizare a poliței CASCO — de la acoperiri modulare la polițe pay-per-kilometer. Telematics (monitorizarea stilului de conducere prin GPS) începe să fie adoptat și în România.</p>

      <h2>4. Asigurări cyber și pentru economia digitală</h2>
      <p>Odată cu creșterea amenințărilor cibernetice, apar tot mai multe produse de asigurare cyber, atât pentru companii, cât și pentru persoane fizice. Protecția împotriva fraudelor online devine un produs standard.</p>

      <h2>5. Sustenabilitate și ESG</h2>
      <p>Asigurătorii încep să integreze criterii de sustenabilitate în evaluarea riscurilor. Vehiculele electrice beneficiază de tarife preferențiale la RCA și CASCO, iar asigurările de locuință iau în calcul eficiența energetică a clădirii.</p>

      <h2>Ce înseamnă pentru tine?</h2>
      <p>Mai multe opțiuni, prețuri mai competitive și procese mai simple. Folosind un comparator online, poți profita de această concurență crescută pentru a obține cele mai bune oferte.</p>
    `,
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function getAllSlugs(): string[] {
  return ARTICLES.map((a) => a.slug);
}
