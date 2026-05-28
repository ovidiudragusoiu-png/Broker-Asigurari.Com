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
- `npm run post:romanian-insurance-news` - publica top 3 stiri zilnice din piata asigurarilor pe pagina Facebook configurata

## Variabile de mediu

Vezi `.env.example` pentru lista completa. Fara aceste variabile, proxy-ul API nu porneste.

### Postare automata stiri Facebook

Workflow-ul GitHub Actions `Daily Romanian Insurance News` ruleaza zilnic la 06:00 UTC si publica un singur post cu top 3 stiri relevante din piata asigurarilor din Romania.

Configureaza in GitHub:

- Secrets: `FACEBOOK_PAGE_ID` (ID-ul numeric sau handle-ul paginii) si `FACEBOOK_PAGE_ACCESS_TOKEN` (Page Access Token cu permisiuni precum `pages_manage_posts` si `pages_read_engagement`).
- Optional repository variables: `FACEBOOK_GRAPH_API_VERSION`, `FACEBOOK_SKIP_DUPLICATE_POST`, `NEWS_LOOKBACK_HOURS`, `NEWS_MAX_ITEMS_PER_QUERY`, `NEWS_SEARCH_QUERIES`.

Pentru verificare locala fara publicare:

```bash
NEWS_DRY_RUN=true npm run post:romanian-insurance-news
```

## Structura principala

- `src/app/` - pagini Next.js (fluxuri pe produs)
- `src/components/` - componente UI reutilizabile
- `src/lib/api/` - clienti API (browser/server)
- `src/lib/flows/` - utilitare de orchestrare pentru comenzi/oferte
- `src/lib/utils/` - validari si utilitare comune
