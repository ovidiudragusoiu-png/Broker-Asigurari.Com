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
- `npm run google-ads:report` - genereaza si trimite raportul saptamanal Google Ads
- `npm run google-ads:scheduler` - porneste schedulerul saptamanal pentru raportul Google Ads

## Variabile de mediu

Vezi `.env.example` pentru lista completa. Fara aceste variabile, proxy-ul API nu porneste.

## Structura principala

- `src/app/` - pagini Next.js (fluxuri pe produs)
- `src/components/` - componente UI reutilizabile
- `src/lib/api/` - clienti API (browser/server)
- `src/lib/flows/` - utilitare de orchestrare pentru comenzi/oferte
- `src/lib/utils/` - validari si utilitare comune
- `src/automations/google-ads-weekly-report/` - automatizare raport performanta Google Ads

## Automatizare raport saptamanal Google Ads

Automatizarea extrage date saptamanale din Google Ads API, compara ultimele 7 zile cu cele 7 zile anterioare, adauga performanta month-to-date cand exista, identifica zone cu risipa de buget si trimite raportul prin email. Analiza este optimizata pentru lead generation CASCO in Romania si pentru pagina `https://www.sigur.ai/casco`.

### Structura

- `config/google-ads-weekly-report.config.json` - setari non-secrete: customer ID, campanii monitorizate, destinatari email, programare, timezone, target CPA, praguri si safety flag.
- `src/automations/google-ads-weekly-report/config.ts` - incarca setarile si credentialele din environment.
- `src/automations/google-ads-weekly-report/googleAdsClient.ts` - creeaza conexiunea Google Ads API.
- `src/automations/google-ads-weekly-report/dataFetcher.ts` - ruleaza GAQL pentru campanii, termeni cautare, keyword-uri, ad group-uri, ads, device, locatie si zi/ora.
- `src/automations/google-ads-weekly-report/analysis.ts` - detecteaza spend fara conversii, CPA mare, limitari de buget, rank slab, termeni negativi, ads cu CTR mic si probleme landing page/tracking.
- `src/automations/google-ads-weekly-report/aiRecommendations.ts` - foloseste Anthropic pentru recomandari in limbaj business; daca lipseste cheia API, raportul continua cu recomandarile locale.
- `src/automations/google-ads-weekly-report/reportRenderer.ts` - genereaza raportul in 12 sectiuni si CSV.
- `src/automations/google-ads-weekly-report/emailReport.ts` - trimite emailul prin Resend.
- `src/automations/google-ads-weekly-report/scheduler.ts` - ruleaza raportul conform programarii configurate.
- `docs/google-ads-weekly-report-example.md` - exemplu de output.

### Configurare

1. Completeaza `config/google-ads-weekly-report.config.json`:

```json
{
  "googleAdsCustomerId": "1234567890",
  "campaignIds": [],
  "emailRecipient": "marketing@example.com",
  "senderEmail": "reports@example.com",
  "reportDay": "Monday",
  "reportTime": "08:00",
  "timezone": "Europe/Bucharest",
  "targetCpaRon": 120,
  "minimumConversionThreshold": 2,
  "maximumAllowedSpendWithoutConversionRon": 250,
  "automaticChangesAllowed": false,
  "landingPageUrl": "https://www.sigur.ai/casco"
}
```

Lasa `campaignIds` gol pentru toate campaniile non-removed din cont sau adauga ID-urile campaniilor CASCO care trebuie monitorizate.

2. Completeaza variabilele din `.env.local`:

```bash
GOOGLE_ADS_DEVELOPER_TOKEN=...
GOOGLE_ADS_CLIENT_ID=...
GOOGLE_ADS_CLIENT_SECRET=...
GOOGLE_ADS_REFRESH_TOKEN=...
GOOGLE_ADS_REPORT_CONFIG_PATH=config/google-ads-weekly-report.config.json
ANTHROPIC_API_KEY=...
RESEND_API_KEY=...
```

Pentru conturi gestionate prin MCC, seteaza `GOOGLE_ADS_LOGIN_CUSTOMER_ID` sau `loginCustomerId` in config.

### Rulare

Genereaza raportul si trimite emailul:

```bash
npm run google-ads:report
```

Genereaza raportul fara email si afiseaza continutul in terminal:

```bash
npm run google-ads:report -- --no-email --print
```

Porneste schedulerul:

```bash
npm run google-ads:scheduler
```

Pentru productie, ruleaza schedulerul intr-un process manager sau foloseste un cron/serverless scheduler care executa `npm run google-ads:report` in fiecare luni dimineata. Programarea implicita este luni la 08:00 in timezone `Europe/Bucharest`.

### Reguli de siguranta

- Automatizarea nu modifica automat campanii, bugete, bids sau negative keywords.
- `automaticChangesAllowed` este `false` implicit si raportul marcheaza clar ca recomandarile necesita review manual.
- Fiecare recomandare are confidence level: High, Medium sau Low.
- Recomandarile sunt logate in `logs/google-ads-recommendations-YYYY-MM-DD.jsonl`.
