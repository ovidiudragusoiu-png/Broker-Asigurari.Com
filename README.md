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
- `npm run google-ads:weekly-report` - ruleaza raportul saptamanal Google Ads si il trimite pe email
- `npm run google-ads:weekly-report -- --dry-run` - genereaza raportul fara trimitere email

## Variabile de mediu

Vezi `.env.example` pentru lista completa. Fara aceste variabile, proxy-ul API nu porneste.

## Automatizare raport saptamanal Google Ads

Automatizarea genereaza un raport de performanta pentru Google Ads, optimizat pentru lead generation CASCO in Romania si pentru landing page-ul `https://www.sigur.ai/casco`. Raportul compara ultimele 7 zile complete cu cele 7 zile anterioare si include month-to-date cand exista zile complete in luna curenta.

### Ce include

- Conectare la Google Ads API pentru campanii, bugete, costuri, impresii, clickuri, CTR, CPC, conversii, CPA si impression share.
- Analiza pentru campanii, keyword-uri, search terms, ad groups, ads, device, locatie si zi/ora.
- Sugestii de negative keywords pentru termeni fara intent CASCO.
- Recomandari de buget, bid, targeting, ad copy, landing page si conversion tracking.
- Nivel de incredere pentru fiecare recomandare: High, Medium sau Low.
- Trimitere email prin Resend, cu raportul in corpul emailului si CSV atasat.
- Strat AI optional prin Anthropic. Daca `ANTHROPIC_API_KEY` lipseste, raportul foloseste recomandarile deterministe.
- Regula de siguranta: `automaticChangesAllowed` este `false` implicit. Codul doar raporteaza si recomanda; nu modifica automat campanii, bugete, bid-uri sau negative keywords.

### Configurare

1. Copiaza configuratia:

```bash
cp config/google-ads-weekly-report.example.json config/google-ads-weekly-report.json
```

2. Completeaza in `config/google-ads-weekly-report.json`:

- `googleAdsCustomerId` - customer ID fara liniute
- `campaignIds` - lista de campanii monitorizate; lasa lista goala pentru toate campaniile din cont
- `emailRecipient` si `senderEmail`
- `reportDay`, `reportTime`, `timezone` (`Europe/Bucharest`)
- `targetCpa`, `minimumConversionThreshold`, `maximumAllowedSpendWithoutConversion`
- `automaticChangesAllowed` - lasa `false` daca nu exista un flux separat de aprobare manuala

3. Completeaza credentialele in `.env.local`:

```bash
GOOGLE_ADS_CLIENT_ID=...
GOOGLE_ADS_CLIENT_SECRET=...
GOOGLE_ADS_DEVELOPER_TOKEN=...
GOOGLE_ADS_REFRESH_TOKEN=...
GOOGLE_ADS_LOGIN_CUSTOMER_ID=...
GOOGLE_ADS_API_VERSION=v22
GOOGLE_ADS_REPORT_CONFIG_PATH=config/google-ads-weekly-report.json
RESEND_API_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_ADS_REPORT_CRON_SECRET=...
```

### Rulare manuala

```bash
npm run google-ads:weekly-report -- --dry-run
npm run google-ads:weekly-report
```

### Scheduler

Pentru cron clasic pe un server Node.js:

```cron
0 8 * * 1 cd /path/to/app && npm run google-ads:weekly-report >> /var/log/google-ads-weekly-report.log 2>&1
```

Seteaza timezone-ul serverului la `Europe/Bucharest` sau ajusteaza ora cronului. Pentru serverless/Vercel, programeaza un apel saptamanal catre:

```text
GET /api/automations/google-ads-weekly-report
Authorization: Bearer $GOOGLE_ADS_REPORT_CRON_SECRET
```

Pentru test fara email:

```text
GET /api/automations/google-ads-weekly-report?dryRun=true
```

### Structura automatizarii

- `config/google-ads-weekly-report.example.json` - configuratie exemplu fara secrete
- `scripts/google-ads-weekly-report.ts` - entrypoint CLI/cron
- `src/app/api/automations/google-ads-weekly-report/route.ts` - entrypoint serverless protejat optional cu secret
- `src/lib/google-ads-reporting/config.ts` - incarcare si validare configuratie
- `src/lib/google-ads-reporting/googleAdsClient.ts` - conectare Google Ads API
- `src/lib/google-ads-reporting/fetchPerformanceData.ts` - interogari GAQL si normalizare date
- `src/lib/google-ads-reporting/analysis.ts` - reguli de analiza si recomandari CASCO
- `src/lib/google-ads-reporting/aiRecommendations.ts` - interpretare AI optionala
- `src/lib/google-ads-reporting/reportRenderer.ts` - raport text/html si CSV
- `src/lib/google-ads-reporting/email.ts` - trimitere email prin Resend
- `src/lib/google-ads-reporting/orchestrator.ts` - flux end-to-end
- `docs/examples/google-ads-weekly-report.example.md` - exemplu de output

## Structura principala

- `src/app/` - pagini Next.js (fluxuri pe produs)
- `src/components/` - componente UI reutilizabile
- `src/lib/api/` - clienti API (browser/server)
- `src/lib/flows/` - utilitare de orchestrare pentru comenzi/oferte
- `src/lib/utils/` - validari si utilitare comune
