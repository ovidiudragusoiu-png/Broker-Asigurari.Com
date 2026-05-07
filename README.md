# Broker Asigurari

Aplicatie Next.js pentru comparare si achizitie asigurari online (RCA, Travel, Locuinta, PAD, Malpraxis), integrata cu API-ul InsureTech printr-un proxy server-side.

## Cerinte

- Node.js 20+
- npm 10+

## Configurare

1. Instaleaza dependentele:

```bash
npm install
```

2. Copiaza variabilele de mediu:

```bash
cp .env.example .env.local
```

3. Completeaza valorile reale pentru credentialele InsureTech in `.env.local`.

## Rulare

```bash
npm run dev
```

Aplicatia va porni pe `http://localhost:3000`.

## Comenzi utile

- `npm run dev` - server development
- `npm run build` - build productie
- `npm start` - porneste build-ul de productie
- `npm run lint` - verificare ESLint
- `npm test` - ruleaza testele (Vitest)
- `npm run test:watch` - ruleaza testele in watch mode
- `npm run report:google-ads -- --dry-run` - genereaza raportul Google Ads fara email
- `npm run report:google-ads` - genereaza si trimite raportul Google Ads
- `npm run report:google-ads:schedule` - porneste schedulerul saptamanal Google Ads

## Variabile de mediu

Vezi `.env.example` pentru lista completa. Fara aceste variabile, proxy-ul API nu porneste.

## Automatizare raport saptamanal Google Ads

Automatizarea verifica performanta campaniilor Google Ads pentru lead generation CASCO in Romania, compara ultimele 7 zile cu precedentele 7 zile, adauga performanta month-to-date cand exista, genereaza recomandari si trimite raportul prin email. Sistemul este doar de raportare: nu opreste campanii, nu schimba bugete si nu adauga cuvinte negative automat.

### Structura

- `config/google-ads-report.config.example.json` - exemplu de configurare pentru cont, campanii, email, program si praguri.
- `src/lib/google-ads-report/config.ts` - incarca si valideaza configurarea si credentialele din environment.
- `src/lib/google-ads-report/googleAdsClient.ts` - creeaza clientul Google Ads API.
- `src/lib/google-ads-report/dataFetcher.ts` - extrage date pe campanii, cuvinte cheie, termeni de cautare, reclame, device, locatie si intervale orare.
- `src/lib/google-ads-report/analysis.ts` - detecteaza risipa, CPA ridicat, CTR slab, pierderi de impression share si probleme de tracking.
- `src/lib/google-ads-report/aiRecommendations.ts` - foloseste Anthropic pentru interpretare business si recomandari.
- `src/lib/google-ads-report/reportRenderer.ts` - construieste raportul weekly in Markdown si CSV.
- `src/lib/google-ads-report/email.ts` - trimite raportul prin Resend.
- `src/lib/google-ads-report/scheduler.ts` - ruleaza raportul in fiecare luni dimineata, conform configurarii.
- `scripts/google-ads-weekly-report.ts` - entry point CLI.

### Configurare

1. Copiaza configurarea:

```bash
cp config/google-ads-report.config.example.json config/google-ads-report.config.json
```

2. Completeaza in `config/google-ads-report.config.json`:

- `googleAdsCustomerId` - customer ID-ul contului Google Ads, fara sau cu cratime.
- `googleAdsLoginCustomerId` - optional, pentru conturi manager.
- `campaignIds` - lista de campanii monitorizate; lasa lista goala pentru toate campaniile eligibile.
- `email.recipient` si `email.sender`.
- `schedule.dayOfWeek`, `schedule.time`, `schedule.timezone` (`Europe/Bucharest` implicit).
- pragurile: `targetCpa`, `maximumSpendWithoutConversion`, `minimumConversionThreshold`.
- `automaticChangesAllowed` trebuie sa ramana `false`; modulul curent doar raporteaza si logheaza recomandari.

3. Completeaza variabilele din `.env.local`:

- `GOOGLE_ADS_CLIENT_ID`
- `GOOGLE_ADS_CLIENT_SECRET`
- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `GOOGLE_ADS_REFRESH_TOKEN`
- `RESEND_API_KEY`
- `ANTHROPIC_API_KEY` si optional `ANTHROPIC_MODEL`
- `GOOGLE_ADS_REPORT_CONFIG_PATH=config/google-ads-report.config.json`

### Rulare

Dry run local, fara email:

```bash
npm run report:google-ads -- --dry-run
```

Trimitere manuala:

```bash
npm run report:google-ads
```

Scheduler long-running:

```bash
npm run report:google-ads:schedule
```

Pentru cron sau serverless, ruleaza comanda manuala lunea dimineata. Schedulerul intern foloseste ora si fusul orar din configurare.

### Date incluse in raport

Raportul include campanii, bugete, cost, impresii, clickuri, CTR, CPC mediu, conversii, rata de conversie, CPA, search impression share, pierderi din buget si rank, termeni de cautare, cuvinte cheie, ad group-uri, reclame, device-uri, locatii, zile, ore si sugestii de negative keywords. Recomandarile sunt optimizate pentru intent CASCO si landing page-ul `https://www.sigur.ai/casco`.

## Structura principala

- `src/app/` - pagini Next.js (fluxuri pe produs)
- `src/components/` - componente UI reutilizabile
- `src/lib/api/` - clienti API (browser/server)
- `src/lib/flows/` - utilitare de orchestrare pentru comenzi/oferte
- `src/lib/utils/` - validari si utilitare comune
